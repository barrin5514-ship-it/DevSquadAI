import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {keyFingerprint} from '../src/services/provider-verification.js';

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-retry-delete-')),key='fixture-deepseek-key-123';let builderCalls=0;
 const workers={call:async(agent,packet)=>{if(packet.phase==='builder'){builderCalls++;if(builderCalls===1)throw {code:'connection_error',stopped:true,unknownOutcome:true};return {report:'Fresh implementation.',files:[{path:'src/retry.txt',content:'fresh attempt'}]};}if(packet.phase==='tester')return {report:'Independent test.',files:[{path:'test/retry.test.cjs',content:'const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");test("fresh",()=>assert.equal(fs.readFileSync("src/retry.txt","utf8"),"fresh attempt"));'}]};return {report:'Reviewed fresh checkpoint.',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'Reviewed fresh attempt.',findings:[]}};},tests:async()=>({executed:true,passed:true,count:1,failed:0,summary:'1 fresh test passed'}),preflight:async()=>null};
 const config=loadConfig({DATABASE_PATH:path.join(root,'data/main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup'),DEEPSEEK_API_KEY:key,DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_INPUT_USD_PER_MILLION:'0.3',DEEPSEEK_OUTPUT_USD_PER_MILLION:'1.2',DEEPSEEK_PRICES_VERIFIED_UNTIL:new Date(Date.now()+3600000).toISOString()}),r=createApp(config,{fetchImpl:async()=>{throw Error('No provider network');},studioOptions:{workers,schedule:fn=>queueMicrotask(fn)}}),s=r.team.studio;
 const now=new Date().toISOString();r.db.prepare('INSERT INTO studio_deepseek_verification VALUES (1,?,?,?,?,?,?)').run('deepseek-flash',keyFingerprint(key),0.3,1.2,'fixture',now);r.db.prepare('INSERT INTO deepseek_balance_observation VALUES (1,?,?)').run(1,now);
 t.after(async()=>{await s.close();r.team.messenger.close();r.team.fileActions.close();r.team.preview.close();r.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {root,r,s,workers,builderCalls:()=>builderCalls};
}
async function failedAttempt(f){
 const p=f.s.project({name:'Retry fixture'}),prompt='Build a retry fixture\nwith a multiline prompt.',c=f.s.create(p.id,prompt),cur=f.s.get(c.id);f.s.failover.configure(c.id,{version:cur.version,approvedBy:'owner',enabled:false,allowedWorkers:[]});
 const started=f.s.start(p.id,{chatId:c.id,requestId:crypto.randomUUID()});await new Promise(setImmediate);await f.s.wait(started.id);return {p,chat:f.s.get(c.id)};
}
test('Retry and Edit & Retry start a new attempt in the same chat/workspace and preserve the old execution',async t=>{
 const f=fixture(t),{p,chat}=await failedAttempt(f),oldRoot=f.s.root(p.id).root,message=f.s.detail(chat.id).events.find(e=>e.kind==='task'),oldExecution=f.s.detail(chat.id).executions[0];
 assert.equal(chat.status,'paused');assert.equal(f.r.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(chat.id).n,0);
 const requestId=crypto.randomUUID(),first=f.s.retry(chat.id,{requestId,prompt:'Build a retry fixture\nwith a multiline prompt.',sourceEventId:message.id,expectedVersion:chat.version});
 assert.equal(first.id,chat.id);assert.equal(first.project_id,p.id);assert.throws(()=>f.s.retry(chat.id,{requestId,expectedVersion:chat.version}),/active|Retry/i);
 await new Promise(setImmediate);await f.s.wait(chat.id);const done=f.s.detail(chat.id);
 assert.equal(done.id,chat.id);assert.equal(done.project_id,p.id);assert.equal(f.s.root(p.id).root,oldRoot);assert.equal(done.status,'awaiting_owner');assert.equal(done.state.attempt,2);assert.equal(done.events.filter(e=>e.kind==='retry_started').length,1);assert.equal(done.executions.filter(e=>e.agent==='deepseek'&&e.phase==='builder').length,2);assert.equal(oldExecution.status,'unknown');assert.equal(fs.readFileSync(path.join(oldRoot,'src/retry.txt'),'utf8'),'fresh attempt');
 assert.throws(()=>f.s.apply(chat.id,'deepseek',[{path:'src/old.txt',content:'old overwrite'}],f.s.root(p.id).fingerprint(),oldExecution.id),/stale worker write/);assert.equal(fs.existsSync(path.join(oldRoot,'src/old.txt')),false);
});
test('an edited retry prompt becomes the new attempt without changing the chat, project or workspace',async t=>{
 const f=fixture(t),{p,chat}=await failedAttempt(f),requestId=crypto.randomUUID();
 f.s.retry(chat.id,{requestId,prompt:'Edited retry prompt\nsecond line',expectedVersion:chat.version});await new Promise(setImmediate);await f.s.wait(chat.id);const done=f.s.detail(chat.id);
 assert.equal(done.id,chat.id);assert.equal(done.project_id,p.id);assert.equal(done.state.goal,'Edited retry prompt\nsecond line');assert.match(done.events.find(e=>e.kind==='retry_started').content.text,/Edited retry prompt/);assert.equal(done.executions.filter(e=>e.agent==='deepseek'&&e.phase==='builder').length,2);
});
test('Delete Project is soft, ignores a stale folder-lock row, leaves workspace files and preserves run/reservation records',async t=>{
 const f=fixture(t),p=f.s.project({name:'Delete fixture'}),c=f.s.create(p.id,'Delete fixture run'),repo=f.s.root(p.id);fs.writeFileSync(path.join(repo.root,'keep.txt'),'workspace survives');const requestId=crypto.randomUUID();f.r.db.prepare('UPDATE studio_chats SET request_id=? WHERE id=?').run(requestId,c.id);const execution=f.s.executions.create({...c,request_id:requestId},'deepseek','builder',repo.root,repo.fingerprint());f.s.executions.record(execution,{status:'unknown',outcome:'unknown'});f.r.db.prepare("INSERT INTO studio_api_reservations(execution_id,chat_id,reserved_usd,status,created_at) VALUES (?,?,?,'unknown',?)").run(execution,c.id,0.004,new Date().toISOString());
 f.r.db.prepare('INSERT INTO studio_locks VALUES (?,?,?)').run(repo.root,c.id,new Date().toISOString());
 const deleted=f.s.deleteProject(p.id,{approvedBy:'owner',confirm:true});assert.equal(deleted.deleted,true);assert.equal(deleted.workspace,repo.root);assert.ok(f.s.list().projects.every(x=>x.id!==p.id));assert.ok(f.r.team.store.projects().some(x=>x.id===p.id));assert.ok(f.r.db.prepare('SELECT 1 FROM studio_chats WHERE id=?').get(c.id));assert.ok(f.r.db.prepare('SELECT 1 FROM studio_executions WHERE id=?').get(execution));assert.equal(f.r.db.prepare('SELECT reserved_usd FROM studio_api_reservations WHERE execution_id=?').get(execution).reserved_usd,0.004);assert.equal(fs.readFileSync(path.join(repo.root,'keep.txt'),'utf8'),'workspace survives');assert.equal(f.s.detail(c.id).events.some(e=>e.kind==='project_deleted'),true);
});
