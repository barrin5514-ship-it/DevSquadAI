import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WebhookOut} from '../src/services/webhook-out.js';
const job={id:'job',task_id:'task',status:'awaiting_owner',state:{roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},completedSteps:['Mock tests passed'],changedFiles:[{content:'private source'}]}};
function team(){return {fields(body,keys){if(Object.keys(body).some(k=>!keys.includes(k)))throw Error('Invalid fields');},safe(value){if(JSON.stringify(value).includes('secret-value'))throw Error('Credential rejected');}};}
test('empty setting and restart both disable delivery without network calls',async()=>{
 let calls=0;const hook=new WebhookOut(team(),{fetchImpl:async()=>{calls++;}});assert.deepEqual(await hook.send(job),{status:'disabled'});hook.configure({url:'',enabled:true});assert.equal(hook.status().enabled,false);assert.equal(calls,0);assert.equal(new WebhookOut(team()).status().enabled,false);
});
test('webhook rejects private addresses, lookalike hosts, userinfo, redirects and non-Zapier URLs',()=>{
 const hook=new WebhookOut(team());for(const url of ['http://hooks.zapier.com/hooks/catch/a/b/','https://127.0.0.1/hooks/catch/a/b/','https://hooks.zapier.com.evil.example/hooks/catch/a/b/','https://user@hooks.zapier.com/hooks/catch/a/b/','https://hooks.zapier.com/hooks/catch/a/b/?redirect=private'])assert.throws(()=>hook.configure({url,enabled:true}));
});
test('one enabled delivery sends only the report and never leaks the URL or source in status',async()=>{
 const calls=[],hook=new WebhookOut(team(),{fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,status:200};}});hook.configure({url:'https://hooks.zapier.com/hooks/catch/123/private-capability/',enabled:true});assert.ok(!JSON.stringify(hook.status()).includes('private-capability'));
 assert.equal((await hook.send({...job,status:'running'})).status,'not_ready');assert.equal((await hook.send(job)).status,'delivered');assert.equal((await hook.send(job)).status,'already_attempted');assert.equal(calls.length,1);assert.equal(calls[0].options.redirect,'error');assert.ok(!calls[0].options.body.includes('private source'));assert.equal(JSON.parse(calls[0].options.body).ownerAcceptance,'still_required');
});
test('unknown delivery outcome is retained in this session and never retried',async()=>{
 let calls=0;const hook=new WebhookOut(team(),{fetchImpl:async()=>{calls++;throw Error('secret response');}});hook.configure({url:'https://hooks.zapier.com/hooks/catch/a/b/',enabled:true});const result=await hook.send(job);assert.equal(result.status,'unknown');assert.ok(!JSON.stringify(result).includes('secret'));await hook.send(job);assert.equal(calls,1);
});
