import {NemotronWorker} from '../services/nemotron-worker.js';
import {modelHealthSnapshot} from '../services/model-health.js';
import {fileTree,projectFile,revision,gitChange,inspection} from '../services/workspace-inspection.js';
import fs from 'node:fs';
import {promptHistory,historyMarkdown,historyText} from '../services/prompt-history.js';
import {developmentOutput} from '../services/workspace-output.js';
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
 // Old scoped/demo dispatch is retired. Existing records remain readable, but
 // cannot start an unexpected paid job through an obsolete control.
 r.use((req,res,next)=>{if(req.method==='POST'&&/^(?:\/big-three\/hello|\/demo-workers\/|\/messenger\/setup-sample|\/shared-jobs\/[^/]+\/(?:run|messenger\/(?:prepare|start|resume|pickup))|\/tasks\/[^/]+\/(?:shared-job|paid-(?:run|quote)|review-(?:run|quote))|\/paid\/balance)/.test(req.path))return next(new ApiError(410,'The old scoped/demo workflow is retired. Use Projects and Run.'));next();});
 r.post('/shared-jobs/:id/roles',(req,res)=>{team.fields(req.body,['roles','rotate','version'],['version']);if(!Number.isSafeInteger(req.body.version)||team.coordinator.read(req.params.id).version!==req.body.version)throw new ApiError(409,'The job changed. Refresh before changing roles.');if(req.body.rotate!==undefined&&typeof req.body.rotate!=='boolean')throw new ApiError(400,'Invalid rotation choice');const {lease,...job}=team.coordinator.setRoles(req.params.id,req.body.roles,req.body.rotate===true);send(res,job);});
 r.post('/paid/verify',async(req,res)=>send(res,await team.paid.inspect(req.body)));
 r.get('/studio/help/zapier',(req,res)=>send(res,{text:historyText(team,fs.readFileSync(new URL('../../docs/zapier-setup.md',import.meta.url),'utf8'))}));
 r.get('/studio/history',(req,res)=>{const result=promptHistory(team.studio,req.query);if(req.query.format==='markdown')return res.set('Content-Disposition','attachment; filename=devsquad-prompt-history.md').type('text/markdown').send(historyMarkdown(result));if(req.query.format==='json')return res.set('Content-Disposition','attachment; filename=devsquad-prompt-history.json').json(result);if(req.query.format)throw new ApiError(400,'Choose JSON or Markdown export.');send(res,result);});
 r.get('/studio/codex-profiles',async(req,res)=>{const workers=team.studio.workers,profiles=workers.profiles;if(!profiles)return send(res,{profiles:[]});if(req.query.check==='true')return send(res,{profiles:await Promise.all(profiles.list().map(p=>profiles.check(p.id,workers.transport.executables.codex,process.cwd())))});send(res,{profiles:profiles.list()});});
 r.post('/studio/chats/:id/execution-mode',(req,res)=>send(res,team.studio.runScope.select(req.params.id,req.body)));
 r.post('/studio/chats/:id/run-approval/refresh-deepseek',async(req,res)=>{
  const j=team.studio.get(req.params.id);
  if(j.status!=='ready'||j.state.runApproval||j.state.executionMode==='builder-only'||!Object.values(j.state.roles).includes('deepseek'))throw new ApiError(409,'Choose an unused DeepSeek team session.');
  send(res,await team.paid.refreshTeamFunding(req.body));
 });
 r.get('/studio/chats/:id/send-proposal',(req,res)=>send(res,team.studio.runScope.sendProposal(req.params.id)));
 r.get('/studio/chats/:id/run-approval',(req,res)=>send(res,team.studio.runScope.preview(req.params.id)));
 r.post('/studio/chats/:id/run-approval',(req,res)=>send(res,team.studio.runScope.arm(req.params.id,req.body,{requireProposal:true})));
 r.get('/studio/chats/:id/fallback',(req,res)=>send(res,team.studio.failover.status(req.params.id)));
 r.post('/studio/chats/:id/fallback',(req,res)=>send(res,team.studio.failover.configure(req.params.id,req.body)));
 r.get('/studio/workspace-initializations',(req,res)=>send(res,service.pending()));
 r.post('/studio/workspace-initializations/:id/recover',(req,res)=>{team.fields(req.body,['approvedBy'],['approvedBy']);if(req.body.approvedBy!=='owner')throw new ApiError(403,'Owner confirmation is required');send(res,service.recover(req.params.id));});
 r.get('/studio/projects/:id/roles',(req,res)=>send(res,team.studio.roleManager.get(req.params.id)));
 r.post('/studio/projects/:id/roles',(req,res)=>send(res,team.studio.roleManager.update(req.params.id,req.body)));
 r.post('/studio/folder-dialog',async(req,res)=>{team.fields(req.body,[]);send(res,await team.fileActions.choose());});
 r.get('/studio/projects/:id/file-details',(req,res)=>send(res,team.fileActions.details(req.params.id,req.query.path||'')));
 r.get('/studio/projects/:id/file-actions',(req,res)=>send(res,team.fileActions.history(req.params.id)));
 r.post('/studio/projects/:id/file-actions/inspect',(req,res)=>send(res,team.fileActions.inspect(req.params.id,req.body)));
 r.post('/studio/projects/:id/file-actions/confirm',async(req,res)=>send(res,await team.fileActions.confirm(req.params.id,req.body)));
 r.post('/studio/projects/:id/workspace-membership',(req,res)=>send(res,team.fileActions.setHidden(req.params.id,req.body)));
 r.post('/studio/projects/:id/reveal',async(req,res)=>send(res,await team.fileActions.reveal(req.params.id,req.body)));
 r.post('/studio/chats/:id/title',(req,res)=>send(res,team.fileActions.renameSession(req.params.id,req.body)));
 r.post('/studio/nemotron/check',async(req,res)=>{team.fields(req.body,[]);send(res,await new NemotronWorker(team).refresh(AbortSignal.timeout(45000)));});
 r.get('/studio/model-health',(req,res)=>send(res,modelHealthSnapshot(team,Date.now(),req.query.chat||null)));
 r.get('/studio',(req,res)=>send(res,team.studio.list()));
 r.get('/studio/chats/:id/events',(req,res)=>team.studio.live.stream(req,res,req.params.id));
 r.post('/studio/chats/:id/reconcile',(req,res)=>{team.fields(req.body,['executionId','version']);send(res,team.studio.executions.reconcile(req.params.id,req.body));});
 r.get('/studio/chats/:id/output',(req,res)=>send(res,developmentOutput(team.studio,req.params.id)));
 r.get('/studio/projects/:id/preview',(req,res)=>send(res,team.preview.status(req.params.id)));
 r.post('/studio/projects/:id/preview',async(req,res)=>{team.fields(req.body,['url','revoke'],[]);if(req.body.revoke===true){team.preview.revoke(req.params.id);return send(res,team.preview.status(req.params.id));}send(res,await team.preview.authorize(req.params.id,req.body.url,`http://${req.headers.host}`));});
 r.post('/studio/projects/:id/preview/refresh',async(req,res)=>{team.fields(req.body,['generation']);const s=team.preview.current(req.params.id,req.body.generation);await team.preview.probe(s);send(res,team.preview.status(req.params.id));});
 r.get('/studio/projects/:id/preview/frame',(req,res)=>team.preview.frame(req.params.id,req.query.generation,res));
 r.get('/studio/projects/:id/preview/external',(req,res)=>{const s=team.preview.current(req.params.id,req.query.generation);res.redirect(s.origin+(s.lastPath||'/'));});
 r.post('/studio/projects',(req,res)=>{team.fields(req.body,['name']);send(res,team.studio.project(req.body),201);});
 r.post('/studio/project-connections/inspect',(req,res)=>send(res,team.projectConnections.inspect(req.body)));
 r.post('/studio/project-connections/confirm',async(req,res)=>send(res,await team.projectConnections.confirm(req.body),201));
 r.get('/studio/project-connections/clones/:id',(req,res)=>send(res,team.projectConnections.job(req.params.id)));
 r.post('/studio/projects/:id/access',(req,res)=>send(res,team.projectConnections.access(req.params.id,req.body)));
 r.post('/studio/projects/:id/chats',(req,res)=>{team.fields(req.body,['task']);send(res,team.studio.create(req.params.id,req.body.task),201);});
 r.post('/studio/projects/:id/sessions',(req,res)=>send(res,team.studio.session(req.params.id,req.body),201));
 r.post('/studio/chats/:id/messages',(req,res)=>send(res,team.studio.message(req.params.id,req.body),201));
 r.get('/studio/projects/:id/references',(req,res)=>send(res,{files:team.studio.root(req.params.id).list().filter(p=>/\.(?:[cm]?js|jsx|tsx?|json|md|txt|html|css|py|go|rs|ya?ml)$/i.test(p)).slice(0,500)}));
 r.get('/studio/projects/:id/files',(req,res)=>send(res,fileTree(team.studio,req.params.id)));
 r.get('/studio/projects/:id/file',(req,res)=>send(res,projectFile(team.studio,req.params.id,req.query.path)));
 r.get('/studio/projects/:id/git-change',(req,res)=>send(res,gitChange(team.studio,req.params.id,req.query.path)));
 r.get('/studio/projects/:id/inspection',(req,res)=>send(res,inspection(team.studio,req.params.id,req.query.chat||null)));
 r.get('/studio/chats/:id/revisions/:revision',(req,res)=>send(res,revision(team.studio,req.params.id,req.params.revision)));
 r.get('/studio/chats/:id',(req,res)=>send(res,team.studio.detail(req.params.id)));
 r.post('/studio/projects/:id/run',(req,res)=>send(res,team.studio.start(req.params.id,req.body,{requireTeamProposal:true}),202));
 r.post('/studio/chats/:id/stop',(req,res)=>{team.fields(req.body,[]);send(res,team.studio.stop(req.params.id));});
 r.post('/studio/chats/:id/accept',(req,res)=>{team.fields(req.body,[]);send(res,team.studio.accept(req.params.id));});

 r.get('/big-three/connections',(req,res)=>send(res,team.hubConnections.status()));
 r.get('/settings/webhook',(req,res)=>send(res,team.webhook.status()));
 r.post('/settings/webhook',(req,res)=>send(res,team.webhook.configure(req.body)));
 r.get('/messenger',(req,res)=>send(res,team.messenger.status()));
 r.get('/demo-workers',(req,res)=>send(res,team.demoWorkers.status()));
 r.post('/shared-jobs/:id/messenger/stop',(req,res)=>{team.fields(req.body,[]);send(res,team.messenger.stop(req.params.id));});
 r.get('/shared-jobs/:id',(req,res)=>send(res,{job:team.coordinator.list().find(j=>j.id===req.params.id),history:team.coordinator.history(req.params.id)}));
 // No executable connectors are registered by production. This bounded call pauses
 // cleanly with setup reasons; it cannot turn on a provider or paid fallback.
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
 r.post('/tasks/:id/resume',async(req,res)=>send(res,await team.resume(req.params.id,req.body)));
 r.post('/tasks/:id/pause',(req,res)=>send(res,team.pause(req.params.id,req.body)));
 r.post('/tasks/:id/auto-assign',(req,res)=>send(res,team.autoAssign(req.params.id,req.body)));
 r.post('/tasks/:id/generate-plan',async(req,res)=>send(res,await team.generatePlan(req.params.id,req.body)));
 return r;
}
