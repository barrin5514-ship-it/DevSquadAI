import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once,EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {cliEnvironment,helloArguments,parseHello,CliHello} from '../src/services/cli-hello.js';
import {helloEstimate} from '../src/services/hub-connections.js';

function fixture(t,hello=async()=>({ok:true,kind:'mock',text:'hello'})){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hub-connections-'));let calls=0;
 const config=loadConfig({DATABASE_PATH:path.join(root,'data/main.sqlite'),WORKSPACE_DIR:path.join(root,'workspace'),BACKUP_DIR:path.join(root,'backups'),TEAM_FOCUS:'big_three',DEEPSEEK_API_KEY:'connection-test-secret',DEEPSEEK_MODEL:'deepseek-flash'});
 const app=createApp(config,{cliHello:{installed:()=>true,hello:async agent=>{calls++;return hello(agent);}},fetchImpl:async()=>{throw Error('Provider HTTP not allowed');}});
 t.after(()=>{app.db.close();fs.rmSync(root,{recursive:true,force:true});});return {app,config,root,get calls(){return calls;}};
}
test('child environment excludes provider credentials and native hello arguments disable tools',()=>{
 const env=cliEnvironment({SystemRoot:'C:\\Windows',USERPROFILE:'C:\\Account',PATH:'path',DEEPSEEK_API_KEY:'secret',ANTHROPIC_API_KEY:'paid',CODEX_API_KEY:'paid',OPENAI_API_KEY:'paid',NODE_OPTIONS:'malicious'});assert.deepEqual(Object.keys(env).sort(),['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC','DISABLE_AUTOUPDATER','PATH','SystemRoot','USERPROFILE','CLAUDE_CODE_MAX_RETRIES','CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES','CLAUDE_CODE_DISABLE_REFUSAL_RETRY','CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK','CLAUDE_CODE_RETRY_WATCHDOG','CLAUDE_CODE_MAX_TURNS','CLAUDE_CODE_DISABLE_THINKING'].sort());
 const codex=helloArguments('codex'),claude=helloArguments('claude');assert.ok(codex.includes('read-only'));assert.ok(codex.includes('shell_tool'));assert.ok(codex.includes('model_providers.devsquad_hello.request_max_retries=0'));assert.equal(claude[claude.indexOf('--tools')+1],'');assert.ok(claude.includes('--strict-mcp-config'));assert.ok(!codex.includes('--dangerously-bypass-approvals-and-sandbox'));
});
test('green requires an actual terminal hello event; partial, tool and error results fail',()=>{
 const event={type:'item.completed',item:{type:'agent_message',text:'hello'}};
 assert.equal(parseHello('codex',JSON.stringify(event)).ok,false);
 assert.equal(parseHello('codex',[event,{type:'turn.completed',usage:{input_tokens:12,output_tokens:2}}].map(JSON.stringify).join('\n')).ok,true);
 assert.equal(parseHello('codex',[event,{type:'turn.failed'}].map(JSON.stringify).join('\n')).ok,false);
 assert.equal(parseHello('claude',JSON.stringify({type:'result',subtype:'success',is_error:false,result:'hello',usage:{output_tokens:2}})).ok,true);
 assert.equal(parseHello('claude',JSON.stringify({type:'result',subtype:'error_max_turns',is_error:true,result:'hello'})).ok,false);
});
test('batch requires owner confirmation, persists only sanitized results and never calls DeepSeek',async t=>{
 const f=fixture(t);await assert.rejects(f.app.team.hubConnections.test({approvedBy:'owner',confirmIncluded:false}),/Confirm/);
 const result=await f.app.team.hubConnections.test({approvedBy:'owner',confirmIncluded:true});assert.equal(f.calls,2);assert.equal(result.results[0].kind,'not_run');assert.equal(result.results[0].ok,false);assert.equal(f.app.team.hubConnections.status().last.status,'finished');assert.equal(f.app.db.prepare('SELECT count(*) n FROM paid_request_quotes').get().n,0);assert.ok(!JSON.stringify(result).includes('connection-test-secret'));
});
test('concurrent hello clicks cannot duplicate a running batch',async t=>{
 let finish;const f=fixture(t,async()=>{await new Promise(r=>finish=r);return {ok:true,kind:'mock',text:'hello'};});const first=f.app.team.hubConnections.test({approvedBy:'owner',confirmIncluded:true});await assert.rejects(f.app.team.hubConnections.test({approvedBy:'owner',confirmIncluded:true}),/already running/);finish();await new Promise(r=>setImmediate(r));finish();await first;assert.equal(f.calls,2);
});
test('console endpoints enforce same-origin session and do not return secrets',async t=>{
 const f=fixture(t),server=f.app.app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port,token=(await(await fetch(base+'/api/console/session')).json()).data.token;
 const request=auth=>fetch(base+'/api/console/big-three/hello',{method:'POST',headers:{'Content-Type':'application/json','X-Dashboard-Token':auth},body:JSON.stringify({approvedBy:'owner',confirmIncluded:true})});assert.equal((await request('')).status,403);assert.equal(f.calls,0);const good=await request(token);assert.equal(good.status,200);assert.ok(!(await good.text()).includes('connection-test-secret'));
});
test('public-price hello estimate is arithmetically correct, conservative, under one cent and not authorization',()=>{
 assert.equal(helloEstimate.conservativeUSD,(helloEstimate.inputTokensReserved*helloEstimate.inputUSDPerMillion+helloEstimate.outputTokensMax*helloEstimate.outputUSDPerMillion)/1e6);assert.ok(helloEstimate.conservativeUSD<helloEstimate.localCapUSD&&helloEstimate.localCapUSD<0.01);assert.equal(helloEstimate.thinking,'disabled');
});
test('native hello refuses API-billed auth, bounds output and sanitizes failure text',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hello-test-')),exe=path.join(dir,'fake.exe');fs.writeFileSync(exe,'');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let calls=0;
 const cli=new CliHello({codex:exe},{spawnImpl:()=>{calls++;const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.exitCode=0;setImmediate(()=>{child.stderr.write('Logged in using API key: must-not-leak');child.emit('close',0);});return child;}});
 const result=await cli.hello('codex');assert.equal(calls,1);assert.equal(result.ok,false);assert.equal(result.code,'login');assert.ok(!JSON.stringify(result).includes('must-not-leak'));
});

