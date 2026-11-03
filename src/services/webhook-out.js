import {ApiError} from '../middleware/errors.js';
import {cleanReport} from './report-cleaning.js';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

// Empty means off. Keep the private URL beside the database in ignored local
// storage, never in Git, logs, job history or browser responses.
export class WebhookOut {
 constructor(team,{fetchImpl=fetch,timeoutMs=5000}={}){
  this.team=team;this.fetch=fetchImpl;this.timeoutMs=timeoutMs;this.url='';this.enabled=false;this.attempted=new Set();this.storageError=false;
  this.file=team.config?.database?path.join(path.dirname(team.config.database),'webhook-out.json'):null;
  if(this.file&&fs.existsSync(this.file)){try{const stat=fs.lstatSync(this.file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4096)throw Error();const saved=JSON.parse(fs.readFileSync(this.file,'utf8'));if(saved.version!==1||Object.keys(saved).sort().join(',')!=='enabled,url,version')throw Error();const value=this.validate({url:saved.url,enabled:saved.enabled});this.url=value;this.enabled=Boolean(value)&&saved.enabled;}catch{this.storageError=true;}}
 }
 status(){return {configured:Boolean(this.url),enabled:this.enabled,persistence:this.file?'Saved privately on this computer; restored after restart.':'No persistent storage configured.',storageError:this.storageError};}
 validate(body){
  this.team.fields(body,['url','enabled'],['enabled']);if(body.url!==undefined&&(typeof body.url!=='string'||body.url.length>2000)||typeof body.enabled!=='boolean')throw new ApiError(400,'Enter an optional Zapier URL and choose whether to enable it');
  const value=body.url===undefined?this.url:body.url.trim();
  if(value){let url;try{url=new URL(value);}catch{throw new ApiError(400,'Enter a valid HTTPS Zapier Catch Hook URL');}
   // An exact host prevents the setting becoming a way to call private servers.
   if(url.protocol!=='https:'||url.hostname!=='hooks.zapier.com'||url.port||url.username||url.password||url.hash||!/^\/hooks\/catch\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)||url.search)throw new ApiError(400,'Use an HTTPS hooks.zapier.com/hooks/catch/.../.../ URL');
  }
  return value;
 }
 configure(body){
  const value=this.validate(body),enabled=Boolean(value)&&body.enabled;
  if(this.file){let temporary=null;try{
   if(fs.existsSync(this.file)){const stat=fs.lstatSync(this.file);if(!stat.isFile()||stat.isSymbolicLink())throw Error();}
   temporary=this.file+'.'+randomUUID()+'.tmp';fs.writeFileSync(temporary,JSON.stringify({version:1,url:value,enabled}),{flag:'wx',mode:0o600});fs.renameSync(temporary,this.file);temporary=null;
  }catch{throw new ApiError(409,'Webhook setting could not be saved locally. No delivery setting was changed.');}finally{if(temporary)try{fs.unlinkSync(temporary);}catch{}}}
  this.url=value;this.enabled=enabled;this.storageError=false;return this.status();
 }
 async send(job){
  if(!this.enabled||!this.url)return {status:'disabled'};
  if(job.status!=='awaiting_owner')return {status:'not_ready'};
  if(this.attempted.has(job.id))return {status:'already_attempted'};
  // Send a small progress report, never source files, credentials or full context.
  const secrets=this.team.config?.ai?.providers?.map(p=>p.key)||[];
  const payload={event:'worker_reports_ready',jobId:job.id,taskId:job.task_id,status:job.status,roles:job.state.roles,completedSteps:job.state.completedSteps.map(text=>cleanReport(text,secrets)),ownerAcceptance:'still_required'};
  this.team.safe(payload);const raw=JSON.stringify(payload);if(Buffer.byteLength(raw)>8000)return {status:'too_large'};
  this.attempted.add(job.id);return this.post(raw);
 }
 async sendStep(step,{signal}={}){
  if(!this.enabled||!this.url)return {status:'disabled'};
  if(!/^[A-Za-z0-9-]{1,100}$/.test(step.jobId)||!Number.isSafeInteger(step.round)||step.round<1||step.round>10||!['builder','tester','reviewer'].includes(step.role)||!['builder','tester','reviewer'].includes(step.expectedNextRole)||!['codex-personal','codex-school','claude-code','deepseek'].includes(step.agent))throw new ApiError(400,'Invalid step report identity');
  const key='step:'+step.jobId+':'+step.round;if(this.attempted.has(key))return {status:'already_attempted'};
  const secrets=[...(this.team.config?.ai?.providers?.map(p=>p.key)||[]),this.team.config?.handoff?.token||''];
  const payload={event:'agent_step_finished',jobId:step.jobId,round:step.round,role:step.role,agent:step.agent,expectedNextRole:step.expectedNextRole,report:cleanReport(step.report,secrets)};
  this.team.safe(payload);const raw=JSON.stringify(payload);if(Buffer.byteLength(raw)>8000)throw new ApiError(400,'Cleaned report is too large');
  this.attempted.add(key);return this.post(raw,signal);
 }
 async post(raw,signal){
  if(signal?.aborted)return {status:'stopped'};
  const abort=new AbortController(),stop=()=>abort.abort();signal?.addEventListener('abort',stop,{once:true});const timer=setTimeout(stop,this.timeoutMs);
  try{const response=await this.fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json'},body:raw,signal:abort.signal,redirect:'error'});await response.body?.cancel();return {status:response.ok?'delivered':'failed',httpStatus:response.status};}
  catch{return {status:'unknown',message:'Delivery was not confirmed. No automatic retry was made.'};}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',stop);}
 }
}
