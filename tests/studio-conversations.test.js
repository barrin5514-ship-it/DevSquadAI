import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';

async function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-conversations-'));let calls=0;const packets=[];
 const workers={call:async(agent,packet)=>{calls++;packets.push(packet);throw Error('Mock worker pauses after receiving context');},tests:async()=>{throw Error('Not reached');}};
 const r=createApp(loadConfig({DATABASE_PATH:path.join(root,'main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backups'),DEEPSEEK_API_KEY:'fixture-key-private'}),{fetchImpl:async()=>{throw Error('No live requests allowed');},studioOptions:{workers}}),server=r.app.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port+'/api/console',token=(await(await fetch(base+'/session')).json()).data.token;
 const post=async(url,body,credential=token)=>{const response=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json','X-Dashboard-Token':credential},body:JSON.stringify(body)});return {status:response.status,...await response.json()};};
 const project=r.team.studio.project({name:'Conversation fixture'}),session=()=>post('/studio/projects/'+project.id+'/sessions',{}),message=(id,text='Explain this utility',rest={})=>post('/studio/chats/'+id+'/messages',{text,submissionId:randomUUID(),...rest});
 t.after(async()=>{await r.team.studio.close();await new Promise(resolve=>server.close(resolve));r.team.messenger.close();r.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {r,project,root,base,post,session,message,packets,get calls(){return calls;}};
}
test('empty sessions and chronological messages persist without creating fake prompts or dispatching',async t=>{
 const f=await fixture(t),c=await f.session();assert.equal(c.status,201);assert.equal(c.data.state.goal,'');assert.deepEqual(f.r.team.studio.detail(c.data.id).events.map(e=>e.kind),['session_created']);
 assert.equal((await f.message(c.data.id,'First real prompt')).status,201);assert.equal((await f.message(c.data.id,'A follow-up')).status,201);
 const detail=f.r.team.studio.detail(c.data.id);assert.deepEqual(detail.events.filter(e=>e.kind==='message').map(e=>e.content.text),['First real prompt','A follow-up']);assert.equal(detail.title,'First real prompt');assert.equal(detail.status,'ready');assert.equal(f.calls,0);assert.equal(f.r.db.prepare('SELECT count(*) n FROM studio_locks').get().n,0);
 const reader=new DatabaseSync(path.join(f.root,'main.sqlite'),{readOnly:true});try{const rows=reader.prepare("SELECT content FROM studio_events WHERE chat_id=? AND kind='message' ORDER BY id").all(c.data.id);assert.equal(JSON.parse(rows[1].content).text,'A follow-up');}finally{reader.close();}
});
test('message retries and concurrent duplicate submissions append once and reject reused IDs with altered content',async t=>{
 const f=await fixture(t),c=(await f.session()).data,submissionId=randomUUID();const results=await Promise.all([f.message(c.id,'One',{submissionId}),f.message(c.id,'One',{submissionId})]);assert.deepEqual(results.map(r=>r.status),[201,201]);assert.equal(f.r.team.studio.detail(c.id).events.filter(e=>e.kind==='message').length,1);assert.equal((await f.message(c.id,'Changed',{submissionId})).status,409);const other=(await f.session()).data;assert.equal((await f.message(other.id,'One',{submissionId})).status,409);assert.equal(f.calls,0);
});
test('attachments and references are immutable message copies and reach only an explicitly run mock worker',async t=>{
 const f=await fixture(t),c=(await f.session()).data,repo=f.r.team.studio.root(f.project.id);fs.writeFileSync(path.join(repo.root,'notes.md'),'Original reference');
 const r=await f.message(c.id,'Use these notes',{attachments:[{name:'requirements.txt',content:'Reject invalid inputs'}],references:['notes.md']});assert.equal(r.status,201);assert.equal(f.calls,0);fs.writeFileSync(path.join(repo.root,'notes.md'),'Changed on disk');
 assert.equal(f.r.team.studio.detail(c.id).events.at(-1).content.references[0].content,'Original reference');assert.equal(fs.existsSync(path.join(repo.root,'requirements.txt')),false);
 const proposal=f.r.team.studio.runScope.sendProposal(c.id);const run=await f.post('/studio/projects/'+f.project.id+'/run',{chatId:c.id,requestId:randomUUID(),expectedVersion:proposal.version,proposalHash:proposal.hash});assert.equal(run.status,202);await new Promise(setImmediate);await f.r.team.studio.wait(c.id);assert.equal(f.calls,1);assert.equal(f.packets[0].attachments[0].content,'Reject invalid inputs');assert.equal(f.packets[0].attachments[1].content,'Original reference');assert.equal(f.r.team.studio.get(c.id).status,'paused');
});
test('secret, private, oversized and outside-project attachments/references are rejected atomically',async t=>{
 const f=await fixture(t),c=(await f.session()).data;
 for(const attachments of [[{name:'.env',content:'private'}],[{name:'bad.txt',content:'fixture-key-private'}],[{name:'large.txt',content:'x'.repeat(4097)}],[{name:'../escape.txt',content:'no'}],[{name:'binary.png',content:'no'}]])assert.ok((await f.message(c.id,'Do not save',{attachments})).status>=400);
 for(const ref of ['../owner.txt','.env','missing.txt'])assert.ok((await f.message(c.id,'Invalid reference',{references:[ref]})).status>=400);
 assert.equal(f.r.team.studio.detail(c.id).events.length,1);assert.equal(f.calls,0);
});
test('session/message writes require dashboard capability and invalid reviewed states stay protected',async t=>{
 const f=await fixture(t),c=(await f.session()).data;assert.equal((await f.post('/studio/projects/'+f.project.id+'/sessions',{},'')).status,403);assert.equal((await f.post('/studio/chats/'+c.id+'/messages',{text:'Unauthorized',submissionId:randomUUID()},'')).status,403);
 for(const status of ['awaiting_owner','accepted']){f.r.db.prepare('UPDATE studio_chats SET status=? WHERE id=?').run(status,c.id);assert.equal((await f.message(c.id,'Do not invalidate review')).status,409);}assert.equal(f.r.team.studio.detail(c.id).events.length,1);assert.equal(f.calls,0);
});
test('project session separation and empty-run rejection preserve existing records',async t=>{
 const f=await fixture(t),c=(await f.session()).data,other=f.r.team.studio.project({name:'Different project'});assert.equal((await f.post('/studio/projects/'+f.project.id+'/run',{chatId:c.id,requestId:randomUUID()})).status,409);assert.equal((await f.post('/studio/projects/'+other.id+'/run',{chatId:c.id,task:'Wrong project',requestId:randomUUID()})).status,409);assert.equal(f.r.team.studio.get(c.id).project_id,f.project.id);assert.equal(f.r.team.studio.get(c.id).state.goal,'');assert.equal(f.r.db.prepare('SELECT count(*) n FROM studio_locks').get().n,0);assert.equal(f.calls,0);
});

test('active messages queue and deduplicate without changing goal, phase, tests or dispatch count',async t=>{const f=await fixture(t),c=(await f.session()).data;const studio=f.r.team.studio;studio.change(c.id,'running',{goal:'Original in-flight goal',phase:'tester',tests:{executed:false}},'local_fixture');const before=studio.get(c.id),submissionId=crypto.randomUUID();for(let i=0;i<2;i++)assert.equal((await f.message(c.id,'Next owner instruction',{submissionId})).status,201);const after=studio.get(c.id);assert.deepEqual(after,before);assert.equal(studio.detail(c.id).events.filter(e=>e.kind==='message_queued').length,1);assert.equal(f.calls,0);studio.change(c.id,'paused',{},'local_fixture');const j=studio.start(f.project.id,{chatId:c.id,requestId:crypto.randomUUID()});await new Promise(setImmediate);await studio.wait(j.id);assert.match(studio.get(j.id).state.goal,/Next owner instruction/);assert.equal(studio.detail(j.id).events.filter(e=>e.kind==='queued_message_applied').length,1);assert.equal(f.packets[0].phase,'builder');});
