// Production worker/HTTP/dashboard paths with fake provider and native-agent
// answers. Only the independent Node test runner really executes in MXC.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {once} from 'node:events';import {createRequire} from 'node:module';
import {createApp} from '../src/app.js';import {loadConfig} from '../src/config/index.js';import {hashText} from '../src/services/project-files.js';import {nemotronModel} from '../src/services/nemotron-worker.js';
const out='docs/verification/nemotron-integration-20261107/mock-browser',root=fs.mkdtempSync(path.join(os.tmpdir(),'nemotron-workflow-')),checks=[],calls=[],errors=[];fs.mkdirSync(out,{recursive:true});let runtime,server,browser,currentJob,activePacket;
const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
function response(p){if(p.phase==='builder')return {report:'SIMULATION Builder implementation',files:[{path:'sum.mjs',content:'export const sum=(a,b)=>a+b;'},{path:'builder.test.mjs',content:'throw Error("Builder tests cannot satisfy independent testing");'}],review:null};if(p.phase==='tester')return {report:'SIMULATION Tester-authored tests, not executed by the model',files:[{path:'independent.test.mjs',content:'import {test} from "node:test";import assert from "node:assert/strict";import {sum} from "./sum.mjs";test("integers",()=>assert.equal(sum(2,3),5));test("negatives",()=>assert.equal(sum(-2,3),1));'}],review:null};return {report:'SIMULATION Reviewer reads recorded execution evidence',files:[],review:{...p.reviewBinding,decision:'approved',summary:'SIMULATION only; no model performed execution',findings:[]}};}
const fetchImpl=async(url,o)=>{if(!url.startsWith('https://openrouter.ai/api/v1/'))throw Error('Unexpected provider/network');if(o.method==='GET'){const item={id:nemotronModel,pricing:{prompt:'0',completion:'0'},top_provider:{max_completion_tokens:131072},reasoning:{mandatory:false},supported_parameters:['max_tokens','reasoning','response_format','structured_outputs']};return new Response(JSON.stringify(url.endsWith('/key')?{data:{is_free_tier:true,free_model_daily_requests:{used:0,limit:50,remaining:50}}}:{data:[item]}),{status:200});}const b=JSON.parse(o.body),p=JSON.parse(b.messages[1].content);calls.push({agent:'nemotron',phase:p.phase,job:p.chatId});activePacket=p;return new Response(JSON.stringify({model:nemotronModel,choices:[{finish_reason:'stop',message:{content:JSON.stringify(response(p))}}],usage:{prompt_tokens:100,completion_tokens:200,total_tokens:300,cost:0}}),{status:200});};
try{
 const config=loadConfig({DATABASE_PATH:path.join(root,'db.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backups'),OPENROUTER_API_KEY:'FAKE_SIMULATION_ONLY',OPENROUTER_FREE_CONFIRMED:'true'});
 runtime=createApp(config,{fetchImpl,messengerAutoPoll:false});const s=runtime.team.studio,w=s.workers;
 w.profiles={configured:()=>true,check:async()=>({ok:true}),selection:id=>({id})};
 w.transport={executables:{codex:'fixture',claude:'fixture'},authCheck:async()=>true,run:async(agent,p)=>{calls.push({agent,phase:p.phase,job:p.chatId});return response(p);}};

 server=runtime.app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 for(const role of ['builder','tester','reviewer']){
  const p=s.project({name:'SIMULATION ONLY · Nemotron '+role});
  const j=s.create(p.id,'SIMULATION ONLY: exercise '+role),roles=role==='builder'?{builder:'nemotron',tester:'codex-personal',reviewer:'claude-code'}:role==='tester'?{builder:'codex-personal',tester:'nemotron',reviewer:'claude-code'}:{builder:'codex-personal',tester:'claude-code',reviewer:'nemotron'};
  const saved=s.change(j.id,'ready',{roles,fallbackPolicy:{enabled:false,allowedWorkers:[]}},'fixture'),approvedAt=new Date().toISOString();
  s.runScope.arm(j.id,{version:saved.version,projectId:p.id,rootHash:hashText(s.root(p.id).root),roles,approvedBy:'owner',approvedAt,expiresAt:new Date(Date.parse(approvedAt)+1800000).toISOString(),requestId:crypto.randomUUID(),free:{model:nemotronModel,maxOutput:2048,timeoutMs:60000}});
  currentJob=j.id;await page.goto(base+'/team#project/'+p.id+'/chat/'+j.id);await page.reload();await page.waitForFunction(id=>state.studioDetail?.id===id&&!state.busy,j.id);
  const before=calls.length;await page.getByRole('button',{name:'Send',exact:true}).click();await page.waitForFunction(()=>state.studioDetail?.status==='awaiting_owner'||state.studioDetail?.status==='paused',{},{timeout:90000});await s.wait(j.id);const d=s.detail(j.id);
  check(role+': complete three-phase simulation reaches owner-pending',d.status==='awaiting_owner');
  check(role+': actual Nemotron production transport called once',calls.filter(c=>c.job===j.id&&c.agent==='nemotron').length===1&&calls.length-before===3);
  check(role+': trusted isolated runner executes independent tests',d.state.tests.executed&&d.state.tests.passed&&d.state.tests.count===2&&d.state.tests.backend==='mxc');
  check(role+': reviewer sees exact hashes; owner acceptance preserved',d.state.review.testEvidenceHash===hashText(JSON.stringify(d.state.tests))&&d.state.review.artifactHash===s.root(p.id).fingerprint()&&!d.state.acceptedAt);
  check(role+': accurate API usage saved without double counting',d.usage.calls===1&&d.usage.input===100&&d.usage.output===200&&d.usage.knownEstimatedUSD===0);
  await page.screenshot({path:out+'/'+role+'-awaiting-owner.png',fullPage:true});
  await page.reload();await page.waitForFunction(id=>state.studioDetail?.id===id&&!state.busy,j.id);
  check(role+': refresh preserves checkpoint without another worker',s.detail(j.id).state.review.artifactHash===d.state.review.artifactHash&&calls.length-before===3);
 }
 check('Owner acceptance visible but never pressed',await page.getByRole('button',{name:'Accept completed work',exact:true}).isVisible());
 check('No UI errors',errors.length===0);
 fs.writeFileSync(out+'/result.json',JSON.stringify({checks,passed:checks.length,calls,errors,liveModelRequests:0,provider:'FAKE responses only',nativeAgentResponses:'SIMULATED',realTestRunner:'Codex MXC node:test, 2/2 each role arrangement',fixture:root},null,2));console.log(JSON.stringify({passed:checks.length,errors,liveModelRequests:0}));
}catch(e){fs.writeFileSync(out+'/failure.json',JSON.stringify({message:e.message,checks,errors,calls,job:currentJob?runtime?.team.studio.detail(currentJob):null},null,2));console.log(JSON.stringify({error:e.message,checks,errors}));process.exitCode=1;}finally{await browser?.close();if(server?.listening)await new Promise(r=>server.close(r));await runtime?.team.studio.close();runtime?.team.messenger.close();runtime?.team.preview.close();runtime?.team.fileActions.close();runtime?.db.close();}
