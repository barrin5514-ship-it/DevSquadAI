import {keyFingerprint} from './provider-verification.js';
import {conversationContext} from './studio-conversations.js';
import {nemotronId,nemotronModel,studioWorkerIds} from './nemotron-worker.js';
import fs from 'node:fs';import {ApiError} from '../middleware/errors.js';import {transaction} from '../middleware/ai-validation.js';import {hashText} from './project-files.js';
const roles=['builder','tester','reviewer'],workers=studioWorkerIds;
// Optional owner permission for one bounded demonstration. Ordinary jobs retain
// their existing behavior. Attempts are counted from durable execution records.
export class StudioRunScope {
 constructor(studio){this.s=studio;this.db=studio.db;}
 databaseHash(){return hashText(fs.realpathSync(this.s.team.config.database));}
 fail(message,code='run_scope_limit'){throw Object.assign(new ApiError(409,message),{code,stopped:true});}
 inputHash(j){return hashText(JSON.stringify({goal:j.state.goal,context:conversationContext(this.s,j.id),problems:j.state.problems,...(j.state.mediaInput?{mediaInput:j.state.mediaInput}:{})}));}
 termsHash(terms){
  const {settings,policy}=this.s.team.paid,c=this.s.team.config;
  return hashText(JSON.stringify({paid:terms.paid,free:terms.free,maxCalls:terms.maxCalls,perRole:terms.perRole,timeoutMs:terms.timeoutMs,maxOutputBytes:terms.maxOutputBytes,limits:c.studioTimeouts,...(terms.reviewOnly?{reviewOnly:true}:{}),...(terms.savedTestsOnly?{savedTestsOnly:true}:{}),...(terms.free?{freeKey:keyFingerprint(c.ai.providers.find(p=>p.id==='openrouter')?.key)}:{}),...(terms.paid?{model:settings.model,base:settings.base,key:keyFingerprint(settings.key),prices:[settings.inputPrice,settings.outputPrice],budgets:[policy.requestLimit,policy.dailyLimit,policy.totalLimit]}:{})}));
 }
 preview(id){
  const s=this.s,j=s.get(id),root=s.root(j.project_id),project=s.team.store.project(j.project_id),roles=j.state.roles,agents=Object.values(roles),settings=s.team.paid.settings;
  const paid=agents.includes('deepseek')?{model:settings.model,maxOutput:8192,inputBytes:24000}:null;
  const free=agents.includes(nemotronId)?{model:nemotronModel,maxOutput:2048,timeoutMs:60000}:null;
  const maxCalls=3,perRole=1,timeoutMs=300000,maxOutputBytes=65536;
  const issues=[];
  if(j.status!=='ready'||j.state.executionMode==='builder-only'||j.state.runApproval||s.executions.list(id).length||!j.state.goal.trim())issues.push('Choose an unused team session with a saved task.');
  if(s.failover.policy(j).enabled||j.state.pendingRoles)issues.push('Save the intended team and turn automatic fallback off.');
  try{s.roleManager.validate(roles,j.state.authors);s.service.verify(project.id,root.root);s.projectsManager?.assertWrite(project.id);}catch(e){issues.push(e.message);}
  const estimate=paid&&[settings.inputPrice,settings.outputPrice].every(Number.isFinite)?Math.ceil((paid.inputBytes+4096)*settings.inputPrice+paid.maxOutput*settings.outputPrice)/1e6:null;
  if(paid){
   // Budget, price-freshness and balance are display-only. They never block
   // proposal or Send; the provider may still reject its own account/billing.
   if(settings.model!=='deepseek-flash'||s.team.config.studioTimeouts.deepseek!==90000)issues.push('DeepSeek must use deepseek-flash and a 90-second timeout for this proposal.');
  }
  if(free){const access=s.workers.nemotron?.status();if(!access?.ok)issues.push(access?.reason||'Fresh Nemotron free account access is required.');}
  if(root.snapshot(24000).truncated||conversationContext(s,id).truncated)issues.push('The approved execution inputs exceed the worker context limit.');
  const proposal={projectId:project.id,sessionId:id,project:project.name,session:j.title,version:j.version,roles,rootHash:hashText(root.root),checkpointHash:root.fingerprint(),inputHash:this.inputHash(j),termsHash:this.termsHash({paid,free,maxCalls,perRole,timeoutMs,maxOutputBytes}),paid,free,maxCalls,perRole,timeoutMs,maxOutputBytes,deepseekTimeoutMs:s.team.config.studioTimeouts.deepseek,estimateUSD:estimate,allowance:'UNKNOWN — owner confirmation required',needsIncludedConfirmation:agents.some(a=>a.startsWith('codex-')||a==='claude-code'),issues};
  return {...proposal,proposalHash:hashText(JSON.stringify([proposal.projectId,id,proposal.rootHash,proposal.checkpointHash,proposal.inputHash,proposal.termsHash,roles]))};
 }
 // A normal Send binds the displayed configuration before any message or worker is saved.
 sendProposal(id,omitPath){
  const s=this.s,j=s.get(id),repo=s.root(j.project_id),project=s.team.store.project(j.project_id);
  const policy=s.failover.policy(j),agents=new Set([...Object.values(j.state.roles),...(policy.enabled?policy.allowedWorkers:[])]);
  const settings=s.team.paid.settings;
  const paid=agents.has('deepseek')?{model:settings.model,maxOutput:8192,inputBytes:24000}:null;
  const free=agents.has(nemotronId)?{model:nemotronModel,maxOutput:2048,timeoutMs:60000}:null;
  const limits={paid,free,maxCalls:3*agents.size,perRole:1,timeoutMs:300000,maxOutputBytes:65536};
  const issues=[];
  if(j.status!=='ready'||j.state.executionMode==='builder-only'||j.state.runApproval||j.state.pendingRoles||s.executions.list(id).filter(e=>e.request_id===j.request_id).length)issues.push('Choose an unused team session with saved assignments.');
  if(!s.failover.scoped(j,policy)&&policy.enabled)issues.push('The saved fallback permission no longer matches this project.');
  try{s.roleManager.validate(j.state.roles,j.state.authors);s.service.verify(project.id,repo.root);s.projectsManager?.assertWrite(project.id);}catch(e){issues.push(e.message);}
  if(repo.snapshot(24000).truncated||conversationContext(s,id).truncated)issues.push('The saved project context exceeds the worker input limit.');
  const proposal={projectId:project.id,sessionId:id,project:project.name,task:j.state.goal,version:j.version,roles:j.state.roles,policy,limits,issues,rootHash:hashText(repo.root),checkpointHash:repo.fingerprint(omitPath)};
  return {...proposal,hash:hashText(JSON.stringify([proposal,this.inputHash(j),this.termsHash(limits)]))};
 }
 authorizeSend(j,proposal,requestId){
  if(!j.state.goal.trim())this.fail('Describe the task before Send.');
  if(this.s.root(j.project_id).fingerprint()!==proposal.checkpointHash||conversationContext(this.s,j.id).truncated)this.fail('The workspace or task inputs changed or exceed the worker input limit.');
  const start=Date.now();
  return {...proposal.limits,projectId:j.project_id,chatId:j.id,databaseHash:this.databaseHash(),mode:'team-send',roles:proposal.roles,fallbackHash:hashText(JSON.stringify(proposal.policy)),rootHash:proposal.rootHash,checkpointHash:proposal.checkpointHash,inputHash:this.inputHash(j),termsHash:this.termsHash(proposal.limits),goalHash:hashText(j.state.goal),requestId,approvedAt:new Date(start).toISOString(),expiresAt:new Date(start+1800000).toISOString()};
 }
 authorizeCorrection(j,{requestId,checkpointHash}){const old=j.state.runApproval;if(!old||old.mode!=='team-send'||old.reviewOnly)this.fail('Only a normal authorized team run can take a bounded correction turn.');const proposal={roles:{...j.state.roles},policy:this.s.failover.policy(j),limits:{paid:old.paid||null,free:old.free||null,maxCalls:3,perRole:1,timeoutMs:300000,maxOutputBytes:65536},checkpointHash,rootHash:hashText(this.s.root(j.project_id).root)};return this.authorizeSend(j,proposal,requestId);}
 authorizedRoles(j,p){
  if(p.mode!=='team-send')return p.roles;
  const last=this.db.prepare("SELECT content FROM studio_events WHERE chat_id=? AND kind='worker_handoff' AND json_extract(content,'$.handoffRequestId')=? ORDER BY id DESC LIMIT 1").get(j.id,p.requestId);
  return last?JSON.parse(last.content).roles:p.roles;
 }
 // Choosing a mode saves intent only. Approval is a separate owner action.
 select(id,b){return transaction(this.db,()=>{this.s.team.fields(b,['version','mode','builder'],['version','mode']);const j=this.s.get(id);if(j.version!==b.version||j.status!=='ready'||j.state.runApproval||this.s.executions.list(id).length)this.fail('Choose a mode only for an unused ready session.');if(!['team','builder-only'].includes(b.mode))this.fail('Choose a supported execution mode.');if(b.mode==='builder-only'&&!['codex-personal','codex-school'].includes(b.builder))this.fail('Builder-only mode requires a dedicated Codex profile.');return this.s.change(id,'ready',{executionMode:b.mode,builderOnlyAgent:b.mode==='builder-only'?b.builder:null},'execution_mode_saved','owner');});}
 assertAvailable(j){if(Object.values(j.state.roles).includes(nemotronId)&&!j.state.runApproval)this.fail('Nemotron needs separate bounded owner approval before Send.');if(j.state.executionMode!=='builder-only')return;if(!j.state.runApproval)this.fail('Builder-only mode needs separate owner approval before Send.');if(this.s.executions.list(j.id).length)this.fail('The one Builder invocation was consumed. Saved work remains paused; this approval cannot be reused.');}
 arm(id,b,{requireProposal=false}={}){return transaction(this.db,()=>{this.s.team.fields(b,['version','approvedBy','projectId','rootHash','roles','approvedAt','expiresAt','requestId','paid','free','proposalHash','confirmIncluded'],['version','approvedBy','projectId','rootHash','roles','approvedAt','expiresAt','requestId']);const j=this.s.get(id),single=j.state.executionMode==='builder-only',boundRoles=single?{builder:j.state.builderOnlyAgent}:j.state.roles,start=Date.parse(b.approvedAt),end=Date.parse(b.expiresAt);
  if(requireProposal&&!single&&typeof b.proposalHash!=='string')this.fail('Review the current bounded team proposal first.');
  if(b.approvedBy!=='owner'||b.version!==j.version||j.project_id!==b.projectId||j.status!=='ready'||j.state.runApproval||this.s.executions.list(id).length)this.fail('This approval requires the unchanged, unused ready session.');
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>Date.now()+1000||end<=Date.now()||end-start!==1800000||typeof b.requestId!=='string'||!/^[-a-zA-Z0-9]{1,100}$/.test(b.requestId))this.fail('Approval time or one-run request identity is invalid.','run_scope_expired');
  if(b.rootHash!==hashText(this.s.root(j.project_id).root)||(single?Object.keys(b.roles||{}).length!==1||b.roles?.builder!==boundRoles.builder||!['codex-personal','codex-school'].includes(boundRoles.builder):roles.some(r=>b.roles?.[r]!==boundRoles[r]||!workers.includes(b.roles[r])))||(!single&&this.s.failover.policy(j).enabled))this.fail('Approval must match this folder and saved native roles, with fallback off.');
  if(!single)this.s.roleManager.validate(b.roles,j.state.authors);const usesPaid=!single&&Object.values(b.roles).includes('deepseek');if(usesPaid){const p=b.paid,settings=this.s.team.paid.settings;this.s.team.fields(p||{},['model','maxOutput','inputBytes'],['model','maxOutput','inputBytes']);if(!p||p.model!==settings.model||!Number.isInteger(p.maxOutput)||p.maxOutput<32||p.maxOutput>8192||!Number.isInteger(p.inputBytes)||p.inputBytes<1024||p.inputBytes>24000)this.fail('Approve the exact paid model and bounded task-only input and output terms.');}else if(b.paid)this.fail('Paid terms require a DeepSeek role in this team.');const usesFree=Object.values(b.roles).includes(nemotronId);if(usesFree){this.s.team.fields(b.free||{},['model','maxOutput','timeoutMs']);if(b.free.model!==nemotronModel||b.free.maxOutput!==2048||b.free.timeoutMs!==60000)this.fail('Approve the exact free model, 2048 output tokens and 60-second limit.');}else if(b.free)this.fail('Free terms require the Nemotron worker.');const checkpointHash=single?null:this.s.root(j.project_id).fingerprint();if(b.proposalHash!==undefined){const v=this.preview(id);if(v.issues.length||v.proposalHash!==b.proposalHash||JSON.stringify(v.paid)!==JSON.stringify(b.paid??null)||JSON.stringify(v.free)!==JSON.stringify(b.free??null)||v.needsIncludedConfirmation&&b.confirmIncluded!==true)this.fail(v.issues[0]||'The proposal changed or included usage was not confirmed.');}const scope={projectId:j.project_id,chatId:id,rootHash:b.rootHash,databaseHash:this.databaseHash(),mode:single?'builder-only':'team',roles:{...b.roles},goalHash:hashText(j.state.goal),approvedAt:b.approvedAt,expiresAt:b.expiresAt,requestId:b.requestId,maxCalls:single?1:3,perRole:1,timeoutMs:300000,maxOutputBytes:65536,...(usesPaid?{paid:{model:b.paid.model,maxOutput:b.paid.maxOutput,inputBytes:b.paid.inputBytes}}:{}),...(usesFree?{free:{...b.free}}:{})};if(!single)Object.assign(scope,{checkpointHash,inputHash:this.inputHash(j),termsHash:this.termsHash(scope),...(b.proposalHash?{proposalHash:b.proposalHash,includedConfirmed:b.confirmIncluded===true}:{})});return this.s.change(id,j.status,{runApproval:scope},'run_approval_saved','owner');
 });}
 check(j,requestId){const p=j.state.runApproval;if(!p){if(Object.values(j.state.roles).includes(nemotronId))this.fail('Nemotron requires separate bounded task approval.');if(j.state.executionMode==='builder-only')this.fail('Builder-only mode needs separate owner approval before Send.');return null;}if(!Number.isFinite(Date.parse(p.expiresAt))||Date.parse(p.expiresAt)<=Date.now())this.fail('The live-run approval expired; no new agent was dispatched.','run_scope_expired');if(p.projectId!==j.project_id||p.chatId!==j.id||p.databaseHash!==this.databaseHash()||p.rootHash!==hashText(this.s.root(j.project_id).root)||p.goalHash!==hashText(j.state.goal)||p.requestId!==requestId||(p.mode==='builder-only'?j.state.executionMode!=='builder-only'||p.roles.builder!==j.state.builderOnlyAgent:roles.some(r=>this.authorizedRoles(j,p)[r]!==j.state.roles[r]))||(p.mode==='team-send'?p.fallbackHash!==hashText(JSON.stringify(this.s.failover.policy(j))):this.s.failover.policy(j).enabled))this.fail('The approved task, database, folder, request or assignments changed. No agent was dispatched.');if(p.checkpointHash){const expected=j.state.phase==='builder'?p.checkpointHash:j.state.teamCheckpointHash;if(!expected||this.s.root(j.project_id).fingerprint()!==expected||this.inputHash(j)!==p.inputHash||this.termsHash(p)!==p.termsHash)this.fail('The approved files, inputs or limits changed. No agent was dispatched.');}return p;}
 reserve(j,agent,phase,root,checkpoint){return transaction(this.db,()=>{j=this.s.get(j.id);const p=this.check(j,j.request_id);if(p){if(p.reviewOnly&&(phase!=='reviewer'||agent!==p.roles.reviewer))this.fail('This continuation authorizes only its assigned Reviewer; Builder, Tester and fallback are not authorized.');const calls=this.db.prepare("SELECT phase,agent,status FROM studio_executions WHERE chat_id=? AND request_id=? AND agent!='application-tests'").all(j.id,p.requestId);if(j.status!=='running'||hashText(root)!==p.rootHash||!(p.mode==='builder-only'?['builder']:roles).includes(phase)||agent!==this.authorizedRoles(j,p)[phase]||!workers.includes(agent)||calls.length>=p.maxCalls||calls.some(c=>c.phase===phase&&(p.mode!=='team-send'||c.agent===agent||c.status!=='failed')))this.fail('This run has no remaining authorization for another '+phase+' call. Saved work, test failures and review findings are preserved; no extra agent was dispatched.');}return this.s.executions.create(j,agent,phase,root,checkpoint);});}
}
