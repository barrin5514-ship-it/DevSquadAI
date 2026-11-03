import {randomUUID} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
import {transaction} from '../middleware/ai-validation.js';
import {GitHubHandoff} from './github-handoff.js';
import {cleanReport} from './report-cleaning.js';
const now=()=>new Date().toISOString();
const phaseRole=phase=>({build:'builder',test:'tester',review:'reviewer'})[phase];

// Zapier supplies task text, never approval, credentials, budgets or executable
// commands. Each round still passes through the existing guarded coordinator.
export class MessengerLoop {
 constructor(team,options={}){
  this.team=team;this.db=team.db;this.reader=options.handoffReader||new GitHubHandoff(team.config.handoff,{fetchImpl:options.githubFetch||fetch});
  this.autoPoll=options.messengerAutoPoll!==false;this.interval=10000;this.timers=new Map();this.controllers=new Map();this.polling=new Set();
  this.db.prepare("UPDATE messenger_jobs SET status='paused',run_token=NULL,reason='Backend restarted; no report was retried. Owner must resume waiting explicitly.',updated_at=? WHERE status IN ('running','waiting')").run(now());
 }
 get(id){const row=this.db.prepare('SELECT * FROM messenger_jobs WHERE job_id=?').get(id);if(!row)throw new ApiError(404,'Messenger loop not prepared');return row;}
 detail(id){const row=this.get(id);return {...row,rounds:this.db.prepare('SELECT * FROM messenger_rounds WHERE job_id=? ORDER BY round').all(id).map(r=>({...r,prompt_json:r.prompt_json?JSON.parse(r.prompt_json):null})),events:this.db.prepare('SELECT kind,round,detail,created_at FROM messenger_events WHERE job_id=? ORDER BY id DESC LIMIT 100').all(id)};}
 status(){return {github:this.reader.status(),defaultRounds:3,defaultTimeoutSeconds:300,pollSeconds:this.interval/1000,loops:this.db.prepare('SELECT job_id FROM messenger_jobs ORDER BY updated_at DESC LIMIT 100').all().map(r=>this.detail(r.job_id)),liveWorkersAvailable:false};}
 event(id,kind,detail){const row=this.get(id);this.db.prepare('INSERT INTO messenger_events(job_id,round,kind,detail,created_at) VALUES (?,?,?,?,?)').run(id,row.round,kind,detail,now());}
 prepare(id,{maxRounds=3,timeoutSeconds=300}={}){
  const job=this.team.coordinator.read(id);if(!['ready','paused'].includes(job.status))throw new ApiError(409,'Prepare an unfinished shared job first');
  if(!Number.isInteger(maxRounds)||maxRounds<1||maxRounds>10||!Number.isInteger(timeoutSeconds)||timeoutSeconds<1||timeoutSeconds>1800)throw new ApiError(400,'Use 1–10 rounds and a 1–1800 second waiting timeout');
  transaction(this.db,()=>{if(this.db.prepare('SELECT 1 FROM messenger_jobs WHERE job_id=?').get(id))throw new ApiError(409,'This job already has a messenger history');this.db.prepare("INSERT INTO messenger_jobs(job_id,status,max_rounds,wait_ms,updated_at) VALUES (?,'ready',?,?,?)").run(id,maxRounds,timeoutSeconds*1000,now());this.event(id,'prepared','Prepared locally; no worker or external request started');});return this.detail(id);
 }
 setup(){if(!this.team.webhook.status().enabled)throw new ApiError(409,'Paste and enable your Zapier Catch Hook URL first');if(!this.reader.status().ready)throw new ApiError(409,'Configure the read-only GitHub handoff token first');}
 async setupSample(){
  if(this.db.prepare("SELECT 1 FROM messenger_jobs WHERE status IN ('running','waiting')").get())throw new ApiError(409,'Do not send setup samples while a real loop owns the mailbox');
  return this.team.webhook.sendStep({jobId:'setup-example',round:1,role:'builder',agent:'deepseek',expectedNextRole:'tester',report:'SETUP SAMPLE ONLY. No agent was run. A pretend utility was drafted; its next role should check it. This sample grants no spending or approval permission.'});
 }
 async start(id){
  this.setup();let token;
  transaction(this.db,()=>{const row=this.get(id);if(row.status!=='ready')throw new ApiError(409,'This loop cannot start again; stopped or unknown work is not replayed');if(this.db.prepare("SELECT 1 FROM messenger_jobs WHERE status IN ('running','waiting')").get())throw new ApiError(409,'Another job owns the single GitHub handoff mailbox');token=randomUUID();this.db.prepare("UPDATE messenger_jobs SET status='running',run_token=?,reason=NULL,updated_at=? WHERE job_id=?").run(token,now(),id);this.event(id,'started','Owner started the bounded loop; spending approvals remain separate');});
  return this.advance(id,token,null);
 }
 current(id,token,state){const row=this.get(id);return row.run_token===token&&row.status===state;}
 pause(id,reason){this.clearTimer(id);this.db.prepare("UPDATE messenger_jobs SET status='paused',run_token=NULL,reason=?,updated_at=? WHERE job_id=? AND status<>'stopped'").run(reason,now(),id);this.event(id,'paused',reason);return this.detail(id);}
 async advance(id,token,prompt){
  const c=new AbortController();this.controllers.set(id,c);
  try{
   const row=this.get(id);if(!this.current(id,token,'running'))return this.detail(id);
   if(row.round>=row.max_rounds)return this.pause(id,'Round limit reached; owner decides what happens next');
   this.event(id,'step_started','Dispatching one role through existing worker and spending guards');
   const result=await this.team.coordinator.run(id,{oneStep:true,prompt,signal:c.signal});
   if(!this.current(id,token,'running'))return this.detail(id);
   if(!['ready','awaiting_owner'].includes(result.status)||!result.state.lastStep)return this.pause(id,result.state.blocker||'No eligible authorized worker; no report sent');
   const step=result.state.lastStep,round=row.round+1,report=cleanReport('Goal: '+result.state.goal+'\nWorker report: '+step.report+'\nRecorded progress: '+result.state.completedSteps.join('; ')+'\nOpen issues: '+(result.state.openIssues.join('; ')||'None recorded')+'\nRecorded test items: '+result.state.testResults.length+'. The messenger did not execute tests.',this.team.coordinator.configuredSecrets());
   transaction(this.db,()=>{
    if(!this.current(id,token,'running'))throw new ApiError(409,'Loop was stopped');
    this.db.prepare('INSERT INTO messenger_rounds(job_id,round,step_id,role,agent,report,created_at) VALUES (?,?,?,?,?,?,?)').run(id,round,step.id,step.role,step.agent,report,now());
    this.db.prepare('UPDATE messenger_jobs SET round=?,updated_at=? WHERE job_id=?').run(round,now(),id);
    // Reserve delivery before HTTP. A crash/unknown result is never resent.
    this.db.prepare("UPDATE messenger_rounds SET report_state='sending' WHERE job_id=? AND round=?").run(id,round);this.event(id,'report_sending','Cleaned report saved; one webhook attempt reserved');
   });
   const next=result.status==='awaiting_owner'?'builder':phaseRole(result.state.phase);
   const sent=await this.team.webhook.sendStep({jobId:id,round,role:step.role,agent:step.agent,expectedNextRole:next,report},{signal:c.signal});
   this.db.prepare('UPDATE messenger_rounds SET report_state=?,sent_at=? WHERE job_id=? AND round=?').run(sent.status,sent.status==='delivered'?now():null,id,round);
   if(!this.current(id,token,'running'))return this.detail(id);
   if(sent.status!=='delivered')return this.pause(id,'Report delivery '+sent.status+'; no automatic retry. Reconcile before continuing.');
   this.event(id,'report_sent','Zapier accepted the cleaned report; this does not prove its AI/action steps completed');
   if(result.status==='awaiting_owner'||round>=row.max_rounds){this.db.prepare("UPDATE messenger_jobs SET status='finished',run_token=NULL,reason=?,updated_at=? WHERE job_id=?").run(result.status==='awaiting_owner'?'Worker rounds finished; application review and owner acceptance are still required':'Round limit reached; no next worker will start',now(),id);this.event(id,'finished','No further automatic dispatch');return this.detail(id);}
   this.db.prepare("UPDATE messenger_jobs SET status='waiting',deadline=?,updated_at=? WHERE job_id=? AND run_token=?").run(Date.now()+row.wait_ms,now(),id,token);this.event(id,'waiting','Waiting for the same job and completed round on the handoffs branch');this.schedule(id);return this.detail(id);
  }catch{if(this.get(id).status==='stopped')return this.detail(id);return this.pause(id,'Step or report could not finish safely. No automatic worker retry or paid fallback was made.');}
  finally{if(this.controllers.get(id)===c)this.controllers.delete(id);}
 }
 schedule(id){this.clearTimer(id);if(!this.autoPoll)return;const timer=setTimeout(async()=>{this.timers.delete(id);if(!this.db.isOpen)return;try{await this.poll(id);}catch{if(this.db.isOpen&&this.get(id).status==='waiting')this.pause(id,'GitHub read failed; owner action required');}},this.interval);timer.unref();this.timers.set(id,timer);}
 clearTimer(id){clearTimeout(this.timers.get(id));this.timers.delete(id);}
 async poll(id){
  if(this.polling.has(id))return this.detail(id);this.polling.add(id);this.clearTimer(id);const c=new AbortController();this.controllers.set(id,c);
  let accepted=null;
  try{
   const row=this.get(id);if(row.status!=='waiting')return this.detail(id);if(Date.now()>=row.deadline)return this.pause(id,'No matching prompt arrived before the waiting timeout');
   this.setup();const file=await this.reader.read(c.signal);
   if(!this.current(id,row.run_token,'waiting'))return this.detail(id);
   if(Date.now()>=row.deadline)return this.pause(id,'Prompt arrived after the waiting timeout; no worker started');
   const p=file.prompt,expected=phaseRole(this.team.coordinator.read(id).state.phase);
   if(file.missing){this.schedule(id);return this.detail(id);}
   if(p&&typeof p==='object'&&typeof p.jobId==='string'&&Number.isSafeInteger(p.round)&&(p.jobId!==id||p.round!==row.round)){this.event(id,'ignored','Ignored stale, future or unrelated job/round; no worker started');this.schedule(id);return this.detail(id);}
   if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='jobId,nextRole,prompt,round'||typeof p.jobId!=='string'||!Number.isSafeInteger(p.round)||typeof p.prompt!=='string'||p.prompt.trim().length<1||p.prompt.length>4000||!['builder','tester','reviewer'].includes(p.nextRole))return this.pause(id,'GitHub JSON does not match the approved four-field handoff format');
   if(p.jobId!==id||p.round!==row.round){this.event(id,'ignored','Ignored stale, future or unrelated job/round; no worker started');this.schedule(id);return this.detail(id);}
   if(p.nextRole!==expected)return this.pause(id,'Next role does not match the current job step; no worker started');
   this.team.safe(p);
   accepted=transaction(this.db,()=>{
    const live=this.get(id);if(live.status!=='waiting'||live.run_token!==row.run_token||live.round!==p.round||Date.now()>=live.deadline)throw new ApiError(409,'Prompt became stale');
    const old=this.db.prepare('SELECT * FROM messenger_rounds WHERE job_id=? AND round=?').get(id,p.round);if(old.prompt_json)return null;
    const token=randomUUID();this.db.prepare('UPDATE messenger_rounds SET prompt_json=?,prompt_sha=?,received_at=? WHERE job_id=? AND round=? AND prompt_json IS NULL').run(JSON.stringify(p),file.sha,now(),id,p.round);
    this.db.prepare("UPDATE messenger_jobs SET status='running',run_token=?,deadline=NULL,reason=NULL,updated_at=? WHERE job_id=?").run(token,now(),id);this.event(id,'prompt_received','Matching GitHub blob accepted once; its text grants no spending or acceptance permission');return {token,prompt:p.prompt};
   });
  }catch(error){if(this.get(id).status==='stopped')return this.detail(id);return this.pause(id,error instanceof ApiError?error.message:'GitHub handoff could not be read or safely accepted; no worker started');}
  finally{this.polling.delete(id);if(this.controllers.get(id)===c)this.controllers.delete(id);}
  return accepted?this.advance(id,accepted.token,accepted.prompt):this.detail(id);
 }
 stop(id){
  this.clearTimer(id);this.db.prepare("UPDATE messenger_jobs SET status='stopped',run_token=NULL,reason='Stopped by owner; no further worker or pickup will start',updated_at=? WHERE job_id=?").run(now(),id);this.get(id);this.controllers.get(id)?.abort();this.team.coordinator.cancel(id);this.event(id,'stopped','Owner stopped the loop. An already sent report cannot be recalled.');return this.detail(id);
 }
 resumeWaiting(id){
  this.setup();transaction(this.db,()=>{const row=this.get(id),last=this.db.prepare('SELECT * FROM messenger_rounds WHERE job_id=? AND round=?').get(id,row.round);
   if(row.status!=='paused'||row.round>=row.max_rounds||!row.deadline||Date.now()>=row.deadline||!last||last.report_state!=='delivered'||last.prompt_json||this.team.coordinator.read(id).status!=='ready')throw new ApiError(409,'Only an unexpired, delivered report can resume waiting; no worker or webhook is retried');
   if(this.db.prepare("SELECT 1 FROM messenger_jobs WHERE status IN ('running','waiting')").get())throw new ApiError(409,'Another loop owns the handoff mailbox');
   this.db.prepare("UPDATE messenger_jobs SET status='waiting',run_token=?,reason=NULL,updated_at=? WHERE job_id=?").run(randomUUID(),now(),id);this.event(id,'waiting_resumed','Resumed the original deadline without resending the report');});this.schedule(id);return this.detail(id);
 }
 close(){for(const id of this.timers.keys())this.clearTimer(id);for(const [id,c]of this.controllers){c.abort();if(this.db.isOpen)this.pause(id,'Backend shutting down; reconcile interrupted work before resuming');}this.controllers.clear();}
}
