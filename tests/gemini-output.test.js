import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ProviderAdapter} from '../src/providers/adapter.js';
const settings={id:'gemini',base:'https://generativelanguage.googleapis.com/v1beta',model:'gemini-3.8-flash',key:'unit-secret',free:true};
const envelope=(parts,finishReason='STOP')=>({candidates:[{content:{parts},finishReason}],usageMetadata:{promptTokenCount:12,candidatesTokenCount:3,thoughtsTokenCount:121,totalTokenCount:136}});
function fixture(data,extra={}){let calls=0,body;const a=new ProviderAdapter({...settings,...extra},{tokenLimit:1024,fetchImpl:async(url,options)=>{calls++;assert.equal(url,settings.base+'/models/'+(extra.model||settings.model)+':generateContent');body=JSON.parse(options.body);return new Response(JSON.stringify(data));}});return {a,get calls(){return calls;},get body(){return body;}};}
test('3.8 uses documented low thinking, shared cap and native JSON schema; joins only final text',async()=>{
 const schema={type:'object',properties:{ready:{type:'string'}},required:['ready']};
 const f=fixture(envelope([{thought:true,text:'private reasoning'},{text:'{"ready":'},{inlineData:{data:'ignored'}},{text:'"READY"}'}]),{responseJsonSchema:schema});
 const r=await f.a.generate('JSON only','Reply READY');
 assert.deepEqual(f.body.generationConfig,{maxOutputTokens:1024,responseMimeType:'application/json',thinkingConfig:{thinkingLevel:'low'},responseJsonSchema:schema});
 assert.deepEqual(JSON.parse(r.text),{ready:'READY'});assert.equal(r.usage.output,124);assert.equal(r.usage.reasoning,121);assert.equal(r.usage.total,136);assert.equal(f.calls,1);
});
test('thinking controls are model-specific and invalid 3.8 controls fail before HTTP',async()=>{
 for(const level of ['medium','high']){const f=fixture(envelope([{text:'{}'}]),{thinkingLevel:level});await f.a.generate('s','u');assert.equal(f.body.generationConfig.thinkingConfig.thinkingLevel,level);}
 for(const level of ['minimal','none',0]){const f=fixture({}, {thinkingLevel:level});await assert.rejects(()=>f.a.generate('s','u'));assert.equal(f.calls,0);}
 const f=fixture(envelope([{text:'{}'}]),{model:'gemini-2.5-flash'});await f.a.generate('s','u');assert.equal(f.body.generationConfig.thinkingConfig,undefined);
});
test('MAX_TOKENS never becomes a draft even with parseable final JSON; safe partial and usage survive',async()=>{
 const f=fixture(envelope([{thought:true,text:'never retain thoughts'},{text:'{"ready":"READY"}'}],'MAX_TOKENS'));
 await assert.rejects(()=>f.a.generate('s','u'),e=>{assert.equal(e.code,'invalid_response');assert.equal(e.httpStatus,200);assert.equal(e.complete,false);assert.equal(e.finishReason,'MAX_TOKENS');assert.equal(e.partialFinalText,'{"ready":"READY"}');assert.equal(e.text,undefined);assert.equal(e.usage.output,124);assert.equal(e.usage.reasoning,121);assert.ok(!JSON.stringify(e).includes('never retain thoughts'));return true;});assert.equal(f.calls,1);
});
test('empty final content is incomplete even with STOP and thought text present',async()=>{
 for(const parts of [[],[{text:'  '}],[{thought:true,text:'reasoning only'}]]){const f=fixture(envelope(parts));await assert.rejects(()=>f.a.generate('s','u'),e=>e.complete===false&&e.code==='invalid_response'&&e.usage.reasoning===121);assert.equal(f.calls,1);}
});
test('diagnostic previews are bounded and omit literal or JSON-escaped credential echoes',async()=>{
 for(const text of ['unit-secret', '{"key":"unit-\\u0073ecret"}', '{"key":"unit-\\u0073ecret']){const f=fixture(envelope([{text}],'MAX_TOKENS'));await assert.rejects(()=>f.a.generate('s','u'),e=>{assert.equal(e.partialFinalText,null);assert.ok(!JSON.stringify(e).includes('unit-secret'));return true;});}
 const f=fixture(envelope([{text:'a'.repeat(5000)}],'MAX_TOKENS'));await assert.rejects(()=>f.a.generate('s','u'),e=>e.partialFinalText.length===4096&&e.partialFinalTextTruncated);
});

test('unexpected finish metadata is not copied into sanitized errors',async()=>{
 const f=fixture(envelope([{thought:true,text:'private thoughts',thoughtSignature:'private signature'}],'PRIVATE_ACCOUNT_VALUE'));
 await assert.rejects(()=>f.a.generate('s','u'),e=>{assert.equal(e.finishReason,null);assert.equal(e.diagnostics.errorKind,'invalid_response');assert.ok(!/PRIVATE_ACCOUNT_VALUE|private thoughts|private signature/.test(JSON.stringify(e)));return true;});
});
