import {cleanOutput} from './workspace-output.js';
import {testPlan,packageConfigFailure} from './studio-test-plan.js';
import {installedDependencyHash,isolatedTestLaunch,npmRuntime,ownerTestCopyMatches} from './studio-npm-runner.js';
import {inspectProcessTree} from './studio-executions.js';
import {workerIdle} from './worker-idle.js';
import {CodexProfiles,codexProfileIds} from './codex-profiles.js';
import {NemotronWorker,nemotronId,studioWorkerIds} from './nemotron-worker.js';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';import {spawn,spawnSync} from 'node:child_process';
import {ProjectFiles,hashText} from './project-files.js';import {NativeDemoBoundary,isolationArgs} from './demo-isolation.js';import {DemoCliTransport} from './demo-cli-transport.js';import {cliEnvironment} from './cli-hello.js';
import {councilInstruction} from './studio-repair-council.js';
import {replyEvidence} from './studio-failure-evidence.js';
const instructions='Read the JSON packet. Its phase and actualRoles are authoritative even if the goal text names different agents. Return only JSON with report, files, and review (null except in reviewer phase). In builder phase write the requested implementation and tests. If repairPlan is present, implement only that agreed fix and leave unrelated files and behavior alone. In Tester phase write independent node:test tests using node:assert/strict. If runner.command is npm test, Dev Squad also runs the existing project suite under that owner setting. Do not change the package test command. Browser code may be tested with a small node:vm DOM fixture. Write or correct independent *.test.js, *.test.mjs or *.test.cjs files only; the application runs them separately. In reviewer phase return files:[] and review:{...reviewBinding,decision:"approved" or "changes_requested",summary:"...",findings:[]}; reviewerExecutedTests stays false. Never claim to have executed tests. No tools, credentials, commands or unrelated files. Use plain-English comments.';
const contextInstruction=' The project map lists available paths; files contains only a small starter excerpt. To get more information, return contextRequests (up to three) with operation search or read, query for search or path for read, and offset (null for the first page). Return files:[] and review:null for a context request. The next packet includes contextResults, with nextOffset when another page is available. No shell or native tools are authorized. Use only the supplied results; if essential context cannot be read, request it again so Dev Squad pauses instead of accepting guessed work. For a final result, set contextRequests to null.';
// The native login broker is trusted, but model tools are off. All model file
// access is mediated by ProjectFiles. Generated tests run separately in MXC.
export class StudioWorkers {
 constructor(team,{transport=new DemoCliTransport(),profiles=new CodexProfiles(),idleMs=180000}={}){this.team=team;this.transport=transport;this.profiles=profiles;this.idleMs=idleMs;this.nemotron=new NemotronWorker(team);}
 async preflight(job,root,signal){for(const phase of (job.state.executionMode==='builder-only'?['builder']:['builder','tester','reviewer'].slice(job.state.runApproval?.savedTestsOnly?2:['builder','tester','reviewer'].indexOf(job.state.phase)))){const agent=job.state.executionMode==='builder-only'?job.state.builderOnlyAgent:job.state.roles[phase];if(agent==='deepseek')continue;if(agent===nemotronId){if(!job.state.runApproval?.free)return {agent,phase,code:'run_scope_limit',message:'Nemotron requires separate bounded owner approval.'};const ready=await this.nemotron.refresh(signal);if(!ready.ok)return {agent,phase,code:'provider_unavailable',message:ready.reason};continue;}if(signal.aborted)throw {ownerStop:true};const health=await this.availability(agent,root,signal);if(!health.ok)return {agent,phase,code:health.code||'auth_expired',message:'Before starting the team, the '+phase+' login ('+agent+') could not be verified. No new model request was sent. Inspect the saved fallback checks.'};}return null;}
 async availability(agent,root,signal){if(signal?.aborted)return {ok:false,code:'owner_stop'};if(agent===nemotronId)return {...this.nemotron.status(),code:'provider_unavailable'};if(agent.startsWith('codex-')&&!this.profiles.configured(agent))return {ok:false,code:'auth_missing'};if(agent.startsWith('codex-'))return this.profiles.check(agent,this.transport.executables.codex,root);if(agent==='claude-code')return {ok:await Promise.resolve().then(()=>this.transport.authCheck('claude',this.transport.executables.claude,root,cliEnvironment(),null)).catch(()=>false),code:'auth_expired'};return {ok:false,code:'availability_unknown'};}
 async profileAvailable(id,root){return (await this.profiles.check(id,this.transport.executables.codex,root)).ok;}
 async call(agent,packet,root,signal,execution={}){this.team.safe(packet);if(!studioWorkerIds.includes(agent))throw Error('Selected worker has no configured project transport');
  const instruction=execution.council?councilInstruction:instructions+(packet.projectContext?contextInstruction:' Set contextRequests to null.');
  if(agent===nemotronId)return this.nemotron.call(packet,root,signal,execution,instruction);
  if(agent!=='deepseek'){const nativeSignal=signal,deadline=execution.nativeLimits?AbortSignal.timeout(Math.max(1,Date.parse(execution.nativeLimits.expiresAt)-Date.now())):null;try{return await this.transport.run(agent.startsWith('codex-')?'codex':'claude',packet,root,{redactionSecrets:this.team.coordinator?.configuredSecrets()||[],signal:deadline?AbortSignal.any([nativeSignal,deadline]):nativeSignal,maxOutputBytes:execution.nativeLimits?.maxOutputBytes||65536,profile:agent.startsWith('codex-')?this.profiles.selection(agent):null,timeoutMs:execution.nativeLimits?Math.min(this.team.config?.studioTimeouts?.[agent]||300000,execution.nativeLimits.timeoutMs):(this.team.config?.studioTimeouts?.[agent]||300000),onEvent:execution.onEvent,onFailure:execution.onFailure,onReply:execution.onReply,streamProgress:true,codexIsolation:agent.startsWith('codex-')?isolationArgs(root,{readOnly:execution.council===true}):null,instruction,outputSchema:agent.startsWith('codex-')?fileURLToPath(new URL('./studio-worker.schema.json',import.meta.url)):null});}catch(error){if(deadline?.aborted&&!nativeSignal.aborted)throw {...error,code:'run_scope_expired',ownerStop:false};throw error;}}
  const settings=this.team.paid.settings;if(!settings?.key||settings.base!=='https://api.deepseek.com'||!settings.model)throw Error('DeepSeek key or official model configuration is missing');
  // Send starts the selected workflow. Explicit automatic-handoff policies
  // require the task's prepaid reservation before any DeepSeek request.
  const adapter=this.team.paid.adapter(),idleAbort=new AbortController();let idle,lastActivity=0;adapter.onResponseActivity=()=>{idle?.touch();if(Date.now()-lastActivity>=1000){lastActivity=Date.now();execution.onEvent?.({lastActivityAt:new Date(lastActivity).toISOString(),progress:'Provider response bytes received; waiting for the complete result.'});}};adapter.timeout=this.team.config?.studioTimeouts?.deepseek||90000;adapter.streamIdleTimeout=this.idleMs;adapter.onStreamProgress=update=>execution.onEvent?.({...update,lastActivityAt:new Date().toISOString()});const original=adapter.fetch;adapter.fetch=(url,o)=>original(url,{...o,signal:AbortSignal.any([o.signal,signal,idleAbort.signal])});
  const body={model:settings.model,messages:[{role:'system',content:instruction},{role:'user',content:JSON.stringify(packet)}],thinking:{type:'disabled'},response_format:{type:'json_object'},stream:true,stream_options:{include_usage:true}};
  const guarded=execution.fallbackBudget,budget=guarded?guarded.budget(execution.chatId):null,bound=execution.nativeLimits?.paid?.maxOutput??budget?.policy?.max_output??8192;body.max_tokens=bound;adapter.tokenLimit=bound;if(guarded)guarded.reserve(execution.chatId,execution.executionId,body);
  execution.usage?.start(execution.chatId,execution.executionId,settings.model);
  execution.onEvent?.({status:'waiting',startedAt:new Date().toISOString(),timeoutMs:adapter.timeout,progress:'Sending one DeepSeek request; no automatic transport retry. Visible-answer progress will stream.'});
  const recordResponseFailure=(diagnostics,failedCheck)=>{
   const meta=diagnostics?.deepseekResponse;
   execution.onEvent?.({deepseekResponse:{failedCheck:failedCheck||meta?.failedCheck||(diagnostics?.httpStatus?'http_response':'request'),completionObserved:meta?.completionObserved??false,finishReason:meta?.finishReason??null,usageReported:meta?.usageReported??false,httpStatus:diagnostics?.httpStatus??null}});
  };
  // A completed but truncated answer can still carry final billable usage.
  // Partial stream observations never release an unknown reservation.
  const teamSend=execution.nativeLimits?.mode==='team-send';let r,rejected=false,reportedUsage=null;try{idle=workerIdle(()=>idleAbort.abort(),this.idleMs);r=await (guarded?adapter.generateBound(body,hashText(JSON.stringify(body))):adapter.generateStudio(body,hashText(JSON.stringify(body))));}catch(e){reportedUsage=e.usage||null;recordResponseFailure(e.diagnostics);execution.usage?.record(execution.chatId,execution.executionId,settings.model,e.usage||e.observedUsage||null,e.usage?'incomplete':'unknown');if(idleAbort.signal.aborted)e.code='inactivity_timeout';if(teamSend&&!signal.aborted){rejected=[401,402,403,429].includes(e.httpStatus);if(rejected)e.code=e.httpStatus===429?'rate_limit':e.httpStatus===402?'payment_required':'auth_expired';}e.unknownOutcome=!e.usage&&!rejected;e.stopped=true;throw e;}finally{idle?.close();if(guarded)guarded.settle(execution.executionId,r?.usage||reportedUsage,{teamSend,rejected});}
  execution.usage?.record(execution.chatId,execution.executionId,settings.model,r.usage,'response_received');
  let value;try{value=JSON.parse(r.text);}catch(error){recordResponseFailure(r.diagnostics,'answer_json');execution.onFailure?.(replyEvidence(r.text,'answer_json',error));throw new SyntaxError('DeepSeek final answer is not valid JSON.');}
  execution.onReply?.(r.text);
  return {...value,usage:r.usage,model:settings.model,httpStatus:r.diagnostics?.httpStatus};
 }
 async tests(root,signal,onExecution=()=>{},{testFiles=null,testCommand=null}={}){
  const source=new ProjectFiles(root),files=source.list(),plan=testPlan(source,{testFiles,testCommand});
  const lifecycle=content=>onExecution({kind:'test_process',content});
  const clean=value=>cleanOutput(this.team.coordinator?this.team:{coordinator:{configuredSecrets:()=>[]}},value);
  let testedHash=null,dependencyHash=null,projectSuite=null;
  const blocked=(summary,details={})=>clean({executed:false,passed:false,status:'blocked',failures:[summary],summary,...(testCommand?{framework:'npm',command:['npm','test'],revisionHash:testedHash,dependencyHash,projectSuite:projectSuite||{status:'blocked',executed:false,exitCode:null,summary}}:{}),...details});
  if(plan.blocked)return blocked(plan.blocked,plan.packageConfigFailure?{packageConfigFailure:plan.packageConfigFailure}:{});
  const parent=path.join(source.root,'.devsquad-tests');if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink())throw Error('Test storage is a link');fs.mkdirSync(parent,{recursive:true});const copy=path.join(parent,randomUUID());fs.mkdirSync(copy);let retainCopy=false;
  try{
   let total=0;
   for(const relative of files){
    let content;
    try{content=source.read(relative,1000000);}catch(error){return blocked(error.status===413?'A project file exceeds the isolated copy limit of 1 MB.':'A project file could not be copied safely into the test workspace.');}
    total+=content.length;
    if(total>20000000)return blocked('The project exceeds the isolated copy limit of 20 MB.');
    const destination=path.join(copy,relative);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,content,{flag:'wx'});
   }
   testedHash=new ProjectFiles(copy).fingerprint();
   const manifest=path.join(copy,'package.json'),defaultPackageScope=!fs.existsSync(manifest);
   // Keep Node's package search inside MXC without changing the project's files or module type.
   if(defaultPackageScope)fs.writeFileSync(manifest,'{}\n',{flag:'wx'});
   let npm;
   if(plan.npm){
    try{
     if(source.fingerprint()!==testedHash)return blocked('Project files changed while the test copy was prepared.');
     const copiedPlan=testPlan(new ProjectFiles(copy),{testFiles,testCommand});
     if(copiedPlan.blocked)return blocked(copiedPlan.blocked);
     npm=npmRuntime();
     dependencyHash=installedDependencyHash(source.root,copy,copiedPlan.npm.manifest);
    }catch(error){return blocked(error.syscall?'The installed dependency tree could not be read safely.':error.message);}
   }
   const boundary=new NativeDemoBoundary(this.team),exe=boundary.exe;if(!fs.existsSync(exe)){if(plan.npm)return blocked('Windows MXC is unavailable.');throw Error('Codex MXC sandbox is unavailable; tests were not executed');}
   // A real, non-model OS check runs before untrusted tests. It proves this
   // selected copy cannot read its parent; it never probes a real credential.
   const decoy=path.join(parent,randomUUID()+'.txt');fs.writeFileSync(decoy,'FAKE_SANDBOX_DECOY',{flag:'wx'});
   const probe='try{require("node:fs").readFileSync(process.argv[1]);process.exit(2)}catch(e){process.exit(["EACCES","EPERM"].includes(e.code)?0:3)}';
   try{const proof=await this.command(exe,copy,[process.execPath,'-e',probe,decoy],signal,lifecycle);if(proof.exit!==0){if(plan.npm)return blocked('Selected project sandbox check failed.');throw Error('Selected project sandbox check failed; tests were not executed');}}finally{fs.unlinkSync(decoy);}
   const execute=async(framework,commandSource,shown,args)=>{
    const start=Date.now(),launcher=plan.npm?isolatedTestLaunch(copy,args):null;
    const info={framework,commandSource,workingDirectory:'.devsquad-tests/'+path.basename(copy),command:shown,launcher:'Codex MXC sandbox',startedAt:new Date().toISOString(),revisionHash:testedHash,defaultPackageScope,...(plan.npm?{dependencyHash}:{})};
    onExecution({kind:'execution_started',content:info});
    let r;
    try{
     r=await this.command(exe,copy,launcher?.command||[process.execPath,...args],signal,lifecycle);
     r={...r,stderr:r.stderr??''};
     if(launcher){
      r=launcher.result(r);
      launcher.clearScratch();
     }
    }catch(e){
     onExecution({kind:'execution_finished',content:{...info,exit:null,durationMs:Date.now()-start,code:e.code||'test_error',timedOut:e.code==='timeout',cancelled:e.ownerStop===true,error:'Test process did not finish; no pass recorded.'}});
     throw e;
    }
    const configFailure=framework==='node:test'&&r.exit!==0?packageConfigFailure(new ProjectFiles(copy),r.stdout,r.stderr):null;
    const durationMs=Date.now()-start;
    onExecution({kind:'execution_finished',content:clean({...info,finishedAt:new Date().toISOString(),durationMs,exit:r.exit,...(launcher?{executed:r.observed}:{}),...(configFailure?{packageConfigFailure:configFailure}:{}),stdout:r.stdout,stderr:r.stderr,truncated:r.stdout.length>16000||r.stderr.length>16000})});
    return {r,info,configFailure,durationMs};
   };
   const unchanged=()=>ownerTestCopyMatches(copy,files)&&new ProjectFiles(copy).fingerprint()===testedHash&&installedDependencyHash(copy,null,{},true)===dependencyHash;
   const stoppedTest=error=>error.code==='timeout'?'The isolated test command timed out.':error.code==='output_limit'?'The isolated test command exceeded its output limit.':'The isolated test command could not finish.';
   if(plan.npm){
    let result;
    try{result=await execute('npm','owner-configured npm test',['npm','test'],[npm,'--ignore-scripts','--offline','--workspaces=false','test']);}
    catch(error){if(!error.stopped||error.ownerStop)throw error;return blocked(stoppedTest(error),{timedOut:error.code==='timeout'});}
    const {r,info,durationMs}=result;
    const missing=r.exit!==0&&([127,9009].includes(r.exit)||/MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|is not recognized as an internal or external command|could not determine executable/i.test(r.stderr));
    const status=!r.observed||missing?'blocked':r.exit===0?'passed':'failed';
    const summary=missing?'npm test could not start a required executable or load a required module. See the saved command output.':status==='blocked'?'The npm command could not be verified in Windows MXC.':status==='failed'?'npm test exited with code '+r.exit+'.':'npm test exited successfully.';
    projectSuite={status,executed:r.observed,passed:status==='passed',exitCode:r.observed?r.exit:null,count:null,failed:null,summary,stdout:r.stdout,stderr:r.stderr,outputHash:hashText(r.stdout+'\n'+r.stderr),command:info.command,workingDirectory:info.workingDirectory,revisionHash:testedHash,dependencyHash,durationMs,backend:'mxc'};
    if(status==='blocked')return blocked(summary);
    if(status==='failed')return clean({...projectSuite,projectSuite,framework:'npm',count:null,failed:null,failures:[summary]});
    try{if(!unchanged())return blocked('The test copy changed during npm test. Independent tests did not run.');}
    catch{return blocked('The test copy changed during npm test. Independent tests did not run.');}
    if(!testFiles)return blocked('The npm command completed. Independent Tester files are required to record a test pass.',{executed:true,exitCode:r.exit});
   }
   let result;
   try{result=await execute(plan.framework,plan.source,['node',...plan.command],plan.command);}
   catch(error){if(!plan.npm||!error.stopped||error.ownerStop)throw error;return blocked(stoppedTest(error),{timedOut:error.code==='timeout'});}
   const {r,info,configFailure,durationMs}=result;
   if(plan.npm){
    if(!r.observed)return blocked('The independent Node process could not be verified in Windows MXC.');
    try{if(!unchanged()||installedDependencyHash(source.root)!==dependencyHash)return blocked('The test copy or installed project dependencies changed before verification finished.');}
    catch{return blocked('The test copy or installed project dependencies changed before verification finished.');}
   }
   const count=Number(/(?:#|ℹ)\s*tests\s+(\d+)/.exec(r.stdout)?.[1]||0),failed=Number(/(?:#|ℹ)\s*fail\s+(\d+)/.exec(r.stdout)?.[1]||0);const skipped=Number(/(?:#|ℹ)\s*skipped\s+(\d+)/.exec(r.stdout)?.[1]||0),passedCount=Number(/(?:#|ℹ)\s*pass\s+(\d+)/.exec(r.stdout)?.[1]||0);const failures=r.stdout.split(/\r?\n/).filter(x=>/^not ok|^✖/.test(x)).map(x=>x.replace(/^not ok\s+\d+\s*-?\s*/,''));
   const loaderOnly=configFailure&&count===1&&failed===1;
   const summary=configFailure?'Node could not load '+(configFailure.path||'a package configuration outside the test copy')+' ('+configFailure.code+'). '+configFailure.detail:count+' tests; '+failed+' failed.';
   const passed=!configFailure&&r.exit===0&&count>skipped&&failed===0&&source.fingerprint()===testedHash;
   return clean({executed:!loaderOnly,passed,...(plan.npm?{status:passed?'passed':'failed',projectSuite,dependencyHash}:{}),count:loaderOnly?0:count,failed:loaderOnly?0:failed,skipped,passedCount,framework:plan.framework,command:info.command,workingDirectory:info.workingDirectory,exitCode:r.exit,timedOut:false,stderr:r.stderr||'',failures:configFailure?[summary,...(loaderOnly?[]:failures)]:failures,summary,...(configFailure?{packageConfigFailure:configFailure}:{}),outputHash:hashText(r.stdout),revisionHash:testedHash,durationMs,backend:'mxc',names:loaderOnly?[]:tapTests(r.stdout)});
  }catch(error){retainCopy=error.stopped===false;throw error;}finally{if(!retainCopy&&fs.existsSync(copy)&&path.dirname(copy)===fs.realpathSync(parent)){if(fs.lstatSync(copy).isSymbolicLink())fs.unlinkSync(copy);else if(fs.realpathSync(copy)===copy)fs.rmSync(copy,{recursive:true,force:true});}}
 }
 command(exe,root,command,signal,onLifecycle=()=>{}){return new Promise((resolve,reject)=>{
  let child,done=false,stdout='',stderr='',timer,settle,reason=null,identity=null,descendants=[],killConfirmed=false;const inspect=this.inspectProcess||inspectProcessTree,clock=this.clock||Date.now,startMs=clock(),timeoutMs=this.team.config?.studioTimeouts?.tests||60000,startedAt=new Date().toISOString();
  const emit=value=>onLifecycle(value);
  const finish=(exit,closeObserved=false)=>{if(done)return;const late=!reason&&closeObserved&&clock()-startMs>=timeoutMs;if(late){reason='timeout';emit({status:'stopping',terminationRequested:'timeout',deadlineExceeded:true,descendants});}done=true;clearTimeout(timer);clearTimeout(settle);signal?.removeEventListener('abort',stop);const observed=child?.pid?inspect(child.pid):null;const childrenGone=descendants.every(p=>{const check=inspect(p.pid);return check.verified&&!check.processes.some(x=>x.pid===p.pid&&x.birth===p.birth);});const stopped=!child?.pid||closeObserved&&observed?.verified&&observed.processes.length===0&&childrenGone&&(!reason||killConfirmed||late);emit({status:reason==='owner_stop'?'cancelled':reason==='timeout'?'timed_out':reason||exit!==0?'failed':'completed',exitCode:exit,closeObserved,treeKillConfirmed:killConfirmed,terminationRequested:reason,descendants,endedAt:new Date().toISOString(),terminationVerified:stopped,timeoutMs:this.team.config?.studioTimeouts?.tests||60000});if(!stopped)return reject(Object.assign(Error('Isolated test process termination is unknown; no pass was recorded.'),{code:reason||'test_process_unknown',stopped:false}));if(reason)return reject(Object.assign(Error(reason==='owner_stop'?'Tests stopped by owner; no pass recorded.':'Tests exceeded their time or output limit; no pass recorded.'),{code:reason,ownerStop:reason==='owner_stop',stopped:true}));resolve({exit,stdout,stderr});};
  const terminate=why=>{if(done||reason)return;reason=why;clearTimeout(timer);const tree=child?.pid?inspect(child.pid):null;if(tree?.verified&&identity&&tree.processes.some(p=>p.pid===child.pid&&p.birth===identity.birth)){descendants=tree.processes.filter(p=>p.pid!==child.pid);emit({status:'stopping',terminationRequested:why,descendants});killConfirmed=(this.terminateTree?this.terminateTree(child.pid):spawnSync(path.join(process.env.SystemRoot||'C:/Windows','System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{timeout:5000,stdio:'ignore',windowsHide:true})).status===0;}settle=setTimeout(()=>finish(null,false),5000);};
  const stop=()=>terminate('owner_stop');if(signal?.aborted){reason='owner_stop';return finish(null,false);}try{child=(this.spawnProcess||spawn)(exe,['sandbox',...isolationArgs(root),'--',...command],{cwd:root,env:cliEnvironment(),shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});child.once('spawn',()=>{const tree=inspect(child.pid);identity=tree.verified?tree.processes.find(p=>p.pid===child.pid):null;emit({status:'running',stage:'isolated-tests',pid:child.pid,birth:identity?.birth||null,treeCaptured:!!identity,descendants:[],closeObserved:false,terminationRequested:null,treeKillConfirmed:false,launchAcknowledged:true,startedAt});});timer=setTimeout(()=>terminate('timeout'),timeoutMs);signal?.addEventListener('abort',stop,{once:true});child.stdout.on('data',v=>{stdout+=v;if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>256000)terminate('output_limit');});child.stderr.on('data',v=>{stderr+=v;if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>256000)terminate('output_limit');});child.once('error',()=>finish(null,false));child.once('close',code=>finish(code,true));}catch{finish(null,false);}
 });}

}

export function tapTests(text){const result=[];let last=null;for(const line of text.split(/\r?\n/)){const m=/^(ok|not ok) \d+ - (.*)$/.exec(line);if(m){last={name:m[2],passed:m[1]==='ok'};result.push(last);}const d=/^\s+duration_ms: ([\d.]+)/.exec(line);if(d&&last)last.durationMs=Number(d[1]);}return result;}
