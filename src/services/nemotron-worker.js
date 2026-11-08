import fs from 'node:fs';
import {ProviderAdapter} from '../providers/adapter.js';
import {modelHealth,recordHealth} from './provider-health.js';
import {hashText} from './project-files.js';

export const nemotronId='nemotron';
export const nemotronModel='nvidia/nemotron-3.5-super-vl:free';
export const studioWorkerIds=['deepseek','codex-personal','codex-school','claude-code',nemotronId];
const schema=JSON.parse(fs.readFileSync(new URL('./studio-worker.schema.json',import.meta.url),'utf8'));
const failure=(code,message,extra={})=>Object.assign(Error(message),{code,stopped:true,...extra});
const zero=m=>m?.pricing&&m.pricing.prompt!==undefined&&m.pricing.completion!==undefined&&Object.values(m.pricing).every(v=>['number','string'].includes(typeof v)&&String(v).trim()!==''&&Number(v)===0);

// The API broker sees only the already guarded packet, never a repository or
// shell. Returned files still pass through the existing ProjectFiles checks.
export class NemotronWorker {
 constructor(team){this.team=team;}
 settings(){return {...this.team.config.ai.providers.find(p=>p.id==='openrouter'),model:nemotronModel};}
 status(){const p=this.settings(),access=modelHealth(this.team.config,p,nemotronModel)?.workerAccess;
  const age=Date.now()-Date.parse(access?.checkedAt);
  const fresh=Number.isFinite(age)&&age>=0&&age<=300000;
  return {configured:!!p.key&&p.free,ok:!!p.key&&p.free&&fresh&&access?.available===true,model:nemotronModel,checkedAt:access?.checkedAt||null,reason:!p.key?'OpenRouter key missing.':!p.free?'Free access confirmation missing.':!fresh?'Fresh free-route/account check required.':access?.reason||'Catalog access only; live role performance remains unverified.',access:access||null};
 }
 async refresh(signal){const p=this.settings(),checkedAt=new Date().toISOString();
  const save=access=>{recordHealth(this.team.config,p,nemotronModel,{workerAccess:{checkedAt,...access},catalogObservation:{checkedAt,httpStatus:access.available?200:null}});return this.status();};
  if(!p.key||!p.free||p.base!=='https://openrouter.ai/api/v1')return save({available:false,reason:'Saved official OpenRouter/free configuration is missing.'});
  const adapter=new ProviderAdapter(p,{fetchImpl:this.team.fetch,timeout:15000});
  const original=adapter.fetch;adapter.fetch=(u,o)=>original(u,{...o,signal:signal?AbortSignal.any([o.signal,signal]):o.signal});
  try{
   const catalog=await adapter.request(p.base+'/models'),accountModels=await adapter.request(p.base+'/models/user'),key=await adapter.request(p.base+'/key');
   const a=catalog.data?.find(m=>m.id===nemotronModel),b=accountModels.data?.find(m=>m.id===nemotronModel),q=key.data?.free_model_daily_requests;
   const quota=q&&['used','limit','remaining'].every(k=>Number.isSafeInteger(q[k])&&q[k]>=0)?q:null;
   const available=!!(zero(a)&&zero(b)&&key.data?.is_free_tier===true&&quota?.remaining>0&&b.top_provider?.max_completion_tokens>=2048&&b.reasoning?.mandatory===false&&['max_tokens','reasoning','response_format','structured_outputs'].every(k=>b.supported_parameters?.includes(k)));
   recordHealth(this.team.config,p,nemotronModel,{allowanceObservation:quota?{kind:'allowance',used:quota.used,limit:quota.limit,unit:'free requests/day',source:'Official OpenRouter key response',status:'VERIFIED',updatedAt:checkedAt}:null});
   return save({available,model:nemotronModel,zeroPrice:!!(zero(a)&&zero(b)),quota,reason:available?'Free route/account verified; generation and role evidence are separate.':'Exact free model, account quota, optional reasoning or required parameters are unavailable.'});
  }catch(e){return save({available:false,reason:e.httpStatus?'Free-route/account check failed: HTTP '+e.httpStatus+'.':'Free-route/account check could not complete. No generation sent.'});}
 }
 // This check is repeated after preflight: a quote never grants permission.
 assertAuthorized(packet,root,execution){const s=this.team.studio,j=s.get(execution.chatId),scope=s.runScope.check(j,j.request_id),e=s.executions.get(execution.executionId),terms=scope?.free;
  if(!scope||!terms||terms.model!==nemotronModel||terms.maxOutput!==2048||terms.timeoutMs!==60000||s.runScope.authorizedRoles(j,scope)[packet.phase]!==nemotronId||j.project_id!==packet.projectId||j.id!==packet.chatId||j.state.phase!==packet.phase||e.chat_id!==j.id||e.agent!==nemotronId||e.phase!==packet.phase||e.status!=='starting'||e.request_id!==j.request_id||e.checkpoint_hash!==s.root(j.project_id).fingerprint()||hashText(root)!==scope.rootHash||j.status!=='running')throw failure('run_scope_limit','Nemotron requires the exact bounded task, role, folder, model and unused execution approval.');
  const repo=s.root(j.project_id);if(packet.goal!==j.state.goal||['builder','tester','reviewer'].some(role=>packet.actualRoles?.[role]!==s.runScope.authorizedRoles(j,scope)[role])||JSON.stringify(packet.files)!==JSON.stringify(repo.snapshot(24000).files))throw failure('run_scope_limit','Packet requirements, assignments or guarded files changed.');
  if(packet.phase==='reviewer'&&(packet.reviewBinding?.draftId!==j.id+':'+repo.fingerprint()||packet.reviewBinding?.artifactHash!==repo.fingerprint()||packet.reviewBinding?.testEvidenceHash!==hashText(JSON.stringify(j.state.tests))||packet.reviewBinding?.reviewerExecutedTests!==false))throw failure('run_scope_limit','Review packet is not bound to the current saved artifacts and evidence.');
  return scope;
 }
 async call(packet,root,signal,execution,instructions){
  if(signal.aborted)throw failure('owner_stop','Stopped before any provider check.',{ownerStop:true});
  let scope=this.assertAuthorized(packet,root,execution);
  // A long Builder/Tester turn may outlive the catalog lease. Refresh only
  // while this exact task is authorized, then recheck scope after that await.
  const age=Date.now()-Date.parse(this.status().checkedAt);
  if(!Number.isFinite(age)||age>300000)await this.refresh(signal);
  scope=this.assertAuthorized(packet,root,execution);
  if(!this.status().ok)throw failure('provider_unavailable',this.status().reason);
  if(signal.aborted)throw failure('owner_stop','Stopped before the API request.',{ownerStop:true});
  const p=this.settings(),deadline=AbortSignal.timeout(Math.max(1,Date.parse(scope.expiresAt)-Date.now()));
  const adapter=new ProviderAdapter(p,{fetchImpl:(u,o)=>this.team.fetch(u,{...o,signal:AbortSignal.any([o.signal,signal,deadline])}),timeout:60000,tokenLimit:2048});
  let activity=0;adapter.onResponseActivity=()=>{if(Date.now()-activity>1000){activity=Date.now();execution.onEvent?.({lastActivityAt:new Date().toISOString(),progress:'API response bytes received; waiting for validated final output.'});}};
  const body={model:nemotronModel,messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(packet)}],stream:false,max_tokens:2048,reasoning:{enabled:false},response_format:{type:'json_schema',json_schema:{name:'studioWorker',strict:true,schema}},provider:{allow_fallbacks:false,require_parameters:true,max_price:{prompt:0,completion:0,request:0}}};
  let result,data,posted=false;
  try{
   // Synchronous durable start prevents another concurrent call reusing this
   // execution. Unknown outcomes never replenish the execution's one-call slot.
   execution.usage.start(execution.chatId,execution.executionId,nemotronModel);posted=true;
   execution.onEvent?.({status:'waiting',timeoutMs:60000,progress:'Sending one free Nemotron request. No retry or fallback.'});
   data=await adapter.request(p.base+'/chat/completions',body);
   const mismatch=data?.model!==nemotronModel;
   if(mismatch)execution.onEvent?.({modelDiscrepancy:{expected:nemotronModel,reported:typeof data?.model==='string'&&/^[\w/.: -]{1,200}$/.test(data.model)?data.model:'Unrecognized'}});
   try{result=adapter.parseGeneration(data);}catch(e){if(mismatch)e.code='model_mismatch';throw e;}
   if(mismatch)throw failure('model_mismatch','OpenRouter reported a different model; response rejected.',{usage:result.usage});
   if(typeof data.usage?.cost==='number'&&data.usage.cost!==0)throw failure('paid_response','Free endpoint reported a nonzero cost; stopped.',{usage:result.usage});
   const value=JSON.parse(result.text);
   if(!validWorkerResponse(value,packet))throw failure('invalid_response','Nemotron returned an invalid role-specific result.',{usage:result.usage});
   this.team.safe(value);execution.usage.record(execution.chatId,execution.executionId,nemotronModel,result.usage,'response_received',data.usage?.cost);
   recordHealth(this.team.config,p,nemotronModel,{capabilityProbe:{checkedAt:new Date().toISOString(),httpStatus:result.diagnostics.httpStatus,complete:true,source:'Bounded project worker response',phase:packet.phase}});
   return {...value,usage:result.usage,model:data.model,httpStatus:result.diagnostics.httpStatus};
  }catch(e){
   if(posted)execution.usage.record(execution.chatId,execution.executionId,nemotronModel,e.usage||result?.usage||null,e.usage||result?.usage?'incomplete':'unknown',data?.usage?.cost);
   if(['model_mismatch','paid_response'].includes(e.code))recordHealth(this.team.config,p,nemotronModel,{workerAccess:{checkedAt:new Date().toISOString(),available:false,reason:e.message}});
   e.ownerStop=signal.aborted;e.code=signal.aborted?'owner_stop':deadline.aborted?'run_scope_expired':e.httpStatus===401?'auth_expired':e.httpStatus===402?'payment_required':e.httpStatus===429?'rate_limit':e.httpStatus>=500?'provider_outage':e.code||'invalid_response';e.stopped=true;e.unknownOutcome=posted&&!e.usage&&!result?.usage&&!(e.httpStatus>=400&&e.httpStatus<500);throw e;
  }
 }
}

export function validWorkerResponse(v,packet){
 if(!v||Object.keys(v).sort().join(',')!=='files,report,review'||typeof v.report!=='string'||!v.report.trim()||v.report.length>6000||!Array.isArray(v.files)||v.files.length>40||!v.files.every(f=>f&&Object.keys(f).sort().join(',')==='content,path'&&typeof f.path==='string'&&typeof f.content==='string'))return false;
 if(packet.phase!=='reviewer')return v.review===null;
 const b=packet.reviewBinding,r=v.review;
 return v.files.length===0&&r&&Object.keys(r).sort().join(',')==='artifactHash,decision,draftId,findings,reviewerExecutedTests,summary,testEvidenceHash'&&['draftId','artifactHash','testEvidenceHash'].every(k=>r[k]===b?.[k])&&r.reviewerExecutedTests===false&&['approved','changes_requested'].includes(r.decision)&&typeof r.summary==='string'&&!!r.summary.trim()&&Array.isArray(r.findings)&&r.findings.every(f=>typeof f==='string');
}
