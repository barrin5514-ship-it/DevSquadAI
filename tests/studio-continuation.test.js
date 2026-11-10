import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {keyFingerprint} from '../src/services/provider-verification.js';

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-continuation-')),key='fixture-deepseek-key-123';let builderCalls=0,testerCalls=0;
 const workers={call:async(agent,packet)=>{if(packet.phase==='builder'){builderCalls++;return {report:'Builder checkpoint.',files:[{path:'src/value.txt',content:'builder checkpoint'}]};}if(packet.phase==='tester'){testerCalls++;if(testerCalls===1)throw {code:'incomplete',stopped:true,message:'Simulated Tester failure'};return {report:'Tester passed.',files:[{path:'test/value.test.cjs',content:'const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");test("value",()=>assert.equal(fs.readFileSync("src/value.txt","utf8"),"builder checkpoint"));'}]};}return {report:'Reviewed.',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'Reviewed saved evidence.',findings:[]}};},tests:async()=>({executed:true,passed:true,count:1,failed:0,summary:'1 test passed'}),preflight:async()=>null};
 const config=loadConfig({DATABASE_PATH:path.join(root,'data/main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup'),DEEPSEEK_API_KEY:key,DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_INPUT_USD_PER_MILLION:'0.3',DEEPSEEK_OUTPUT_USD_PER_MILLION:'1.2',DEEPSEEK_PRICES_VERIFIED_UNTIL:new Date(Date.now()+3600000).toISOString()}),r=createApp(config,{fetchImpl:async()=>{throw Error('No provider network');},studioOptions:{workers}}),s=r.team.studio,now=new Date().toISOString();r.db.prepare('INSERT INTO studio_deepseek_verification VALUES (1,?,?,?,?,?,?)').run('deepseek-flash',keyFingerprint(key),0.3,1.2,'fixture',now);r.db.prepare('INSERT INTO deepseek_balance_observation VALUES (1,?,?)').run(1,now);
 t.after(async()=>{await s.close();r.team.messenger.close();r.team.fileActions.close();r.team.preview.close();r.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {r,s,builderCalls:()=>builderCalls,testerCalls:()=>testerCalls};
}
async function failedTester(f){
 const p=f.s.project({name:'Continuation fixture'}),prompt='Build a continuation fixture.',c=f.s.create(p.id,prompt),cur=f.s.get(c.id);f.s.failover.configure(c.id,{version:cur.version,approvedBy:'owner',enabled:false,allowedWorkers:[]});const started=f.s.start(p.id,{chatId:c.id,requestId:crypto.randomUUID()});await new Promise(setImmediate);await f.s.wait(started.id);return {p,chat:f.s.get(c.id)};
}
test('a Tester failure resumes at Tester in the same chat with zero Builder calls and one atomic attempt record',async t=>{
 const f=await fixture(t),{p,chat}=await failedTester(f),plan=f.s.detail(chat.id).resume;
 assert.equal(chat.status,'paused');assert.equal(plan.available,true);assert.equal(plan.phase,'tester');assert.equal(f.builderCalls(),1);assert.equal(f.testerCalls(),1);
 const staleExecution=f.s.executions.list(chat.id).at(-1);assert.equal(staleExecution.status,'failed');assert.equal(f.s.lock(chat.id),null);
 const requestId=crypto.randomUUID(),root=f.s.root(p.id).root;const started=f.s.retry(chat.id,{requestId,expectedVersion:chat.version});
 assert.equal(started.id,chat.id);assert.equal(started.project_id,p.id);assert.equal(started.state.phase,'tester');
 await assert.rejects(Promise.resolve().then(()=>f.s.retry(chat.id,{requestId,expectedVersion:chat.version})),/active|Retry/i);
 await new Promise(setImmediate);await f.s.wait(chat.id);const done=f.s.detail(chat.id);
 assert.equal(done.status,'awaiting_owner');assert.equal(done.state.attempt,2);assert.equal(f.builderCalls(),1);assert.equal(f.testerCalls(),2);assert.equal(f.s.root(p.id).root,root);assert.equal(f.r.db.prepare('SELECT count(*) n FROM studio_retry_requests WHERE chat_id=? AND status=?').get(chat.id,'accepted').n,1);
});
test('a rejected retry preserves the exact previous state and writes no retry record',async t=>{
 const f=await fixture(t),{chat}=await failedTester(f),before={version:chat.version,status:chat.status,requestId:chat.request_id,state:JSON.stringify(chat.state)},requestId=crypto.randomUUID();
 const original=f.s.runScope.sendProposal;f.s.runScope.sendProposal=()=>({issues:['forced retry rejection'],version:before.version});
 assert.throws(()=>f.s.retry(chat.id,{requestId,expectedVersion:before.version}),/forced retry rejection/);
 f.s.runScope.sendProposal=original;
 const after=f.s.get(chat.id);
 assert.equal(after.version,before.version);assert.equal(after.status,before.status);assert.equal(after.request_id,before.requestId);assert.equal(JSON.stringify(after.state),before.state);assert.equal(f.r.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(chat.id).n,0);assert.equal(f.r.db.prepare('SELECT count(*) n FROM studio_retry_requests WHERE request_id=?').get(requestId).n,0);
});
