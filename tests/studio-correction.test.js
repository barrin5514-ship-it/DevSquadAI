import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {keyFingerprint} from '../src/services/provider-verification.js';

function fixture(t,{failures=1,sameFinding=true,stopOnCorrection=null,largeTest=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-correction-')),key='fixture-deepseek-key-123';let builderCalls=0,testerCalls=0,testRuns=0,problemsSeen=[];
 const workers={call:async(agent,packet,folder,signal)=>{if(packet.phase==='builder'){builderCalls++;problemsSeen.push(packet.problems||[]);if(stopOnCorrection!==null&&builderCalls===stopOnCorrection+1){s.stop(packet.chatId);signal.throwIfAborted();}return {report:'Builder version '+builderCalls,files:[{path:'src/value.txt',content:'v'+builderCalls}]};}if(packet.phase==='tester'){testerCalls++;const source='const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");test("value",()=>assert.equal(fs.readFileSync("src/value.txt","utf8"),"v2"));';return {report:'Tester supplied test.',files:[{path:'test/value.test.cjs',content:source+'\n// build '+builderCalls+(largeTest?'\n/* '+ 'context filler '.repeat(800)+' */':'')}]};}return {report:'Reviewed.',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'Reviewed correction.',findings:[]}};},tests:async()=>{testRuns++;if(testRuns<=failures)return {executed:true,passed:false,count:1,failed:1,failures:[sameFinding?'value mismatch':'value mismatch '+testRuns],summary:'1 test failed'};return {executed:true,passed:true,count:1,failed:0,summary:'1 test passed'};},preflight:async()=>null};
 const config=loadConfig({DATABASE_PATH:path.join(root,'data/main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup'),DEEPSEEK_API_KEY:key,DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_INPUT_USD_PER_MILLION:'0.3',DEEPSEEK_OUTPUT_USD_PER_MILLION:'1.2',DEEPSEEK_PRICES_VERIFIED_UNTIL:new Date(Date.now()+3600000).toISOString()}),r=createApp(config,{fetchImpl:async()=>{throw Error('No provider network');},studioOptions:{workers}}),s=r.team.studio,now=new Date().toISOString();r.db.prepare('INSERT INTO studio_deepseek_verification VALUES (1,?,?,?,?,?,?)').run('deepseek-flash',keyFingerprint(key),0.3,1.2,'fixture',now);r.db.prepare('INSERT INTO deepseek_balance_observation VALUES (1,?,?)').run(1,now);
 t.after(async()=>{await s.close();r.team.messenger.close();r.team.fileActions.close();r.team.preview.close();r.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {r,s,builderCalls:()=>builderCalls,testerCalls:()=>testerCalls,problemsSeen:()=>problemsSeen};
}
async function authorizedRun(f){
 const p=f.s.project({name:'Correction fixture'}),chat=f.s.create(p.id,'Build a correction fixture.'),cur=f.s.get(chat.id);f.s.failover.configure(chat.id,{version:cur.version,approvedBy:'owner',enabled:false,allowedWorkers:[]});const proposal=f.s.runScope.sendProposal(chat.id);const started=f.s.start(p.id,{chatId:chat.id,requestId:crypto.randomUUID(),expectedVersion:proposal.version,proposalHash:proposal.hash});await new Promise(setImmediate);await f.s.wait(started.id);return {p,chat:f.s.get(chat.id)};
}
test('a normal authorized run sends one Tester failure back to Builder once, then re-runs Tester and reaches owner review',async t=>{
 const f=await fixture(t),{p,chat}=await authorizedRun(f),done=f.s.detail(chat.id);
 assert.equal(done.status,'awaiting_owner',JSON.stringify({alert:done.state.alert,failure:done.state.failure,phase:done.state.phase,corrections:done.state.corrections,builder:f.builderCalls(),tester:f.testerCalls()}));assert.equal(f.builderCalls(),2);assert.equal(f.testerCalls(),2);assert.ok(f.problemsSeen()[1].length>0);assert.equal(done.state.corrections,1);assert.equal(done.state.attempt,undefined);assert.equal(done.events.filter(e=>e.kind==='correction_started').length,1);assert.equal(done.events.some(e=>e.kind==='bounded_tests_failed'),false);assert.equal(f.s.root(p.id).root,done.state.pinnedRoot);assert.equal(done.state.review.decision,'approved');
});
test('a new build after Awaiting Owner starts in the same chat with a separate run and preserves prior review history',async t=>{
 const f=await fixture(t),{chat}=await authorizedRun(f),current=f.s.get(chat.id),firstRequest=chat.request_id,oldReviewEvents=f.s.detail(chat.id).events.filter(e=>e.kind==='independent_review').length;
 const started=f.s.retry(chat.id,{requestId:crypto.randomUUID(),prompt:"Change the button text to 'Try me' and make the new background color blue.",expectedVersion:current.version,mode:'new'});
 assert.equal(started.status,'running');assert.equal(started.state.phase,'builder');assert.equal(started.state.review,null);assert.equal(started.state.tests,null);assert.notEqual(started.request_id,firstRequest);
 await new Promise(setImmediate);await f.s.wait(chat.id);const done=f.s.detail(chat.id);
 assert.equal(done.status,'awaiting_owner');assert.notEqual(done.request_id,firstRequest);assert.match(done.state.goal,/Try me/);assert.equal(done.events.filter(e=>e.kind==='independent_review').length,oldReviewEvents+1);assert.equal(f.builderCalls(),3);
});
test('managed security instructions are excluded from the worker project snapshot',async t=>{
 const f=await fixture(t),{p}=await authorizedRun(f),snapshot=f.s.root(p.id).snapshot(24000);
 assert.equal(snapshot.files.some(file=>/^AGENTS(?:\.override)?\.md$/i.test(file.path)),false);
});
test('a correction Builder is not blocked when Tester test files push the project past nine KiB',async t=>{
 const f=await fixture(t,{largeTest:true}),{chat}=await authorizedRun(f),done=f.s.detail(chat.id);
 assert.equal(done.status,'awaiting_owner');assert.equal(f.builderCalls(),2);assert.equal(f.testerCalls(),2);assert.equal(done.events.filter(e=>e.kind==='correction_started').length,1);assert.equal(done.events.some(e=>/context is incomplete/i.test(e.content.alert||'')),false);
});
test('five distinct Tester findings get five corrections and reach Awaiting Owner',async t=>{
 const f=fixture(t,{failures:5,sameFinding:false}),{chat}=await authorizedRun(f),done=f.s.detail(chat.id);
 assert.equal(done.status,'awaiting_owner',done.state.alert);assert.equal(f.builderCalls(),6);assert.equal(f.testerCalls(),6);
 assert.deepEqual(done.events.filter(e=>e.kind==='correction_started').map(e=>e.content.corrections),[1,2,3,4,5]);
});
test('the same Tester finding twice changes the Builder approach and keeps working',async t=>{
 const f=fixture(t,{failures:2}),{chat}=await authorizedRun(f),done=f.s.detail(chat.id);
 assert.equal(done.status,'awaiting_owner',done.state.alert);assert.equal(f.builderCalls(),3);
 assert.deepEqual(f.problemsSeen()[1],['value mismatch']);
 assert.match(f.problemsSeen()[2].at(-1),/different approach/i);
 assert.ok(done.events.some(e=>e.kind==='correction_started'&&e.content.corrections===2&&e.content.findings.includes('value mismatch')));
});
test('owner Stop during correction four preserves the checkpoint and Retry continues it',async t=>{
 const f=fixture(t,{failures:5,sameFinding:false,stopOnCorrection:4}),{p,chat}=await authorizedRun(f),stopped=f.s.detail(chat.id);
 assert.equal(stopped.status,'stopped',stopped.state.alert);assert.equal(stopped.state.corrections,4);
 const repo=f.s.root(p.id),checkpoint=repo.fingerprint();
 assert.equal(stopped.resume.checkpointHash,checkpoint);assert.equal(fs.readFileSync(repo.resolve('src/value.txt'),'utf8'),'v4');
 f.s.retry(chat.id,{requestId:crypto.randomUUID(),expectedVersion:stopped.version,mode:'resume'});
 await new Promise(setImmediate);await f.s.wait(chat.id);
 const done=f.s.detail(chat.id);assert.equal(done.status,'awaiting_owner',done.state.alert);assert.equal(done.state.corrections,5);
 assert.ok(done.executions.some(e=>e.status==='cancelled'&&e.checkpoint_hash===checkpoint));
});
test('Retry of an old correction-limit pause continues with its latest finding and saved files',async t=>{
 const f=fixture(t),{p,chat}=await authorizedRun(f),repo=f.s.root(p.id),checkpoint=repo.fingerprint();
 const paused=f.s.change(chat.id,'paused',{phase:'tester',corrections:3,tests:{...chat.state.tests,passed:false,failures:['Latest saved failure']},alert:'Correction limit reached after three bounded Builder corrections. Findings and checkpoints are preserved; no automatic correction remains.'},'correction_limit');
 const plan=f.s.detail(chat.id).resume;assert.equal(plan.phase,'builder');assert.equal(plan.checkpointHash,checkpoint);
 f.s.retry(chat.id,{requestId:crypto.randomUUID(),expectedVersion:paused.version,mode:'resume'});
 await new Promise(setImmediate);await f.s.wait(chat.id);
 const done=f.s.detail(chat.id);assert.equal(done.status,'awaiting_owner',done.state.alert);assert.equal(done.state.corrections,4);
 assert.ok(f.problemsSeen().at(-1).includes('Latest saved failure'));
});
