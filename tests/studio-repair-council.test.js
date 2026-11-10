import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeFailedReply,replyEvidence} from '../src/services/studio-failure-evidence.js';
import {parseDemoCli} from '../src/services/demo-workers.js';
import {workflowFixture} from './helpers/workflow-debug-fixture.js';

const report=body=>({report:JSON.stringify(body),files:[],review:null,usage:{input_tokens:17,output_tokens:12}});
export function simulatedCouncil({absent=null,disagreeFirst=false,implementation}={}){
 return {absent,implementation,reply(agent,packet){
  const disagree=disagreeFirst&&!packet.failure.priorDiscussion;
  if(packet.phase==='council_synthesis'){
   const selected=packet.diagnoses.filter(d=>d.causeKey==='invalid-json');
   return report({causeKey:'invalid-json',fixKey:'return-valid-json',supports:selected.map(d=>d.executionId),plan:'Return a complete JSON object with the requested file list.',why:'The selected diagnoses traced the problem to the completed reply.'});
  }
  const key=disagree?agent:'invalid-json';
  return report({causeKey:key,fixKey:disagree?agent:'return-valid-json',cause:'The completed response was invalid.',fix:'Return a valid file list in one JSON object.',confidence:'high'});
 }};
}
const rounds=j=>j.events.filter(e=>e.kind==='repair_council_result'&&e.content.round);
const councilCalls=f=>f.calls.filter(c=>c.phase.startsWith('council_'));

test('council agrees on a correction, Builder implements it, and only independent evidence reaches the owner',async t=>{
 const f=await workflowFixture(t,{mode:'builder-json-once',fallback:false,council:simulatedCouncil()});
 const j=await f.run(),[round]=rounds(j);
 assert.equal(j.status,'awaiting_owner');
 assert.equal(round.content.outcome,'agreed');
 assert.equal(round.content.diagnoses.length,3);
 assert.ok(round.content.synthesis.executionId);
 assert.equal(j.state.corrections,1);
 assert.equal(j.state.tests.count,2);
 assert.equal(j.state.review.decision,'approved');
 assert.deepEqual(f.calls.map(c=>c.phase),['builder','council_diagnosis','council_diagnosis','council_diagnosis','council_synthesis','builder','tester','reviewer']);
 const evidence=f.packets.filter(p=>p.phase==='council_diagnosis').map(p=>p.failure);
 assert.deepEqual(evidence,[evidence[0],evidence[0],evidence[0]]);
 assert.equal(evidence[0].reply.text,'not valid JSON');
 assert.equal(evidence[0].validation.check,'answer_json');
 assert.ok(j.executions.some(e=>e.evidence.failureEvidence?.reply?.text==='not valid JSON'));
 assert.equal(j.events.filter(e=>e.kind==='api_usage'&&j.executions.some(x=>x.id===e.content.executionId&&x.phase.startsWith('council_'))).length,4);
 assert.equal(f.councilProviderBodies.length,1);
 assert.equal(f.councilProviderBodies[0].max_tokens,768);
 const paid=j.events.find(e=>e.kind==='api_usage'&&e.content.executionId===round.content.diagnoses.find(d=>d.agent==='deepseek').executionId);
 assert.deepEqual([paid.content.input,paid.content.output,paid.content.total],[25,15,40]);
 assert.ok(f.packets.filter(p=>p.phase==='builder').at(-1).problems.some(p=>p.includes('complete JSON')));
 const implemented=j.events.find(e=>e.kind==='repair_council_implementation');
 assert.equal(implemented.content.roundId,round.content.roundId);
 assert.equal(j.executions.find(e=>e.id===implemented.content.executionId).status,'completed');
});

test('a council disagreement pauses with findings and no Builder rewrite',async t=>{
 const f=await workflowFixture(t,{mode:'builder-json-once',council:simulatedCouncil({disagreeFirst:true})});
 const j=await f.run(),[round]=rounds(j);
 assert.equal(j.status,'paused');
 assert.equal(round.content.outcome,'disagreement');
 assert.equal(round.content.diagnoses.length,3);
 assert.ok(round.content.synthesis.executionId);
 assert.equal(councilCalls(f).length,4);
 assert.equal(f.providerBodies.length,1);
 assert.equal(j.revisions.length,0);
 assert.match(j.state.alert,/could not agree/i);
});

