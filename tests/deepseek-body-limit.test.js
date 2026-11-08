import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ProviderAdapter} from '../src/providers/adapter.js';

const model='deepseek-flash';
const sse=obj=>`data: ${JSON.stringify(obj)}\n\n`;
function makeStream({visible='x'.repeat(5619),reasoning=null}){
 const chunks=[sse({model,choices:[{delta:{content:visible}}]})];
 if(reasoning)chunks.push(sse({model,choices:[{delta:{reasoning_content:reasoning}}]}));
 chunks.push(sse({model,choices:[{delta:{},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:10,total_tokens:110}}));
 chunks.push('data: [DONE]\n\n');
 return {chunks,bytes:Buffer.byteLength(chunks.join(''))};
}
async function run(opts){
 const stream=makeStream(opts),chunks=stream.chunks.map(s=>Buffer.from(s));
 const adapter=new ProviderAdapter({id:'deepseek',base:'https://api.deepseek.com',model,key:'fixture-key',free:true,inputPrice:0.3,outputPrice:1.2},{fetchImpl:async()=>new Response(new ReadableStream({start(c){for(const b of chunks)c.enqueue(b);c.close();}}),{status:200,headers:{'content-type':'text/event-stream'}}),timeout:5000,tokenLimit:4096});
 const body={model,messages:[{role:'system',content:'fixture'},{role:'user',content:'fixture'}],thinking:{type:'disabled'},response_format:{type:'json_object'},stream:true,stream_options:{include_usage:true},max_tokens:4096};
 const hash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 try{return {passed:true,result:await adapter.generateStudio(body,hash),rawBytes:stream.bytes};}catch(error){return {passed:false,error,rawBytes:stream.bytes};}
}
test('a valid visible answer survives a reasoning-heavy SSE stream above the old raw 512k cap',async()=>{
 const normal=await run({}),heavy=await run({reasoning:'r'.repeat(600000)});
 assert.equal(normal.passed,true);assert.equal(normal.rawBytes,5858);assert.equal(heavy.passed,true);assert.equal(heavy.rawBytes,605939);assert.equal(heavy.result.text.length,5619);assert.equal(heavy.result.finishReason,'stop');assert.equal(heavy.result.usage.input,100);
});
test('a genuinely oversized visible answer fails with a bounded, clear answer_limit',async()=>{
 const r=await run({visible:'y'.repeat(520000)});assert.equal(r.passed,false);assert.equal(r.error.code,'answer_limit');assert.equal(r.error.diagnostics.deepseekResponse.failedCheck,'answer_limit');assert.match(r.error.message,/visible answer/i);
});
test('a parser failure or answer-limit breach cancels the reader and aborts the transport',async()=>{
 for(const mode of ['malformed','answer']){
  let cancelled=0,requestSignal=null;
  const chunk=mode==='malformed'?Buffer.from('data: {broken-json}\n\n'):Buffer.from(sse({model,choices:[{delta:{content:'z'.repeat(520000)}}]}));
  const body=new ReadableStream({start(c){c.enqueue(chunk);},cancel(){cancelled++;}});
  const adapter=new ProviderAdapter({id:'deepseek',base:'https://api.deepseek.com',model,key:'fixture-key',free:true,inputPrice:0.3,outputPrice:1.2},{fetchImpl:async(_url,options)=>{requestSignal=options.signal;return new Response(body,{status:200,headers:{'content-type':'text/event-stream'}});},timeout:5000,tokenLimit:4096});
  const request={model,messages:[{role:'system',content:'fixture'},{role:'user',content:'fixture'}],thinking:{type:'disabled'},response_format:{type:'json_object'},stream:true,stream_options:{include_usage:true},max_tokens:4096},hash=createHash('sha256').update(JSON.stringify(request)).digest('hex');
  await assert.rejects(()=>adapter.generateStudio(request,hash));
  assert.equal(cancelled,1,mode);assert.equal(requestSignal.aborted,true,mode);
 }
});
test('a genuinely oversized raw stream fails with the bounded raw body_limit',async()=>{
 const r=await run({reasoning:'r'.repeat(2100000)});assert.equal(r.passed,false);assert.equal(r.error.code,'body_limit');assert.equal(r.error.diagnostics.deepseekResponse.failedCheck,'body_limit');assert.match(r.error.message,/raw safety limit/i);
});
