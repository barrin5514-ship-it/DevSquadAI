import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {hashText} from '../src/services/project-files.js';
import {StudioWorkers} from '../src/services/studio-workers.js';
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'team-paid-mock-'));
 const r=createApp(loadConfig({DATABASE_PATH:path.join(root,'db.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backups'),DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_API_KEY:'FAKE_UNIT_FIXTURE',DEEPSEEK_INPUT_USD_PER_MILLION:'0.3',DEEPSEEK_OUTPUT_USD_PER_MILLION:'1.2',DEEPSEEK_PRICES_VERIFIED_UNTIL:new Date(Date.now()+3600000).toISOString()}),{fetchImpl:async()=>{throw Error('No authenticated requests allowed');},studioOptions:{schedule:()=>{}}});
 const s=r.team.studio,p=s.project({name:'MOCK paid team'}),j=s.create(p.id,'MOCK only');s.change(j.id,'ready',{fallbackPolicy:{enabled:false,allowedWorkers:[]}},'fixture');r.db.prepare('INSERT INTO deepseek_balance_observation VALUES (1,?,?)').run(1,new Date().toISOString());
 const approvedAt=new Date().toISOString(),terms={version:s.get(j.id).version,projectId:p.id,approvedBy:'owner',rootHash:hashText(s.root(p.id).root),roles:s.get(j.id).state.roles,approvedAt,expiresAt:new Date(Date.parse(approvedAt)+1800000).toISOString(),requestId:crypto.randomUUID(),paid:{model:'deepseek-flash',maxOutput:4096,inputBytes:24000}};
 t.after(async()=>{await s.close();r.team.messenger.close();r.team.fileActions.close();r.team.preview.close();r.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {r,s,p,j,terms,body:{model:'deepseek-flash',max_tokens:4096,messages:[]},begin(){s.runScope.arm(j.id,terms);const saved=s.start(p.id,{chatId:j.id,requestId:terms.requestId}),repo=s.root(p.id),execution=s.runScope.reserve(saved,'deepseek','builder',repo.root,repo.fingerprint());return {execution,repo};}};
}
function streamResponse(value){return new Response('data: '+JSON.stringify({model:'deepseek-flash',choices:[{delta:{content:JSON.stringify(value)},finish_reason:'stop'}],usage:{prompt_tokens:20,completion_tokens:40,total_tokens:60}})+'\n\ndata: [DONE]\n\n',{status:200,headers:{'Content-Type':'text/event-stream'}});}
test('paid team terms require matching model and bounded input/output, not a dollar cap',t=>{
 const f=fixture(t),valid=f.terms.paid;
 for(const paid of [undefined,{...valid,model:'other'},{...valid,maxOutput:999999},{...valid,inputBytes:999999}])assert.throws(()=>f.s.runScope.arm(f.j.id,{...f.terms,paid}));
 const armed=f.s.runScope.arm(f.j.id,{...f.terms,paid:valid});
 assert.equal(armed.state.runApproval.paid.capUSD,undefined);assert.equal(armed.state.runApproval.paid.maxOutput,4096);assert.equal(f.r.team.studio.runScope.preview(f.j.id).issues.includes('The conservative reservation exceeds the available balance or task cap.'),false);
});
test('bounded paid team uses the existing atomic phase slot and no fallback',async t=>{
 const f=fixture(t),{execution,repo}=f.begin();assert.equal(f.s.failover.policy(f.s.get(f.j.id)).enabled,false);
 const attempts=await Promise.allSettled([1,2].map(()=>Promise.resolve().then(()=>f.s.runScope.reserve(f.s.get(f.j.id),'deepseek','builder',repo.root,repo.fingerprint()))));
 assert.equal(attempts.filter(a=>a.status==='fulfilled').length,0);assert.ok(execution);assert.equal(f.s.executions.list(f.j.id).length,1);
});
test('usage reservation remains idempotent and unknown outcomes are retained without a spending cap',t=>{
 const f=fixture(t),{execution}=f.begin(),held=f.s.failover.reserve(f.j.id,execution,f.body);
 assert.ok(held>0);assert.throws(()=>f.s.failover.reserve(f.j.id,execution,f.body));f.s.failover.settle(execution,null);
 assert.equal(f.s.failover.budget(f.j.id).heldUSD,held);assert.equal(f.s.failover.budget(f.j.id).displayOnly,true);assert.equal(f.r.db.prepare('SELECT status FROM studio_api_reservations WHERE execution_id=?').get(execution).status,'unknown');
 assert.throws(()=>f.s.runScope.arm(f.j.id,{...f.terms,version:f.s.get(f.j.id).version}));
});
test('no local cap, balance, price-staleness or request/day/total limit blocks provider dispatch; usage is recorded',async t=>{
 const f=fixture(t);
 f.r.team.paid.policy={...f.r.team.paid.policy,requestLimit:0.000001,dailyLimit:0.000001,totalLimit:0.000001,pricesVerifiedUntil:'2000-01-01T00:00:00Z'};
 f.r.db.prepare('UPDATE deepseek_balance_observation SET available_usd=0,checked_at=?').run('2000-01-01T00:00:00Z');
 const proposal=f.s.runScope.sendProposal(f.j.id),started=f.s.start(f.p.id,{chatId:f.j.id,requestId:crypto.randomUUID(),expectedVersion:proposal.version,proposalHash:proposal.hash}),repo=f.s.root(f.p.id),executionId=f.s.runScope.reserve(started,'deepseek','builder',repo.root,repo.fingerprint());
 let calls=0;f.r.team.fetch=async()=>{calls++;return streamResponse({report:'Provider call completed despite stale caps.',files:[],review:null});};
 const execution={executionId,chatId:started.id,nativeLimits:started.state.runApproval,fallbackBudget:f.s.failover,usage:f.s.usage};
 const result=await new StudioWorkers(f.s.team).call('deepseek',{phase:'builder'},repo.root,new AbortController().signal,execution);
 assert.equal(result.report,'Provider call completed despite stale caps.');assert.equal(calls,1);
 const usage=f.s.usage.summary(started.id);assert.equal(usage.input,20);assert.equal(usage.output,40);assert.equal(usage.calls,1);assert.ok(usage.knownEstimatedUSD>0);
 assert.equal(f.r.db.prepare('SELECT status FROM studio_api_reservations WHERE execution_id=?').get(executionId).status,'completed');
});
test('a large worker packet is not rejected by the approved context byte count',t=>{
 const f=fixture(t),{execution}=f.begin(),body={...f.body,messages:[{role:'user',content:'x'.repeat(30000)}]};
 assert.ok(Buffer.byteLength(JSON.stringify(body))>24000);assert.doesNotThrow(()=>f.s.failover.reserve(f.j.id,execution,body));
});
test('Studio DeepSeek defaults to an explicit 8192-token output bound',async t=>{
 const f=fixture(t),proposal=f.s.runScope.sendProposal(f.j.id);
 assert.equal(proposal.limits.paid.maxOutput,8192);
 let sent=null;f.r.team.fetch=async(_url,options)=>{sent=JSON.parse(options.body);return streamResponse({report:'LOCAL 8192 FIXTURE',files:[]});};
 const result=await new StudioWorkers(f.r.team).call('deepseek',{phase:'builder'},f.s.root(f.p.id).root,new AbortController().signal,{executionId:'fixture-output',chatId:f.j.id,usage:{start(){},record(){}},onEvent(){}});
 assert.equal(result.report,'LOCAL 8192 FIXTURE');assert.equal(sent.max_tokens,8192);assert.equal(sent.stream,true);
});
test('stale pricing and zero balance are display-only status, not a dispatch rejection',t=>{
 const f=fixture(t),{execution}=f.begin();f.r.db.prepare('UPDATE deepseek_balance_observation SET available_usd=0,checked_at=?').run('2000-01-01T00:00:00Z');
 const funding=f.s.failover.fundingReady(),ready=f.s.failover.paidReady(f.j.id);
 assert.equal(ready.ok,true);assert.equal(funding.ok,true);assert.equal(funding.displayOnly,true);assert.equal(funding.stale,true);
 assert.ok(f.s.failover.reserve(f.j.id,execution,f.body)>=0);assert.equal(f.s.failover.budget(f.j.id).displayOnly,true);
});
test('a provider billing error remains the provider error, not a Dev Squad budget failure',async t=>{
 const f=fixture(t),proposal=f.s.runScope.sendProposal(f.j.id),started=f.s.start(f.p.id,{chatId:f.j.id,requestId:crypto.randomUUID(),expectedVersion:proposal.version,proposalHash:proposal.hash}),repo=f.s.root(f.p.id),id=f.s.runScope.reserve(started,'deepseek','builder',repo.root,repo.fingerprint());
 f.r.team.fetch=async()=>Response.json({error:{message:'Provider account has no remaining credit'}},{status:402});
 const execution={executionId:id,chatId:started.id,nativeLimits:started.state.runApproval,fallbackBudget:f.s.failover,usage:f.s.usage};
 await assert.rejects(()=>new StudioWorkers(f.s.team).call('deepseek',{phase:'builder'},repo.root,new AbortController().signal,execution),e=>e.code==='payment_required');
 assert.equal(f.r.db.prepare('SELECT status FROM studio_api_reservations WHERE execution_id=?').get(id).status,'rejected');
});
test('normal DeepSeek adapter distinguishes confirmed provider limit from unknown completion and settles safely',async t=>{
 for(const status of [429,503]){
  const f=fixture(t),p=f.s.runScope.sendProposal(f.j.id),j=f.s.start(f.p.id,{chatId:f.j.id,requestId:crypto.randomUUID(),expectedVersion:p.version,proposalHash:p.hash}),repo=f.s.root(f.p.id);
  const id=f.s.runScope.reserve(j,'deepseek','builder',repo.root,repo.fingerprint());let calls=0;
  f.r.team.fetch=async()=>{calls++;return Response.json({error:{message:'Mock limit or outage'}},{status});};
  const execution={executionId:id,chatId:j.id,nativeLimits:j.state.runApproval,fallbackBudget:f.s.failover,usage:f.s.usage};
  await assert.rejects(()=>f.s.workers.call('deepseek',{phase:'builder'},repo.root,new AbortController().signal,execution),e=>e.unknownOutcome===(status===503)&&(status!==429||e.code==='rate_limit'));
  const row=f.r.db.prepare('SELECT status,reserved_usd FROM studio_api_reservations WHERE execution_id=?').get(id);
  assert.equal(row.status,status===429?'rejected':'unknown');assert.equal(row.reserved_usd>0,status===503);assert.equal(calls,1);
 }
});
test('DeepSeek stream fixtures record the failed check without persisting provider text',async t=>{
 const frame=value=>'data: '+JSON.stringify(value)+'\n\n';
 const visible='PRIVATE_VISIBLE_FIXTURE '.repeat(240);
 const output=model=>frame({model,choices:[{delta:{content:visible,reasoning_content:'PRIVATE_REASONING_FIXTURE'}}]});
 const finish=(reason,tokens=10)=>frame({choices:[{finish_reason:reason}],usage:{prompt_tokens:30,completion_tokens:tokens,total_tokens:30+tokens}});
 const done='data: [DONE]\n\n';
 const cases=[
  {payload:output('deepseek-flash')+finish('length',4096)+done,check:'finish_reason',completionObserved:true,finishReason:'length',usageReported:true,code:'response_truncated',unknown:false},
  {payload:output('deepseek-flash')+'data: PRIVATE_BROKEN_EVENT\n\n',check:'event_json',completionObserved:false,finishReason:null,usageReported:false,code:'invalid_response',unknown:true},
  {payload:output('PRIVATE_RETURNED_MODEL')+finish('stop')+done,check:'response_model',completionObserved:true,finishReason:'stop',usageReported:true,code:'invalid_response',unknown:true},
  {payload:output('deepseek-flash')+finish('stop'),check:'missing_done',completionObserved:false,finishReason:'stop',usageReported:true,code:'provider_error',unknown:true},
  {payload:output('deepseek-flash')+finish('PRIVATE_FINISH_FIXTURE')+done,check:'finish_reason',completionObserved:true,finishReason:'unrecognized',usageReported:true,code:'invalid_response',unknown:false},
  {payload:output('deepseek-flash')+finish('stop')+done,check:'answer_json',completionObserved:true,finishReason:'stop',usageReported:true,code:undefined,unknown:false}
 ];
 for(const {payload,check,completionObserved,finishReason,usageReported,code,unknown} of cases){
  const f=fixture(t),p=f.s.runScope.sendProposal(f.j.id),j=f.s.start(f.p.id,{chatId:f.j.id,requestId:crypto.randomUUID(),expectedVersion:p.version,proposalHash:p.hash}),repo=f.s.root(f.p.id);
  const id=f.s.runScope.reserve(j,'deepseek','builder',repo.root,repo.fingerprint());let calls=0;
  f.r.team.fetch=async()=>{calls++;return new Response(payload,{headers:{'content-type':'text/event-stream'}});};
  const execution={executionId:id,chatId:j.id,nativeLimits:j.state.runApproval,fallbackBudget:f.s.failover,usage:f.s.usage,onEvent:e=>f.s.executions.record(id,e)};
  await assert.rejects(()=>f.s.workers.call('deepseek',{phase:'builder'},repo.root,new AbortController().signal,execution),e=>e.code===code&&Boolean(e.unknownOutcome)===unknown&&!e.message.includes('PRIVATE_'));
  const detail=f.s.detail(j.id);
  assert.deepEqual(detail.executions[0].evidence.deepseekResponse,{failedCheck:check,completionObserved,finishReason,usageReported,httpStatus:200});
  if(finishReason==='length'){
   const usage=detail.events.find(e=>e.kind==='api_usage').content;
   assert.equal(usage.outcome,'incomplete');assert.equal(usage.output,4096);
   assert.equal(detail.revisions.length,0);assert.equal(repo.fingerprint(),j.state.runApproval.checkpointHash);
  }
  if(check==='missing_done'){
   const usage=detail.events.find(e=>e.kind==='api_usage').content;
   assert.equal(usage.outcome,'unknown');assert.equal(usage.total,40);
   const hold=f.r.db.prepare('SELECT status,reserved_usd FROM studio_api_reservations WHERE execution_id=?').get(id);
   assert.equal(hold.status,'unknown');assert.ok(hold.reserved_usd>0);
  }
  assert.ok(!JSON.stringify(detail).includes('PRIVATE_'));
  assert.equal(calls,1);
 }
});
