import {verifyDemoPrices} from './demo-approval.js';
import {keyFingerprint} from './provider-verification.js';
import {helloHeld} from './paid-hello.js';
import {checkDeepSeek} from './deepseek-connection.js';
import {savedVerification,saveVerification} from './provider-verification.js';
import {randomUUID,createHash} from 'node:crypto';
import {ProviderAdapter} from '../providers/adapter.js';
import {ApiError} from '../middleware/errors.js';
import {transaction} from '../middleware/ai-validation.js';
import {ScopedPaidReview} from './scoped-paid-review.js';
const now=()=>new Date().toISOString();
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

// Prepared prepaid path, deliberately excluded from all free routing and retries.
export class DeepSeekService {
 constructor(team,scopeFile){this.team=team;this.db=team.db;this.settings=team.config.ai.providers.find(p=>p.id==='deepseek');this.policy=team.config.ai.paid;this.scope=scopeFile?new ScopedPaidReview(this,scopeFile):null;}
 async inspect(body){this.team.fields(body,['approvedBy','confirmReadOnly']);if(body.approvedBy!=='owner'||body.confirmReadOnly!==true)throw new ApiError(403,'Explicit owner authorization for read-only account checks is required');if(!this.settings.key)throw new ApiError(400,'Configure the DeepSeek key locally first');const result=await checkDeepSeek(this.settings,this.team.fetch,Math.min(this.team.config.timeout,15000));this.team.safe(result);saveVerification(this.team.config,this.settings,result);return this.status();}
 status(){const observed=savedVerification(this.team.config,this.settings);const last=this.db.prepare("SELECT created_at FROM usage_events WHERE provider_id='deepseek' AND outcome='validated' ORDER BY rowid DESC LIMIT 1").get();return {verification:observed?{checkedAt:observed.checkedAt,httpStatus:observed.httpStatus,balanceStatus:observed.balanceStatus}:null,accountVerified:observed?.httpStatus===200&&observed.modelIds?.includes(this.settings.model)===true,generationVerified:!!last,lastVerifiedActivity:last?.created_at||null,provider:'deepseek',enabled:this.policy.enabled===true,configured:!!this.settings?.key,model:this.settings?.model||null,classification:'paid',automaticRouting:false,perRequestOwnerApproval:true,pricingKnown:this.ratesValid(),pricing:{inputUSDPerMillion:this.settings.inputPrice,outputUSDPerMillion:this.settings.outputPrice,verifiedUntil:this.policy.pricesVerifiedUntil||null},budgetsConfigured:[this.policy.requestLimit,this.policy.dailyLimit,this.policy.totalLimit].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0),connection:!this.settings?.key?'awaiting_configuration':observed?.httpStatus===200&&observed.modelIds?.includes(this.settings.model)?'account_verified_generation_unverified':observed?'account_check_failed':last?'historical_provider_response_verified':'configured_not_live_verified',reviewAvailable:observed?.httpStatus===200&&observed.modelIds?.includes(this.settings.model)===true&&observed.balance?.usable===true&&observed.balance.available_usd>0&&this.policy.enabled===true&&!!this.settings?.key&&['deepseek-flash','deepseek-v4-pro'].includes(this.settings.model)&&this.pricesValid()&&this.team.liveOptIn,balance:observed?observed.balance||null:this.db.prepare('SELECT available_usd,checked_at FROM deepseek_balance_observation WHERE id=1').get()||null,budgets:{requestUSD:this.policy.requestLimit,dailyUSD:this.policy.dailyLimit,totalUSD:this.policy.totalLimit},localReservations:this.db.prepare("SELECT coalesce(sum(reserved_usd),0) usd FROM paid_request_quotes WHERE status IN ('reserved','completed','unknown')").get().usd+helloHeld(this.db),budgetEnforcement:'Local conservative reservations; provider charges are not independently capped or verified'};}
 // Owner-triggered account metadata only. It creates no run authorization.
 async refreshTeamFunding(body,{signal}={}){
  this.team.fields(body,['approvedBy','confirmReadOnly'],['approvedBy','confirmReadOnly']);
  if(body.approvedBy!=='owner'||body.confirmReadOnly!==true)throw new ApiError(403,'Confirm the read-only DeepSeek metadata check.');
  const settings=this.settings,source='https://api-docs.deepseek.com/quick_start/pricing/';
  if(!settings.key||settings.base!=='https://api.deepseek.com'||settings.model!=='deepseek-flash')throw new ApiError(403,'Configure the exact official DeepSeek Flash model locally.');
  const response=await this.team.fetch(source,{method:'GET',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
  if(!response.ok||!response.body)throw new ApiError(503,'Official DeepSeek pricing is unavailable.');
  const chunks=[];let bytes=0;
  for await(const chunk of response.body){bytes+=chunk.length;if(bytes>512000)throw new ApiError(413,'Pricing document exceeds the verification limit.');chunks.push(chunk);}
  const rates=verifyDemoPrices(Buffer.concat(chunks).toString('utf8'));
  if(rates.input!==settings.inputPrice||rates.output!==settings.outputPrice)throw new ApiError(409,'Published rates do not match configured rates.');
  const account=await checkDeepSeek(settings,(url,options)=>this.team.fetch(url,{...options,signal:signal?AbortSignal.any([signal,options.signal]):options.signal}),Math.min(this.team.config.timeout,15000));
  if(account.httpStatus!==200||account.balanceStatus!==200||!account.modelIds.includes(settings.model)||!account.balance?.usable)throw new ApiError(403,'Official model access or usable USD prepaid balance could not be verified.');
  if(signal?.aborted)throw new ApiError(409,'The run stopped before funding verification completed.');
  const checkedAt=account.checkedAt;
  return transaction(this.db,()=>{
   this.db.prepare('INSERT INTO studio_deepseek_verification VALUES (1,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET model=excluded.model,key_fingerprint=excluded.key_fingerprint,input_price=excluded.input_price,output_price=excluded.output_price,source=excluded.source,checked_at=excluded.checked_at').run(settings.model,keyFingerprint(settings.key),rates.input,rates.output,source,checkedAt);
   this.db.prepare('INSERT INTO deepseek_balance_observation VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET available_usd=excluded.available_usd,checked_at=excluded.checked_at').run(account.balance.available_usd,checkedAt);
   return {model:settings.model,source,checkedAt,input:rates.input,output:rates.output};
  });
 }
 teamRatesValid(){
  const s=this.settings,e=this.db.prepare('SELECT * FROM studio_deepseek_verification WHERE id=1').get();
  if(!e)return this.ratesValid();
  const balance=this.db.prepare('SELECT checked_at FROM deepseek_balance_observation WHERE id=1').get(),age=Date.now()-Date.parse(e.checked_at);
  return !!s.key&&s.base==='https://api.deepseek.com'&&e.model===s.model&&e.key_fingerprint===keyFingerprint(s.key)&&e.input_price===s.inputPrice&&e.output_price===s.outputPrice&&e.checked_at===balance?.checked_at&&age>=0&&age<300000;
 }
 ratesValid(){return [this.settings.inputPrice,this.settings.outputPrice].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0)&&Date.parse(this.policy.pricesVerifiedUntil)>Date.now();}
 pricesValid(){const p=this.settings,c=this.policy;return !!p&&[p.inputPrice,p.outputPrice,c.requestLimit,c.dailyLimit,c.totalLimit].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0)&&Date.parse(c.pricesVerifiedUntil)>Date.now();}
 prompt(id,reviewId=null){if(reviewId)return this.team.senior.prompt(id,reviewId);const j=this.team.get(id);if(!j.parent_id||!this.team.get(j.parent_id).owner_plan_approval)throw new ApiError(403,'Owner-approved development plan required');return {system:'Return only JSON: {"files":[{"path":"src/example.js","content":"..."}]}. Produce a JavaScript draft for independent review. DeepSeek must not review its own work. Do not execute code or request credentials.',user:JSON.stringify({objective:j.description,handoff:this.team.checkpoints.packet(id),approvedPlan:this.team.get(j.parent_id).plan})};}
 quote(id,outputBound=512,reviewId=null){
  if(this.scope&&id===this.scope.terms.taskId&&reviewId)return this.scope.quote(id,outputBound,reviewId);
  if(this.db.prepare('SELECT 1 FROM paid_review_scopes WHERE task_id=?').get(id))throw new ApiError(403,'This task requires its original one-shot review scope; legacy quotes cannot replenish it');
  if(!this.pricesValid())throw new ApiError(403,'Current verified USD prices, expiry and positive spending limits are required');
  if(!['deepseek-flash','deepseek-v4-pro'].includes(this.settings.model))throw new ApiError(403,'Configure an officially verified DeepSeek model');
  if(!Number.isInteger(outputBound)||outputBound<1||outputBound>4096)throw new ApiError(400,'Invalid output token bound');
  const prompt=this.prompt(id,reviewId);this.team.safe(prompt);
  const bytes=Buffer.byteLength(prompt.system+prompt.user);if(bytes>this.settings.maxInputBytes)throw new ApiError(413,'Paid context exceeds input policy');
  // UTF-8 bytes plus framing allowance is a conservative reservation, never actual usage.
  const inputBound=bytes+4096,prices={input:this.settings.inputPrice,output:this.settings.outputPrice,expires:this.policy.pricesVerifiedUntil};
  const reserved=Math.ceil(inputBound*prices.input+outputBound*prices.output)/1000000;
  if(reserved>this.policy.requestLimit)throw new ApiError(403,'Estimated upper bound exceeds request spending limit');
  const quoteId=randomUUID(),expires=Date.now()+300000;
  this.db.prepare("INSERT INTO paid_request_quotes(id,task_id,model,input_bound,output_bound,reserved_usd,status,created_at,request_hash,price_snapshot,expires_at,purpose,review_request_id) VALUES (?,?,?,?,?,?,'quoted',?,?,?,?,?,?)").run(quoteId,id,this.settings.model,inputBound,outputBound,reserved,now(),hash(prompt),JSON.stringify(prices),expires,reviewId?'review':'development',reviewId);
  return {quoteId,purpose:reviewId?'review':'development',reviewId,model:this.settings.model,reservedUSD:reserved,inputTokenBound:inputBound,outputTokenBound:outputBound,expiresAt:expires,estimated:true,finalCharge:'unknown',enabled:this.policy.enabled===true};
 }
 adapter(outputBound){return new ProviderAdapter({...this.settings,free:true,disabledReason:null},{fetchImpl:this.team.fetch,timeout:this.team.config.timeout,tokenLimit:outputBound});}
 authorize(body){if(body?.approvedBy!=='owner'||body?.confirmPaid!==true||this.policy.enabled!==true||!this.team.liveOptIn||!this.settings.key)throw new ApiError(403,'DeepSeek is disabled or missing explicit paid owner authorization');}
 async balance(body){this.authorize(body);const data=await this.adapter(1).request(this.settings.base+'/user/balance');const usd=data.balance_infos?.find(b=>b.currency==='USD');const amount=typeof usd?.total_balance==='string'&&usd.total_balance.trim()?Number(usd.total_balance):NaN;if(data.is_available!==true||!Number.isFinite(amount)||amount<0)throw new ApiError(403,'Usable USD prepaid balance could not be established');const checkedAt=now();this.db.prepare('INSERT INTO deepseek_balance_observation VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET available_usd=excluded.available_usd,checked_at=excluded.checked_at').run(amount,checkedAt);return {availableUSD:amount,checkedAt};}
 async execute(id,body,expectedPurpose='development'){
  if(this.scope&&id===this.scope.terms.taskId&&expectedPurpose==='review')return this.scope.execute(id,body);
  if(this.db.prepare('SELECT 1 FROM paid_review_scopes WHERE task_id=?').get(id))throw new ApiError(403,'Scoped task cannot use an unscoped paid dispatch');
  this.team.fields(body,['quoteId','approvedBy','confirmPaid','maximumUSD']);this.authorize(body);
  const q=this.db.prepare('SELECT * FROM paid_request_quotes WHERE id=? AND task_id=?').get(body.quoteId,id),prompt=this.prompt(id,q?.purpose==='review'?q.review_request_id:null);
  if(!q||q.purpose!==expectedPurpose||q.status!=='quoted'||q.expires_at<Date.now()||!this.pricesValid()||q.request_hash!==hash(prompt)||q.model!==this.settings.model||JSON.parse(q.price_snapshot).input!==this.settings.inputPrice||JSON.parse(q.price_snapshot).output!==this.settings.outputPrice||typeof body.maximumUSD!=='number'||!Number.isFinite(body.maximumUSD)||body.maximumUSD<q.reserved_usd||body.maximumUSD>this.policy.requestLimit)throw new ApiError(403,'A fresh matching owner-approved cost quote is required');
  const balance=await this.balance(body);if(balance.availableUSD<q.reserved_usd)throw new ApiError(403,'Insufficient prepaid balance');
  let execution,usageId,reportedUsage;const review=q.purpose==='review',operationId='paid-'+q.id;
  transaction(this.db,()=>{
   if(this.db.prepare('SELECT 1 FROM team_task_locks WHERE task_id=?').get(id))throw new ApiError(409,'Task workspace is locked');
   const current=this.db.prepare('SELECT * FROM paid_request_quotes WHERE id=?').get(q.id);if(current.expires_at<=Date.now()||!this.pricesValid())throw new ApiError(403,'Quote or price verification expired during balance check');if(current.status!=='quoted')throw new ApiError(409,'Quote already consumed');
   const sums=this.db.prepare("SELECT coalesce(sum(reserved_usd),0) total,coalesce(sum(CASE WHEN created_at>=? THEN reserved_usd ELSE 0 END),0) daily FROM paid_request_quotes WHERE status IN ('reserved','completed','unknown')").get(now().slice(0,10));
   if(sums.total+helloHeld(this.db)+q.reserved_usd>this.policy.totalLimit||sums.daily+helloHeld(this.db,now().slice(0,10))+q.reserved_usd>this.policy.dailyLimit)throw new ApiError(403,'Persistent paid budget exhausted');
   // Charge the local daily allowance on reservation day, including a quote issued before midnight.
   this.db.prepare("UPDATE paid_request_quotes SET status='reserved',created_at=? WHERE id=?").run(now(),q.id);
   // reserve() is transaction-owning; set up the equivalent state within this transaction.
   const j=this.team.expect(id,review?['AWAITING_REVIEW']:['ASSIGNED']);if(!review&&j.attempts>=3)throw new ApiError(409,'Attempt limit reached');
   if(!review)this.db.prepare("UPDATE team_jobs SET attempts=attempts+1,model_key='deepseek' WHERE task_id=?").run(id);
   if(!review)this.team.move(id,'IN_PROGRESS','owner','Specific prepaid quote authorized; no automatic paid fallback');
   this.db.prepare("INSERT INTO team_operations VALUES (?,?,?,'started',NULL,?,?)").run(operationId,id,JSON.stringify({purpose:q.purpose,quoteId:q.id}),now(),now());this.db.prepare('INSERT INTO team_task_locks VALUES (?,?)').run(id,operationId);
   execution=this.team.store.startExecution(id,'senior');if(review)this.team.senior.start(id,q.review_request_id,q.id,execution);
  });
  try{
   this.db.prepare("INSERT OR IGNORE INTO ai_providers (id,provider_name,model_name,enabled) VALUES ('deepseek','deepseek',?,1)").run(q.model);
   const adapter=this.adapter(q.output_bound);usageId=this.team.usage.reserve(this.team.store.task(id),this.db.prepare("SELECT * FROM agents WHERE id='senior'").get(),adapter,q.input_bound,execution);
   // Exactly one POST; no retry even on timeout/unknown charge.
   const result=await adapter.generate(prompt.system,prompt.user);
   reportedUsage=result.usage;const saved=review?this.team.senior.finish(id,q.review_request_id,result.text,q.model):this.team.saveDraft(id,execution,result.text,q.model);this.team.usage.finish(usageId,result.usage,'validated');
   this.db.prepare("UPDATE paid_request_quotes SET status='completed' WHERE id=?").run(q.id);this.db.prepare("UPDATE team_operations SET status='completed',result=?,updated_at=? WHERE id=?").run(JSON.stringify(saved),now(),operationId);return saved;
  }catch(error){this.db.prepare("UPDATE paid_request_quotes SET status='unknown' WHERE id=?").run(q.id);if(usageId)this.team.usage.finish(usageId,reportedUsage||error.usage,'unknown_paid_outcome');this.db.prepare("UPDATE team_operations SET status='interrupted',updated_at=? WHERE id=?").run(now(),operationId);if(review)this.team.senior.fail(id,q.review_request_id,execution);if(!review&&this.team.get(id).state==='IN_PROGRESS')this.team.fail(id,execution,'paid_outcome_requires_reconciliation');throw new ApiError(503,'Paid outcome requires owner reconciliation; reservation retained and no retry performed');}finally{this.db.prepare('DELETE FROM team_task_locks WHERE task_id=? AND operation_id=?').run(id,operationId);}
 }
}
