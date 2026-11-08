import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {hashText} from '../src/services/project-files.js';
import {hasIndependentTests} from '../src/services/studio-independence.js';

function fixture(t,{failures=[],findings=[],testsPassed=true}={}) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pipeline-discipline-'));
 const workers={
  call:async(agent,packet)=>{
   if(packet.phase==='builder')return {report:'Fixture implementation',files:[{path:'src/add.mjs',content:'export const add=(a,b)=>a+b;'}]};
   if(packet.phase==='tester')return {report:'Fixture independent tests',files:[{path:'test/add.test.mjs',content:'// independent fixture test'}]};
   return {report:'Fixture review',files:[],review:{...packet.reviewBinding,decision:'changes_requested',summary:'Review found a problem',findings}};
  },
  tests:async()=>({executed:true,passed:testsPassed,count:1,failed:testsPassed?0:1,failures:failures,summary:testsPassed?'1 passed':'1 failed'}),
  preflight:async()=>null
 };
 const app=createApp(loadConfig({DATABASE_PATH:path.join(root,'data/main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup')}),{fetchImpl:async()=>{throw Error('No network')},studioOptions:{workers}});
 const studio=app.team.studio,project=studio.project({name:'Pipeline discipline fixture'}),chat=studio.create(project.id,'Build the fixture.');
 studio.failover.configure(chat.id,{version:studio.get(chat.id).version,approvedBy:'owner',enabled:false,allowedWorkers:[]});
 t.after(async()=>{await studio.close();app.team.messenger.close();app.team.fileActions.close();app.team.preview.close();app.db.close();fs.rmSync(root,{recursive:true,force:true});});
 return {app,studio,project,chat};
}
async function run(f){const started=f.studio.start(f.project.id,{chatId:f.chat.id,requestId:crypto.randomUUID()});await new Promise(setImmediate);await f.studio.wait(started.id);return f.studio.detail(f.chat.id);}

test('Awaiting Owner requires independent executed evidence tied to the current checkpoint',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pipeline-evidence-'));const source=path.join(root,'add.mjs'),testFile=path.join(root,'add.test.mjs');fs.writeFileSync(source,'export const add=(a,b)=>a+b;');fs.writeFileSync(testFile,'// test');const fingerprint=hashText(fs.readFileSync(source,'utf8')+fs.readFileSync(testFile,'utf8'));
 const repo={root,fingerprint:()=>fingerprint,resolve:p=>path.join(root,p)};
 const job={state:{roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},tests:{executed:true,passed:true,count:1,failed:0,skipped:0,independent:true,testExecutionId:'e1',testedRevisionHash:fingerprint},testProvenance:{tester:'codex-personal',executionId:'e1',files:[{path:'add.test.mjs',hash:hashText('// test')}]}}};
 const studio={executions:{list:()=>[{id:'e1',agent:'codex-personal',phase:'tester',status:'completed'}]}};
 assert.equal(hasIndependentTests(studio,job,repo),true);
 assert.equal(hasIndependentTests(studio,{state:{...job.state,tests:{...job.state.tests,testedRevisionHash:'stale'}}},repo),false);
 assert.equal(hasIndependentTests(studio,{state:{...job.state,tests:{...job.state.tests,passed:false}}},repo),false);
 fs.rmSync(root,{recursive:true,force:true});
});
test('a reviewer change request without a specific finding pauses instead of starting a correction',async t=>{
 const f=fixture(t,{findings:[]}),done=await run(f);
 assert.equal(done.status,'paused');assert.equal(done.events.some(e=>e.kind==='correction_started'),false);assert.ok(done.events.some(e=>e.kind==='review_needs_specific_finding'));assert.match(done.state.alert,/specific finding/i);
});
test('a failing test result without a recorded failure pauses instead of starting a vague correction',async t=>{
 const f=fixture(t,{testsPassed:false,failures:[]}),done=await run(f);
 assert.equal(done.status,'paused');assert.equal(done.events.some(e=>e.kind==='correction_started'),false);assert.ok(done.events.some(e=>e.kind==='test_failure_unrecorded'));assert.match(done.state.alert,/specific recorded failure/i);
});
