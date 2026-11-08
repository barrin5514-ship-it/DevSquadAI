import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {nativeFailure} from '../src/services/native-diagnostics.js';
import {DemoCliTransport} from '../src/services/demo-cli-transport.js';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';

const exhausted='Your workspace is out of credits. Ask your workspace owner to refill in order to continue.';
test('the recorded workspace-credit error is a usage limit; unrelated credit text stays unclassified',()=>{
 assert.deepEqual(nativeFailure(exhausted),{code:'usage_limit',reason:'usage_limit'});
 assert.equal(nativeFailure('Credit card CSS component failed').code,'worker_error');
});

test('structured Codex credit exhaustion beats its ordinary stdin startup message without retry',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'codex-credit-fixture-')),exe=path.join(root,'fixture.exe');fs.writeFileSync(exe,'LOCAL FIXTURE');
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));let calls=0;
 const transport=new DemoCliTransport({executables:{codex:exe},authCheck:()=>true,inspect:()=>({verified:true,processes:[{pid:4321,birth:'fixture'}]}),spawnImpl:()=>{
  calls++;const child=new EventEmitter();child.pid=4321;child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
  child.stdin.end=()=>queueMicrotask(()=>{child.emit('spawn');child.stderr.emit('data',Buffer.from('Reading additional input from stdin...\n'));child.stdout.emit('data',Buffer.from(JSON.stringify({type:'error',message:exhausted})+'\n'+JSON.stringify({type:'turn.failed',error:{message:exhausted}})+'\n'));child.emit('close',1);});return child;
 }});
 await assert.rejects(()=>transport.run('codex',{},root),e=>e.code==='usage_limit'&&e.stopped===true&&e.diagnostics.reason==='usage_limit'&&e.diagnostics.stdout.includes('out of credits'));
 assert.equal(calls,1);
});

test('SIMULATED exhausted School reviewer hands the same tested checkpoint to Personal without rebuilding',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'codex-credit-handoff-')),calls=[];let schoolFiles;
 const workers={nemotron:{status:()=>({ok:true})},availability:async()=>({ok:true}),preflight:async()=>null,call:async(agent,packet)=>{
  calls.push({agent,phase:packet.phase});
  if(packet.phase==='builder')return {report:'SIMULATED Builder',files:[{path:'value.mjs',content:'export const value=1;'}]};
  if(packet.phase==='tester')return {report:'SIMULATED Tester',files:[{path:'value.test.mjs',content:'// Independent local fixture'}]};
  if(agent==='codex-school'){schoolFiles=packet.files;throw {...nativeFailure(exhausted),stopped:true};}
  assert.equal(agent,'codex-personal');assert.deepEqual(packet.files,schoolFiles);assert.equal(packet.testResults.passed,true);
  return {report:'SIMULATED Reviewer',files:[],review:{...packet.reviewBinding,decision:'approved',summary:'SIMULATED independent review',findings:[]}};
 },tests:async()=>({executed:true,passed:true,count:1,failed:0,summary:'SIMULATED evidence'})};
 const app=createApp(loadConfig({DATABASE_PATH:path.join(root,'main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup'),DEEPSEEK_API_KEY:'LOCAL_FAKE',DEEPSEEK_MODEL:'deepseek-flash'}),{studioOptions:{workers},fetchImpl:async()=>{throw Error('No live network allowed');}}),s=app.team.studio;
 t.after(async()=>{await s.close();app.team.messenger.close();app.team.preview.close();app.team.fileActions.close();app.db.close();fs.rmSync(root,{recursive:true,force:true});});
 const project=s.project({name:'SIMULATED credit handoff'});s.roleManager.update(project.id,{version:0,roles:{builder:'deepseek',tester:'nemotron',reviewer:'codex-school'}});
 const chat=s.create(project.id,'Local fixture only');s.failover.configure(chat.id,{version:chat.version,approvedBy:'owner',enabled:true,allowedWorkers:['codex-personal','codex-school','deepseek','nemotron']});
 const proposal=s.runScope.sendProposal(chat.id);assert.deepEqual(proposal.issues,[]);s.start(project.id,{chatId:chat.id,requestId:crypto.randomUUID(),expectedVersion:proposal.version,proposalHash:proposal.hash});
 await new Promise(setImmediate);await s.wait(chat.id);const done=s.detail(chat.id);
 assert.equal(done.status,'awaiting_owner');assert.deepEqual(calls.map(c=>c.agent),['deepseek','nemotron','codex-school','codex-personal']);
 assert.equal(done.events.filter(e=>e.kind==='build_saved').length,1);assert.ok(done.events.some(e=>e.kind==='profile_switched'&&e.content.reason==='usage_limit'));
 assert.equal(done.state.acceptedAt,undefined);
});
