import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {DemoCliTransport} from '../src/services/demo-cli-transport.js';
import {nativeDiagnostics,nativeDiagnosticText,safeNativeDiagnostics} from '../src/services/native-diagnostics.js';

// Local child-process doubles only: these tests cannot contact an AI service.
function fixture(t,{out='',err='',exit=1,limit=32768}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'native-errors-')),exe=path.join(root,'fixture.exe');fs.writeFileSync(exe,'LOCAL TEST');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let checked=0,calls=0,child,launch;const events=[];
 const transport=new DemoCliTransport({executables:{codex:exe},authCheck:()=>{checked++;return true;},inspect:()=>({verified:true,processes:[{pid:4321,birth:'fixture'}]}),killTree:()=>{queueMicrotask(()=>child.emit('close',1));return true;},spawnImpl:(_exe,args,options)=>{calls++;launch={args,options};child=new EventEmitter();child.pid=4321;child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=packet=>{launch.packet=JSON.parse(packet);queueMicrotask(()=>{child.emit('spawn');if(out)child.stdout.emit('data',Buffer.from(out));if(err)child.stderr.emit('data',Buffer.from(err));queueMicrotask(()=>child.emit('close',exit));});};return child;}});
 return {events,get calls(){return calls;},get checked(){return checked;},get launch(){return launch;},run:()=>transport.run('codex',{goal:'LOCAL FIXTURE'},root,{profile:{label:'Personal',home:path.join(root,'personal')},onEvent:e=>events.push(e),maxOutputBytes:limit,redactionSecrets:['LOCAL_PRIVATE_SENTINEL']})};
}
test('A/D: successful auth followed by exit 1 retains useful sanitized execution error, not an invented login failure',async t=>{
 const f=fixture(t,{err:'Error: invalid configuration LOCAL_PRIVATE_SENTINEL'});await assert.rejects(f.run(),e=>{assert.equal(e.code,'worker_error');assert.equal(e.stopped,true);assert.match(e.diagnostics.stderr,/invalid configuration/);assert.equal(e.diagnostics.stage,'execution');assert.equal(e.diagnostics.profile,'Personal');assert.ok(!JSON.stringify(e).includes('LOCAL_PRIVATE_SENTINEL'));return true;});assert.equal(f.checked,1);assert.equal(f.calls,1);assert.ok(f.events.some(e=>e.terminationVerified));assert.equal(f.launch.options.env.CODEX_HOME,path.join(f.launch.options.cwd,'personal'));assert.equal(f.launch.options.env.OPENAI_API_KEY,undefined);assert.equal(f.launch.packet.goal,'LOCAL FIXTURE');assert.equal(f.launch.options.shell,false);
});
test('B: exit 1 without stderr is an unknown native failure, never assumed quota or auth',async t=>{const f=fixture(t);await assert.rejects(f.run(),e=>e.code==='worker_error'&&e.diagnostics.reason==='native_exit'&&e.diagnostics.stderr==='');assert.equal(f.calls,1);});
test('C: malformed response has parsing diagnostics but no assistant text or hidden reasoning',async t=>{const f=fixture(t,{out:'PRIVATE MALFORMED BODY',exit:0});await assert.rejects(f.run(),e=>e.code==='incomplete'&&e.diagnostics.stage==='parsing'&&e.diagnostics.reason==='json_syntax'&&!JSON.stringify(e).includes('PRIVATE MALFORMED'));assert.equal(f.calls,1);});
test('E/G: explicit structured quota error is classified even on exit zero and preserves verified closure',async t=>{const f=fixture(t,{out:JSON.stringify({type:'error',message:'usage_limit_reached'})+'\n',exit:0});await assert.rejects(f.run(),e=>e.code==='usage_limit'&&e.stopped&&/usage_limit_reached/.test(e.diagnostics.stdout));assert.equal(f.calls,1);});
test('K: credentials, authentication responses, paths, addresses and reasoning never enter diagnostics',()=>{
 const d=nativeDiagnostics({reason:'native_exit',stderr:'Error: LOCAL_PRIVATE_SENTINEL Bearer fake-bearer-value\nError: token=private-value\nError: https://hooks.zapier.com/hooks/catch/private\nError: C:\\Users\\private\\auth.json\nError: user@example.test 192.0.2.4\nthinking: HIDDEN_REASONING\nMORE_HIDDEN_REASONING\nError: safe final error',raw:[{type:'item.completed',item:{type:'reasoning',text:'HIDDEN_STDOUT'}},{type:'error',message:'Error: LOCAL_PRIVATE_SENTINEL'}].map(JSON.stringify).join('\n'),secrets:['LOCAL_PRIVATE_SENTINEL']});
 const text=JSON.stringify(safeNativeDiagnostics(d));for(const forbidden of ['LOCAL_PRIVATE_SENTINEL','fake-bearer-value','private-value','hooks.zapier.com','C:\\\\Users','example.test','192.0.2.4','HIDDEN_REASONING','HIDDEN_STDOUT'])assert.ok(!text.includes(forbidden),forbidden);assert.match(text,/safe final error/);
 assert.equal(nativeDiagnosticText(JSON.stringify({access_token:'fake',account:{private:'data'}},null,2)),'[authentication response omitted]');
});
test('L: oversized chunks are capped before capture, text omitted, termination checked, and never retried',async t=>{const f=fixture(t,{err:'X'.repeat(1000000),limit:128});await assert.rejects(f.run(),e=>e.code==='output_limit'&&e.stopped===true&&e.diagnostics.truncated&&e.diagnostics.stderr==='[capture limit exceeded; text omitted]'&&e.diagnostics.stderrBytes===1000000);assert.equal(f.calls,1);assert.ok(JSON.stringify(f.events).length<10000);});

test('real diagnostic regression: AGENTS instruction access denial is a startup sandbox failure, not auth/quota',async t=>{const f=fixture(t,{err:'Error: thread/start failed: failed to load AGENTS.md instructions for environment local: Access is denied. (os error 5) (code -32603)'});await assert.rejects(f.run(),e=>e.code==='sandbox_error'&&e.stopped&&e.diagnostics.reason==='instruction_access_denied'&&e.diagnostics.stage==='startup');assert.equal(f.calls,1);});
