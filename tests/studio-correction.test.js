import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {keyFingerprint} from '../src/services/provider-verification.js';

function fixture(t,{alwaysFail=false,largeTest=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-correction-')),key='fixture-deepseek-key-123';let builderCalls=0,testerCalls=0,testRuns=0,problemsSeen=[];
 const workers={call:async(agent,packet)=>{if(packet.phase==='builder'){builderCalls++;problemsSeen.push(packet.problems||[]);return {report:'Builder version '+builderCalls,files:[{path:'src/value.txt',content:'v'+builderCalls}]};}if(packet.phase==='tester'){testerCalls++;const source='const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");test("value",()=>assert.equal(fs.readFileSync("src/value.txt","utf8"),"v2"));';return {report:'Tester supplied test.',files:[{path:'test/value.test.cjs',content:source+'\n// build '+builderCalls+(largeTest?'\n/* '+ 'context filler '.repeat(800)+' */':'')}]};}return {report:'Reviewed.',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'Reviewed correction.',findings:[]}};},tests:async()=>{testRuns++;if(alwaysFail||testRuns===1)return {executed:true,passed:false,count:1,failed:1,failures:['value mismatch'],summary:'1 test failed'};return {executed:true,passed:true,count:1,failed:0,summary:'1 test passed'};},preflight:async()=>null};
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
test('repeated identical Tester failures stop at the existing repeated-problem bound instead of looping',async t=>{
 const f=await fixture(t,{alwaysFail:true}),{chat}=await authorizedRun(f),done=f.s.detail(chat.id);
 assert.equal(done.status,'paused');assert.equal(f.builderCalls(),3);assert.equal(f.testerCalls(),3);assert.match(done.state.alert,/STUCK/i);assert.ok(done.state.repeat.count>=3);assert.ok(done.events.filter(e=>e.kind==='correction_started').length<=2);
});
