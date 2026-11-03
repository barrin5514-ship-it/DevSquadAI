import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createApp} from '../src/app.js';import {loadConfig} from '../src/config/index.js';
import {PaidHello,helloHeld} from '../src/services/paid-hello.js';
import {keyFingerprint} from '../src/services/provider-verification.js';
import {HubConnections} from '../src/services/hub-connections.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
function fixture(t,options={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'paid-hello-')),calls=[];let hook=async()=>{};
 const config=loadConfig({DATABASE_PATH:path.join(root,'db.sqlite'),WORKSPACE_DIR:path.join(root,'workspace'),BACKUP_DIR:path.join(root,'backups'),DEEPSEEK_API_KEY:'hello-fake-key',DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_TOTAL_LIMIT_USD:options.budget||'1'});
 const r=createApp(config,{fetchImpl:async(url,opts)=>{calls.push({url,body:opts.body});await hook(url);return new Response(JSON.stringify(url.endsWith('/models')?{data:[{id:options.absent?'different':'deepseek-flash'}]}:url.endsWith('/user/balance')?{is_available:true,balance_infos:[{currency:'USD',total_balance:options.low?'0':'5'}]}:options.failure?{error:{message:'hello-fake-key'}}:{choices:[{message:{content:'hello'},finish_reason:options.truncated?'length':'stop'}],usage:{prompt_tokens:12,completion_tokens:2,total_tokens:14,completion_tokens_details:{reasoning_tokens:0}}}),{status:url.endsWith('/chat/completions')&&options.failure?503:200});}});
 t.after(()=>{r.db.close();fs.rmSync(root,{recursive:true,force:true});});
 const p=r.team.create(r.service.create({name:'DISPOSABLE hello mock'}).id,{request:'Hello'});r.team.startPlan(p.task_id);r.team.plan(p.task_id,{author:'owner',summary:'Connection only',steps:['Connection-only hello checks; no code generation or acceptance.']});const task=r.team.approvePlan(p.task_id,{approvedBy:'owner',approve:true}).children[0],stat=fs.statSync(config.database),body=JSON.parse(fs.readFileSync(new URL('../docs/deepseek-hello-request.json',import.meta.url)));
 const terms={id:randomUUID(),projectId:task.project_id,taskId:task.task_id,databasePath:fs.realpathSync(config.database),databaseDev:String(stat.dev),databaseIno:String(stat.ino),approvedBy:'owner',approvalEvidence:'Mock owner approval',approvedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+600000).toISOString(),provider:'deepseek',model:'deepseek-flash',maximumUSD:0.001,maxOutput:32,timeoutMs:90000,maxModelGET:1,maxBalanceGET:1,maxPOST:1,payloadHash:sha(JSON.stringify(body)),keyFingerprint:keyFingerprint('hello-fake-key'),prices:{input:0.3,output:1.2,source:'https://api-docs.deepseek.com/quick_start/pricing/',checkedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+600000).toISOString()}},file=path.join(root,'hello.json');
 const save=()=>fs.writeFileSync(file,JSON.stringify(terms));save();const activate=()=>new PaidHello(r.team,file);
 return {r,config,root,terms,file,save,activate,calls,task,hook:fn=>hook=fn};
}
test('one hello consumes exactly three HTTP slots, holds cap and records real usage without accepting a task',async t=>{
 const f=fixture(t),scope=f.activate(),result=await scope.execute();assert.equal(result.ok,true);assert.equal(result.httpStatus,200);assert.equal(result.usage.total,14);assert.equal(result.calculatedCostUSD,(12*0.3+2*1.2)/1e6);assert.equal(scope.status().heldUSD,0.001);assert.equal(helloHeld(f.r.db),0.001);assert.equal(f.calls.length,3);const sent=JSON.parse(f.calls[2].body);assert.equal(sent.max_tokens,32);assert.equal(sent.thinking.type,'disabled');assert.equal(f.r.team.get(f.task.task_id).state,'PENDING');assert.equal((await scope.execute()).cached,true);assert.equal(f.calls.length,3);
});
test('wrong task/model/database, extra output, tampered file and payload cannot authorize HTTP',async t=>{
 for(const field of ['taskId','model','databaseIno','maxOutput','payloadHash']){const f=fixture(t);f.terms[field]=field==='maxOutput'?33:'wrong';f.save();assert.throws(f.activate);assert.equal(f.calls.length,0);}
 const f=fixture(t),scope=f.activate();f.terms.approvalEvidence='changed';f.save();await assert.rejects(scope.execute());assert.equal(f.calls.length,0);
});
test('expiration before checks or during balance cannot dispatch a POST',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.now()});const f=fixture(t);f.terms.expiresAt=new Date(Date.now()+1000).toISOString();f.save();const scope=f.activate();f.hook(async url=>{if(url.endsWith('/user/balance'))t.mock.timers.tick(2000);});await assert.rejects(scope.execute());assert.equal(f.calls.length,2);assert.equal(scope.status().heldUSD,0);
});
test('unavailable model, insufficient funds and configured global budget stop generation',async t=>{
 for(const opts of [{absent:true},{low:true},{budget:'0.00001'}]){const f=fixture(t,opts),scope=f.activate();try{await scope.execute();}catch{}assert.ok(f.calls.every(c=>!c.url.endsWith('/chat/completions')));assert.equal(scope.status().heldUSD,0);}
});
test('unknown POST keeps its full cap and never retries, including from a reconstructed scope',async t=>{
 const f=fixture(t,{failure:true}),scope=f.activate(),result=await scope.execute();assert.equal(result.ok,false);assert.equal(result.httpStatus,503);assert.equal(scope.status().heldUSD,0.001);assert.equal(scope.status().outcome,'unknown');assert.ok(!JSON.stringify(result).includes('hello-fake-key'));await assert.rejects(f.activate().execute());assert.equal(f.calls.length,3);
});
test('concurrent scope attempts cannot duplicate a GET or mutate the in-flight result',async t=>{
 const f=fixture(t),scope=f.activate();let release,entered;const reached=new Promise(r=>entered=r);f.hook(async url=>{if(url.endsWith('/models')){entered();await new Promise(r=>release=r);}});const running=scope.execute();await reached;await assert.rejects(f.activate().execute());release();assert.equal((await running).ok,true);assert.equal(f.calls.length,3);
});
test('truncated hello is never verified and immutable scope cannot be replenished',async t=>{
 const f=fixture(t,{truncated:true}),scope=f.activate();assert.equal((await scope.execute()).ok,false);assert.throws(()=>f.r.db.prepare("UPDATE paid_hello_scopes SET body='{}'").run(),/immutable/);f.terms.id=randomUUID();f.save();assert.throws(f.activate);assert.equal(f.calls.length,3);
});
test('completed hub batch survives reconstruction and expiry without another native or paid call',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.now()});const f=fixture(t);let native=0;const options={helloGrantFile:f.file,cliHello:{installed:()=>true,hello:async()=>{native++;return {ok:true,kind:'mock',text:'hello'};}}};
 const first=await new HubConnections(f.r.team,options).test({approvedBy:'owner',confirmIncluded:true});assert.equal(first.results.length,3);assert.equal(native,2);assert.equal(f.calls.length,3);
 t.mock.timers.tick(600001);const saved=await new HubConnections(f.r.team,options).test({approvedBy:'owner',confirmIncluded:true});assert.equal(saved.cached,true);assert.equal(native,2);assert.equal(f.calls.length,3);assert.equal(f.r.db.prepare('SELECT count(*) n FROM hub_connection_checks').get().n,1);
});
