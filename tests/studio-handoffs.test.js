import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';

function baseEnv(root,{zapier=true,callbackToken='fixture-callback-token'}={}){
 return {DATABASE_PATH:path.join(root,'data/main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup'),STUDIO_ZAPIER_HANDOFFS:zapier?'true':'false',STUDIO_ZAPIER_CALLBACK_TOKEN:callbackToken,STUDIO_HANDOFF_TIMEOUT_MS:'5000'};
}

async function fixture(t,{zapier=true,call,tests,configureWebhook=true,callbackToken='fixture-callback-token',zapierFailure=null}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-handoff-test-')),calls=[],webhookCalls=[];let server,base;
 const workers={call:async(agent,packet)=>{calls.push({agent,phase:packet.phase});if(call)return call(agent,packet);if(packet.phase==='builder')return {report:'Fixture implementation',files:[{path:'src/add.mjs',content:'export const add=(a,b)=>a+b;'}]};if(packet.phase==='tester')return {report:'Fixture independent tests',files:[{path:'test/add.test.mjs',content:'// Fixture test source'}]};return {report:'Fixture review',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'Reviewed supplied evidence',findings:[]}};},tests:tests||(async()=>({executed:true,passed:true,count:3,failed:0,summary:'Fixture runner evidence'}))};
 const webhookFetch=async (_url,options)=>{
  const payload=JSON.parse(options.body);webhookCalls.push(payload);
  if(zapierFailure==='http')throw Error('simulated dead Zapier target');
  if(zapierFailure==='no-callback')return new Response('',{status:200});
  if(zapier){
   const response=await fetch(base+'/api/console/studio/zapier/callback',{method:'POST',headers:{'content-type':'application/json','x-studio-callback-token':'fixture-callback-token'},body:JSON.stringify({...payload,action:'continue'})});
   if(!response.ok)throw Error('simulated Zapier callback HTTP '+response.status);
  }
  return new Response('',{status:200});
 };
 const config=loadConfig(baseEnv(root,{zapier,callbackToken})),runtime=createApp(config,{fetchImpl:async()=>{throw Error('No provider network in fixture');},webhookFetch,studioOptions:{workers}});server=runtime.app.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
 if(configureWebhook)await runtime.team.webhook.configure({url:'https://hooks.zapier.com/hooks/catch/fixture/fixture',enabled:true});
 const studio=runtime.team.studio,project=studio.project({name:'DISPOSABLE handoff fixture'});
 t.after(async()=>{await studio.close();runtime.team.messenger.close();runtime.team.fileActions.close();if(server.listening)await new Promise(resolve=>server.close(resolve));runtime.db.close();fs.rmSync(root,{recursive:true,force:true});});
 const run=async()=>{const j=studio.start(project.id,{task:'Build a fixture utility',requestId:crypto.randomUUID()});await new Promise(setImmediate);await studio.wait(j.id);return studio.get(j.id);};
 return {root,runtime,studio,project,calls,webhookCalls,run,base};
}

test('one Send uses two simulated Zapier checkpoint handoffs and ends at owner review',async t=>{
 const f=await fixture(t),j=await f.run(),d=f.studio.detail(j.id);
 assert.equal(j.status,'awaiting_owner');
 assert.deepEqual(f.calls.map(x=>[x.agent,x.phase]),[['deepseek','builder'],['codex-personal','tester'],['claude-code','reviewer']]);
 assert.equal(f.webhookCalls.length,2);
 assert.deepEqual(f.webhookCalls.map(x=>[x.phase,x.nextPhase,x.checkpointHash.length]),[['builder','tester',64],['tester','reviewer',64]]);
 assert.equal(d.handoffs.length,2);
 assert.ok(d.handoffs.every(h=>h.status==='accepted'&&h.mode==='zapier'));
 assert.equal(d.handoffs[0].accepted_at!==null,true);
 const builderExecution=d.executions.find(e=>e.agent==='deepseek'&&e.phase==='builder'),testExecution=d.executions.find(e=>e.agent==='application-tests');
 assert.equal(d.executions.filter(e=>e.agent==='application-tests').length,1);
 assert.equal(f.webhookCalls[0].executionId,builderExecution.id);assert.equal(f.webhookCalls[1].executionId,testExecution.id);assert.equal(d.handoffs[0].detail.executionId,builderExecution.id);assert.equal(d.handoffs[1].detail.executionId,testExecution.id);
 assert.equal(j.state.writeAccess.status,'released');
 assert.equal(f.runtime.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(j.id).n,0);
 assert.equal(d.events.filter(e=>e.kind==='handoff_accepted').length,2);
 assert.equal(d.events.filter(e=>e.kind==='independent_review').length,1);
 assert.equal(d.state.review.decision,'approved');
});

