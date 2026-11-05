import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {ScopedPaidReview,sha256} from '../src/services/scoped-paid-review.js';
import {keyFingerprint} from '../src/services/provider-verification.js';
import {report} from './review-fixture.js';
import {DatabaseSync} from 'node:sqlite';

function fixture(t,options={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'devsquad-scoped-paid-')),calls=[];
 const config=loadConfig({DATABASE_PATH:path.join(dir,'db.sqlite'),WORKSPACE_DIR:path.join(dir,'workspace'),BACKUP_DIR:path.join(dir,'backups'),GROQ_API_KEY:'scope-groq-mock',GROQ_MODEL:'openai/gpt-oss-120b',GROQ_FREE_CONFIRMED:'true',DEEPSEEK_API_KEY:'scope-paid-mock',DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_INPUT_USD_PER_MILLION:'0.3',DEEPSEEK_OUTPUT_USD_PER_MILLION:'1.2'});
 let hook=async()=>{},r;
 const fetchImpl=async(url,opts)=>{
  calls.push({url,method:opts.method,body:opts.body});await hook(url,opts);
  if(options.fail)throw new Error('simulated transport failure');
  if(url.endsWith('/models'))return Response.json({data:[{id:options.absent?'different-model':'deepseek-flash'}]});
  if(url.endsWith('/user/balance'))return Response.json({is_available:true,balance_infos:[{currency:'USD',total_balance:options.low?'0.005':'100'}]});
  return Response.json({choices:[{message:{content:JSON.stringify(report())},finish_reason:options.incomplete?'length':'stop'}],usage:{prompt_tokens:200,completion_tokens:150,total_tokens:350,completion_tokens_details:{reasoning_tokens:0}}});
 };
 r=createApp(config,{fetchImpl});
 const project=r.service.create({name:'Disposable scoped review'}),parent=r.team.create(project.id,{request:'Add finite numbers'});
 r.team.startPlan(parent.task_id);r.team.plan(parent.task_id,{author:'owner',summary:'Develop test review',steps:['Add utility']});
 const task=r.team.approvePlan(parent.task_id,{approvedBy:'owner',approve:true}).children[0];r.team.assign(task.task_id,{modelKey:'groq'});
 r.team.manualDraft(task.task_id,{author:'owner',files:[{path:'src/add.js',content:'export function add(a,b){if(!Number.isFinite(a)||!Number.isFinite(b))throw new TypeError();return a+b;}'}]});
 const id=task.task_id,draft=r.db.prepare('SELECT * FROM generated_drafts WHERE id=?').get(r.team.get(id).draft_id);
 r.team.tests(id,{draftId:draft.id,passed:true,evidence:'Mock operator test evidence, not reviewer-run',recordedBy:'fixture'});
 const review=r.team.packet(id,{reviewer:'DeepSeek',proposedChanges:'Static independent review'}),st=fs.statSync(config.database),now=Date.now();
 const body={model:'deepseek-flash',messages:[{role:'system',content:'Independent static review. JSON only. Never claim execution.'},{role:'user',content:JSON.stringify({identity:{projectId:project.id,taskId:id,draftId:draft.id,draftHash:draft.content_hash,pendingReviewId:review.id,pendingReviewSnapshotHash:review.content_hash},artifacts:JSON.parse(draft.files)})}],stream:false,max_tokens:1024,thinking:{type:'disabled'},response_format:{type:'json_object'}};
 const payloadFile=path.join(dir,'payload.json'),file=path.join(dir,'grant.json');fs.writeFileSync(payloadFile,JSON.stringify(body));
 const terms={id:'fixture-scope',approvedBy:'owner',approvalEvidence:'Mock test approval timestamp',approvedAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+600000).toISOString(),provider:'deepseek',model:'deepseek-flash',projectId:project.id,taskId:id,draftId:draft.id,draftHash:draft.content_hash,reviewId:review.id,snapshotHash:review.content_hash,databasePath:fs.realpathSync(config.database),databaseDev:String(st.dev),databaseIno:String(st.ino),keyFingerprint:keyFingerprint('scope-paid-mock'),payloadFile,payloadHash:sha256(JSON.stringify(body)),maximumUSD:0.01,maxOutput:1024,maxModelGET:1,maxBalanceGET:1,maxPOST:1,prices:{input:0.3,output:1.2,source:'https://api-docs.deepseek.com/quick_start/pricing/',checkedAt:new Date(now-500).toISOString(),expiresAt:new Date(now+600000).toISOString()}};
 const save=()=>fs.writeFileSync(file,JSON.stringify(terms));save();
 t.after(()=>{r.db.close();fs.rmSync(dir,{recursive:true,force:true});});
 function activate(){r.team.paid.scope=new ScopedPaidReview(r.team.paid,file);return r.team.paid.scope;}
 return {get r(){return r;},id,draft,review,terms,body,calls,save,activate,hook(fn){hook=fn;},quote(){return r.team.paid.quote(id,1024,review.id);},run(q){return r.team.paid.execute(id,{quoteId:q.quoteId,approvedBy:'owner',confirmPaid:true,maximumUSD:0.01},'review');},restart(){r.db.close();r=createApp(config,{fetchImpl,paidReviewGrantFile:file});},payloadFile};
}

