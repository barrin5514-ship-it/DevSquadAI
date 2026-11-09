import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {workflowFixture} from './helpers/workflow-debug-fixture.js';

const roles={builder:'deepseek',tester:'codex-school',reviewer:'claude-code'};
const request=(f,j,extra={})=>f.post('/studio/chats/'+j.id+'/retry',{requestId:crypto.randomUUID(),expectedVersion:j.version,mode:'resume',...extra});

test('role swap clears only the stale connection issue and Retry runs the new Tester',async t=>{
 const f=await workflowFixture(t,{fallback:false,recovery:{roles,unavailable:['codex-school']}});
 await f.run();
 f.s.change(f.chat.id,'paused',{fallbackUnavailable:['codex-school','codex-personal']},'fixture_cached_availability');
 const paused=f.s.detail(f.chat.id);
 assert.equal(paused.state.failure.code,'usage_limit');
 const old=paused.executions.find(e=>e.phase==='tester');
 const saved=f.s.roleManager.update(f.project.id,{version:1,chatId:f.chat.id,chatVersion:paused.version,roles:{...roles,tester:'codex-personal'}}).chat;
 assert.equal(saved.state.failure.code,undefined);
 assert.equal(saved.state.failure.connectionCleared,true);
 assert.deepEqual(saved.state.fallbackUnavailable,[]);
 assert.equal(saved.state.teamCheckpointHash,paused.state.teamCheckpointHash);
 assert.equal((await request(f,saved)).status,202);
 await f.s.wait(f.chat.id);
 const done=f.s.detail(f.chat.id);
 assert.equal(done.status,'awaiting_owner');
 assert.equal(done.executions.find(e=>e.id===old.id).status,'failed');
 assert.equal(done.executions.filter(e=>e.phase==='tester').at(-1).agent,'codex-personal');
 assert.equal(f.providerBodies.length,1);
});

test('the next Tester uses Nemotron even if the saved fallback list contains only School',async t=>{
 const f=await workflowFixture(t,{recovery:{roles,unavailable:['codex-school'],allowed:['codex-school']}});
 f.body.availabilityFallback=true;
 const done=await f.run();
 assert.equal(done.status,'awaiting_owner');
 assert.deepEqual(f.calls.filter(c=>c.phase==='tester').map(c=>c.agent),['codex-school','nemotron']);
 assert.ok(done.events.some(e=>e.kind==='provider_switched'&&e.content.from==='codex-school'&&e.content.to==='nemotron'));
});

test('the only available alternative cannot test its own implementation',async t=>{
 const f=await workflowFixture(t,{recovery:{roles:{...roles,builder:'nemotron'},paid:false,unavailable:['codex-school'],allowed:['codex-school']}});
 f.body.availabilityFallback=true;
 const j=await f.run();
 assert.equal(j.status,'paused');
 assert.deepEqual(f.calls.filter(c=>c.phase==='tester').map(c=>c.agent),['codex-school']);
 assert.match(j.state.failure.message,/independent/i);
});

test('checkpoint inspection names edited and added files and keeps Retry blocked',async t=>{
 const f=await workflowFixture(t,{fallback:false,recovery:{roles,unavailable:['codex-school']}});
 const j=await f.run(),repo=f.s.root(f.project.id);
 fs.writeFileSync(repo.resolve('app.mjs'),'export const changed = true;');
 fs.writeFileSync(repo.resolve('new.txt'),'new');
 const after=f.s.detail(j.id);
 assert.equal(after.resume.available,false);
 assert.match(after.resume.reason,/app\.mjs/);
 assert.match(after.resume.reason,/new\.txt/);
 assert.deepEqual(after.resume.changedFiles.map(x=>[x.path,x.change]),[['app.mjs','modified'],['new.txt','added']]);
 assert.ok(after.resume.changedFiles[0].revisionId);
 assert.equal((await request(f,j)).status,409);
 assert.equal(f.calls.filter(c=>c.phase==='tester').length,1);
});

test('a pre-dispatch Tester pause preserves a completed Builder and recovers older mislabelled checkpoints',async t=>{
 const f=await workflowFixture(t,{fallback:false,recovery:{roles,skipTester:true}});
 const j=await f.run(),builder=j.executions.find(e=>e.phase==='builder');
 assert.equal(j.status,'paused');
 assert.equal(j.state.failure.phase,'tester');
 assert.equal(builder.status,'completed');
 assert.equal(j.state.failure.checkpointHash,j.state.teamCheckpointHash);
 assert.ok(!j.executions.some(e=>e.phase==='tester'));
 const historical={...j.state.failure,checkpointHash:builder.checkpoint_hash};
 delete historical.checkpointFiles;
 f.s.executions.record(builder.id,{status:'failed',code:'provider_unavailable'});
 f.s.change(j.id,'paused',{failure:historical},'fixture_historical_failure');
 assert.equal(f.s.detail(j.id).resume.available,true);
 const app=f.s.root(f.project.id).resolve('app.mjs'),original=fs.readFileSync(app);
 fs.appendFileSync(app,'\n// outside edit');
 assert.match(f.s.detail(j.id).resume.reason,/app\.mjs/);
 fs.writeFileSync(app,original);
 const retry=await request(f,f.s.detail(j.id));assert.equal(retry.status,202);
 await f.s.wait(j.id);
 const done=f.s.detail(j.id);
 assert.equal(done.status,'awaiting_owner');
 assert.equal(done.executions.filter(e=>e.phase==='builder').length,1);
 assert.equal(done.executions.find(e=>e.phase==='tester').agent,'codex-school');
});