test('a dead Zapier target falls back to local handoffs for both builds and rejects replay',async t=>{
 const f=await fixture(t,{zapierFailure:'http'}),j=await f.run(),d=f.studio.detail(j.id);
 assert.equal(j.status,'awaiting_owner');
 assert.deepEqual(f.calls.map(x=>[x.agent,x.phase]),[['deepseek','builder'],['codex-personal','tester'],['claude-code','reviewer']]);
 assert.equal(f.webhookCalls.length,2);
 assert.equal(d.handoffs.length,2);
 assert.ok(d.handoffs.every(h=>h.status==='local'&&h.detail.fallback===true&&h.mode==='zapier'));
 assert.equal(d.events.filter(e=>e.kind==='handoff_local_fallback').length,2);
 const before=f.calls.length,payload=f.webhookCalls[0];
 const replay=await fetch(f.base+'/api/console/studio/zapier/callback',{method:'POST',headers:{'content-type':'application/json','x-studio-callback-token':'fixture-callback-token'},body:JSON.stringify({...payload,action:'continue'})});
 assert.equal(replay.status,409);
 assert.equal(f.calls.length,before);
});
test('a Zapier callback timeout falls back to local for both builds',async t=>{
 const f=await fixture(t,{zapierFailure:'no-callback'}),j=await f.run(),d=f.studio.detail(j.id);
 assert.equal(j.status,'awaiting_owner');
 assert.equal(f.calls.filter(x=>x.phase==='reviewer').length,1);
 assert.equal(d.handoffs.length,2);
 assert.ok(d.handoffs.every(h=>h.status==='local'&&h.detail.fallback===true));
 assert.equal(d.events.filter(e=>e.kind==='handoff_local_fallback'&&e.content.delivery==='timed_out').length,2);
});
test('fully local mode completes the same two-build cycle without any Zapier delivery',async t=>{
 const f=await fixture(t,{zapier:false}),j=await f.run(),d=f.studio.detail(j.id);
 assert.equal(j.status,'awaiting_owner');
 assert.equal(f.calls.filter(x=>x.phase==='builder').length,1);
 assert.equal(f.calls.filter(x=>x.phase==='tester').length,1);
 assert.equal(f.calls.filter(x=>x.phase==='reviewer').length,1);
 assert.equal(f.webhookCalls.length,0);
 assert.ok(d.handoffs.every(h=>h.status==='local'&&h.mode==='local'));
});

test('an active writer holds a workspace claim until the run finishes',async t=>{
 let releaseBuilder;
 const f=await fixture(t,{call:async(agent,packet)=>{if(packet.phase==='builder')return new Promise(resolve=>{releaseBuilder=resolve;});if(packet.phase==='tester')return {report:'Fixture independent tests',files:[{path:'test/add.test.mjs',content:'// Fixture test source'}]};return {report:'Fixture review',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'Reviewed',findings:[]}};}});
 const j=f.studio.start(f.project.id,{task:'Hold the writer lock',requestId:crypto.randomUUID()});await new Promise(setImmediate);
 try{
  assert.equal(f.studio.lock(j.id).chat_id,j.id);
  assert.equal(f.studio.get(j.id).state.writeAccess.status,'held');
  assert.throws(()=>f.studio.start(f.project.id,{task:'Competing build',requestId:crypto.randomUUID()}),/folder is in use/);
 }finally{releaseBuilder({report:'Fixture implementation',files:[{path:'src/add.mjs',content:'export const add=(a,b)=>a+b;'}]});}
 await f.studio.wait(j.id);
 assert.equal(f.studio.get(j.id).status,'awaiting_owner');
 assert.equal(f.runtime.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(j.id).n,0);
});

test('unknown Builder outcome releases write access with no checkpoint, preserves history, and rejects late writes',async t=>{
 let release;
 const f=await fixture(t,{call:async(agent,packet)=>{if(packet.phase==='builder')throw {code:'connection_error',stopped:true,unknownOutcome:true};if(packet.phase==='tester')throw Error('must not reach tester');return {report:'must not reach reviewer',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'unexpected',findings:[]}};}});
 const j=await f.run(),d=f.studio.detail(j.id),builder=d.executions.find(e=>e.agent==='deepseek');
 assert.equal(j.status,'paused');
 assert.equal(f.runtime.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(j.id).n,0);
 assert.equal(j.state.writeAccess.status,'released');
 assert.equal(j.state.writeAccess.unknownOutcome,true);
 assert.equal(j.state.writeAccess.checkpointHash,null);
 assert.equal(j.state.failure.code,'connection_error');
 assert.equal(builder.status,'unknown');
 assert.equal(d.handoffs.length,0);
 assert.match(j.state.alert,/outcome is unknown/i);
 assert.match(j.state.alert,/no verified checkpoint/i);
 assert.equal(f.calls.filter(x=>x.phase==='builder').length,1);
 assert.equal(f.calls.filter(x=>x.phase==='tester').length,0);
 assert.throws(()=>f.studio.apply(j.id,'deepseek',[{path:'src/late.mjs',content:'late write'}],f.studio.root(f.project.id).fingerprint(),builder.id),/stale worker write/);
 assert.equal(fs.existsSync(path.join(f.studio.root(f.project.id).root,'src/late.mjs')),false);
 assert.doesNotThrow(()=>f.studio.start(f.project.id,{task:'A new owner task after safe release',requestId:crypto.randomUUID()}));
});