test('exact bound JSON/non-thinking body follows existing review pipeline while global paid stays disabled',async t=>{
 const f=fixture(t);f.activate();const q=f.quote();assert.equal(f.r.team.paid.policy.enabled,false);assert.equal(f.r.team.liveOptIn,false);
 assert.equal((await f.run(q)).state,'VERIFIED');assert.equal(f.calls.length,3);assert.deepEqual(f.calls.map(c=>c.method),['GET','GET','POST']);assert.equal(f.calls[2].body,JSON.stringify(f.body));
 const state=f.r.team.paid.scope.status(f.id);assert.equal(state.outcome,'completed');assert.equal(state.heldUSD,0.01);assert.equal(state.result.usage.total,350);assert.equal(state.result.reviewerExecutedTests,false);
 assert.equal(f.r.db.prepare('SELECT count(*) n FROM user_approvals').get().n,0);assert.equal(f.r.team.senior.list(f.id)[0].status,'approved');
 f.restart();assert.equal(f.r.team.get(f.id).state,'VERIFIED');assert.equal(f.r.team.paid.scope.status(f.id).requests.length,3);await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,3);
});
test('repeated quotes are idempotent and do not replenish the task lifetime allowance',t=>{const f=fixture(t);f.activate();assert.equal(f.quote().quoteId,f.quote().quoteId);assert.equal(f.r.db.prepare('SELECT count(*) n FROM paid_request_quotes').get().n,1);assert.equal(f.calls.length,0);});
test('payload tampering before startup or after quote prevents dispatch',async t=>{const f=fixture(t);const original=fs.readFileSync(f.payloadFile);fs.writeFileSync(f.payloadFile,'{}');assert.throws(()=>f.activate());fs.writeFileSync(f.payloadFile,original);f.activate();const q=f.quote();fs.writeFileSync(f.payloadFile,JSON.stringify({...f.body,max_tokens:1023}));await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,0);});
test('wrong task, revision, model, provider and database identity cannot create a capability',t=>{const f=fixture(t);for(const change of [{taskId:'unrelated'},{draftId:'wrong-revision'},{model:'deepseek-v4-pro'},{provider:'groq'},{databaseIno:'wrong'},{databasePath:'C:/wrong.sqlite'}]){const before={...f.terms};Object.assign(f.terms,change);f.save();assert.throws(()=>f.activate());Object.assign(f.terms,before);f.save();}assert.equal(f.calls.length,0);});
test('unrelated tasks and wrong review/output parameters are rejected',async t=>{const f=fixture(t);const s=f.activate();assert.throws(()=>s.quote('unrelated',1024,f.review.id));assert.throws(()=>s.quote(f.id,1024,'wrong'));assert.throws(()=>s.quote(f.id,512,f.review.id));assert.equal(f.calls.length,0);});
test('expired approval or price lease prevents every request',async t=>{
 // One fixed test clock keeps the expired window exactly 30 minutes. Sampling
 // Date.now twice could accidentally create an invalid 30-minute-plus-1ms grant.
 t.mock.timers.enable({apis:['Date'],now:Date.now()});const f=fixture(t);f.terms.approvedAt=new Date(Date.now()-1800001).toISOString();f.terms.expiresAt=new Date(Date.now()-1).toISOString();f.terms.prices.checkedAt=f.terms.approvedAt;f.terms.prices.expiresAt=f.terms.expiresAt;f.save();const s=f.activate();assert.throws(()=>s.quote(f.id,1024,f.review.id));assert.equal(f.calls.length,0);});
