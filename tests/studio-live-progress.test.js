import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './helpers/workflow-debug-fixture.js';

test('a raw progress burst updates execution evidence without adding history or hiding meaningful events',async t=>{
 const f=await workflowFixture(t,{fallback:false}),original=f.s.workers.call.bind(f.s.workers);
 let lastActivityAt;
 f.s.workers.call=async(agent,packet,root,signal,execution)=>{
  const response=await original(agent,packet,root,signal,execution);
  if(packet.phase==='builder')for(let i=0;i<170;i++){
   lastActivityAt=new Date(Date.UTC(2026,10,9,18,0,0,i)).toISOString();
   execution.onEvent({lastActivityAt,progress:'Provider response bytes received',receivedCharacters:128*i});
  }
  return response;
 };
 const done=await f.run(),saved=f.s.detail(f.chat.id);
 assert.equal(done.status,'awaiting_owner');
 const builder=saved.executions.find(e=>e.phase==='builder');
 assert.equal(builder.evidence.lastActivityAt,lastActivityAt);
 assert.equal(builder.evidence.receivedCharacters,128*169);
 assert.equal(f.app.db.prepare("SELECT count(*) n FROM studio_events WHERE chat_id=? AND kind='worker_lifecycle' AND json_extract(content,'$.receivedCharacters') IS NOT NULL").get(f.chat.id).n,0);
 const kinds=saved.events.map(e=>e.kind);
 for(const kind of ['worker_started','worker_report','files_saved','handoff_created','handoff_local','test_results','independent_review','ready_for_owner'])assert.ok(kinds.includes(kind),kind);
});
