import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {hashText} from '../src/services/project-files.js';

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'role-change-retry-'));let builder=0,tester=0,reviewer=0;
 const workers={
  call:async(agent,packet)=>{
   if(packet.phase==='builder'){builder++;return {report:'Role-change implementation',files:[{path:'src/add.mjs',content:'export const add=(a,b)=>a+b;'}]};}
   if(packet.phase==='tester'){tester++;return {report:'Independent tests',files:[{path:'test/add.test.mjs',content:'// independent '+tester}]};}
   reviewer++;if(reviewer===1)throw {code:'provider_error',stopped:true};return {report:'Fresh review',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'Reviewed fresh Tester evidence',findings:[]}};
  },
  tests:async()=>({executed:true,passed:true,count:1,failed:0,skipped:0,summary:'1 passed',failures:[]}),
  preflight:async()=>null
 };
 const app=createApp(loadConfig({DATABASE_PATH:path.join(root,'data/main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup')}),{fetchImpl:async()=>{throw Error('No network')},studioOptions:{workers}});
 const studio=app.team.studio,project=studio.project({name:'Role change retry fixture'}),chat=studio.create(project.id,'Build the role-change fixture.');
 studio.failover.configure(chat.id,{version:studio.get(chat.id).version,approvedBy:'owner',enabled:false,allowedWorkers:[]});
 t.after(async()=>{await studio.close();app.team.messenger.close();app.team.fileActions.close();app.team.preview.close();app.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {app,studio,project,chat,counts:()=>({builder,tester,reviewer})};
}

test('changing the Reviewer at a Reviewer pause makes Resume rerun Tester before the new Reviewer decides',async t=>{
 const f=fixture(t);f.studio.roleManager.update(f.project.id,{version:f.studio.roleManager.get(f.project.id).version,chatId:f.chat.id,chatVersion:f.studio.get(f.chat.id).version,roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'}});
 const started=f.studio.start(f.project.id,{chatId:f.chat.id,requestId:crypto.randomUUID(),task:'Build the role-change fixture.'});await new Promise(setImmediate);await f.studio.wait(started.id);
 const paused=f.studio.get(f.chat.id),oldTests=paused.state.tests;
 assert.equal(paused.status,'paused');assert.equal(paused.state.phase,'reviewer');assert.ok(oldTests?.executed);assert.ok(paused.state.testProvenance?.executionId);
 const roles=f.studio.roleManager.get(f.project.id);
 f.studio.roleManager.update(f.project.id,{version:roles.version,chatId:f.chat.id,chatVersion:paused.version,roles:{builder:'deepseek',tester:'codex-personal',reviewer:'nemotron'}});
 const changed=f.studio.get(f.chat.id);
 assert.equal(changed.state.phase,'tester');assert.equal(changed.state.failure,null);assert.equal(changed.state.review,null);assert.equal(changed.state.testerRefresh,true);
 const retry=f.studio.retry(f.chat.id,{requestId:crypto.randomUUID(),expectedVersion:changed.version,mode:'resume'});await new Promise(setImmediate);await f.studio.wait(retry.id);
 const done=f.studio.detail(f.chat.id);
 assert.equal(done.status,'awaiting_owner');assert.equal(done.state.review.decision,'approved');assert.equal(done.events.findLast(e=>e.kind==='independent_review').agent,'nemotron');
 assert.equal(f.counts().tester,2);assert.equal(f.counts().reviewer,2);
 assert.notEqual(done.state.tests.testExecutionId,oldTests.testExecutionId);
 assert.equal(done.state.tests.testedRevisionHash,f.studio.root(f.project.id).fingerprint());
 assert.equal(done.state.tests.executed,true);assert.equal(done.state.tests.passed,true);
});

test('fresh Tester evidence from an older checkpoint is rejected by the evidence gate',async t=>{
 const f=fixture(t);f.studio.roleManager.update(f.project.id,{version:f.studio.roleManager.get(f.project.id).version,chatId:f.chat.id,chatVersion:f.studio.get(f.chat.id).version,roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'}});
 const started=f.studio.start(f.project.id,{chatId:f.chat.id,requestId:crypto.randomUUID()});await new Promise(setImmediate);await f.studio.wait(started.id);
 const paused=f.studio.get(f.chat.id),repo=f.studio.root(f.project.id);
 const old=hashText('older checkpoint');const stale={...paused.state,tests:{...paused.state.tests,testedRevisionHash:old},testProvenance:{...paused.state.testProvenance,files:paused.state.testProvenance.files}};
 assert.equal(((await import('../src/services/studio-independence.js')).hasIndependentTests({executions:{list:()=>[{id:stale.testProvenance.executionId,agent:'codex-personal',phase:'tester',status:'completed'}]}},{state:stale},repo)),false);
});