test('the first failed independent test convenes the authorized council before the Builder rewrites',async t=>{
 const f=await workflowFixture(t,{fallback:false,council:simulatedCouncil({implementation:attempt=>attempt===1?'export function add(){return 999;}':undefined})});
 const j=await f.run();
 assert.equal(j.status,'awaiting_owner');
 const failed=j.events.find(e=>e.kind==='test_results'&&!e.content.tests.passed);
 const convened=j.events.find(e=>e.kind==='repair_council_started');
 const agreed=j.events.find(e=>e.kind==='repair_council_result'&&e.content.outcome==='agreed');
 const correction=j.events.find(e=>e.kind==='correction_started');
 assert.ok(failed.id<convened?.id&&convened.id<agreed?.id&&agreed.id<correction.id);
 assert.deepEqual(f.calls.map(c=>c.phase),['builder','tester','council_diagnosis','council_diagnosis','council_diagnosis','council_synthesis','builder','tester','reviewer']);
 const packets=f.packets.filter(p=>p.phase==='council_diagnosis');
 assert.ok(packets.every(p=>p.failure.stage==='tester'&&p.failure.tests.failures.includes('integers')&&p.failure.files.some(f=>f.path==='app.mjs'&&f.text.includes('999'))));
 assert.equal(j.state.tests.count,2);assert.equal(j.state.review.decision,'approved');
});

test('ordinary Send still corrects directly without council permission',async t=>{
 const f=await workflowFixture(t,{fallback:false,council:simulatedCouncil({implementation:attempt=>attempt===1?'export function add(){return 999;}':undefined})});
 f.body.repairCouncil=false;
 const j=await f.run();
 assert.equal(j.status,'awaiting_owner');assert.equal(councilCalls(f).length,0);
 assert.equal(j.events.find(e=>e.kind==='correction_started').content.councilEnabled,false);
 assert.deepEqual(f.calls.map(c=>c.phase),['builder','tester','builder','tester','reviewer']);
});

test('explicit owner Retry can enable the council without a new chat or rebuilding before diagnosis',async t=>{
 const f=await workflowFixture(t,{mode:'tester-once',fallback:false,council:simulatedCouncil({implementation:attempt=>attempt===1?'export function add(){return 999;}':undefined})});
 f.body.repairCouncil=false;
 const paused=await f.run();
 assert.equal(paused.status,'paused');assert.equal(paused.resume.phase,'tester');assert.equal(paused.resume.councilAvailable,true);
 assert.equal(paused.state.runApproval.council,undefined);
 const route='/studio/chats/'+f.chat.id+'/retry';
 assert.equal((await f.post(route,{requestId:crypto.randomUUID(),expectedVersion:paused.version-1,mode:'resume',repairCouncil:true})).status,409);
 assert.equal(f.providerBodies.length,1);
 assert.equal((await f.post(route,{requestId:crypto.randomUUID(),expectedVersion:paused.version,mode:'resume',repairCouncil:true})).status,202);
 await f.s.wait(f.chat.id);
 const j=f.s.detail(f.chat.id);
 assert.equal(j.status,'awaiting_owner');assert.equal(j.id,paused.id);
 const stages=f.calls.map(c=>c.phase);
 assert.equal(stages.filter(phase=>phase==='builder').length,2);
 assert.ok(stages.lastIndexOf('council_synthesis')<stages.lastIndexOf('builder'));
});

test('council records an absent provider and can agree with two',async t=>{
 const f=await workflowFixture(t,{mode:'builder-json-once',fallback:false,council:simulatedCouncil({absent:'codex-personal'})});
 const j=await f.run(),[round]=rounds(j);
 assert.equal(j.status,'awaiting_owner');
 assert.equal(round.content.diagnoses.length,2);
 assert.ok(round.content.absent.some(r=>r.agent==='codex-personal'));
 assert.equal(councilCalls(f).length,3);
});

