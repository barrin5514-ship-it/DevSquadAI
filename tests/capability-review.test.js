import {test} from 'node:test';import assert from 'node:assert/strict';
import {capabilityReview,roleCapabilityStatus,requestCapabilityReview} from '../src/services/capability-review.js';
import {ProviderAdapter} from '../src/providers/adapter.js';
const fixture={explanation:'Sum an array.',edgeCase:'A string element silently concatenates.',improvement:'Validate finite numeric inputs.',code:'function calculateTotal(prices) { if(!Array.isArray(prices)||prices.some(p=>!Number.isFinite(p)))throw new TypeError(); return prices.reduce((a,b)=>a+b,0); }',tests:['[1,2] returns 3','[1,"2"] throws TypeError']};
test('structured capability answer preserves code and two distinct suggested tests without claiming execution',()=>{assert.deepEqual(capabilityReview(JSON.stringify(fixture)),fixture);assert.equal(Object.hasOwn(capabilityReview(JSON.stringify(fixture)),'executed'),false);});
test('invalid JSON, incomplete output, duplicate tests and unexpected fields are rejected',()=>{for(const value of ['{',JSON.stringify({...fixture,code:''}),JSON.stringify({...fixture,tests:['same','same']}),JSON.stringify({...fixture,executed:true})])assert.throws(()=>capabilityReview(value));});
test('HTTP 200 catalog, free confirmation or failed generation cannot qualify a worker role',()=>{for(const probe of [null,{httpStatus:200},{complete:false,structuredValid:false},{complete:true,structuredValid:true,behaviorVerified:false}])assert.deepEqual(roleCapabilityStatus({probe}),{builder:'BLOCKED',tester:'BLOCKED',reviewer:'BLOCKED'});});
test('a successful disposable answer still does not prove production Builder/Reviewer integration or real Tester execution',()=>{assert.deepEqual(roleCapabilityStatus({probe:{complete:true,structuredValid:true,behaviorVerified:true}}),{builder:'NOT VERIFIED',tester:'PARTIALLY VERIFIED',reviewer:'NOT VERIFIED'});});
test('each role requires its own contract and evidence; no model has a permanent role',()=>{const e={probe:{complete:true,structuredValid:true,behaviorVerified:true},contracts:{builder:true,tester:true,reviewer:true},artifactsVerified:true,independentRunnerVerified:true,bindingVerified:true,independenceVerified:true};assert.deepEqual(roleCapabilityStatus(e),{builder:'VERIFIED',tester:'VERIFIED',reviewer:'VERIFIED'});assert.equal(roleCapabilityStatus({...e,independentRunnerVerified:false}).tester,'PARTIALLY VERIFIED');assert.equal(roleCapabilityStatus({...e,independenceVerified:false}).reviewer,'NOT VERIFIED');});
test('capability caller passes separate strings through the actual adapter contract exactly once',async()=>{const calls=[],adapter={async generate(...args){calls.push(args);return {text:JSON.stringify(fixture),finishReason:'STOP'};}};const result=await requestCapabilityReview(adapter,{system:'Return JSON',user:'Review calculateTotal'});assert.deepEqual(calls,[['Return JSON','Review calculateTotal']]);assert.equal(result.review.code,fixture.code);});
test('malformed local capability prompts fail before any adapter/provider invocation',async()=>{let calls=0;for(const prompt of [{system:{bad:true},user:'text'},{system:'text'},{system:'',user:'text'}])await assert.rejects(()=>requestCapabilityReview({generate:async()=>{calls++;}},prompt),/separate nonempty/);assert.equal(calls,0);});
test('corrected caller constructs the real Gemini request with JSON, low thinking and a 500-token cap',async()=>{
 let calls=0;
 const adapter=new ProviderAdapter({id:'gemini',key:'FAKE_TEST_ONLY',model:'gemini-3.8-flash',base:'https://generativelanguage.googleapis.com/v1beta',free:true},{tokenLimit:500,timeout:60000,fetchImpl:async(url,options)=>{
  calls++;const body=JSON.parse(options.body);
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  assert.equal(body.systemInstruction.parts[0].text,'Return JSON');assert.equal(body.contents[0].parts[0].text,'Review calculateTotal');
  assert.equal(body.generationConfig.maxOutputTokens,500);assert.deepEqual(body.generationConfig.thinkingConfig,{thinkingLevel:'low'});
  assert.equal(body.generationConfig.responseMimeType,'application/json');assert.deepEqual(body.generationConfig.responseJsonSchema,{type:'object'});
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(fixture)}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:12,candidatesTokenCount:30,totalTokenCount:44,thoughtsTokenCount:2}}),{status:200,headers:{'content-type':'application/json'}});
 }});
 adapter.responseJsonSchema={type:'object'};
 const result=await requestCapabilityReview(adapter,{system:'Return JSON',user:'Review calculateTotal'});
 assert.equal(calls,1);assert.equal(result.review.code,fixture.code);assert.equal(result.finishReason,'STOP');
});
