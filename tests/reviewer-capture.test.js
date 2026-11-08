import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {DemoCliTransport} from '../src/services/demo-cli-transport.js';
import {workflowFixture} from './helpers/workflow-debug-fixture.js';

test('Claude Reviewer uses a bounded final JSON response instead of overflowing capture with repeated progress framing',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'review-capture-')),exe=path.join(root,'fixture.exe');fs.writeFileSync(exe,'LOCAL FIXTURE');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let args,spawns=0;const answer={report:'Reviewed recorded tests; did not run them.',files:[],review:{decision:'approved',summary:'Small review.',findings:[]}};
 const final={type:'result',subtype:'success',is_error:false,result:JSON.stringify(answer),usage:{input_tokens:100,output_tokens:50}};
 const transport=new DemoCliTransport({executables:{claude:exe},authCheck:()=>true,killTree:()=>false,inspect:()=>({verified:true,processes:[{pid:1234,birth:'fixture'}]}),spawnImpl:(_exe,argv)=>{
  spawns++;args=argv;const child=new EventEmitter();child.pid=1234;child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
  child.stdin.end=()=>queueMicrotask(()=>{child.emit('spawn');if(argv[argv.indexOf('--output-format')+1]==='stream-json')for(let i=0;i<20;i++)child.stdout.emit('data',Buffer.from(JSON.stringify({type:'stream_event',event:{delta:{type:'text_delta',text:'local progress '.repeat(300)}}})+'\n'));child.stdout.emit('data',Buffer.from(JSON.stringify(final)+'\n'));child.emit('close',0);});return child;
 }});
 const result=await transport.run('claude',{phase:'reviewer'},root,{streamProgress:true,maxOutputBytes:65536});
 assert.equal(result.review.decision,'approved');assert.equal(result.usage.output_tokens,50);assert.equal(spawns,1);
 assert.equal(args[args.indexOf('--output-format')+1],'json');assert.ok(!args.includes('--include-partial-messages'));assert.ok(!args.includes('--verbose'));
});

test('unknown Reviewer outcome resumes only Reviewer using saved tested files; retry replay never recalls Builder or Tester',async t=>{
 const f=await workflowFixture(t),original=f.s.workers.call;let reviews=0;
 f.s.workers.call=async(agent,packet,...rest)=>{if(packet.phase==='reviewer'&&reviews++===0){f.calls.push({agent,phase:packet.phase});f.packets.push(packet);throw {code:'output_limit',stopped:false,writeAccessEnded:true,diagnostics:{reason:'output_limit',stdoutBytes:65720,stderrBytes:0,truncated:true}};}return original(agent,packet,...rest);};
 const paused=await f.run();assert.equal(paused.status,'paused');assert.equal(paused.state.failure.code,'output_limit');assert.equal(paused.resume.phase,'reviewer');assert.equal(paused.resume.available,true);assert.equal(f.calls.length,3);assert.equal(paused.state.tests.count,2);
 const checkpoint=f.s.root(f.project.id).fingerprint(),tests=JSON.stringify(paused.state.tests),request={requestId:crypto.randomUUID(),expectedVersion:paused.version,mode:'resume'},route='/studio/chats/'+f.chat.id+'/retry';
 assert.equal((await f.post(route,request)).status,202);await f.s.wait(f.chat.id);const done=f.s.detail(f.chat.id);
 assert.equal(done.status,'awaiting_owner');assert.equal(done.id,paused.id);assert.equal(f.s.root(f.project.id).fingerprint(),checkpoint);assert.equal(JSON.stringify(done.state.tests),tests);
 assert.deepEqual(f.calls.map(c=>c.phase),['builder','tester','reviewer','reviewer']);assert.equal(f.providerBodies.length,1);
 assert.equal(f.packets.at(-1).testResults.testedRevisionHash,checkpoint);assert.ok(f.packets.at(-1).files.some(f=>f.path==='app.mjs'));
 assert.equal((await f.post(route,request)).status,409);assert.equal(f.calls.length,4);assert.equal(f.providerBodies.length,1);
});

