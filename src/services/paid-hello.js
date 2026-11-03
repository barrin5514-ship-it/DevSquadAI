import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
import {transaction} from '../middleware/ai-validation.js';
import {ProviderAdapter} from '../providers/adapter.js';
import {keyFingerprint} from './provider-verification.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const stamp=()=>new Date().toISOString();
const deny=()=>{throw new ApiError(403,'The one-shot hello scope is mismatched, expired or already consumed');};
export function helloHeld(db,day=null){return db.prepare('SELECT coalesce(sum(held_usd),0) amount FROM paid_hello_scopes WHERE (? IS NULL OR reserved_at>=?)').get(day,day).amount;}

// Only a local startup capability can authorize this fixed hello. Browser role
// changes cannot create a scope, renew its clock, or replenish its HTTP slots.
export class PaidHello {
 constructor(team,filename){
  this.team=team;this.db=team.db;this.settings=team.paid.settings;
  const root=fs.realpathSync(path.dirname(team.config.database));this.file=fs.realpathSync(filename);
  if(path.relative(root,this.file).startsWith('..')||fs.statSync(this.file).size>16000)deny();
  this.raw=fs.readFileSync(this.file,'utf8');this.terms=JSON.parse(this.raw);const s=this.terms;
  this.body={model:'deepseek-flash',messages:[{role:'user',content:'Reply with exactly the word hello.'}],thinking:{type:'disabled'},max_tokens:32,stream:false};this.bodyRaw=JSON.stringify(this.body);
  if(s.approvedBy!=='owner'||!s.approvalEvidence||s.provider!=='deepseek'||s.model!=='deepseek-flash'||s.maximumUSD!==0.001||s.maxOutput!==32||s.timeoutMs!==90000||s.maxModelGET!==1||s.maxBalanceGET!==1||s.maxPOST!==1||s.payloadHash!==hash(this.bodyRaw)||!Number.isFinite(Date.parse(s.approvedAt))||!Number.isFinite(Date.parse(s.expiresAt))||Date.parse(s.expiresAt)<=Date.parse(s.approvedAt)||Date.parse(s.expiresAt)>Date.parse(s.approvedAt)+1800000||s.prices?.input!==0.3||s.prices?.output!==1.2||s.prices?.source!=='https://api-docs.deepseek.com/quick_start/pricing/'||!Number.isFinite(Date.parse(s.prices.checkedAt))||!Number.isFinite(Date.parse(s.prices.expiresAt))||Date.parse(s.prices.expiresAt)>Date.parse(s.prices.checkedAt)+1800000||Date.parse(s.expiresAt)>Date.parse(s.prices.expiresAt))deny();
  this.binding();this.termsHash=hash(this.raw);
  transaction(this.db,()=>{const old=this.db.prepare('SELECT * FROM paid_hello_scopes WHERE task_id=?').get(s.taskId);if(old&&(old.id!==s.id||old.terms_hash!==this.termsHash||old.body_hash!==s.payloadHash))deny();if(!old)this.db.prepare('INSERT INTO paid_hello_scopes(id,task_id,terms,terms_hash,body,body_hash) VALUES (?,?,?,?,?,?)').run(s.id,s.taskId,this.raw,this.termsHash,this.bodyRaw,s.payloadHash);});
 }
 binding(){
  const s=this.terms,p=this.settings,filename=fs.realpathSync(this.team.config.database),stat=fs.statSync(filename),main=this.db.prepare('PRAGMA database_list').all().find(r=>r.name==='main'),task=this.team.get(s.taskId);
  if(filename!==s.databasePath||fs.realpathSync(main.file)!==filename||String(stat.dev)!==s.databaseDev||String(stat.ino)!==s.databaseIno||task.project_id!==s.projectId||!task.parent_id||!this.team.get(task.parent_id).owner_plan_approval||task.state!=='PENDING'||task.draft_id||task.description!=='Connection-only hello checks; no code generation or acceptance.'||!p.key||p.base!=='https://api.deepseek.com'||p.model!==s.model||keyFingerprint(p.key)!==s.keyFingerprint)deny();
  this.team.safe(this.body);
 }
 assert(){
  this.binding();const s=this.terms,t=Date.now();if(t<Date.parse(s.approvedAt)||t>=Date.parse(s.expiresAt)||t<Date.parse(s.prices.checkedAt)||t>=Date.parse(s.prices.expiresAt)||hash(fs.readFileSync(this.file,'utf8'))!==this.termsHash||hash(JSON.stringify(this.body))!==s.payloadHash)deny();
  const row=this.db.prepare('SELECT * FROM paid_hello_scopes WHERE id=?').get(s.id);if(!row||row.terms_hash!==this.termsHash||hash(row.terms)!==this.termsHash||hash(row.body)!==s.payloadHash)deny();return row;
 }
 claim(kind){return transaction(this.db,()=>{
  const row=this.assert(),s=this.terms;
  if(!['models','balance','post'].includes(kind)||this.db.prepare('SELECT 1 FROM paid_hello_http WHERE scope_id=? AND kind=?').get(s.id,kind))deny();
  if(kind!=='models'&&!this.db.prepare("SELECT 1 FROM paid_hello_http WHERE scope_id=? AND kind=? AND state='complete'").get(s.id,kind==='balance'?'models':'balance'))deny();
  if(kind==='post'){
   const balance=this.db.prepare("SELECT * FROM paid_hello_http WHERE scope_id=? AND kind='balance'").get(s.id),fresh=JSON.parse(balance.evidence);
   const heldReviews=this.db.prepare("SELECT coalesce(sum(held_usd),0) amount FROM paid_review_scopes WHERE outcome<>'completed'").get().amount;
   const legacy=this.db.prepare("SELECT coalesce(sum(reserved_usd),0) amount FROM paid_request_quotes WHERE status IN ('reserved','unknown') AND id NOT IN (SELECT quote_id FROM paid_review_scopes WHERE quote_id IS NOT NULL)").get().amount;
   if(Date.now()-Date.parse(balance.started_at)>60000||row.held_usd!==0||fresh.availableUSD<heldReviews+legacy+helloHeld(this.db)+s.maximumUSD)deny();
   const policy=this.team.config.ai.paid,existing=this.db.prepare("SELECT coalesce(sum(reserved_usd),0) total,coalesce(sum(CASE WHEN created_at>=? THEN reserved_usd ELSE 0 END),0) daily FROM paid_request_quotes WHERE status IN ('reserved','completed','unknown')").get(stamp().slice(0,10));
   if(typeof policy.requestLimit==='number'&&s.maximumUSD>policy.requestLimit||typeof policy.totalLimit==='number'&&existing.total+helloHeld(this.db)+s.maximumUSD>policy.totalLimit||typeof policy.dailyLimit==='number'&&existing.daily+helloHeld(this.db,stamp().slice(0,10))+s.maximumUSD>policy.dailyLimit)deny();
   // Hold the full approved local cap before dispatch. Unknown outcomes keep it.
   this.db.prepare("UPDATE paid_hello_scopes SET held_usd=?,outcome='reserved',reserved_at=? WHERE id=?").run(s.maximumUSD,stamp(),s.id);
  }
  this.db.prepare('INSERT INTO paid_hello_http(scope_id,kind,started_at) VALUES (?,?,?)').run(s.id,kind,stamp());
 });}
 record(kind,evidence){this.team.safe(evidence);this.db.prepare("UPDATE paid_hello_http SET state='complete',evidence=? WHERE scope_id=? AND kind=?").run(JSON.stringify(evidence),this.terms.id,kind);}
 status(){const row=this.db.prepare('SELECT * FROM paid_hello_scopes WHERE id=?').get(this.terms.id);return {id:row.id,taskId:row.task_id,outcome:row.outcome,heldUSD:row.held_usd,expiresAt:this.terms.expiresAt,result:row.result?JSON.parse(row.result):null,requests:this.db.prepare('SELECT kind,state,started_at,evidence FROM paid_hello_http WHERE scope_id=? ORDER BY rowid').all(row.id)};}
 async execute(){
  const row=this.assert();if(row.outcome==='completed'&&row.result)return {...JSON.parse(row.result),cached:true};
  const adapter=new ProviderAdapter({...this.settings,free:true,disabledReason:null},{fetchImpl:this.team.fetch,timeout:90000,tokenLimit:32});
  let stage='models',start=Date.now(),claimed=false;
  try{
   this.claim('models');claimed=true;const models=await adapter.request(this.settings.base+'/models');if(!models?.data?.some(m=>m.id===this.terms.model))throw new ApiError(403,'The approved model is not available to this account');this.record('models',{httpStatus:200,modelListed:true});
   stage='balance';claimed=false;this.claim('balance');claimed=true;const balance=await adapter.request(this.settings.base+'/user/balance'),usd=balance?.balance_infos?.find(v=>v.currency==='USD'),available=typeof usd?.total_balance==='string'&&usd.total_balance.trim()?Number(usd.total_balance):NaN;if(balance?.is_available!==true||!Number.isFinite(available)||available<0.001)throw new ApiError(403,'A usable prepaid balance was not confirmed');this.record('balance',{httpStatus:200,availableUSD:available});
   stage='post';claimed=false;this.claim('post');claimed=true;start=Date.now();const data=await adapter.request(this.settings.base+'/chat/completions',this.body),elapsedMs=Date.now()-start,choice=data?.choices?.[0],u=data?.usage||{},num=n=>Number.isSafeInteger(n)&&n>=0?n:null;
   const usage={input:num(u.prompt_tokens),output:num(u.completion_tokens),total:num(u.total_tokens),reasoning:num(u.completion_tokens_details?.reasoning_tokens),cachedInput:num(u.prompt_cache_hit_tokens)};
   const ok=choice?.finish_reason==='stop'&&typeof choice.message?.content==='string'&&/^hello[.!]?$/i.test(choice.message.content.trim());
   const calculatedCostUSD=usage.input!==null&&usage.output!==null?(usage.input*0.3+usage.output*1.2)/1e6:null;
   const result={ok,kind:'live',model:this.terms.model,httpStatus:200,elapsedMs,timeoutMs:90000,finishReason:['stop','length','content_filter','tool_calls'].includes(choice?.finish_reason)?choice.finish_reason:null,text:ok?choice.message.content.trim():null,usage,calculatedCostUSD,costBasis:'Calculated using peak uncached rates; provider did not supply an invoice.',message:ok?'DeepSeek replied hello.':'DeepSeek returned an incomplete or unexpected reply; no retry was made.',heldUSD:0.001};
   this.team.safe(result);this.record('post',result);this.db.prepare("UPDATE paid_hello_scopes SET outcome='completed',result=? WHERE id=?").run(JSON.stringify(result),this.terms.id);return result;
  }catch(error){
   if(!claimed)throw error;
   const result={ok:false,kind:'live',model:this.terms.model,httpStatus:error?.httpStatus||null,elapsedMs:Date.now()-start,stage,message:stage==='post'?'DeepSeek did not return a confirmed complete hello. The local reservation is retained; no retry was made.':error instanceof ApiError&&error.status===403?'The approved model, balance, budget or time-bound permission could not be confirmed; no generation was sent.':'The DeepSeek account check failed. No retry or generation fallback was made.',code:['timeout','rate_limit','provider_error'].includes(error?.code)?error.code:'scope_or_access',heldUSD:this.status().heldUSD};
   this.db.prepare('UPDATE paid_hello_scopes SET outcome=?,result=? WHERE id=?').run(stage==='post'?'unknown':'blocked',JSON.stringify(result),this.terms.id);return result;
  }
 }
}
