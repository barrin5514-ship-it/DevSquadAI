import {randomUUID,createHash} from 'node:crypto';
import {transaction} from '../middleware/ai-validation.js';
import {ApiError} from '../middleware/errors.js';
import {cleanReport} from './report-cleaning.js';

export const workerOrder=Object.freeze(['codex-personal','codex-school','claude-code','deepseek']);
export const defaultRoles=Object.freeze({builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'});
const family=id=>id.startsWith('codex-')?'codex':id;
const roleForPhase=phase=>({build:'builder',test:'tester',review:'reviewer'})[phase];
const stoppedErrors=new Set(['usage_limit','rate_limit','quota_exhausted','auth_expired','repeated_timeout']);
const timestamp=()=>new Date().toISOString();
const hash=s=>createHash('sha256').update(s).digest('hex');

// Coordination only: never spawns a CLI, reads credentials, or bypasses paid controls.
// Executable workers must be trusted, isolated connectors; none ship enabled here.
export class BigThreeCoordinator {
 constructor(team,workers={},timeoutMs=90000,{mockOnly=false}={}){this.team=team;this.db=team.db;this.workers=workers;this.mockOnly=mockOnly;this.timeoutMs=Math.min(90000,Math.max(1,timeoutMs));}
 read(id){const row=this.db.prepare('SELECT * FROM shared_jobs WHERE id=?').get(id);if(!row)throw new ApiError(404,'Shared job not found');return {...row,state:JSON.parse(row.state)};}
 list(){return this.db.prepare('SELECT id FROM shared_jobs ORDER BY updated_at DESC LIMIT 100').all().map(r=>{const {lease,...job}=this.read(r.id);return job;});}
 history(id){this.read(id);return this.db.prepare('SELECT * FROM shared_job_history WHERE job_id=? ORDER BY version').all(id).map(r=>({...r,snapshot:JSON.parse(r.snapshot)}));}
 validateRoles(roles,authors=[]){
  if(!roles||Object.keys(roles).sort().join(',')!=='builder,reviewer,tester'||Object.values(roles).some(w=>!workerOrder.includes(w)))throw new ApiError(400,'Choose a registered worker for each of the three roles');
  if(family(roles.builder)===family(roles.reviewer)||authors.some(w=>family(w)===family(roles.reviewer)))throw new ApiError(409,'A builder cannot review the same step, including through another Codex profile');
  return {...roles};
 }
 // These edits only change assignments. They never start a worker or approve work.
 setRoles(id,roles,rotate=false){return transaction(this.db,()=>{
  const job=this.read(id);if(job.lease||!['ready','paused'].includes(job.status))throw new ApiError(409,'Pause the job before changing its roles');
  const before=job.state.roles||defaultRoles;
  const next=this.validateRoles(rotate?{builder:before.reviewer,tester:before.builder,reviewer:before.tester}:roles,job.state.authors);
  const swaps=[...job.state.swaps];for(const role of ['builder','tester','reviewer'])if(before[role]!==next[role])swaps.push({time:timestamp(),reason:rotate?'Owner rotated roles':'Owner changed role',role,from:before[role],to:next[role]});
  const state={...job.state,roles:next,swaps};this.team.safe(state);const raw=JSON.stringify(state),result=this.db.prepare('UPDATE shared_jobs SET version=version+1,state=?,updated_at=? WHERE id=? AND version=? AND lease IS NULL').run(raw,timestamp(),id,job.version);if(result.changes!==1)throw new ApiError(409,'Assignment changed; refresh first');
  this.db.prepare('INSERT INTO shared_job_history(job_id,version,kind,worker,snapshot,snapshot_hash,created_at) VALUES (?,?,?,?,?,?,?)').run(id,job.version+1,'roles_changed','owner',raw,hash(raw),timestamp());return this.read(id);
 });}
 create(taskId,roles=defaultRoles){return transaction(this.db,()=>{
  const task=this.team.get(taskId);
  if(!task.parent_id||!this.team.get(task.parent_id).owner_plan_approval||!['PENDING','ASSIGNED','BLOCKED','CHANGES_REQUESTED'].includes(task.state))throw new ApiError(409,'An unfinished task in an owner-approved plan is required');
  const id=randomUUID(),state={goal:task.description,plan:task.plan||[],roles:this.validateRoles(roles),completedSteps:[],currentStep:'Build',changedFiles:[],testResults:[],openIssues:[],currentWorker:null,authors:[],phase:'build',swaps:[],attempted:[],unavailable:[],retryAt:null,blocker:null};
  const raw=JSON.stringify(state),time=timestamp();this.team.safe(state);
  this.db.prepare("INSERT INTO shared_jobs VALUES (?,?,0,'ready',NULL,?,?)").run(id,taskId,raw,time);
  this.db.prepare('INSERT INTO shared_job_history(job_id,version,kind,worker,snapshot,snapshot_hash,created_at) VALUES (?,0,?,NULL,?,?,?)').run(id,'created',raw,hash(raw),time);
  return this.read(id);
 });}
 save(id,version,lease,status,state,kind,worker=null){return transaction(this.db,()=>{
  this.team.safe(state);const raw=JSON.stringify(state);if(raw.length>256000)throw new ApiError(400,'Shared state exceeds bounded record size');
  const result=this.db.prepare('UPDATE shared_jobs SET version=version+1,status=?,state=?,updated_at=? WHERE id=? AND version=? AND lease IS ?').run(status,raw,timestamp(),id,version,lease);
  if(result.changes!==1)throw new ApiError(409,'Stale worker or concurrent job turn');
  this.db.prepare('INSERT INTO shared_job_history(job_id,version,kind,worker,snapshot,snapshot_hash,created_at) VALUES (?,?,?,?,?,?,?)').run(id,version+1,kind,worker,raw,hash(raw),timestamp());
  return this.read(id);
 });}
 // Restart fencing is explicit: unknown worker outcomes require investigation, never redispatch.
 recover(){for(const row of this.db.prepare("SELECT id FROM shared_jobs WHERE status='running'").all()){
  const j=this.read(row.id);this.save(j.id,j.version,j.lease,'paused',{...j.state,blocker:'Interrupted worker outcome unknown; confirm it stopped before resuming.'},'interrupted',j.state.currentWorker);
  this.db.prepare('UPDATE shared_jobs SET lease=NULL WHERE id=?').run(j.id);
 }}
 eligible(worker,state){const connector=this.workers[worker];
  if(!connector)return 'Secure connector/profile setup required';
  const restriction=connector.availability?.(state);if(restriction)return restriction;
  if(state.phase==='review'&&state.authors.some(a=>family(a)===family(worker)))return 'Builder family cannot review its own work';
  // A generic paid worker cannot be plugged into failover. An existing scoped paid
  // pipeline must explicitly authorize this exact state before any invocation.
  if(worker==='deepseek'&&!(this.mockOnly&&connector.simulation===true)&&connector.paidAuthorization?.(state)!==true)return 'Existing task-specific paid authorization and guarded review connector required';
  return null;
 }
 cancel(id){const j=this.read(id);if(['running','ready'].includes(j.status)){this.save(id,j.version,j.lease,'paused',{...j.state,blocker:'Stopped by owner; confirm any running worker ended before restarting.'},'owner_stop',j.state.currentWorker);this.db.prepare('UPDATE shared_jobs SET lease=NULL WHERE id=?').run(id);}}
 async run(id,{oneStep=false,prompt=null,signal=null}={}){let j=this.read(id);if(signal?.aborted)throw new ApiError(409,'Job was stopped');if(!['ready','paused'].includes(j.status)||j.state.blocker?.startsWith('Interrupted')||j.state.blocker?.startsWith('Unknown')||j.state.blocker?.startsWith('Stopped'))throw new ApiError(409,'Job cannot safely resume');
  const task=this.team.get(j.task_id);
  const importedDemo=task.state==='AWAITING_REVIEW'&&['test','review'].includes(j.state.phase)&&this.db.prepare('SELECT 1 FROM demo_artifacts WHERE job_id=? AND task_id=? AND draft_id=?').get(id,j.task_id,task.draft_id);if(!task.parent_id||!this.team.get(task.parent_id).owner_plan_approval||(!['PENDING','ASSIGNED','BLOCKED','CHANGES_REQUESTED'].includes(task.state)&&!importedDemo))throw new ApiError(409,'Task is no longer eligible for a worker');
  if(this.db.prepare('SELECT 1 FROM team_task_locks WHERE task_id=?').get(j.task_id))throw new ApiError(409,'Existing task operation is locked');
  const lease=randomUUID();const lock=this.db.prepare("UPDATE shared_jobs SET lease=? WHERE id=? AND version=? AND lease IS NULL").run(lease,id,j.version);if(lock.changes!==1)throw new ApiError(409,'Job already locked');
  try{
   if(prompt!==null&&(typeof prompt!=='string'||prompt.length>4000))throw new ApiError(400,'Invalid handoff prompt');
   j=this.save(id,j.version,lease,'running',{...j.state,blocker:null,...(prompt!==null?{handoffPrompt:prompt}: {})},'started');
   for(let turn=0;turn<workerOrder.length*3;turn++){
    const role=roleForPhase(j.state.phase),preferred=(j.state.roles||defaultRoles)[role];
    // Try the assigned worker, then its alternate Codex login, then the rest.
    const order=[...new Set([preferred,...(family(preferred)==='codex'?workerOrder.filter(w=>family(w)==='codex'):[]),...workerOrder])];
    const unavailable=[];const worker=order.find(w=>{const why=this.eligible(w,j.state)||((j.state.unavailable||[]).includes(w)?'Worker stopped earlier in this job':null);if(why)unavailable.push(w+': '+why);return !why&&!j.state.attempted.includes(j.state.phase+':'+w);});
    if(!worker){j=this.save(id,j.version,lease,'paused',{...j.state,currentWorker:null,blocker:'No eligible workers. '+unavailable.join('; ')},'paused');return j;}
    const swaps=[...j.state.swaps];
    if(preferred!==worker)swaps.push({time:timestamp(),reason:j.state.lastFailure||this.eligible(preferred,j.state)||'Assigned worker unavailable',role,from:preferred,to:worker});
    j=this.save(id,j.version,lease,'running',{...j.state,roles:{...(j.state.roles||defaultRoles),[role]:worker},currentWorker:worker,swaps,attempted:[...j.state.attempted,j.state.phase+':'+worker]},preferred!==worker?'swap':'turn_started',worker);
    const turnVersion=j.version;let active=true;
    const checkpoint=patch=>{
     if(!active)throw new ApiError(409,'Worker turn has ended');
     if(!patch||Object.keys(patch).some(k=>!['plan','completedSteps','currentStep','changedFiles','testResults','openIssues'].includes(k)))throw new ApiError(400,'Invalid progress fields');
     for(const k of ['plan','completedSteps','changedFiles','testResults','openIssues'])if(k in patch&&!Array.isArray(patch[k]))throw new ApiError(400,'Progress lists must be arrays');
     if('currentStep' in patch&&typeof patch.currentStep!=='string')throw new ApiError(400,'Current step must be text');
     const latest=this.read(id);if(latest.lease!==lease||latest.state.currentWorker!==worker||latest.version<turnVersion||latest.status!=='running')throw new ApiError(409,'Stale worker turn');
     if(patch.completedSteps&&latest.state.completedSteps.some(step=>!patch.completedSteps.includes(step)))throw new ApiError(409,'Previously completed steps must be preserved');
     // Snapshots preserve every earlier version, including prior file revisions.
     const authors=latest.state.phase==='build'?[...new Set([...latest.state.authors,worker])]:latest.state.authors;
     j=this.save(id,latest.version,lease,'running',{...latest.state,...patch,authors},'progress',worker);
    };
    const abort=new AbortController();let timer,stop;
    try{
     const timedOut=new Promise((_,reject)=>{timer=setTimeout(()=>{active=false;abort.abort();reject({code:'timeout',stopped:false});},this.timeoutMs);});
     const stopped=new Promise((_,reject)=>{stop=()=>{active=false;abort.abort();reject({code:'owner_stop',stopped:false});};signal?.addEventListener('abort',stop,{once:true});});
     if(signal?.aborted)throw new ApiError(409,'Job was stopped');
     const result=await Promise.race([this.workers[worker].run(structuredClone(j.state),checkpoint,abort.signal),timedOut,stopped]);
     active=false;
     if(result?.complete!==true)throw {code:'incomplete',stopped:true};
     const lastStep={id:randomUUID(),role,agent:worker,report:cleanReport(result.report||'Worker finished this role. No detailed report or independently executed tests were supplied.',this.configuredSecrets()),at:timestamp()};
     if(j.state.phase==='review')return this.save(id,j.version,lease,'awaiting_owner',{...j.state,lastStep,reviewResult:result.review||null,blocker:null,currentStep:'Independent review recorded; final owner acceptance required'},'review_recorded',worker);
     const built=j.state.phase==='build';
     j=this.save(id,j.version,lease,oneStep?'ready':'running',{...j.state,lastStep,authors:built?[...new Set([...j.state.authors,worker])]:j.state.authors,phase:built?'test':'review',currentStep:built?'Testing':'Independent review',lastFailure:null,blocker:null},built?'build_finished':'test_report_recorded',worker);
     if(oneStep)return j;
    }catch(error){active=false;const code=stoppedErrors.has(error?.code)?error.code:error?.code==='incomplete'?'incomplete':'worker_error';
     // Never record arbitrary exception text, which may contain credentials.
     const knownStopped=error?.stopped===true;
     const retryAt=typeof error?.retryAt==='string'&&Number.isFinite(Date.parse(error.retryAt))?error.retryAt:null;
     j=this.save(id,j.version,lease,knownStopped&&stoppedErrors.has(code)?'running':'paused',{...j.state,unavailable:[...new Set([...(j.state.unavailable||[]),worker])],lastFailure:code,retryAt,blocker:knownStopped?code:'Unknown worker outcome; confirm it stopped before resuming.'},'turn_failed',worker);
     if(j.status==='paused')return j;
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',stop);}
   }
   return this.save(id,j.version,lease,'paused',{...j.state,blocker:'Bounded turn limit reached'},'paused');
  }finally{this.db.prepare('UPDATE shared_jobs SET lease=NULL WHERE id=? AND lease=?').run(id,lease);}
 }
 configuredSecrets(){return [...this.team.config.ai.providers.map(p=>p.key),this.team.config.handoff?.token||''];}
 status(){return {focus:this.team.config.teamFocus==='big_three',defaultRoles,demoWorkers:this.team.demoWorkers?.status()||null,messenger:this.team.messenger?.status()||null,webhook:this.team.webhook?.status()||null,connections:this.team.hubConnections?.status()||null,liveExecutionEnabled:false,workers:workerOrder.map(id=>({id,family:family(id),status:id==='deepseek'?'Paid authorization required':'Secure connector/profile setup required'})),jobs:this.list()};}
}
