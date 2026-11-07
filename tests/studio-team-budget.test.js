import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {hashText} from '../src/services/project-files.js';
function fixture(t,{capUSD=0.02}={}) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'team-paid-mock-'));
 const r=createApp(loadConfig({DATABASE_PATH:path.join(root,'db.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backups'),DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_API_KEY:'FAKE_UNIT_FIXTURE',DEEPSEEK_INPUT_USD_PER_MILLION:'0.3',DEEPSEEK_OUTPUT_USD_PER_MILLION:'1.2',DEEPSEEK_PRICES_VERIFIED_UNTIL:new Date(Date.now()+3600000).toISOString()}),{fetchImpl:async()=>{throw Error('No authenticated requests allowed');},studioOptions:{schedule:()=>{}}});
 const s=r.team.studio,p=s.project({name:'MOCK paid team'}),j=s.create(p.id,'MOCK only');s.change(j.id,'ready',{fallbackPolicy:{enabled:false,allowedWorkers:[]}},'fixture');r.db.prepare('INSERT INTO deepseek_balance_observation VALUES (1,?,?)').run(1,new Date().toISOString());
 const approvedAt=new Date().toISOString(),terms={version:s.get(j.id).version,projectId:p.id,approvedBy:'owner',rootHash:hashText(s.root(p.id).root),roles:s.get(j.id).state.roles,approvedAt,expiresAt:new Date(Date.parse(approvedAt)+1800000).toISOString(),requestId:crypto.randomUUID(),paid:{model:'deepseek-flash',capUSD,maxOutput:4096,inputBytes:24000}};
 t.after(async()=>{await s.close();r.team.messenger.close();r.team.fileActions.close();r.team.preview.close();r.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {r,s,p,j,terms,body:{model:'deepseek-flash',max_tokens:4096,messages:[]},begin(){s.runScope.arm(j.id,terms);const saved=s.start(p.id,{chatId:j.id,requestId:terms.requestId}),repo=s.root(p.id),execution=s.runScope.reserve(saved,'deepseek','builder',repo.root,repo.fingerprint());return {execution,repo};}};
}
test('team paid terms require explicit matching model and positive bounded limits; no clock before approval',t=>{const f=fixture(t);assert.equal(f.s.get(f.j.id).state.runApproval,undefined);for(const paid of [undefined,{...f.terms.paid,model:'other'},{...f.terms.paid,capUSD:0},{...f.terms.paid,maxOutput:999999},{...f.terms.paid,inputBytes:999999}])assert.throws(()=>f.s.runScope.arm(f.j.id,{...f.terms,paid}));assert.equal(f.s.get(f.j.id).state.runApproval,undefined);});
test('bounded paid team uses the existing atomic phase slot and no fallback',async t=>{const f=fixture(t),{execution,repo}=f.begin();assert.equal(f.s.failover.policy(f.s.get(f.j.id)).enabled,false);const attempts=await Promise.allSettled([1,2].map(()=>Promise.resolve().then(()=>f.s.runScope.reserve(f.s.get(f.j.id),'deepseek','builder',repo.root,repo.fingerprint()))));assert.equal(attempts.filter(a=>a.status==='fulfilled').length,0);assert.ok(execution);assert.equal(f.s.executions.list(f.j.id).length,1);});
test('task lifetime reservation cannot be duplicated, rearmed or released after unknown outcome',t=>{const f=fixture(t),{execution}=f.begin(),held=f.s.failover.reserve(f.j.id,execution,f.body);assert.ok(held>0&&held<=0.02);assert.throws(()=>f.s.failover.reserve(f.j.id,execution,f.body));f.s.failover.settle(execution,null);assert.equal(f.s.failover.budget(f.j.id).heldUSD,held);assert.equal(f.r.db.prepare('SELECT status FROM studio_api_reservations WHERE execution_id=?').get(execution).status,'unknown');assert.throws(()=>f.s.runScope.arm(f.j.id,{...f.terms,version:f.s.get(f.j.id).version}));});
test('conservative cost, output and input bounds reject before a paid dispatch',t=>{for(const kind of ['cap','output','input','model']){const f=fixture(t,{capUSD:kind==='cap'?0.000001:0.02}),{execution}=f.begin();const body={...f.body};if(kind==='output')body.max_tokens++;if(kind==='model')body.model='other';if(kind==='input')body.messages=[{role:'user',content:'x'.repeat(24001)}];assert.throws(()=>f.s.failover.reserve(f.j.id,execution,body));assert.equal(f.s.failover.budget(f.j.id).heldUSD,0);}});
test('stale pricing or balance cannot dispatch; no automatic refresh',t=>{for(const kind of ['pricing','balance']){const f=fixture(t),{execution}=f.begin();if(kind==='balance')f.r.db.prepare('UPDATE deepseek_balance_observation SET checked_at=?').run('2000-01-01T00:00:00Z');else f.r.team.paid.policy={...f.r.team.paid.policy,pricesVerifiedUntil:'2000-01-01T00:00:00Z'};assert.equal(f.s.failover.paidReady(f.j.id).ok,false);assert.throws(()=>f.s.failover.reserve(f.j.id,execution,f.body));}});
test('normal team reserves beyond the former micro-cap against actual funding and keeps provider policy limits',t=>{
 for(const variant of ['funded','insufficient','provider-limit']){
  const f=fixture(t);f.r.team.paid.settings.outputPrice=10;
  if(variant==='insufficient')f.r.db.prepare('UPDATE deepseek_balance_observation SET available_usd=0.01').run();
  if(variant==='provider-limit')f.r.team.paid.policy={...f.r.team.paid.policy,requestLimit:0.01};
  const p=f.s.runScope.sendProposal(f.j.id),j=f.s.start(f.p.id,{chatId:f.j.id,requestId:crypto.randomUUID(),expectedVersion:p.version,proposalHash:p.hash}),repo=f.s.root(f.p.id);
  const id=f.s.runScope.reserve(j,'deepseek','builder',repo.root,repo.fingerprint());
  if(variant==='funded'){
   assert.ok(f.s.failover.reserve(j.id,id,f.body)>0.02);
   f.s.failover.settle(id,null,{teamSend:true});
   assert.ok(f.s.failover.budget(j.id).heldUSD>0.02);
  }else assert.throws(()=>f.s.failover.reserve(j.id,id,f.body),e=>e.code===(variant==='insufficient'?'insufficient_balance':'prepaid_limit'));
 }
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
 const finish=reason=>frame({choices:[{finish_reason:reason}],usage:{prompt_tokens:30,completion_tokens:10,total_tokens:40}});
 const done='data: [DONE]\n\n';
 const cases=[
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
