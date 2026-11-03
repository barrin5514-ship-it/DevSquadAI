import {ApiError} from '../middleware/errors.js';

// Empty means off. The URL is kept only in this backend session, never in Git,
// logs, job history or browser responses. Restarting returns the setting to off.
export class WebhookOut {
 constructor(team,{fetchImpl=fetch,timeoutMs=5000}={}){this.team=team;this.fetch=fetchImpl;this.timeoutMs=timeoutMs;this.url='';this.enabled=false;this.attempted=new Set();}
 status(){return {configured:Boolean(this.url),enabled:this.enabled,persistence:'This backend session only; restarting disables delivery.'};}
 configure(body){
  this.team.fields(body,['url','enabled']);if(typeof body.url!=='string'||body.url.length>2000||typeof body.enabled!=='boolean')throw new ApiError(400,'Enter an optional Zapier URL and choose whether to enable it');
  const value=body.url.trim();
  if(value){let url;try{url=new URL(value);}catch{throw new ApiError(400,'Enter a valid HTTPS Zapier Catch Hook URL');}
   // An exact host prevents the setting becoming a way to call private servers.
   if(url.protocol!=='https:'||url.hostname!=='hooks.zapier.com'||url.port||url.username||url.password||url.hash||!/^\/hooks\/catch\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)||url.search)throw new ApiError(400,'Use an HTTPS hooks.zapier.com/hooks/catch/.../.../ URL');
  }
  this.url=value;this.enabled=Boolean(value)&&body.enabled;return this.status();
 }
 async send(job){
  if(!this.enabled||!this.url)return {status:'disabled'};
  if(job.status!=='awaiting_owner')return {status:'not_ready'};
  if(this.attempted.has(job.id))return {status:'already_attempted'};
  // Send a small progress report, never source files, credentials or full context.
  const payload={event:'worker_reports_ready',jobId:job.id,taskId:job.task_id,status:job.status,roles:job.state.roles,completedSteps:job.state.completedSteps,ownerAcceptance:'still_required'};
  this.team.safe(payload);const raw=JSON.stringify(payload);if(Buffer.byteLength(raw)>8000)return {status:'too_large'};
  this.attempted.add(job.id);const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),this.timeoutMs);
  try{const response=await this.fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json'},body:raw,signal:abort.signal,redirect:'error'});return {status:response.ok?'delivered':'failed',httpStatus:response.status};}
  catch{return {status:'unknown',message:'Delivery was not confirmed. No automatic retry was made.'};}
  finally{clearTimeout(timer);}
 }
}
