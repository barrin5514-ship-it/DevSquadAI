import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {parseDemoCli} from '../src/services/demo-workers.js';
import {DemoCliTransport} from '../src/services/demo-cli-transport.js';

const result={type:'result',subtype:'success',is_error:false,stop_reason:'max_tokens',result:JSON.stringify({report:'PRIVATE_PARTIAL_RESULT',files:[]}),usage:{input_tokens:12,output_tokens:4096}};
test('a parseable Claude final answer stopped by max_tokens is rejected as truncated',()=>{
 assert.throws(()=>parseDemoCli('claude',JSON.stringify(result)),e=>e.code==='response_truncated'&&!e.message.includes('PRIVATE_'));
});
test('Claude terminal token/turn limits retain their exact category and known closure without raw output',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'codex-cli-limit-')),exe=path.join(root,'local-fixture.exe');fs.writeFileSync(exe,'LOCAL FIXTURE');
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const [record,code]of [[result,'response_truncated'],[{...result,subtype:'error_max_turns',is_error:true,stop_reason:null},'session_limit']]){
  let calls=0;const events=[];
  const transport=new DemoCliTransport({executables:{claude:exe},authCheck:()=>true,inspect:()=>({verified:true,processes:[{pid:1234,birth:'fixture'}]}),spawnImpl:()=>{
   calls++;const child=new EventEmitter();child.pid=1234;child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
   child.stdin.end=()=>queueMicrotask(()=>{child.emit('spawn');child.stdout.emit('data',Buffer.from(JSON.stringify(record)+'\n'));child.emit('close',0);});return child;
  }});
  await assert.rejects(()=>transport.run('claude',{},root,{streamProgress:true,onEvent:e=>events.push(e)}),e=>e.code===code&&e.stopped===true);
  assert.equal(calls,1);assert.ok(!JSON.stringify(events).includes('PRIVATE_'));
  assert.ok(events.some(e=>e.nativeResponse?.outputTokens===4096));
 }
});
