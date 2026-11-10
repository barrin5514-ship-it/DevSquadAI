import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {StudioProjectContext} from '../src/services/studio-project-context.js';

const target='src/z-rule.mjs', rule='export const multiplier = 37;';

function fixture(t,worker){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'studio-project-context-'));
 const runtime=createApp(loadConfig({DATABASE_PATH:path.join(folder,'db.sqlite'),WORKSPACE_DIR:path.join(folder,'projects'),BACKUP_DIR:path.join(folder,'backups')}),{
  fetchImpl:async()=>{throw Error('Provider network forbidden in this fixture');},
  messengerAutoPoll:false,studioOptions:{workers:worker,schedule:()=>{}}
 });
 t.after(async()=>{await runtime.team.studio.close();runtime.team.messenger.close();runtime.team.preview.close();runtime.team.fileActions.close();runtime.db.close();fs.rmSync(folder,{recursive:true,force:true});});
 const studio=runtime.team.studio,project=studio.project({name:'Disposable project context'});
 const repo=studio.root(project.id);
 for(let i=0;i<6;i++)fs.writeFileSync(repo.resolve('a-guide-'+i+'.txt'),'Documentation. '.repeat(320));
 fs.mkdirSync(repo.resolve('src'));
 fs.writeFileSync(repo.resolve(target),rule);
 return {studio,project,repo,folder,runtime};
}

test('normal Send lets all three roles search and read the same project beyond the old snapshot',async t=>{
 const rounds=[],seen=new Map();
 const workers={async call(agent,packet){
  const n=(seen.get(packet.phase)||0)+1;seen.set(packet.phase,n);rounds.push([agent,packet.phase,n]);
  assert.ok(!packet.files.some(f=>f.path===target));
  if(n===1){
   assert.equal(packet.projectContext.paths.includes(target),true);
   return {report:'Looking for the multiplier definition.',files:[],review:null,contextRequests:[{operation:'search',query:'multiplier'}]};
  }
  if(n===2){
   assert.ok(packet.contextResults.flat().some(item=>item.matches?.some(match=>match.path===target)));
   return {report:'Read the definition.',files:[],review:null,contextRequests:[{operation:'read',path:target}]};
  }
  assert.ok(packet.contextResults.flat().some(item=>item.content===rule));
  if(packet.phase==='builder')return {report:'Builder used the saved multiplier.',files:[{path:'app.mjs',content:'import {multiplier} from "./src/z-rule.mjs"; export const value=multiplier*2;'}]};
  assert.ok(packet.projectContext.paths.includes('app.mjs'));
  if(packet.phase==='tester')return {report:'Independent test uses the same source.',files:[{path:'app.test.mjs',content:'import {test} from "node:test"; import assert from "node:assert/strict"; import {value} from "./app.mjs"; test("saved multiplier",()=>assert.equal(value,74));'}]};
  assert.equal(packet.testResults.passed,true);
  assert.ok(packet.projectContext.paths.includes('app.test.mjs'));
  return {report:'Reviewed actual files and test evidence.',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'Evidence reviewed.',findings:[]}};
 },async tests(){return {executed:true,passed:true,count:1,failed:0,summary:'Simulated runner evidence'};}};
 const {studio,project,repo}=fixture(t,workers);
 const old=repo.snapshot(24000);
 assert.equal(old.truncated,true);
 assert.ok(!old.files.some(file=>file.path===target));
 const chat=studio.create(project.id,'Use the multiplier defined in project source.');
 const proposal=studio.runScope.sendProposal(chat.id);
 assert.deepEqual(proposal.issues,[]);
 const job=studio.start(project.id,{chatId:chat.id,requestId:'large-context',proposalHash:proposal.hash,expectedVersion:proposal.version},{requireTeamProposal:true});
 await studio.drive(job.id,studio.active.get(job.id));
 const done=studio.detail(job.id);
 assert.equal(done.status,'awaiting_owner',JSON.stringify(done.state.failure));
 assert.deepEqual([...seen],[['builder',3],['tester',3],['reviewer',3]]);
 assert.equal(rounds.length,9);
 assert.equal(done.events.filter(e=>e.kind==='project_context_read').length,6);
 assert.equal(done.executions.filter(e=>e.status==='context_requested').length,6);
 assert.equal(studio.accept(job.id).status,'accepted');
});

