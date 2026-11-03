import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
import {transaction} from '../middleware/ai-validation.js';
import {ProviderAdapter} from '../providers/adapter.js';
import {keyFingerprint} from './provider-verification.js';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
const fail=()=>{throw new ApiError(403,'Paid review scope mismatch, expired, exhausted or not ready');};
const stamp=()=>new Date().toISOString();

// An internal startup file is an owner capability, never a browser-created grant.
// SQLite serializes quote creation and pre-dispatch request consumption, even
// across separate connections. Unknown slots/reservations are never released.
export class ScopedPaidReview {
 constructor(paid,filename){
  this.paid=paid;this.team=paid.team;this.db=paid.db;this.file=fs.realpathSync(filename);
  const root=fs.realpathSync(path.dirname(this.team.config.database)),relative=path.relative(root,this.file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||fs.statSync(this.file).size>64000)fail();
  const s=JSON.parse(fs.readFileSync(this.file,'utf8'));
  if(s.approvedBy!=='owner'||s.provider!=='deepseek'||s.model!=='deepseek-flash'||s.maximumUSD!==0.01||s.maxOutput!==1024||s.maxModelGET!==1||s.maxBalanceGET!==1||s.maxPOST!==1||!s.approvalEvidence||!Number.isFinite(Date.parse(s.approvedAt))||!Number.isFinite(Date.parse(s.expiresAt))||Date.parse(s.expiresAt)>Date.parse(s.approvedAt)+1800000||Date.parse(s.expiresAt)<=Date.parse(s.approvedAt)||s.prices?.input!==0.3||s.prices?.output!==1.2||s.prices?.source!=='https://api-docs.deepseek.com/quick_start/pricing/'||!Number.isFinite(Date.parse(s.prices.checkedAt))||Date.parse(s.prices.checkedAt)>Date.parse(s.prices.expiresAt)||Date.parse(s.prices.expiresAt)-Date.parse(s.prices.checkedAt)>1800000||Date.parse(s.expiresAt)>Date.parse(s.prices.expiresAt))fail();
  const bodyFile=fs.realpathSync(s.payloadFile),bodyRelative=path.relative(root,bodyFile);
  if(bodyRelative.startsWith('..')||path.isAbsolute(bodyRelative)||fs.statSync(bodyFile).size>32000)fail();
  this.body=JSON.parse(fs.readFileSync(bodyFile,'utf8'));this.raw=JSON.stringify(this.body);
  if(sha256(this.raw)!==s.payloadHash||this.body.model!==s.model||this.body.max_tokens!==s.maxOutput||this.body.thinking?.type!=='disabled'||this.body.response_format?.type!=='json_object'||this.body.stream!==false||Object.keys(this.body).sort().join(',')!=='max_tokens,messages,model,response_format,stream,thinking')fail();
  this.terms=s;this.termsRaw=JSON.stringify(s);this.termsHash=sha256(this.termsRaw);
  if(!Array.isArray(this.body.messages)||this.body.messages.length!==2||this.body.messages[0].role!=='system'||this.body.messages[1].role!=='user')fail();
  const packet=JSON.parse(this.body.messages[1].content),identity=packet.identity;
  if(!identity||identity.projectId!==s.projectId||identity.taskId!==s.taskId||identity.draftId!==s.draftId||identity.draftHash!==s.draftHash||identity.pendingReviewId!==s.reviewId||identity.pendingReviewSnapshotHash!==s.snapshotHash)fail();
  this.binding(s.taskId);
  const draft=this.db.prepare('SELECT files FROM generated_drafts WHERE id=?').get(s.draftId);
  if(JSON.stringify(packet.artifacts)!==draft.files)fail();
  transaction(this.db,()=>{
   const existing=this.db.prepare('SELECT * FROM paid_review_scopes WHERE task_id=?').get(s.taskId);
   if(existing&&(existing.id!==s.id||existing.terms_hash!==this.termsHash||existing.body_hash!==s.payloadHash))fail();
   if(!existing)this.db.prepare('INSERT INTO paid_review_scopes(id,task_id,terms,terms_hash,body,body_hash) VALUES (?,?,?,?,?,?)').run(s.id,s.taskId,this.termsRaw,this.termsHash,this.raw,s.payloadHash);
  });
 }
 binding(id){
  const s=this.terms,p=this.paid.settings,filename=fs.realpathSync(this.team.config.database),stat=fs.statSync(filename),main=this.db.prepare('PRAGMA database_list').all().find(x=>x.name==='main');
  const task=this.team.get(id),draft=this.db.prepare('SELECT * FROM generated_drafts WHERE id=? AND task_id=?').get(s.draftId,id),review=this.db.prepare('SELECT * FROM deepseek_review_requests WHERE id=? AND task_id=?').get(s.reviewId,id);
  if(id!==s.taskId||task.project_id!==s.projectId||task.draft_id!==s.draftId||filename!==s.databasePath||fs.realpathSync(main.file)!==filename||String(stat.dev)!==s.databaseDev||String(stat.ino)!==s.databaseIno||!task.parent_id||!this.team.get(task.parent_id).owner_plan_approval||!draft||draft.content_hash!==s.draftHash||sha256(draft.files)!==s.draftHash||!review||review.draft_id!==s.draftId||review.content_hash!==s.snapshotHash||sha256(review.snapshot)!==s.snapshotHash||!this.team.senior.independent(task)||!p.key||keyFingerprint(p.key)!==s.keyFingerprint||p.model!==s.model||p.base!=='https://api.deepseek.com'||p.inputPrice!==s.prices.input||p.outputPrice!==s.prices.output)fail();
  this.team.safe(this.body);
  return {task,draft,review};
 }
 assert(id){
  this.binding(id);const s=this.terms,t=Date.now();
  if(t<Date.parse(s.approvedAt)||t>=Date.parse(s.expiresAt)||t>=Date.parse(s.prices.expiresAt)||t<Date.parse(s.prices.checkedAt)||sha256(JSON.stringify(JSON.parse(fs.readFileSync(this.file,'utf8'))))!==this.termsHash||sha256(JSON.stringify(JSON.parse(fs.readFileSync(s.payloadFile,'utf8'))))!==s.payloadHash||sha256(JSON.stringify(this.body))!==s.payloadHash)fail();
  const row=this.db.prepare('SELECT * FROM paid_review_scopes WHERE id=?').get(s.id);
  if(!row||row.terms_hash!==this.termsHash||sha256(row.terms)!==this.termsHash||sha256(row.body)!==s.payloadHash)fail();
  return row;
 }
 status(id){if(id!==this.terms.taskId)return null;const row=this.db.prepare('SELECT * FROM paid_review_scopes WHERE id=?').get(this.terms.id),requests=this.db.prepare('SELECT kind,state,started_at,diagnostics,evidence FROM paid_review_http WHERE scope_id=? ORDER BY rowid').all(row.id);let available=false;try{this.assert(id);available=row.outcome==='prepared'&&!requests.some(r=>r.kind==='review'||r.state!=='complete');}catch{}return {id:row.id,model:this.terms.model,taskId:id,draftId:this.terms.draftId,payloadHash:this.terms.payloadHash,expiresAt:this.terms.expiresAt,maximumUSD:this.terms.maximumUSD,heldUSD:row.held_usd,outcome:row.outcome,result:row.result?JSON.parse(row.result):null,requests,available,automaticRouting:false};}
 quote(id,output,reviewId){
  return transaction(this.db,()=>{
   const row=this.assert(id),s=this.terms;
   this.team.senior.prompt(id,reviewId);
   if(reviewId!==s.reviewId||output!==s.maxOutput||this.db.prepare("SELECT 1 FROM paid_review_http WHERE scope_id=? AND kind='review'").get(s.id))fail();
   if(row.quote_id)return this.quoteResult(row.quote_id);
   const bytes=Buffer.byteLength(this.raw),input=bytes+4096,reserved=Math.ceil(input*s.prices.input+s.maxOutput*s.prices.output)/1000000;
   if(Buffer.byteLength(this.body.messages.map(m=>m.content).join(''))>this.paid.settings.maxInputBytes||!Number.isFinite(reserved)||reserved>s.maximumUSD)fail();
   const quoteId=randomUUID();
   this.db.prepare("INSERT INTO paid_request_quotes(id,task_id,model,input_bound,output_bound,reserved_usd,status,created_at,request_hash,price_snapshot,expires_at,purpose,review_request_id) VALUES (?,?,?,?,?,?,'quoted',?,?,?,?, 'review',?)").run(quoteId,id,s.model,input,s.maxOutput,reserved,stamp(),s.payloadHash,JSON.stringify(s.prices),Date.parse(s.expiresAt),reviewId);
   this.db.prepare('UPDATE paid_review_scopes SET quote_id=? WHERE id=?').run(quoteId,s.id);return this.quoteResult(quoteId);
  });
 }
 quoteResult(id){const q=this.db.prepare('SELECT * FROM paid_request_quotes WHERE id=?').get(id);return {quoteId:id,reviewId:q.review_request_id,model:q.model,reservedUSD:q.reserved_usd,maximumUSD:this.terms.maximumUSD,outputTokenBound:q.output_bound,expiresAt:q.expires_at,estimated:true,taskScoped:true};}
 claim(id,kind){
  return transaction(this.db,()=>{
   const row=this.assert(id),s=this.terms;
   if(!['models','balance','review'].includes(kind)||this.db.prepare('SELECT 1 FROM paid_review_http WHERE scope_id=? AND kind=?').get(s.id,kind))fail();
   if(kind!=='models'&&!this.db.prepare("SELECT 1 FROM paid_review_http WHERE scope_id=? AND kind=? AND state='complete'").get(s.id,kind==='balance'?'models':'balance'))fail();
   if(kind==='review'){
    const q=this.db.prepare('SELECT * FROM paid_request_quotes WHERE id=?').get(row.quote_id);
    const expectedInput=Buffer.byteLength(this.raw)+4096,expectedUSD=Math.ceil(expectedInput*s.prices.input+s.maxOutput*s.prices.output)/1000000;
    if(!q||q.status!=='quoted'||q.task_id!==id||q.purpose!=='review'||q.review_request_id!==s.reviewId||q.model!==s.model||q.request_hash!==s.payloadHash||q.input_bound!==expectedInput||q.output_bound!==s.maxOutput||q.expires_at!==Date.parse(s.expiresAt)||q.expires_at<=Date.now()||JSON.stringify(JSON.parse(q.price_snapshot))!==JSON.stringify(s.prices)||q.reserved_usd!==expectedUSD||q.reserved_usd>s.maximumUSD||row.held_usd!==0)fail();
    // Hold the full approved dollar allowance, not merely a heuristic quote.
    const fresh=this.db.prepare("SELECT evidence,started_at FROM paid_review_http WHERE scope_id=? AND kind='balance' AND state='complete'").get(s.id);
    const other=this.db.prepare("SELECT coalesce(sum(held_usd),0) amount FROM paid_review_scopes WHERE id<>? AND outcome<>'completed'").get(s.id).amount;
    const legacy=this.db.prepare("SELECT coalesce(sum(reserved_usd),0) amount FROM paid_request_quotes WHERE status IN ('reserved','unknown') AND id NOT IN (SELECT quote_id FROM paid_review_scopes WHERE quote_id IS NOT NULL)").get().amount;
    if(Date.now()-Date.parse(fresh.started_at)>60000||JSON.parse(fresh.evidence).availableUSD<other+legacy+s.maximumUSD)fail();
    const j=this.team.expect(id,['AWAITING_REVIEW']);this.team.senior.current(id,s.reviewId);
    if(this.db.prepare('SELECT 1 FROM team_task_locks WHERE task_id=?').get(id))fail();
    const op='scoped-'+s.id;this.db.prepare("INSERT INTO team_operations VALUES (?,?,?,'started',NULL,?,?)").run(op,id,JSON.stringify({purpose:'review',scopeId:s.id,quoteId:q.id}),stamp(),stamp());
    this.db.prepare('INSERT INTO team_task_locks VALUES (?,?)').run(j.task_id,op);
    const execution=this.team.store.startExecution(id,'senior');this.team.senior.start(id,s.reviewId,q.id,execution);
    this.db.prepare("UPDATE paid_request_quotes SET status='reserved',created_at=? WHERE id=?").run(stamp(),q.id);
    this.db.prepare("UPDATE paid_review_scopes SET held_usd=?,outcome='unknown',result=? WHERE id=?").run(s.maximumUSD,JSON.stringify({execution,operationId:op}),s.id);
   }
   this.db.prepare('INSERT INTO paid_review_http(scope_id,kind,started_at) VALUES (?,?,?)').run(s.id,kind,stamp());
  });
 }
 adapter(){return new ProviderAdapter({...this.paid.settings,free:true,disabledReason:null},{fetchImpl:this.team.fetch,timeout:Math.min(this.team.config.timeout,60000),tokenLimit:this.terms.maxOutput});}
 record(kind,adapter,evidence,complete){this.team.safe(evidence);this.db.prepare('UPDATE paid_review_http SET state=?,diagnostics=?,evidence=? WHERE scope_id=? AND kind=?').run(complete?'complete':'unknown',JSON.stringify(adapter.lastDiagnostics||{}),JSON.stringify(evidence),this.terms.id,kind);}
 async preflight(id,kind){
  const existing=this.db.prepare('SELECT * FROM paid_review_http WHERE scope_id=? AND kind=?').get(this.terms.id,kind);
  if(existing){if(existing.state!=='complete')fail();return;}
  this.claim(id,kind);const adapter=this.adapter();
  try{
   const data=await adapter.request(adapter.base+(kind==='models'?'/models':'/user/balance'));
   let evidence;
   if(kind==='models'){if(!data.data?.some(m=>m.id===this.terms.model))fail();evidence={modelListed:true,model:this.terms.model};}
   else {const usd=data.balance_infos?.find(b=>b.currency==='USD'),available=typeof usd?.total_balance==='string'&&usd.total_balance.trim()?Number(usd.total_balance):NaN;if(data.is_available!==true||!Number.isFinite(available)||available<0)fail();evidence={availableUSD:available};this.db.prepare('INSERT INTO deepseek_balance_observation VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET available_usd=excluded.available_usd,checked_at=excluded.checked_at').run(available,stamp());}
   this.record(kind,adapter,evidence,true);
  }catch(error){this.record(kind,adapter,{errorKind:error.code||'scope_check_failed'},false);throw new ApiError(503,'Scoped account check failed; no retry allowed');}
 }
 async execute(id,body){
  this.team.fields(body,['quoteId','approvedBy','confirmPaid','maximumUSD']);const s=this.terms,row=this.assert(id);
  if(body.approvedBy!=='owner'||body.confirmPaid!==true||body.maximumUSD!==s.maximumUSD||body.quoteId!==row.quote_id||!row.quote_id||this.db.prepare("SELECT 1 FROM paid_review_http WHERE scope_id=? AND kind='review'").get(s.id))fail();
  await this.preflight(id,'models');await this.preflight(id,'balance');
  this.claim(id,'review');const claimed=JSON.parse(this.db.prepare('SELECT result FROM paid_review_scopes WHERE id=?').get(s.id).result),adapter=this.adapter();let usageId,usage;
  try{
   const q=this.db.prepare('SELECT * FROM paid_request_quotes WHERE id=?').get(row.quote_id);
   usageId=this.team.usage.reserve(this.team.store.task(id),this.db.prepare("SELECT * FROM agents WHERE id='senior'").get(),adapter,q.input_bound,claimed.execution);
   // Recheck time, binding and price evidence immediately before the one fetch.
   this.assert(id);
   const result=await adapter.generateBound(JSON.parse(this.raw),s.payloadHash);usage=result.usage;
   // Validate the frozen task/draft again; returned schema is checked by finish().
   this.binding(id);const saved=this.team.senior.finish(id,s.reviewId,result.text,s.model);
   this.team.usage.finish(usageId,usage,'validated');this.record('review',adapter,{finishReason:result.finishReason,complete:true,usage,estimatedCost:usage.estimatedCost,reviewerExecutedTests:false},true);
   transaction(this.db,()=>{this.db.prepare("UPDATE paid_request_quotes SET status='completed' WHERE id=?").run(row.quote_id);this.db.prepare("UPDATE paid_review_scopes SET outcome='completed',result=? WHERE id=?").run(JSON.stringify({httpStatus:adapter.lastDiagnostics.httpStatus,elapsedMs:adapter.lastDiagnostics.elapsedMs,timeoutMs:adapter.timeout,finishReason:result.finishReason,usage,estimatedCost:usage.estimatedCost,providerReportedCost:null,complete:true,reviewerExecutedTests:false}),s.id);this.db.prepare("UPDATE team_operations SET status='completed',result=?,updated_at=? WHERE id=?").run(JSON.stringify(saved),stamp(),claimed.operationId);this.team.checkpoints.save(id,'Scoped DeepSeek findings persisted; final owner acceptance pending');});
   return saved;
  }catch(error){
   usage=usage||error.usage;if(usageId)this.team.usage.finish(usageId,usage,'unknown_paid_outcome');
   this.record('review',adapter,{errorKind:error.code||'invalid_review',finishReason:error.finishReason||null,usage:usage||null,complete:false},false);
   this.db.prepare("UPDATE paid_request_quotes SET status='unknown' WHERE id=?").run(row.quote_id);this.team.senior.fail(id,s.reviewId,claimed.execution);this.db.prepare("UPDATE team_operations SET status='interrupted',updated_at=? WHERE id=?").run(stamp(),claimed.operationId);
   throw new ApiError(503,'Scoped review outcome requires reconciliation; full allowance retained, no retry');
  }finally{this.db.prepare('DELETE FROM team_task_locks WHERE task_id=? AND operation_id=?').run(id,claimed.operationId);}
 }
}
