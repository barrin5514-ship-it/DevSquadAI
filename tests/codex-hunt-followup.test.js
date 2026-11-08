import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';

test('two builds reach owner review in the same chat and folder under separate request IDs',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'codex-followup-')),packets=[];
 const workers={
  async call(agent,packet){
   packets.push({agent,phase:packet.phase,goal:packet.goal});
   if(packet.phase==='builder')return {report:'SIMULATED Builder',files:[{path:'index.html',content:packet.goal}]};
   if(packet.phase==='tester')return {report:'SIMULATED Tester',files:[{path:'page.test.mjs',content:'// independent fixture '+packet.goal}]};
   return {report:'SIMULATED Reviewer',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'SIMULATED review',findings:[]}};
  },
  async tests(){return {executed:true,passed:true,count:1,failed:0,summary:'SIMULATED test evidence'};}
 };
 const app=createApp(loadConfig({DATABASE_PATH:path.join(temp,'main.sqlite'),WORKSPACE_DIR:path.join(temp,'projects'),BACKUP_DIR:path.join(temp,'backup')}),{studioOptions:{workers},fetchImpl:async()=>{throw Error('No network');}});
 const s=app.team.studio;
 t.after(async()=>{await s.close();app.team.messenger.close();app.team.fileActions.close();app.team.preview.close();app.db.close();fs.rmSync(temp,{recursive:true,force:true});});
 const project=s.project({name:'DISPOSABLE Codex follow-up fixture'}),chat=s.create(project.id,'Make a button'),root=s.root(project.id).root;
 const run=async id=>{const p=s.runScope.sendProposal(id);const j=s.start(project.id,{chatId:id,requestId:crypto.randomUUID(),proposalHash:p.hash,expectedVersion:p.version},{requireTeamProposal:true});await new Promise(setImmediate);await s.wait(j.id);return s.detail(j.id);};
 const first=await run(chat.id);assert.equal(first.status,'awaiting_owner');
 const history=first.events.filter(e=>['independent_review','test_results','run_requested'].includes(e.kind));
 const next=s.message(chat.id,{text:'Change button text to Try me and color to blue',submissionId:crypto.randomUUID()});
 assert.equal(next.id,chat.id);
 assert.equal(next.project_id,project.id);assert.equal(s.root(project.id).root,root);
 assert.equal(app.db.prepare('SELECT count(*) n FROM studio_chats').get().n,1);
 const second=await run(next.id);
 assert.equal(second.status,'awaiting_owner');assert.notEqual(second.request_id,first.request_id);
 assert.equal(second.events.filter(e=>e.kind==='independent_review').length,2);
 for(const event of history)assert.deepEqual(second.events.find(e=>e.id===event.id),event);
 assert.equal(packets[3].goal,'Change button text to Try me and color to blue');
 assert.equal(second.state.acceptedAt,undefined);
});