test('council cycles continue beyond two rounds with fresh evidence',async t=>{
 const f=await workflowFixture(t,{mode:'builder-json-four',fallback:false,council:simulatedCouncil()});
 const j=await f.run();
 assert.equal(j.status,'awaiting_owner');
 assert.deepEqual(rounds(j).map(e=>e.content.round),[1,2,3,4]);
 assert.equal(new Set(rounds(j).map(e=>e.content.executionId)).size,4);
 assert.equal(councilCalls(f).length,16);
 assert.equal(j.state.corrections,4);
 assert.equal(f.providerBodies.length,5);
 assert.equal(j.state.tests.passed,true);
});

test('failed tests after a council repair prompt a new diagnosis before owner review',async t=>{
 const council=simulatedCouncil({implementation:attempt=>attempt===2?'export function add(){return 999;}':undefined});
 const f=await workflowFixture(t,{mode:'builder-json-once',fallback:false,council});
 const j=await f.run();
 assert.equal(j.status,'awaiting_owner');
 const results=j.events.filter(e=>e.kind==='test_results');
 assert.deepEqual(results.map(e=>e.content.tests.passed),[false,true]);
 assert.equal(rounds(j).length,2);
 assert.equal(f.packets.findLast(p=>p.phase==='council_diagnosis').failure.stage,'tester');
 assert.equal(f.calls.filter(c=>c.phase==='reviewer').length,1);
});

test('text-only happy path does not start a council',async t=>{
 const f=await workflowFixture(t,{fallback:false,council:simulatedCouncil()});
 const j=await f.run();
 assert.equal(j.status,'awaiting_owner');
 assert.equal(rounds(j).length,0);
 assert.equal(councilCalls(f).length,0);
});

test('review rejection is retained and only a fresh independent review can clear it',async t=>{
 const f=await workflowFixture(t,{mode:'review-once',fallback:false,council:simulatedCouncil()});
 const j=await f.run();
 assert.equal(j.status,'awaiting_owner');
 assert.deepEqual(j.events.filter(e=>e.kind==='independent_review').map(e=>e.content.decision),['changes_requested','approved']);
 assert.equal(rounds(j).length,1);
 assert.ok(j.executions.some(e=>e.phase==='reviewer'&&e.evidence.failureEvidence?.review?.findings.includes('Clarify the exported function.')));
 assert.deepEqual(f.calls.filter(c=>['builder','tester','reviewer'].includes(c.phase)).map(c=>c.phase),['builder','tester','reviewer','builder','tester','reviewer']);
});

test('three historical corrections do not block a fresh council cycle',async t=>{
 const f=await workflowFixture(t,{mode:'builder-json-once',fallback:false,council:simulatedCouncil()});
 f.s.change(f.chat.id,'ready',{corrections:3},'fixture_correction_history');
 const proposal=f.s.runScope.sendProposal(f.chat.id);
 Object.assign(f.body,{expectedVersion:proposal.version,proposalHash:proposal.hash});
 const j=await f.run();
 assert.equal(j.status,'awaiting_owner');
 assert.equal(j.state.corrections,4);
 assert.equal(rounds(j).length,1);
 assert.equal(councilCalls(f).length,4);
});

test('unknown API outcome gets advice only and preserves the original reservation',async t=>{
 const f=await workflowFixture(t,{mode:'interrupted',fallback:true,council:simulatedCouncil()});
 const j=await f.run(),[round]=rounds(j);
 assert.equal(j.status,'paused');
 assert.equal(round.content.outcome,'advice_only');
 assert.equal(f.providerBodies.length,1);
 const execution=j.executions.find(e=>e.phase==='builder');
 assert.equal(execution.status,'unknown');
 assert.equal(f.app.db.prepare('SELECT status FROM studio_api_reservations WHERE execution_id=?').get(execution.id).status,'unknown');
});