test('role endpoint binds exact job/version and protects role rotation with console session',async t=>{
 const f=fixture(t),team=f.app.team,p=team.create(f.app.service.create({name:'MOCK roles'}).id,{request:'Tiny utility'});team.startPlan(p.task_id);team.plan(p.task_id,{author:'owner',summary:'Build utility',steps:['Implement utility']});const child=team.approvePlan(p.task_id,{approvedBy:'owner',approve:true}).children[0],job=team.coordinator.create(child.task_id);
 const server=f.app.app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port,token=(await(await fetch(base+'/api/console/session')).json()).data.token;
 const post=(body,auth=token,id=job.id)=>fetch(base+'/api/console/shared-jobs/'+id+'/roles',{method:'POST',headers:{'Content-Type':'application/json','X-Dashboard-Token':auth},body:JSON.stringify(body)});
 assert.equal((await post({version:0,rotate:true},'')).status,403);
 assert.equal((await post({version:0,rotate:true})).status,200);
 assert.equal((await post({version:0,rotate:true})).status,409);
 assert.equal((await post({version:1,rotate:true},token,'wrong-job')).status,404);
 assert.equal((await post({version:1,roles:{builder:'codex-personal',tester:'deepseek',reviewer:'codex-school'}})).status,409);
 assert.equal(team.coordinator.read(job.id).version,1);assert.equal(f.calls,0);
});
