import {inspectExpansion} from '../services/expansion-verification.js';
import {recordAccountTerms,setProviderEnabled} from '../services/expansion-policy.js';
import {teamConnectionStatus} from '../services/team-status.js';
import {artifactSummaries} from '../services/artifact-summaries.js';
import {Router} from 'express';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
import {text,transaction} from '../middleware/ai-validation.js';

// A same-origin browser capability, not multi-user authentication. No CORS.
export function consoleRoutes(team,service){
 const r=Router(),token=randomBytes(32).toString('hex'),send=(res,data,status=200)=>res.status(status).json({data});
 r.use((req,res,next)=>{
  res.set('Cache-Control','no-store');
  const host=req.headers.host||'',origin=req.headers.origin;
  if(!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host)||origin&&origin!==`http://${host}`||['cross-site','same-site'].includes(req.headers['sec-fetch-site']))return next(new ApiError(403,'Open this dashboard directly on localhost'));
  if(req.method!=='GET'){
   const supplied=Buffer.from(req.headers['x-dashboard-token']||'');
   if(!req.is('application/json')||supplied.length!==token.length||!timingSafeEqual(supplied,Buffer.from(token)))return next(new ApiError(403,'Dashboard session expired. Refresh and try again.'));
  }
  next();
 });
 r.get('/session',(req,res)=>send(res,{token}));
 r.get('/big-three/connections',(req,res)=>send(res,team.hubConnections.status()));
 r.post('/big-three/hello',async(req,res)=>send(res,await team.hubConnections.test(req.body)));
 r.get('/settings/webhook',(req,res)=>send(res,team.webhook.status()));
 r.post('/settings/webhook',(req,res)=>send(res,team.webhook.configure(req.body)));
 r.post('/shared-jobs/:id/roles',(req,res)=>{team.fields(req.body,['roles','rotate','version'],['version']);if(!Number.isSafeInteger(req.body.version)||team.coordinator.read(req.params.id).version!==req.body.version)throw new ApiError(409,'The job changed. Refresh before changing roles.');if(req.body.rotate!==undefined&&typeof req.body.rotate!=='boolean')throw new ApiError(400,'Invalid rotation choice');const {lease,...job}=team.coordinator.setRoles(req.params.id,req.body.roles,req.body.rotate===true);send(res,job);});
 r.get('/shared-jobs/:id',(req,res)=>send(res,{job:team.coordinator.list().find(j=>j.id===req.params.id),history:team.coordinator.history(req.params.id)}));
 r.post('/tasks/:id/shared-job',(req,res)=>{team.fields(req.body,['approvedBy']);if(req.body.approvedBy!=='owner'||team.config.teamFocus!=='big_three')throw new ApiError(403,'Owner-approved Big Three task required');const {lease,...job}=team.coordinator.create(req.params.id);send(res,job,201);});
 // No executable connectors are registered by production. This bounded call pauses
 // cleanly with setup reasons; it cannot turn on a provider or paid fallback.
 r.post('/shared-jobs/:id/run',async(req,res)=>{team.fields(req.body,[]);if(team.config.teamFocus!=='big_three')throw new ApiError(403,'Big Three focus required');const {lease,...job}=await team.coordinator.run(req.params.id);const webhook=await team.webhook.send(job);send(res,{...job,webhook});});
 r.get('/',(req,res)=>send(res,{...team.dashboard(),connections:teamConnectionStatus(team),events:team.db.prepare('SELECT e.*,t.description,t.project_id FROM team_events e JOIN tasks t ON t.id=e.task_id ORDER BY e.id DESC LIMIT 200').all(),reviewQueue:team.db.prepare("SELECT p.id,p.task_id,'DeepSeek' reviewer,p.status,p.created_at,t.project_id,t.description,j.state FROM deepseek_review_requests p JOIN team_jobs j ON j.task_id=p.task_id JOIN tasks t ON t.id=p.task_id WHERE p.draft_id=j.draft_id ORDER BY p.created_at DESC").all(),usage:team.usage.list()}));
 r.post('/tasks/:id/scope-live',(req,res)=>{team.fields(req.body,['approvedBy','confirmIncluded']);if(req.body.approvedBy!=='owner'||req.body.confirmIncluded!==true||!team.taskGrant)throw new ApiError(403,'Owner task-only session authorization required');team.taskGrant.assert(req.params.id);team.taskGrant.sessionEnabled=true;send(res,{taskSessionEnabled:true,globalLiveEnabled:team.liveOptIn});});
 r.post('/tasks/:id/verify-scope',async(req,res)=>{
  team.fields(req.body,['approvedBy','confirmReadOnly']);if(!team.taskGrant)throw new ApiError(403,'No owner task scope');
  team.taskGrant.assert(req.params.id,'verification');let claim=null;const start=Date.now();
  const scoped=Object.create(team);scoped.fetch=async(url,options)=>{if(options.method!=='GET'||claim)throw new ApiError(403,'One read-only verification allowed');claim=team.taskGrant.claim(req.params.id,'verification',url);return team.fetch(url,options);};
  const result=await inspectExpansion(scoped,'gemini',req.body);
  if(claim)team.taskGrant.record(claim,{httpStatus:result.httpStatus,elapsedMs:Date.now()-start,complete:result.httpStatus===200&&result.modelListed,errorKind:result.errorKind});
  send(res,result);
 });
 r.post('/providers/:id/verify',async(req,res)=>send(res,await inspectExpansion(team,req.params.id,req.body)));
 r.post('/providers/:id/terms',(req,res)=>send(res,recordAccountTerms(team,req.params.id,req.body)));
 r.post('/providers/:id/enabled',(req,res)=>send(res,setProviderEnabled(team,req.params.id,req.body)));
 r.post('/settings/live',(req,res)=>{team.fields(req.body,['enabled','confirmedFree']);if(typeof req.body.enabled!=='boolean'||req.body.enabled&&req.body.confirmedFree!==true)throw new ApiError(403,'Confirm free-account access before enabling this session');team.liveOptIn=req.body.enabled;send(res,{liveEnabled:team.liveOptIn});});
 r.post('/projects',(req,res)=>{
  team.fields(req.body,['name','description','requirements'],['name','requirements']);
  const name=text(req.body.name,'project name',200),requirements=text(req.body.requirements,'requirements',8000),description=req.body.description?text(req.body.description,'description',4000):requirements;
  const result=transaction(team.db,()=>{const project=service.create({name,description});const task=team.add(project.id,requirements);team.store.saveContext(project.id,requirements,[]);return {project,task};});send(res,result,201);
 });
 r.get('/tasks/:id',(req,res)=>send(res,{...team.detail(req.params.id),artifactSummaries:artifactSummaries(team.config,team.db,req.params.id)}));
 r.get('/tasks/:id/paid-review-scope',(req,res)=>send(res,team.paid.scope?.status(req.params.id)||null));
 r.post('/tasks/:id/revise-draft',(req,res)=>send(res,team.reviseDraft(req.params.id,req.body)));
 for(const [route,method] of Object.entries({plan:'editPlan','plan-decision':'planDecision',assign:'assign',reassign:'reassign','manual-draft':'manualDraft',tests:'tests',packet:'packet',review:'review',complete:'complete',corrections:'ownerCorrections'}))r.post('/tasks/:id/'+route,(req,res)=>send(res,team[method](req.params.id,req.body)));
 r.post('/tasks/:id/start-plan',(req,res)=>{team.fields(req.body,[]);send(res,team.startPlan(req.params.id));});
 r.post('/tasks/:id/approve-plan',(req,res)=>send(res,team.approvePlan(req.params.id,req.body)));
 r.post('/tasks/:id/verify-children',(req,res)=>{team.fields(req.body,[]);send(res,team.verifyParent(req.params.id));});
 r.post('/tasks/:id/run',async(req,res)=>{team.fields(req.body,['authorizeRequest','expectedModel','allowFallback','category','operationId'],['authorizeRequest','expectedModel']);const task=team.get(req.params.id),model=team.models(req.params.id).find(m=>m.key===task.model_key);if(!model||req.body.expectedModel!==model.model)throw new ApiError(409,'Assignment changed. Refresh and authorize the displayed model again.');send(res,await team.run(req.params.id,{authorizeRequest:req.body.authorizeRequest,...Object.fromEntries(["allowFallback","category","operationId"].filter(k=>req.body[k]!==undefined).map(k=>[k,req.body[k]]))}));});
 r.post('/tasks/:id/review-quote',(req,res)=>{team.fields(req.body,['reviewId','outputTokens']);send(res,team.paid.quote(req.params.id,req.body.outputTokens,req.body.reviewId));});
 r.post('/tasks/:id/review-run',async(req,res)=>send(res,await team.paid.execute(req.params.id,req.body,'review')));
 r.post('/tasks/:id/paid-quote',(req,res)=>{team.fields(req.body,['outputTokens']);send(res,team.paid.quote(req.params.id,req.body.outputTokens));});
 r.post('/tasks/:id/paid-run',async(req,res)=>send(res,await team.paid.execute(req.params.id,req.body)));
 r.post('/paid/verify',async(req,res)=>send(res,await team.paid.inspect(req.body)));
 r.post('/paid/balance',async(req,res)=>{team.fields(req.body,['approvedBy','confirmPaid']);send(res,await team.paid.balance(req.body));});
 r.post('/tasks/:id/resume',async(req,res)=>send(res,await team.resume(req.params.id,req.body)));
 r.post('/tasks/:id/pause',(req,res)=>send(res,team.pause(req.params.id,req.body)));
 r.post('/tasks/:id/auto-assign',(req,res)=>send(res,team.autoAssign(req.params.id,req.body)));
 r.post('/tasks/:id/generate-plan',async(req,res)=>send(res,await team.generatePlan(req.params.id,req.body)));
 return r;
}