test('scoped reads refuse late Windows junctions, hard links, private paths and credential text',t=>{
 const {studio,repo,folder}=fixture(t,{});
 const sibling=path.join(folder,'decoy');
 fs.mkdirSync(sibling);
 const decoy=path.join(sibling,'outside.txt');
 fs.writeFileSync(decoy,'outside fixture text');
 fs.mkdirSync(repo.resolve('directory'));
 fs.writeFileSync(repo.resolve('directory/outside.txt'),'expected inside text');
 fs.writeFileSync(repo.resolve('linked.txt'),'expected inside text');
 fs.writeFileSync(repo.resolve('example.txt'),'api_key = "PLACEHOLDER_TEST_ONLY_123456"');
 const broker=new StudioProjectContext(studio,repo,repo.fileHashes());
 fs.unlinkSync(repo.resolve('directory/outside.txt'));
 fs.rmdirSync(repo.resolve('directory'));
 fs.symlinkSync(sibling,path.join(repo.root,'directory'),process.platform==='win32'?'junction':'dir');
 fs.unlinkSync(repo.resolve('linked.txt'));
 fs.linkSync(decoy,path.join(repo.root,'linked.txt'));
 const output=broker.respond([{operation:'read',path:'directory/outside.txt'},{operation:'read',path:'linked.txt'},{operation:'read',path:'example.txt'}]);
 assert.ok(output.every(item=>typeof item.error==='string'&&!item.content));
 assert.deepEqual(broker.respond([{operation:'search',query:'outside fixture text'}])[0].matches,[]);
 assert.ok(broker.respond([{operation:'read',path:'../decoy/outside.txt'}])[0].error);
 assert.equal(broker.respond([{operation:'read',path:target}])[0].content,rule);
});

test('a third read request pauses the current role without another provider call or patch',async t=>{
 let calls=0;
 const {studio,project}=fixture(t,{async call(){calls++;return {report:'Still need this file.',files:[],review:null,contextRequests:[{operation:'read',path:'absent.mjs'}]};}});
 const chat=studio.create(project.id,'Read a missing project file.');
 const proposal=studio.runScope.sendProposal(chat.id);
 const job=studio.start(project.id,{chatId:chat.id,requestId:'context-limit',proposalHash:proposal.hash,expectedVersion:proposal.version});
 await studio.drive(job.id,studio.active.get(job.id));
 const done=studio.detail(job.id);
 assert.equal(calls,3);
 assert.equal(done.status,'paused');
 assert.equal(done.state.failure.code,'project_context_limit');
 assert.equal(done.revisions.length,0);
 assert.equal(done.events.filter(e=>e.kind==='project_context_read').every(e=>e.content.blocked===1),true);
});

test('a Builder cannot replace the npm script that the owner authorized for the run',async t=>{
 let tests=0;
 const {studio,project,repo}=fixture(t,{
  async call(_agent,packet){
   assert.equal(packet.phase,'builder');
   return {report:'Changed the test script.',files:[{path:'package.json',content:JSON.stringify({scripts:{test:'echo fake pass'}})}]};
  },
  async tests(){tests++;throw Error('The changed script must never run');}
 });
 fs.writeFileSync(repo.resolve('package.json'),JSON.stringify({scripts:{test:'node --test'}}));
 const summary=studio.projectsManager.summary(project);
 studio.projectsManager.edit(project.id,{name:project.name,description:'',version:summary.settingsVersion,testCommand:'npm test'});
 const chat=studio.create(project.id,'Run the saved test suite.');
 const proposal=studio.runScope.sendProposal(chat.id);
 const job=studio.start(project.id,{chatId:chat.id,requestId:'approved-suite',proposalHash:proposal.hash,expectedVersion:proposal.version});
 await studio.drive(job.id,studio.active.get(job.id));
 const done=studio.detail(job.id);
 assert.equal(done.status,'paused');
 assert.match(done.state.failure.message,/test script changed/);
 assert.equal(tests,0);
 assert.equal(done.executions.filter(execution=>execution.phase==='tester').length,0);
});
