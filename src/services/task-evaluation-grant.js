import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
import {savedVerification,keyFingerprint} from './provider-verification.js';
import {modelHealth} from './provider-health.js';

const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=()=>{throw new ApiError(403,'Task evaluation scope expired, exhausted or outside authorization');};
// Internal startup capability, not an HTTP grant-creation API. The original
// disposable EvaluationGrant remains unchanged. The ledger survives restarts.
export class TaskEvaluationGrant {
 constructor(config,db,filename){
  this.config=config;this.db=db;this.file=fs.realpathSync(filename);
  const directory=fs.realpathSync(path.dirname(config.database));
  if(path.relative(directory,this.file).startsWith('..')||path.isAbsolute(path.relative(directory,this.file)))fail();
  const raw=this.read();this.scope=Object.freeze({...raw.scope});this.identity=digest(this.scope);
  const s=this.scope;
  if(s.approvedBy!=='owner'||s.provider!=='gemini'||s.model!=='gemini-3.8-flash'||s.confirmIncluded!==true||s.noPaidUsage!==true||!Number.isInteger(s.maxRequests)||s.maxRequests<1||s.maxRequests>2||!Number.isInteger(s.maxOutput)||s.maxOutput<1||s.maxOutput>1024||!Number.isFinite(Date.parse(s.expiresAt))||Date.parse(s.expiresAt)>Date.now()+3600000||!Number.isFinite(Date.parse(s.issuedAt))||Date.parse(s.expiresAt)-Date.parse(s.issuedAt)>3600000)fail();
  this.assertBinding(s.taskId);
 }
 read(){if(fs.statSync(this.file).size>64000)fail();const value=JSON.parse(fs.readFileSync(this.file,'utf8'));if(!value.scope||!Array.isArray(value.requests))fail();return value;}
 assertBinding(taskId){
  const s=this.scope,main=this.db.prepare('PRAGMA database_list').all().find(x=>x.name==='main');
  const file=fs.realpathSync(this.config.database),stat=fs.statSync(file);
  const p=this.config.ai.providers.find(x=>x.id===s.provider);
  const t=this.db.prepare('SELECT t.project_id,j.parent_id,p.owner_plan_approval FROM tasks t JOIN team_jobs j ON j.task_id=t.id LEFT JOIN team_jobs p ON p.task_id=j.parent_id WHERE t.id=?').get(taskId);
  if(taskId!==s.taskId||!t||t.project_id!==s.projectId||!t.parent_id||!t.owner_plan_approval||file!==s.databasePath||fs.realpathSync(main.file)!==file||String(stat.dev)!==s.databaseDev||String(stat.ino)!==s.databaseIno||!p?.key||!p.free||p.disabledReason||p.model!==s.model||keyFingerprint(p.key)!==s.keyFingerprint)fail();
  return p;
 }
 assert(taskId,kind='generation'){
  const p=this.assertBinding(taskId),state=this.read(),s=this.scope;
  if(digest(state.scope)!==this.identity||Date.now()<Date.parse(s.issuedAt)||Date.now()>=Date.parse(s.expiresAt)||state.requests.length>=s.maxRequests||!['verification','generation'].includes(kind))fail();
  if(kind==='verification'&&state.requests.some(x=>x.kind==='verification'))fail();
  // Catalog evidence comes only from the existing actual verification path.
  // Free access remains the owner's bounded attestation AND saved free flag,
  // not a claim that catalog visibility establishes a billing entitlement.
  if(kind==='generation'){
   const receipt=savedVerification(this.config,p);
   if(receipt?.httpStatus!==200||receipt.model!==s.model||receipt.modelListed!==true||modelHealth(this.config,p,s.model)?.requiresOwnerAction)throw new ApiError(403,'Scoped Gemini model verification required');
  }
  return p;
 }
 allows(taskId){try{this.assert(taskId);return true;}catch{return false;}}
 status(taskId){if(taskId!==this.scope.taskId)return null;let reason=null,verificationAvailable=false;try{this.assert(taskId);}catch(e){reason=e.message;}try{this.assert(taskId,'verification');verificationAvailable=true;}catch{}const used=this.read().requests.length;return {sessionEnabled:this.sessionEnabled===true,provider:this.scope.provider,model:this.scope.model,expiresAt:this.scope.expiresAt,maxOutput:this.scope.maxOutput,requests:used,maxRequests:this.scope.maxRequests,available:!reason,verificationAvailable,reason};}
 claim(taskId,kind,url,tokens=0){
  let lock;try{lock=fs.openSync(this.file+'.lock','wx');}catch{fail();}
  try{
   const p=this.assert(taskId,kind),expected=kind==='verification'?p.base+'/models/'+this.scope.model:p.base+'/models/'+this.scope.model+':generateContent';
   if(url!==expected||kind==='generation'&&(!Number.isInteger(tokens)||tokens<1||tokens>this.scope.maxOutput)||kind==='verification'&&tokens!==0)fail();
   const state=this.read(),id=randomUUID();state.requests.push({id,kind,taskId,model:this.scope.model,requestedOutputTokens:tokens,startedAt:new Date().toISOString(),outcome:'reserved_unknown'});
   this.write(state);return id;
  }finally{fs.closeSync(lock);fs.unlinkSync(this.file+'.lock');}
 }
 write(state){const tmp=this.file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2));fs.renameSync(tmp,this.file);}
 record(id,result){
  let lock;try{lock=fs.openSync(this.file+'.lock','wx');}catch{fail();}
  try{const state=this.read();if(digest(state.scope)!==this.identity)fail();const row=state.requests.find(x=>x.id===id);if(!row)fail();Object.assign(row,{outcome:result.complete?'complete':'failed',httpStatus:result.httpStatus??null,elapsedMs:result.elapsedMs??null,finishReason:result.finishReason??null,usage:result.usage??null,complete:result.complete===true,errorKind:result.errorKind??null});this.write(state);}finally{fs.closeSync(lock);fs.unlinkSync(this.file+'.lock');}
 }
}
