import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ProviderAdapter } from '../../src/providers/adapter.js';
import { checkPlanTime } from './independent-cases.mjs';

// Offline mock only: never shipped as a generated draft or application utility.
function mockPlanTime(durations, hours, buffer = false) {
  if (!Array.isArray(durations) || typeof hours !== 'number' || !Number.isFinite(hours) || hours < 0 || typeof buffer !== 'boolean') throw new TypeError('Invalid input');
  let total = 0;
  for (let i = 0; i < durations.length; i++) {
    if (!Object.hasOwn(durations,i) || typeof durations[i] !== 'number' || !Number.isFinite(durations[i]) || durations[i] < 0) throw new TypeError('Invalid duration');
    total += durations[i];
  }
  const added = buffer ? total * 0.2 : 0, needed = total + added, available = hours * 60, remaining = available - needed;
  if (![total,added,needed,available,remaining].every(Number.isFinite)) throw new RangeError('Overflow');
  return { totalMinutes:total, bufferMinutes:added, requiredMinutes:needed, remainingMinutes:remaining, fits:remaining >= 0 };
}

const read = file => JSON.parse(fs.readFileSync(new URL(file,import.meta.url),'utf8'));
test('pilot independent fixed cases pass mock only and detect broken buffer implementation', () => {
  assert.equal(checkPlanTime(mockPlanTime).passed,38);
  assert.throws(() => checkPlanTime((a,h,b) => mockPlanTime(a,h,false)), /20 percent buffer/);
});
test('pilot templates cannot serve as an active scope or start an approval clock', () => {
  const grant = read('./gemini-grant.template.json'), payload = read('./gemini-payload.template.json');
  assert.equal(grant.active,false); assert.equal(payload.active,false);
  for (const key of ['projectId','parentTaskId','taskId','databaseIdentity','credentialBinding','approvalTimestamp','expiration','ownerFreeAccessConfirmation']) assert.equal(grant[key],null);
  assert.equal(grant.scope,undefined); assert.equal(grant.requests,undefined);
  assert.equal(grant.maxProviderHttpRequests,2); assert.deepEqual(grant.slots,{modelGet:1,generationPost:1});
  assert.equal(grant.retries,0); assert.equal(grant.fallback,false); assert.equal(grant.paidUsage,false);
});
test('pilot adapter mock preserves exact model, low thinking, native JSON, cap and single dispatch', async () => {
  const plan = read('./gemini-payload.template.json'); let calls=0;
  const adapter = new ProviderAdapter({id:'gemini',base:'https://generativelanguage.googleapis.com/v1beta',model:plan.model,key:'OFFLINE-MOCK-NOT-A-KEY',free:true}, {
    timeout:90000, tokenLimit:1024, fetchImpl:async (url,options) => {
      calls++; assert.equal(url,plan.endpoint); assert.equal(options.method,'POST');
      assert.deepEqual(JSON.parse(options.body).generationConfig,plan.generationConfig);
      return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"files":[{"path":"src/mock.js","content":"// OFFLINE MOCK ONLY"}]}'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:12,totalTokenCount:22}}));
    }
  });
  const response = await adapter.generate('Return native JSON files artifact.',plan.plannedTaskPrompt);
  assert.equal(calls,1); assert.equal(response.finishReason,'STOP'); assert.equal(response.diagnostics.httpStatus,200); assert.equal(response.usage.total,22);
  assert.match(response.text,/OFFLINE MOCK ONLY/); // Synthetic tokens, never provider evidence.
});
test('pilot adapter mock treats truncation and empty final response as incomplete without retry', async () => {
  for (const [finishReason,text] of [['MAX_TOKENS','{"files":[]}'],['STOP','']]) {
    let calls=0;
    const adapter = new ProviderAdapter({id:'gemini',base:'https://generativelanguage.googleapis.com/v1beta',model:'gemini-3.8-flash',key:'OFFLINE-MOCK-NOT-A-KEY',free:true},{timeout:90000,tokenLimit:1024,fetchImpl:async()=>{calls++;return new Response(JSON.stringify({candidates:[{content:{parts:[{text}]},finishReason}]}));}});
    await assert.rejects(()=>adapter.generate('JSON','Synthetic test'),error=>error.complete===false);
    assert.equal(calls,1);
  }
});
