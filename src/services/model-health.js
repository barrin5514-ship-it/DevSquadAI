import {nemotronId,nemotronModel} from './nemotron-worker.js';
import {modelHealth} from './provider-health.js';

// These percentages describe one known allowance, never a mix of tokens, money
// and subscription messages. Missing or old evidence stays unknown.
export function usageWarning(metric, thresholds=[70,85,95], now=Date.now(), maxAge=300000) {
 if (!metric || metric.kind!=='allowance' || !['VERIFIED','ESTIMATED'].includes(metric.status) || !Number.isFinite(metric.used) || !Number.isFinite(metric.limit) || metric.used<0 || metric.limit<=0 || !metric.unit) return {status:'UNKNOWN',percent:null};
 const age=now-Date.parse(metric.updatedAt);
 if(!Number.isFinite(age)||age<0||age>maxAge)return {status:'STALE',percent:null};
 const percent=100*metric.used/metric.limit;
 return {status:percent>=100?'UNAVAILABLE':percent>=thresholds[2]?'CRITICAL':percent>=thresholds[1]?'WARNING':percent>=thresholds[0]?'NOTICE':'AVAILABLE',percent,unit:metric.unit,confidence:metric.status};
}
export function measurement(value, source, updatedAt, now=Date.now(), maxAge=300000, estimated=false) {
 if(value===null||value===undefined||!Number.isFinite(value)||value<0)return {value:null,source,updatedAt:updatedAt||null,status:'UNKNOWN'};
 const age=now-Date.parse(updatedAt);
 return {value,source,updatedAt:updatedAt||null,status:!Number.isFinite(age)||age<0||age>maxAge?'STALE':estimated?'ESTIMATED':'VERIFIED'};
}
export function healthState({configured,probe=null,failure=null,allowance=null},now=Date.now(),maxAge=300000) {
 if(!configured)return 'UNAVAILABLE';
 const fresh=v=>v&&Number.isFinite(Date.parse(v.checkedAt))&&now-Date.parse(v.checkedAt)>=0&&now-Date.parse(v.checkedAt)<=maxAge;
 if(fresh(failure)){
  if(failure.code==='rate_limit'&&Date.parse(failure.retryAt)>now)return 'RATE LIMITED';
  if(['quota_exhausted','subscription_exhausted'].includes(failure.code))return 'QUOTA EXHAUSTED';
  if(['auth_expired','authentication_failed'].includes(failure.code))return 'UNAVAILABLE';
 }
 if(fresh(probe)&&probe.complete===false&&!probe.localDiagnosticError)return 'LIMITED';
 const warning=usageWarning(allowance,[70,85,95],now,maxAge);
 if(warning.status==='UNAVAILABLE')return 'QUOTA EXHAUSTED';
 if(fresh(probe)&&probe.complete===true&&warning.percent!==null&&allowance.status==='VERIFIED')return 'AVAILABLE';
 return 'UNKNOWN';
}