test('Reviewer final JSON still obeys the original byte cap and unverified termination remains unknown',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'review-overflow-')),exe=path.join(root,'fixture.exe');fs.writeFileSync(exe,'LOCAL FIXTURE');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));let calls=0;
 const transport=new DemoCliTransport({executables:{claude:exe},authCheck:()=>true,killTree:()=>false,inspect:()=>({verified:true,processes:[{pid:1234,birth:'fixture'}]}),spawnImpl:()=>{
  calls++;const child=new EventEmitter();child.pid=1234;child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=()=>queueMicrotask(()=>{child.emit('spawn');child.stdout.emit('data',Buffer.from(JSON.stringify({type:'result',subtype:'success',is_error:false,result:'x'.repeat(66000)})));child.emit('close',0);});return child;
 }});
 await assert.rejects(()=>transport.run('claude',{phase:'reviewer'},root,{streamProgress:true,maxOutputBytes:65536}),e=>e.code==='output_limit'&&e.stopped===false&&e.diagnostics.truncated===true&&e.diagnostics.exitCode===0);
 assert.equal(calls,1);
});

for(const outcome of ['findings','usage_limit'])test('Reviewer-only stage retry pauses on '+outcome+' without corrections or role swaps',async t=>{
 const f=await workflowFixture(t),original=f.s.workers.call;let review=0;
 f.s.workers.call=async(agent,p,...rest)=>{
  if(p.phase==='reviewer'){
   f.calls.push({agent,phase:p.phase});f.packets.push(p);
   if(review++===0)throw {code:'output_limit',stopped:false,writeAccessEnded:true};
   if(outcome==='usage_limit')throw {code:'usage_limit',stopped:true};
   return {report:'SIMULATED findings',files:[],review:{...p.reviewBinding,decision:'changes_requested',summary:'One recorded concern.',findings:['SIMULATED specific correction needed.']}};
  }
  if(f.calls.some(c=>c.phase==='reviewer')){f.calls.push({agent,phase:p.phase});throw {code:'incomplete',stopped:true};}
  return original(agent,p,...rest);
 };
 const paused=await f.run(),roles=JSON.stringify(paused.state.roles);
 assert.equal((await f.post('/studio/chats/'+f.chat.id+'/retry',{requestId:crypto.randomUUID(),expectedVersion:paused.version,mode:'resume'})).status,202);await f.s.wait(f.chat.id);
 const done=f.s.detail(f.chat.id);assert.equal(done.status,'paused');assert.equal(done.state.runApproval.reviewOnly,true);assert.equal(done.state.runApproval.maxCalls,1);
 assert.equal(JSON.stringify(done.state.roles),roles);assert.deepEqual(f.calls.map(c=>c.phase),['builder','tester','reviewer','reviewer']);assert.equal(f.providerBodies.length,1);
 if(outcome==='findings')assert.equal(done.state.review.decision,'changes_requested');else assert.equal(done.state.failure.fallbackDecision.reason,'bounded_run_disallows_fallback');
});

test('changed implementation blocks unknown Reviewer continuation instead of reusing stale test evidence',async t=>{
 const f=await workflowFixture(t),original=f.s.workers.call;
 f.s.workers.call=async(agent,p,...rest)=>{if(p.phase==='reviewer'){f.calls.push({agent,phase:p.phase});throw {code:'output_limit',stopped:false,writeAccessEnded:true};}return original(agent,p,...rest);};
 const paused=await f.run();fs.appendFileSync(f.s.root(f.project.id).resolve('app.mjs'),'\n// Changed after testing');
 const result=await f.post('/studio/chats/'+f.chat.id+'/retry',{requestId:crypto.randomUUID(),expectedVersion:paused.version,mode:'resume'});
 assert.equal(result.status,409);assert.equal(f.calls.length,3);assert.equal(f.providerBodies.length,1);assert.equal(f.s.get(f.chat.id).request_id,paused.request_id);
});