test('a missing Zapier hook or callback token blocks the next role and releases write access',async t=>{
 const f=await fixture(t,{configureWebhook:false}),j=await f.run(),d=f.studio.detail(j.id);
 assert.equal(j.status,'paused');
 assert.deepEqual(f.calls.map(x=>[x.agent,x.phase]),[['deepseek','builder']]);
 assert.equal(d.handoffs.length,1);
 assert.equal(d.handoffs[0].status,'blocked');
 assert.match(d.handoffs[0].detail.reason,/Catch Hook/i);
 assert.equal(j.state.writeAccess.status,'released');
 assert.equal(f.runtime.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(j.id).n,0);
 assert.equal(f.webhookCalls.length,0);
});

test('a missing callback token blocks the next role after the hook is enabled',async t=>{
 const f=await fixture(t,{callbackToken:''}),j=await f.run(),d=f.studio.detail(j.id);
 assert.equal(j.status,'paused');
 assert.deepEqual(f.calls.map(x=>[x.agent,x.phase]),[['deepseek','builder']]);
 assert.equal(d.handoffs.length,1);
 assert.equal(d.handoffs[0].status,'blocked');
 assert.match(d.handoffs[0].detail.reason,/CALLBACK_TOKEN/i);
 assert.equal(f.webhookCalls.length,0);
});

test('duplicate callbacks and repeated delivery do not start another role or another webhook',async t=>{
 const f=await fixture(t),j=await f.run(),d=f.studio.detail(j.id),handoff=d.handoffs[0],before=f.calls.length;
 const payload=f.webhookCalls[0];
 const duplicate=await fetch(f.base+'/api/console/studio/zapier/callback',{method:'POST',headers:{'content-type':'application/json','x-studio-callback-token':'fixture-callback-token'},body:JSON.stringify({...payload,action:'continue'})});
 assert.equal(duplicate.status,200);
 assert.equal((await duplicate.json()).data.status,'already_accepted');
 assert.equal(f.calls.length,before);
 assert.equal(f.studio.get(j.id).status,'awaiting_owner');
 assert.equal(f.webhookCalls.length,2);
 const sent=await f.studio.handoffs.send(handoff.id);
 assert.equal(sent.status,'accepted');
 assert.equal(f.webhookCalls.length,2);
});

test('a startup recovery releases only a verifiably ended API writer and preserves its unknown reservation',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-recovery-handoff-')),config=loadConfig(baseEnv(root,{zapier:false})),first=createApp(config,{fetchImpl:async()=>{throw Error('No network');}}),s=first.team.studio,p=s.project({name:'STUCK fixture'}),j=s.create(p.id,'Stuck unknown fixture'),repo=s.root(p.id),requestId=crypto.randomUUID(),executionId=s.executions.create({...j,request_id:requestId},'deepseek','builder',repo.root,repo.fingerprint());
 s.db.prepare('UPDATE studio_chats SET request_id=? WHERE id=?').run(requestId,j.id);s.executions.record(executionId,{status:'unknown',outcome:'unknown',remoteOutcomeUnknown:true,provider:'deepseek',endedAt:new Date().toISOString()});s.db.prepare('INSERT INTO studio_locks VALUES (?,?,?)').run(repo.root,j.id,new Date().toISOString());s.db.prepare("INSERT INTO studio_api_reservations(execution_id,chat_id,reserved_usd,status,created_at) VALUES (?,?,?,'unknown',?)").run(executionId,j.id,0.007748,new Date().toISOString());s.change(j.id,'paused',{phase:'builder',failure:{agent:'deepseek',phase:'builder',code:'connection_error',unknownOutcome:true},alert:'Worker outcome is unknown; the folder remains locked.'},'error');
 assert.equal(s.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(j.id).n,1);
 await s.close();first.team.messenger.close();first.db.close();
 const second=createApp(config,{fetchImpl:async()=>{throw Error('No network');}}),r=second.team.studio,recovered=r.get(j.id),reservation=second.db.prepare('SELECT status,reserved_usd FROM studio_api_reservations WHERE execution_id=?').get(executionId);
 assert.equal(recovered.status,'paused');
 assert.equal(recovered.state.writeAccess.status,'released');
 assert.equal(recovered.state.writeAccess.unknownOutcome,true);
 assert.equal(recovered.state.failure.code,'connection_error');
 assert.equal(second.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(j.id).n,0);
 assert.equal(reservation.status,'unknown');
 assert.equal(reservation.reserved_usd,0.007748);
 assert.ok(r.detail(j.id).events.some(e=>e.kind==='workspace_write_released'&&e.content.writeAccess.unknownOutcome===true));
 await r.close();second.team.messenger.close();second.db.close();fs.rmSync(root,{recursive:true,force:true});
});