test('changed prices or approval file cannot dispatch an existing quote',async t=>{const f=fixture(t);f.activate();const q=f.quote();f.r.team.paid.settings.inputPrice=0.31;await assert.rejects(()=>f.run(q));f.r.team.paid.settings.inputPrice=0.3;f.terms.expiresAt=new Date(Date.now()+100000).toISOString();f.save();await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,0);});
test('concurrent callers consume at most one of each HTTP slot and one full allowance',async t=>{const f=fixture(t);f.activate();const q=f.quote();let release,entered;const started=new Promise(r=>entered=r);f.hook(async url=>{if(url.endsWith('/chat/completions')){entered();await new Promise(r=>release=r);}});const first=f.run(q);await started;await assert.rejects(()=>f.run(q));assert.throws(()=>f.quote());release();await first;assert.equal(f.calls.length,3);assert.equal(f.r.team.paid.scope.status(f.id).heldUSD,0.01);});
test('concurrent preflight requests are consumed before fetch, never duplicated',async t=>{const f=fixture(t);f.activate();const q=f.quote();let release,entered;const started=new Promise(r=>entered=r);f.hook(async url=>{if(url.endsWith('/models')){entered();await new Promise(r=>release=r);}});const first=f.run(q);await started;await assert.rejects(()=>f.run(q));release();await first;assert.equal(f.calls.filter(c=>c.url.endsWith('/models')).length,1);assert.equal(f.calls.length,3);});
test('unknown model GET is consumed permanently, including after restart',async t=>{const f=fixture(t,{fail:true});f.activate();const q=f.quote();await assert.rejects(()=>f.run(q));f.restart();await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,1);assert.equal(f.r.team.get(f.id).state,'AWAITING_REVIEW');});
test('unavailable model stops after the one GET',async t=>{const f=fixture(t,{absent:true});f.activate();await assert.rejects(()=>f.run(f.quote()));assert.equal(f.calls.length,1);});
test('insufficient fresh funds stops before POST and does not repeat the balance GET',async t=>{const f=fixture(t,{low:true});f.activate();const q=f.quote();await assert.rejects(()=>f.run(q));await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,2);assert.equal(f.r.team.paid.scope.status(f.id).heldUSD,0);});
test('unknown review retains the full allowance, usage and one-POST limit across restart',async t=>{const f=fixture(t,{incomplete:true});f.activate();const q=f.quote();await assert.rejects(()=>f.run(q));f.restart();assert.equal(f.r.team.get(f.id).state,'AWAITING_REVIEW');assert.equal(f.r.team.paid.scope.status(f.id).heldUSD,0.01);assert.equal(f.r.team.paid.scope.status(f.id).outcome,'unknown');assert.equal(f.r.team.detail(f.id).usage.find(u=>u.provider_id==='deepseek').total_tokens,350);assert.throws(()=>f.quote());await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,3);});
test('price change during preflight blocks POST after exactly two GETs',async t=>{const f=fixture(t);f.activate();const q=f.quote();f.hook(async url=>{if(url.endsWith('/user/balance'))f.r.team.paid.settings.outputPrice=1.3;});await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,2);});
test('expired grant cannot dispatch after a successful balance response',async t=>{
 // Advance only the test clock at the balance boundary, independent of PC speed.
 t.mock.timers.enable({apis:['Date'],now:Date.now()});const f=fixture(t);f.terms.expiresAt=new Date(Date.now()+2000).toISOString();f.save();f.activate();const q=f.quote();f.hook(async url=>{if(url.endsWith('/user/balance'))t.mock.timers.tick(2050);});await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,2);});
test('a new grant ID cannot reset persistent task request limits',async t=>{const f=fixture(t);f.activate();await f.run(f.quote());f.terms.id='replacement-grant';f.save();assert.throws(()=>f.activate());assert.equal(f.calls.length,3);});
test('immutable database terms cannot be rewritten and quote tampering cannot dispatch POST',async t=>{const f=fixture(t);f.activate();const q=f.quote();assert.throws(()=>f.r.db.prepare("UPDATE paid_review_scopes SET body='{}'").run(),/immutable/);f.r.db.prepare('UPDATE paid_request_quotes SET reserved_usd=0 WHERE id=?').run(q.quoteId);await assert.rejects(()=>f.run(q));assert.equal(f.calls.filter(c=>c.method==='POST').length,0);});
test('separate SQLite connections share atomic request slots, not per-process counters',t=>{const f=fixture(t),first=f.activate();f.quote();const db=new DatabaseSync(f.r.team.config.database);try{const team=Object.create(f.r.team);team.db=db;const paid=Object.create(f.r.team.paid);paid.db=db;paid.team=team;const second=new ScopedPaidReview(paid,first.file);first.claim(f.id,'models');assert.throws(()=>second.claim(f.id,'models'));assert.equal(db.prepare('SELECT count(*) n FROM paid_review_http').get().n,1);}finally{db.close();}});
test('removing startup scope or using legacy development cannot bypass the persistent task cap',async t=>{const f=fixture(t);f.activate();const q=f.quote();await assert.rejects(()=>f.r.team.paid.execute(f.id,{quoteId:q.quoteId,approvedBy:'owner',confirmPaid:true,maximumUSD:0.01},'development'));f.r.team.paid.scope=null;assert.throws(()=>f.quote());await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,0);});
test('pending legacy reservations are netted against fresh balance before POST',async t=>{const f=fixture(t);f.activate();const q=f.quote();f.r.db.prepare("INSERT INTO paid_request_quotes(id,task_id,model,input_bound,output_bound,reserved_usd,status,created_at,request_hash,price_snapshot,expires_at) VALUES ('legacy-reserved',?,'deepseek-flash',100,100,99.995,'unknown',?,'mock-hash','{}',0)").run(f.id,new Date().toISOString());await assert.rejects(()=>f.run(q));assert.equal(f.calls.length,2);assert.equal(f.r.team.paid.scope.status(f.id).heldUSD,0);});
