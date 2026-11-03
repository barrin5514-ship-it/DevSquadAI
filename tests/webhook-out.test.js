import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WebhookOut} from '../src/services/webhook-out.js';
const job={id:'job',task_id:'task',status:'awaiting_owner',state:{roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},completedSteps:['Mock tests passed'],changedFiles:[{content:'private source'}]}};
function team(){return {fields(body,keys){if(Object.keys(body).some(k=>!keys.includes(k)))throw Error('Invalid fields');},safe(value){if(JSON.stringify(value).includes('secret-value'))throw Error('Credential rejected');}};}
test('unconfigured setting stays off without network calls',async()=>{
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

function localStore(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'devsquad-webhook-'));const value=team();value.config={database:path.join(root,'db.sqlite')};t.after(()=>{for(const name of fs.readdirSync(root))fs.unlinkSync(path.join(root,name));fs.rmdirSync(root);});return {root,value,file:path.join(root,'webhook-out.json')};}
test('private webhook setting and enabled choice survive reconstruction without any delivery',async t=>{
 const f=localStore(t);let calls=0;const hook=new WebhookOut(f.value,{fetchImpl:async()=>{calls++;}});hook.configure({url:'https://hooks.zapier.com/hooks/catch/mock/only-fixture/',enabled:true});const restored=new WebhookOut(f.value,{fetchImpl:async()=>{calls++;}});assert.equal(restored.status().configured,true);assert.equal(restored.status().enabled,true);assert.match(restored.status().persistence,/restored after restart/);assert.ok(!JSON.stringify(restored.status()).includes('only-fixture'));assert.equal(calls,0);restored.configure({enabled:false});const disabled=new WebhookOut(f.value);assert.equal(disabled.status().configured,true);assert.equal(disabled.status().enabled,false);disabled.configure({url:'',enabled:false});assert.equal(new WebhookOut(f.value).status().configured,false);
});
test('corrupt, oversized or invalid-host saved configuration fails closed without exposing content',t=>{
 const f=localStore(t);for(const raw of ['not-json','x'.repeat(4097),JSON.stringify({version:1,url:'https://evil.example/private',enabled:true}),JSON.stringify({version:1,url:'https://hooks.zapier.com/hooks/catch/a/b/',enabled:'true'})]){fs.writeFileSync(f.file,raw);const hook=new WebhookOut(f.value);assert.equal(hook.status().configured,false);assert.equal(hook.status().enabled,false);assert.equal(hook.status().storageError,true);assert.ok(!JSON.stringify(hook.status()).includes('evil.example/private'));}
});
test('failed disk save preserves the last in-memory setting and returns a sanitized error',t=>{
 const f=localStore(t),hook=new WebhookOut(f.value);hook.configure({url:'https://hooks.zapier.com/hooks/catch/mock/retained-fixture/',enabled:false});fs.unlinkSync(f.file);fs.mkdirSync(f.file);try{assert.throws(()=>hook.configure({enabled:true}),e=>!e.message.includes('retained-fixture')&&/could not be saved/.test(e.message));assert.equal(hook.status().configured,true);assert.equal(hook.status().enabled,false);}finally{fs.rmdirSync(f.file);}
});
