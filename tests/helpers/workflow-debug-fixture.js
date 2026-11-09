import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {createApp} from '../../src/app.js';
import {loadConfig} from '../../src/config/index.js';
import {StudioWorkers,tapTests} from '../../src/services/studio-workers.js';
import {ProjectFiles,hashText} from '../../src/services/project-files.js';
import {cliEnvironment} from '../../src/services/cli-hello.js';

export async function workflowFixture(t,{mode='normal',fallback=true,mediaOptions,council=null}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'workflow-http-')),calls=[],packets=[],providerBodies=[],councilProviderBodies=[];
 let real,entered,release,testerTurns=0,reviewerTurns=0;const blocked=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 const implementation='export function add(a,b){return a+b;}';
 const testSource="import {test} from 'node:test';import assert from 'node:assert/strict';import {add} from '../app.mjs';test('integers',()=>assert.equal(add(2,3),5));test('negative and zero',()=>assert.equal(add(-1,1),0));";
 const workers={nemotron:{status:()=>({ok:true}),refresh:async()=>({ok:true})},preflight:async()=>null,availability:async id=>({ok:council?id!==council.absent:id==='codex-personal'}),call:async(agent,packet,folder,signal,e)=>{
  calls.push({agent,phase:packet.phase});packets.push(packet);
  if(packet.phase.startsWith('council_'))return agent==='deepseek'?real.call(agent,packet,folder,signal,e):council.reply(agent,packet,e);
  if(packet.phase==='builder'){
   if(mode==='wait'){entered();await blocked;}
   if(mode==='empty')return {report:'SIMULATED missing implementation',files:[]};
   if(agent==='deepseek')return real.call(agent,packet,folder,signal,e);
   return {report:'SIMULATED fallback Builder',files:[{path:'app.mjs',content:implementation}]};
  }
  if(packet.phase==='tester'){
   if(mode==='tester-once'&&testerTurns++===0)throw {code:'incomplete',stopped:true};
   if(mode==='tester-credit')throw {code:'usage_limit',stopped:true,diagnostics:{reason:'usage_limit',stderr:'Reading additional input from stdin...\n',stdout:'Your workspace is out of credits.'}};
   return {report:'SIMULATED independent Tester',files:[{path:'test/add.test.mjs',content:testSource}]};
  }
  const reject=mode==='review-once'&&reviewerTurns++===0;
  return {report:'SIMULATED independent Reviewer',files:[],review:{...packet.reviewBinding,decision:reject?'changes_requested':'approved',summary:'Reviewed actual files and recorded local tests; did not execute tests.',findings:reject?['Clarify the exported function.']:[]}};
 },tests:async(folder,_signal,_events,{testFiles})=>{
  // Only our hand-written fixture tests run here, with no credentials or network.
  let stdout,exit=0;try{stdout=execFileSync(process.execPath,['--permission','--allow-fs-read='+folder,'--test','--test-reporter=tap','--test-isolation=none','--test-concurrency=1',...testFiles],{cwd:folder,env:cliEnvironment(),encoding:'utf8',timeout:5000,maxBuffer:64000,windowsHide:true});}catch(e){exit=e.status??1;stdout=String(e.stdout||'');}
  const count=Number(/# tests (\d+)/.exec(stdout)?.[1]||0),failed=Number(/# fail (\d+)/.exec(stdout)?.[1]||0);
  return {executed:true,passed:exit===0&&count>0&&failed===0,count,failed,summary:'Actual local fixture Node tests',backend:'node-permission-fixture',revisionHash:new ProjectFiles(folder).fingerprint(),outputHash:hashText(stdout),names:tapTests(stdout)};
 }};
 const config=loadConfig({DATABASE_PATH:path.join(root,'db.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup'),DEEPSEEK_API_KEY:'LOCAL_FIXTURE',DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_INPUT_USD_PER_MILLION:'0.3',DEEPSEEK_OUTPUT_USD_PER_MILLION:'1.2'});
 const app=createApp(config,{studioOptions:{workers,mediaOptions},fetchImpl:async(url,o)=>{
  if(url!=='https://api.deepseek.com/chat/completions'||o.method!=='POST')throw Error('Unexpected simulated provider request');
  const frame=x=>'data: '+JSON.stringify(x)+'\n\n',length=mode==='length';
  const body=JSON.parse(o.body),packet=JSON.parse(body.messages[1].content);
  if(packet.phase.startsWith('council_')){
   councilProviderBodies.push(body);
   const reply=await council.reply('deepseek',packet);
   return new Response(frame({model:'deepseek-flash',choices:[{delta:{content:JSON.stringify(reply)},finish_reason:'stop'}],usage:{prompt_tokens:25,completion_tokens:15,total_tokens:40}})+'data: [DONE]\n\n');
  }
  providerBodies.push(body);
  if(mode==='rate')return Response.json({error:{message:'LOCAL rate limit'}},{status:429});
  const value={report:'SIMULATED DeepSeek Builder',files:[{path:'app.mjs',content:council?.implementation??implementation}]};
  return new Response(frame({model:'deepseek-flash',choices:[{delta:{content:mode==='builder-json'||mode==='builder-json-once'&&providerBodies.length===1?'not valid JSON':JSON.stringify(value)},finish_reason:length?'length':'stop'}],usage:{prompt_tokens:30,completion_tokens:length?8192:40,total_tokens:length?8222:70}})+(mode==='interrupted'?'':'data: [DONE]\n\n'));
 }});
 real=new StudioWorkers(app.team);const s=app.team.studio,project=s.project({name:'SIMULATED one-Send workflow'});
 s.roleManager.update(project.id,{version:0,roles:{builder:'deepseek',tester:council?.tester||(council?'codex-personal':'nemotron'),reviewer:'claude-code'}});
 const chat=s.create(project.id,'Build the fixture add utility and independent tests');s.failover.configure(chat.id,{version:chat.version,approvedBy:'owner',enabled:fallback,allowedWorkers:['codex-personal','deepseek','nemotron','claude-code']});
 const server=app.app.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port,base=origin+'/api/console',token=(await(await fetch(base+'/session')).json()).data.token;
 t.after(async()=>{release();await s.close();app.team.messenger.close();app.team.preview.close();app.team.fileActions.close();server.closeAllConnections();await new Promise(r=>server.close(r));app.db.close();fs.rmSync(root,{recursive:true,force:true});});
 const post=async(route,body)=>{const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Dashboard-Token':token},body:JSON.stringify(body)});return {status:response.status,...await response.json()};};
 const proposal=s.runScope.sendProposal(chat.id),body={chatId:chat.id,requestId:crypto.randomUUID(),expectedVersion:proposal.version,proposalHash:proposal.hash,...(council?{repairCouncil:true}:{})},route='/studio/projects/'+project.id+'/run';
 return {app,s,root,project,chat,body,route,post,calls,packets,providerBodies,councilProviderBodies,implementation,origin,started,release,async run(){const response=await post(route,body);if(response.status!==202)throw Error(JSON.stringify(response));await s.wait(chat.id);return s.detail(chat.id);}};
}