test('an unknown council call is retained and never replayed in a later discussion',async t=>{
 const council=simulatedCouncil({disagreeFirst:true}),reply=council.reply;
 council.reply=(agent,packet)=>{
  if(agent==='codex-personal'&&!packet.failure.priorDiscussion)throw {code:'timeout',stopped:false,unknownOutcome:true};
  return reply(agent,packet);
 };
 const f=await workflowFixture(t,{mode:'builder-json-once',council,fallback:false});
 const j=await f.run();
 assert.equal(j.status,'paused');
 assert.equal(rounds(j).length,1);
 assert.equal(rounds(j)[0].content.outcome,'advice_only');
 assert.equal(j.executions.find(e=>e.phase==='council_diagnosis'&&e.agent==='codex-personal').status,'unknown');
 assert.equal(f.providerBodies.length,1);
});

test('a second malformed Builder reply offers an eligible fallback without dispatching it',async t=>{
 const council={...simulatedCouncil({absent:'claude-code'}),tester:'nemotron'};
 const f=await workflowFixture(t,{mode:'builder-json',council});
 const first=await f.run();
 assert.equal(first.status,'paused');
 const retry=await f.post('/studio/chats/'+f.chat.id+'/retry',{requestId:crypto.randomUUID(),expectedVersion:first.version,mode:'resume'});
 assert.equal(retry.status,202);await f.s.wait(f.chat.id);
 const j=f.s.detail(f.chat.id),offer=j.events.find(e=>e.kind==='repair_fallback_offered');
 assert.equal(j.status,'paused');
 assert.equal(rounds(j).length,2);
 assert.equal(offer.content.agent,'codex-personal');
 assert.equal(f.calls.filter(c=>c.phase==='builder').length,2);
 assert.equal(j.revisions.length,0);
});

test('availability exhaustion during a correction pauses with the latest finding and checkpoint',async t=>{
 const council={...simulatedCouncil({implementation:'export function add(){return 999;}'}),unavailableAfter:1};
 const f=await workflowFixture(t,{council,recovery:{roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},allowed:[],available:['codex-personal','claude-code']}});
 const j=await f.run();
 assert.equal(j.status,'paused');
 assert.match(j.state.alert,/No available independent worker/i);
 assert.equal(j.state.corrections,1);
 assert.deepEqual(j.state.problems.slice(0,2),['integers','negative and zero']);
 assert.match(j.state.problems[2],/^Repair council plan:/);
 assert.equal(j.resume.checkpointHash,f.s.root(f.project.id).fingerprint());
 assert.equal(j.state.failure.code,'rate_limit');
 assert.equal(f.providerBodies.length,2);
 assert.equal(councilCalls(f).length,4);
 const reservation=f.app.db.prepare('SELECT status,reserved_usd FROM studio_api_reservations WHERE execution_id=?').get(j.executions.findLast(e=>e.phase==='builder').id);
 assert.deepEqual({...reservation},{status:'rejected',reserved_usd:0});
});

test('failure text caps UTF-8 and removes credential values and hidden reasoning before storage',()=>{
 const team={coordinator:{configuredSecrets:()=>['fixture-private-value']}};
 const reply=safeFailedReply(team,'<think>private deliberation</think> fixture-private-value {"api_key":"sk-secretvalue12345"} '+ '🌐'.repeat(2000));
 assert.ok(reply.truncated);
 assert.ok(Buffer.byteLength(reply.text)<=reply.capBytes);
 assert.doesNotMatch(reply.text,/private deliberation|fixture-private-value|sk-secretvalue/);
 const err=new SyntaxError('Invalid JSON at position 17 (line 2 column 4) with sensitive snippet');
 assert.deepEqual(replyEvidence('broken','answer_json',err).validation,{check:'answer_json',message:'Final reply could not be parsed as JSON.',position:17,line:2,column:4});
});

test('a Codex council answer requires exactly one final agent message',()=>{
 const raw=[{type:'item.completed',item:{type:'agent_message',text:'{"report":"first","files":[]}'}},{type:'item.completed',item:{type:'agent_message',text:'{"report":"second","files":[]}'}},{type:'turn.completed'}].map(x=>JSON.stringify(x)).join('\n');
 assert.equal(parseDemoCli('codex',raw).report,'second');
 assert.throws(()=>parseDemoCli('codex',raw,8192,{singleFinal:true}),/exactly one/);
});