// This endpoint reads existing local evidence only. It never asks a provider for
// its quota and never authorizes or starts a worker.
export function modelHealthSnapshot(team,now=Date.now(),chatId=null) {
 const job=chatId?team.studio.get(chatId):null,policy=job?team.studio.failover.policy(job):null;
 const maxAge=team.config.modelHealth?.maxAge||300000,thresholds=team.config.modelHealth?.thresholds||[70,85,95];
 const events=team.db.prepare("SELECT agent,kind,content,created_at FROM studio_events WHERE kind IN ('worker_report','api_usage','error') ORDER BY id DESC LIMIT 2000").all();
 const registered=team.studio.roleManager.workers(),hub=team.hubConnections.status(),balance=team.db.prepare('SELECT available_usd,checked_at FROM deepseek_balance_observation WHERE id=1').get();
 const ids=['codex-personal','codex-school','claude-code','deepseek',nemotronId,'gemini','mistral'];
 const rows=ids.map(id=>{
  const api=id===nemotronId?{...team.config.ai.providers.find(p=>p.id==='openrouter'),model:nemotronModel}:team.config.ai.providers.find(p=>p.id===id),native=id.startsWith('codex-')||id==='claude-code';
  const configured=native?id.startsWith('codex-')?team.studio.workers.profiles?.configured(id)===true:hub.claudeInstalled:!!api?.key;
  const cached=api?modelHealth(team.config,api,api.model):null,probe=cached?.capabilityProbe||null;
  const relevant=events.filter(e=>e.agent===id),latest=relevant.find(e=>e.kind==='worker_report'||e.kind==='api_usage');
  const content=latest?JSON.parse(latest.content):null,u=content?.usage||content;
  const input=u?.input??u?.input_tokens??null,output=u?.output??u?.output_tokens??null;
  const recentError=relevant.find(e=>e.kind==='error'),error=recentError?JSON.parse(recentError.content).failure:null;
  const failure=error?{code:error.code,checkedAt:recentError.created_at,retryAt:error.retryAt||null}:null;
  const paired=content?.executionId?relevant.find(e=>e.kind==='api_usage'&&JSON.parse(e.content).executionId===content.executionId):null;const cost=content?.estimatedCostUSD??(paired?JSON.parse(paired.content).estimatedCostUSD:null);const allowance=cached?.allowanceObservation||null,status=healthState({configured,probe,failure,allowance},now,maxAge);const known=usageWarning(allowance,thresholds,now,maxAge),remaining=known.percent===null?null:Math.max(0,allowance.limit-allowance.used);
  const worker=registered.find(w=>w.id===id);
  return {id,provider:id==='codex-personal'?'Codex Personal':id==='codex-school'?'Codex School':id==='claude-code'?'Claude Code':({nemotron:'NVIDIA Nemotron',deepseek:'DeepSeek',gemini:'Gemini',mistral:'Mistral'}[id]||id),model:native?'Native default — exact model not reported':api?.model||'Model not configured',status,configured,
   connection:cached?.catalogObservation?{status:now-Date.parse(cached.catalogObservation.checkedAt)>maxAge?'STALE catalog evidence':cached.catalogObservation.httpStatus===200?'Catalog authenticated only':'Catalog failed',checkedAt:cached.catalogObservation.checkedAt}: {status:'Not checked now',checkedAt:null},
   inputTokens:{...measurement(input,'Last recorded provider token usage',latest?.created_at,now,maxAge),metricType:'MODEL_INPUT_TOKENS'},outputTokens:{...measurement(output,'Last recorded provider token usage',latest?.created_at,now,maxAge),metricType:'MODEL_OUTPUT_TOKENS'},
   estimatedCostUSD:{...measurement(cost,'Configured-rate estimate, not an invoice',latest?.created_at,now,maxAge,true),metricType:'ESTIMATED_COST_USD'},
   balanceUSD:measurement(id==='deepseek'?balance?.available_usd:null,'Cached official balance observation; no refresh request',id==='deepseek'?balance?.checked_at:null,now,maxAge),
   remainingAllowance:{...measurement(remaining,allowance?.source||'No supported current allowance observation',allowance?.updatedAt,now,maxAge,true),metricType:'ACCOUNT_ALLOWANCE_REMAINING',unit:allowance?.unit||null},warning:known,rateReset:failure?.code==='rate_limit'?failure.retryAt:null,
   lastChecked:probe?.checkedAt||cached?.catalogObservation?.checkedAt||null,probe:probe?{httpStatus:probe.httpStatus,complete:probe.complete,checkedAt:probe.checkedAt,verdict:probe.localDiagnosticError?'INCONCLUSIVE — local diagnostic request was malformed; generation remains unverified':null}:null,
   workerEligibility:id===nemotronId?'Bounded API contracts: local integration tests; live role performance NOT VERIFIED; owner scope required.':worker?'Supported transport; availability and role qualification must be checked':'Not integrated; no worker role eligible',roles:worker?['builder','tester','reviewer']:[],
   fallbackAvailable:job?!!(id!==nemotronId&&worker&&policy?.enabled&&policy.allowedWorkers?.includes(id)&&!job.state.runApproval&&status==='AVAILABLE'):null,fallbackReason:!job?'Select a task to inspect its fallback policy.':!policy?.enabled?'Task fallback is disabled.':job.state.runApproval?'Bounded run forbids fallback.':'Policy, verified role capability, current availability and spending must all pass.',quality:'UNKNOWN — no automatic quality score inferred from configuration'};
 });
 return {checkedAt:new Date(now).toISOString(),source:'Local cached evidence only; no provider requests',maxAgeMs:maxAge,thresholds,rows};
}
