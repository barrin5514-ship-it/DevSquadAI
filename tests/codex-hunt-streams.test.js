import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ProviderAdapter} from '../src/providers/adapter.js';
import {deepseekStream} from '../src/providers/deepseek-stream.js';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';

const frame=x=>'data: '+JSON.stringify(x)+'\r\n\r\n';
test('split UTF-8, split lines and keep-alive comments do not become final content',()=>{
 const s=deepseekStream(),text='hé💡';
 const payload=Buffer.from(': keep-alive\r\n\r\n'+frame({model:'deepseek-flash',choices:[{delta:{content:text,reasoning_content:'PRIVATE_HIDDEN'}}]})+': keep-alive\r\n'+frame({choices:[{finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3}})+'data: [DONE]\r\n\r\n');
 for(let i=0;i<payload.length;i+=3)s.write(payload.subarray(i,i+3));
 assert.equal(s.end().choices[0].message.content,text);
 assert.equal(s.metadata().visibleAnswerBytes,Buffer.byteLength(text));
 assert.equal(s.metadata().rawStreamBytes,payload.length);
 assert.deepEqual(s.metadata().limits,{answer:512000,raw:2000000});
 assert.ok(!JSON.stringify(s.metadata()).includes('PRIVATE_'));
});
for(const finish of ['stop','length','content_filter',null])for(const done of [true,false]){
 test('terminal '+String(finish)+' / DONE '+done+' requires the proper completion state',async()=>{
  const text=JSON.stringify({report:'LOCAL FIXTURE',files:[]}),payload=frame({model:'deepseek-flash',choices:[{delta:{content:text},finish_reason:finish}],usage:{prompt_tokens:2,completion_tokens:4,total_tokens:6}})+(done?'data: [DONE]\n\n':'');
  let calls=0;
  const adapter=new ProviderAdapter({id:'deepseek',base:'https://api.deepseek.com',model:'deepseek-flash',key:'LOCAL_FAKE',free:true},{tokenLimit:64,fetchImpl:async()=>{calls++;return new Response(payload);}});
  const body={model:'deepseek-flash',max_tokens:64,stream:true,stream_options:{include_usage:true},thinking:{type:'disabled'},response_format:{type:'json_object'},messages:[]};
  const run=()=>adapter.generateBound(body,createHash('sha256').update(JSON.stringify(body)).digest('hex'));
  if(done&&finish==='stop')assert.equal((await run()).text,text);
  else await assert.rejects(run,e=>e.code===(!done||!finish?'provider_error':finish==='length'?'response_truncated':'invalid_response'));
  assert.equal(calls,1);
 });
}
test('a stalled DeepSeek stream hands the Builder stage to the saved fallback without applying files',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'codex-stall-')),key='LOCAL_FAKE';let calls=0,abortObserved=false,fallbackCalls=0;
 const config=loadConfig({DATABASE_PATH:path.join(root,'main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backups'),DEEPSEEK_API_KEY:key,DEEPSEEK_MODEL:'deepseek-flash',STUDIO_DEEPSEEK_TIMEOUT_MS:'30'});
 const r=createApp(config,{studioOptions:{schedule:()=>{}},fetchImpl:async(_url,o)=>{
  calls++;return new Response(new ReadableStream({start(controller){controller.enqueue(Buffer.from(': keep-alive\n\n'+frame({model:'deepseek-flash',choices:[{delta:{reasoning_content:'PRIVATE_THOUGHT'}}]})));o.signal.addEventListener('abort',()=>{abortObserved=true;controller.error(new DOMException('Local fixture aborted','AbortError'));},{once:true});}}));
 }});
 const s=r.team.studio;s.workers.preflight=async()=>null;s.workers.idleMs=40;s.workers.availability=async agent=>({ok:agent==='codex-personal'});
 const original=s.workers.call.bind(s.workers);s.workers.call=async(agent,packet,...args)=>{if(agent==='deepseek')return original(agent,packet,...args);fallbackCalls++;throw {code:'usage_limit',stopped:true};};
 t.after(async()=>{await s.close();r.team.messenger.close();r.team.preview.close();r.team.fileActions.close();r.db.close();fs.rmSync(root,{recursive:true,force:true});});
 const p=s.project({name:'DISPOSABLE stalled fixture'}),j=s.create(p.id,'Local fixture only');s.change(j.id,'ready',{roles:{builder:'deepseek',tester:'claude-code',reviewer:'nemotron'}},'fixture');const proposal=s.runScope.sendProposal(j.id);
 const started=s.start(p.id,{chatId:j.id,requestId:crypto.randomUUID(),proposalHash:proposal.hash,expectedVersion:proposal.version});
 await s.drive(j.id,s.active.get(j.id));
 const failed=s.detail(j.id),first=failed.executions[0];
 assert.equal(calls,1);assert.equal(abortObserved,true);assert.equal(failed.status,'paused');
 assert.equal(first.status,'failed');assert.ok(['timeout','inactivity_timeout'].includes(first.evidence.code));assert.notEqual(first.evidence.remoteOutcomeUnknown,true);
 assert.equal(failed.state.roles.builder,'codex-personal',JSON.stringify({code:first.evidence.code,unknown:first.evidence.remoteOutcomeUnknown,decisions:failed.events.filter(e=>e.kind==='fallback_decision').map(e=>e.content)}));assert.ok(fallbackCalls>0);
 assert.ok(failed.events.some(e=>e.kind==='provider_switched'&&['timeout','inactivity_timeout'].includes(e.content.reason)&&e.content.to==='codex-personal'));
 assert.equal(failed.revisions.length,0);assert.equal(s.root(p.id).fingerprint(),proposal.checkpointHash);
 const usage=failed.events.find(e=>e.kind==='api_usage'&&e.content.executionId===first.id);
 assert.equal(usage.content.outcome,'unknown');assert.equal(usage.content.input,null);assert.equal(usage.content.output,null);assert.equal(usage.content.costNote.includes('Unknown usage is not zero'),true);
 assert.ok(!JSON.stringify(failed).includes('PRIVATE_'));
 assert.equal(calls,1);
});
test('a streamed response with periodic activity beyond the total timeout still completes',async()=>{
 const text=JSON.stringify({report:'LOCAL ACTIVITY FIXTURE',files:[]}),payload=frame({model:'deepseek-flash',choices:[{delta:{content:text},finish_reason:'stop'}],usage:{prompt_tokens:2,completion_tokens:4,total_tokens:6}})+'data: [DONE]\n\n';
 const parts=Array.from({length:8},(_,i)=>payload.slice(Math.floor(payload.length*i/8),Math.floor(payload.length*(i+1)/8)));
 const body={model:'deepseek-flash',max_tokens:64,stream:true,stream_options:{include_usage:true},thinking:{type:'disabled'},response_format:{type:'json_object'},messages:[]};
 const adapter=new ProviderAdapter({id:'deepseek',base:'https://api.deepseek.com',model:'deepseek-flash',key:'LOCAL_FAKE',free:true},{tokenLimit:64,timeout:30,fetchImpl:async()=>new Response(new ReadableStream({start(controller){let i=0;const tick=()=>{if(i<parts.length){controller.enqueue(parts[i++]);setTimeout(tick,18);}else controller.close();};tick();}}))});
 const result=await adapter.generateBound(body,createHash('sha256').update(JSON.stringify(body)).digest('hex'));
 assert.equal(result.text,text);
});
