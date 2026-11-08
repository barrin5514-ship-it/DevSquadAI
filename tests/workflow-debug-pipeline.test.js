import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {workflowFixture} from './helpers/workflow-debug-fixture.js';

test('one HTTP Send passes actual files and executed test evidence to independent roles and awaits the owner',async t=>{
 const f=await workflowFixture(t),j=await f.run();assert.equal(j.status,'awaiting_owner');
 assert.deepEqual(f.calls.map(c=>c.phase),['builder','tester','reviewer']);assert.equal(f.providerBodies.length,1);
 assert.equal(f.packets[1].files.find(x=>x.path==='app.mjs').content,f.implementation);
 assert.ok(f.packets[2].files.some(x=>x.path==='test/add.test.mjs'));assert.equal(f.packets[2].testResults.passed,true);assert.equal(f.packets[2].testResults.count,2);
 assert.equal(j.state.review.reviewerExecutedTests,false);assert.equal(j.state.acceptedAt,undefined);assert.equal(j.state.runApproval.mode,'team-send');
});

for(const fallback of [true,false])test('confirmed truncation obeys fallback='+fallback+' and settles its final reported usage',async t=>{
 const f=await workflowFixture(t,{mode:'length',fallback}),j=await f.run();assert.equal(j.status,fallback?'awaiting_owner':'paused');
 assert.equal(f.providerBodies.length,1);assert.equal(f.providerBodies[0].max_tokens,8192);
 const first=j.executions.find(e=>e.agent==='deepseek'),row=f.app.db.prepare('SELECT status,reserved_usd FROM studio_api_reservations WHERE execution_id=?').get(first.id);
 assert.equal(first.evidence.code,'response_truncated');assert.equal(row.status,'completed');assert.equal(row.reserved_usd,0.0098394);
 if(fallback){assert.deepEqual(f.calls.map(c=>c.agent),['deepseek','codex-personal','nemotron','claude-code']);assert.ok(j.events.some(e=>e.kind==='provider_switched'&&e.content.reason==='response_truncated'));}
 else{assert.equal(f.calls.length,1);assert.equal(j.state.failure.fallbackDecision.reason,'task_policy_disabled');assert.equal(j.revisions.length,0);}
});

test('unknown interrupted response pauses with its reservation retained and a duplicate Send cannot charge again',async t=>{
 const f=await workflowFixture(t,{mode:'interrupted'}),j=await f.run();assert.equal(j.status,'paused');assert.equal(j.state.failure.fallbackDecision.reason,'outcome_unknown');
 assert.equal(f.calls.length,1);assert.equal(f.providerBodies.length,1);assert.equal(j.revisions.length,0);
 const row=f.app.db.prepare('SELECT status,reserved_usd FROM studio_api_reservations WHERE execution_id=?').get(j.executions[0].id);assert.equal(row.status,'unknown');assert.ok(row.reserved_usd>0.009);
 const replay=await f.post(f.route,f.body);assert.equal(replay.status,202);assert.equal(f.providerBodies.length,1);assert.equal(f.calls.length,1);
});

test('a Builder returning no files for an empty project cannot advance to Tester or owner review',async t=>{
 const f=await workflowFixture(t,{mode:'empty'}),j=await f.run();assert.equal(j.status,'paused');assert.equal(f.calls.length,1);assert.equal(j.revisions.length,0);assert.match(j.state.alert,/no.*files|empty/i);
});

test('an unchanged existing implementation can still advance to independent testing and review',async t=>{
 const f=await workflowFixture(t,{mode:'empty'}),repo=f.s.root(f.project.id);
 fs.writeFileSync(repo.resolve('app.mjs'),f.implementation);
 const proposal=f.s.runScope.sendProposal(f.chat.id);Object.assign(f.body,{expectedVersion:proposal.version,proposalHash:proposal.hash});
 const done=await f.run();assert.equal(done.status,'awaiting_owner');assert.equal(done.state.tests.passed,true);assert.equal(done.state.tests.count,2);
 assert.equal(fs.readFileSync(repo.resolve('app.mjs'),'utf8'),f.implementation);assert.equal(f.calls.length,3);
});

for(const fallback of [true,false])test('a confirmed usage limit obeys fallback='+fallback+' with a rejected, zero-cost reservation',async t=>{
 const f=await workflowFixture(t,{mode:'rate',fallback}),j=await f.run();assert.equal(j.status,fallback?'awaiting_owner':'paused');assert.equal(f.providerBodies.length,1);
 const first=j.executions.find(e=>e.agent==='deepseek'),row=f.app.db.prepare('SELECT status,reserved_usd FROM studio_api_reservations WHERE execution_id=?').get(first.id);
 assert.equal(row.status,'rejected');assert.equal(row.reserved_usd,0);assert.equal(first.evidence.code,'rate_limit');
 if(!fallback)assert.equal(f.calls.length,1);
});

test('duplicate and competing Send while active cannot start an extra worker',async t=>{
 const f=await workflowFixture(t,{mode:'wait'}),first=await f.post(f.route,f.body);assert.equal(first.status,202);await f.started;
 assert.equal((await f.post(f.route,f.body)).status,202);
 assert.equal((await f.post(f.route,{...f.body,requestId:crypto.randomUUID()})).status,409);assert.equal(f.calls.length,1);
 f.release();await f.s.wait(f.chat.id);assert.equal(f.s.get(f.chat.id).status,'awaiting_owner');assert.equal(f.providerBodies.length,1);
});

test('paused Tester resumes from the actual saved files with no second paid Builder send',async t=>{
 const f=await workflowFixture(t,{mode:'tester-once'}),paused=await f.run();assert.equal(paused.status,'paused');assert.equal(paused.resume.phase,'tester');
 const response=await f.post('/studio/chats/'+f.chat.id+'/retry',{requestId:crypto.randomUUID(),expectedVersion:paused.version,mode:'resume'});assert.equal(response.status,202);await f.s.wait(f.chat.id);
 const done=f.s.detail(f.chat.id);assert.equal(done.status,'awaiting_owner');assert.notEqual(done.request_id,paused.request_id);assert.equal(done.project_id,paused.project_id);
 assert.equal(f.calls.filter(c=>c.phase==='builder').length,1);assert.equal(f.providerBodies.length,1);assert.equal(f.calls.filter(c=>c.phase==='tester').length,2);
 assert.equal(f.packets.at(-1).testResults.passed,true);
});

test('the displayed failure favors the real structured error over the ordinary stdin startup notice',async t=>{
 const f=await workflowFixture(t,{mode:'tester-credit',fallback:false}),j=await f.run();assert.equal(j.status,'paused');assert.equal(f.calls.length,2);
 assert.match(j.state.alert,/out of credits/);assert.doesNotMatch(j.state.alert,/Reading additional input from stdin/);
 assert.equal(j.state.failure.diagnostics.stderr,'Reading additional input from stdin...\n');
});
