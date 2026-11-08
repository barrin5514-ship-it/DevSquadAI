import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {createApp} from '../src/app.js';import {loadConfig} from '../src/config/index.js';import {hashText} from '../src/services/project-files.js';
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'scoped-native-')),calls=[],workers={async call(agent,p){calls.push(p.phase);return p.phase==='builder'?{report:'MOCK builder',files:[{path:'app.mjs',content:'export const a=1;'}]}:p.phase==='tester'?{report:'MOCK tester',files:[{path:'app.test.mjs',content:'// fixture'}]}:{report:'MOCK review',files:[],review:{...p.reviewBinding,decision:'approved',summary:'Mock only',findings:[]}};},async tests(){return {executed:true,passed:true,count:1,failed:0,summary:'MOCK tests'};}};const r=createApp(loadConfig({DATABASE_PATH:path.join(root,'db.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backups'),DEEPSEEK_MODEL:'deepseek-flash'}),{fetchImpl:async()=>{throw Error('No provider calls');},studioOptions:{workers,schedule:()=>{}}}),s=r.team.studio,p=s.project({name:'LOCAL SCOPE MOCK'}),j=s.create(p.id,'Local mock only');s.change(j.id,'ready',{roles:{builder:'codex-personal',tester:'deepseek',reviewer:'claude-code'},fallbackPolicy:{enabled:false,allowedWorkers:[]}},'fixture');const approvedAt=new Date().toISOString(),b={version:s.get(j.id).version,approvedBy:'owner',projectId:p.id,rootHash:hashText(s.root(p.id).root),roles:s.get(j.id).state.roles,paid:{model:'deepseek-flash',maxOutput:2048,inputBytes:24000},approvedAt,expiresAt:new Date(Date.parse(approvedAt)+1800000).toISOString(),requestId:randomUUID()};t.after(async()=>{await s.close();r.team.messenger.close();r.team.preview.close();r.team.fileActions.close();r.db.close();assert.equal(path.dirname(fs.realpathSync(root)),fs.realpathSync(os.tmpdir()));fs.rmSync(root,{recursive:true,force:true});});return {r,s,p,j,b,calls,workers,async run(){const job=s.start(p.id,{chatId:j.id,requestId:b.requestId});await s.drive(job.id,s.active.get(job.id));return s.detail(job.id);}};}
test('one bound native run completes exactly three mock calls and preserves owner acceptance',async t=>{const f=fixture(t);assert.equal(f.s.runScope.preview(f.j.id).paid.maxOutput,8192);f.s.runScope.arm(f.j.id,f.b);const j=await f.run();assert.equal(j.status,'awaiting_owner');assert.deepEqual(f.calls,['builder','tester','reviewer']);assert.equal(j.executions.filter(e=>e.agent!=='application-tests').length,3);assert.equal(f.s.start(f.p.id,{chatId:j.id,requestId:f.b.requestId}).status,'awaiting_owner');assert.equal(f.calls.length,3);});
test('failed tests cannot dispatch a second Builder, and completed execution evidence is not overwritten',async t=>{const f=fixture(t);f.s.runScope.arm(f.j.id,f.b);f.workers.tests=async()=>({executed:true,passed:false,count:1,failed:1,failures:['MOCK defect'],summary:'MOCK failure'});const j=await f.run();assert.equal(j.status,'paused');assert.deepEqual(f.calls,['builder','tester']);assert.match(j.state.alert,/no remaining authorization/);assert.equal(j.executions[0].status,'completed');assert.equal(j.executions.at(-1).status,'failed');assert.ok(j.state.tests.failed);});
test('requested review corrections pause without a fourth call',async t=>{const f=fixture(t);f.s.runScope.arm(f.j.id,f.b);const original=f.workers.call;f.workers.call=async(a,p)=>p.phase==='reviewer'?(f.calls.push('reviewer'),{report:'CHANGES REQUESTED',files:[],review:{...p.reviewBinding,decision:'changes_requested',summary:'Mock correction',findings:['Mock concern']}}):original(a,p);const j=await f.run();assert.equal(j.status,'paused');assert.deepEqual(f.calls,['builder','tester','reviewer']);assert.ok(j.events.some(e=>e.kind==='independent_review'));});
test('expired, wrong-project, wrong-folder and mismatched-role approvals cannot arm',t=>{for(const variant of ['expired','project','root','roles']){const f=fixture(t),b={...f.b};if(variant==='expired'){b.approvedAt='2000-01-01T00:00:00Z';b.expiresAt='2000-01-01T00:30:00Z';}if(variant==='project')b.projectId='wrong';if(variant==='root')b.rootHash='wrong';if(variant==='roles')b.roles={...b.roles,reviewer:'codex-school'};assert.throws(()=>f.s.runScope.arm(f.j.id,b));assert.equal(f.calls.length,0);}});
test('scope is single-use, cannot be rearmed, and rejects another request or altered goal/database',t=>{const f=fixture(t);f.s.runScope.arm(f.j.id,f.b);assert.throws(()=>f.s.runScope.arm(f.j.id,{...f.b,version:f.s.get(f.j.id).version}));assert.throws(()=>f.s.start(f.p.id,{chatId:f.j.id,requestId:'other-request'}));for(const field of ['databaseHash','goalHash']){const j=f.s.get(f.j.id),copy={...j,state:{...j.state,runApproval:{...j.state.runApproval,[field]:'wrong'}}};assert.throws(()=>f.s.runScope.check(copy,f.b.requestId));}assert.equal(f.calls.length,0);});
test('concurrent reservations consume one phase slot and never replenish unknown attempts',async t=>{const f=fixture(t);f.s.runScope.arm(f.j.id,f.b);const j=f.s.start(f.p.id,{chatId:f.j.id,requestId:f.b.requestId}),repo=f.s.root(f.p.id);const out=await Promise.allSettled([1,2].map(()=>Promise.resolve().then(()=>f.s.runScope.reserve(j,'codex-personal','builder',repo.root,repo.fingerprint()))));assert.equal(out.filter(r=>r.status==='fulfilled').length,1);const id=out.find(r=>r.status==='fulfilled').value;f.s.executions.record(id,{status:'unknown',outcome:'unknown'});assert.throws(()=>f.s.runScope.reserve(j,'codex-personal','builder',repo.root,repo.fingerprint()));});
test('dispatch rechecks expiry and role identity, without silently reaching paid fallback',t=>{const f=fixture(t);f.s.runScope.arm(f.j.id,f.b);const j=f.s.start(f.p.id,{chatId:f.j.id,requestId:f.b.requestId}),repo=f.s.root(f.p.id);assert.throws(()=>f.s.runScope.reserve(j,'deepseek','builder',repo.root,repo.fingerprint()));f.s.change(j.id,'running',{runApproval:{...j.state.runApproval,expiresAt:'2000-01-01T00:00:00Z'}},'fixture');assert.throws(()=>f.s.runScope.reserve(j,'codex-personal','builder',repo.root,repo.fingerprint()));assert.equal(f.s.executions.list(j.id).length,0);});

function single(f){delete f.b.paid;f.s.runScope.select(f.j.id,{version:f.s.get(f.j.id).version,mode:'builder-only',builder:'codex-personal'});f.b.version=f.s.get(f.j.id).version;f.b.roles={builder:'codex-personal'};}
test('Builder-only selection requires separate approval and no future role assignments',async t=>{const f=fixture(t);single(f);assert.throws(()=>f.s.start(f.p.id,{chatId:f.j.id,requestId:f.b.requestId}),/separate owner approval/);f.s.change(f.j.id,'ready',{roles:{}},'fixture');f.b.version=f.s.get(f.j.id).version;f.s.runScope.arm(f.j.id,f.b);const j=await f.run();assert.equal(j.status,'paused');assert.equal(j.state.builderCompleted,true);assert.equal(j.state.review,null);assert.equal(j.state.tests,null);assert.deepEqual(f.calls,['builder']);assert.equal(j.executions.length,1);assert.ok(j.state.builderCheckpointHash);assert.equal(j.resume.available,false);assert.throws(()=>f.s.accept(j.id));assert.equal(f.s.start(f.p.id,{chatId:j.id,requestId:f.b.requestId}).status,'paused');assert.throws(()=>f.s.start(f.p.id,{chatId:j.id,requestId:'another'}));assert.equal(f.calls.length,1);});
test('Builder-only preflight checks only the approved Builder, never future logins',async t=>{const {StudioWorkers}=await import('../src/services/studio-workers.js');const w=new StudioWorkers({}),seen=[];w.availability=async a=>(seen.push(a),{ok:true});const job={state:{executionMode:'builder-only',phase:'builder',builderOnlyAgent:'codex-personal',roles:{}}};assert.equal(await w.preflight(job,'unused',new AbortController().signal),null);assert.deepEqual(seen,['codex-personal']);});
test('Builder-only consumption is atomic; disallowed phases, tampering and expired scopes cannot dispatch',async t=>{const f=fixture(t);single(f);f.s.runScope.arm(f.j.id,f.b);const j=f.s.start(f.p.id,{chatId:f.j.id,requestId:f.b.requestId}),repo=f.s.root(f.p.id);for(const phase of ['tester','reviewer'])assert.throws(()=>f.s.runScope.reserve(j,'codex-personal',phase,repo.root,repo.fingerprint()));const attempts=await Promise.allSettled([1,2].map(()=>Promise.resolve().then(()=>f.s.runScope.reserve(j,'codex-personal','builder',repo.root,repo.fingerprint()))));assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.throws(()=>f.s.runScope.arm(j.id,{...f.b,version:f.s.get(j.id).version}));assert.throws(()=>f.s.runScope.check({...j,state:{...j.state,goal:'different task'}},f.b.requestId));assert.throws(()=>f.s.runScope.check({...j,state:{...j.state,runApproval:{...j.state.runApproval,expiresAt:'2000-01-01'}}},f.b.requestId));assert.equal(f.calls.length,0);});
test('Builder-only failed or unknown calls preserve evidence, forbid fallback and never create a blocking lock',async t=>{for(const unknown of [false,true]){const f=fixture(t);single(f);f.s.runScope.arm(f.j.id,f.b);f.workers.call=async()=>{f.calls.push('builder');throw {code:'usage_limit',message:'MOCK limit',stopped:!unknown};};const j=await f.run();assert.equal(j.status,'paused');assert.equal(j.executions.length,1);assert.equal(j.executions[0].status,unknown?'unknown':'failed');assert.equal(f.s.failover.policy(j).enabled,false);assert.equal(f.s.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(j.id).n,0);assert.throws(()=>f.s.start(f.p.id,{chatId:j.id,requestId:'new-request'}));assert.deepEqual(f.calls,['builder']);}});
test('completed Builder-only state cannot dispatch after a database reopen',async t=>{const f=fixture(t);single(f);f.s.runScope.arm(f.j.id,f.b);await f.run();const {DatabaseSync}=await import('node:sqlite'),db=new DatabaseSync(f.r.team.config.database,{readOnly:true});try{const row=db.prepare('SELECT * FROM studio_chats WHERE id=?').get(f.j.id);assert.equal(row.status,'paused');assert.equal(JSON.parse(row.state).builderCompleted,true);assert.equal(db.prepare('SELECT count(*) n FROM studio_executions WHERE chat_id=?').get(f.j.id).n,1);}finally{db.close();}assert.throws(()=>f.s.start(f.p.id,{chatId:f.j.id,requestId:'post-restart-request'}));assert.equal(f.calls.length,1);});

test('Builder-only rejects wrong session project database root and approval mutation',t=>{const f=fixture(t);single(f);f.s.runScope.arm(f.j.id,f.b);const j=f.s.get(f.j.id);for(const bad of [{...j,id:'another-session'},{...j,project_id:'another-project'},{...j,state:{...j.state,builderOnlyAgent:'codex-school'}},{...j,state:{...j.state,runApproval:{...j.state.runApproval,databaseHash:'another-database'}}}])assert.throws(()=>f.s.runScope.check(bad,f.b.requestId));const live=f.s.start(f.p.id,{chatId:j.id,requestId:f.b.requestId});assert.throws(()=>f.s.runScope.reserve(live,'codex-personal','builder','another-root','wrong'));assert.equal(f.s.executions.list(j.id).length,0);});
test('new team approval binds current files without using timestamps',t=>{
 const f=fixture(t),repo=f.s.root(f.p.id),file=path.join(repo.root,'seed.mjs');
 fs.writeFileSync(file,'export const seed=1;');
 f.s.runScope.arm(f.j.id,f.b);
 assert.equal(f.s.get(f.j.id).state.runApproval.checkpointHash,repo.fingerprint());
 fs.utimesSync(file,new Date(0),new Date(0));
 assert.ok(f.s.runScope.check(f.s.get(f.j.id),f.b.requestId));
 fs.writeFileSync(file,'export const seed=2;');
 assert.throws(()=>f.s.start(f.p.id,{chatId:f.j.id,requestId:f.b.requestId}),/approved files, inputs or limits changed/);
 assert.equal(f.calls.length,0);
});
test('approved inputs and limits cannot be changed after approval',t=>{
 const f=fixture(t);f.s.runScope.arm(f.j.id,f.b);const j=f.s.get(f.j.id);
 assert.throws(()=>f.s.runScope.check({...j,state:{...j.state,runApproval:{...j.state.runApproval,paid:{...j.state.runApproval.paid,maxOutput:1}}}},f.b.requestId),/approved files, inputs or limits changed/);
 f.s.event(j.id,'message',{attachments:[{name:'seed.mjs',content:'new input',hash:hashText('new input')}]});
 assert.throws(()=>f.s.runScope.check(f.s.get(j.id),f.b.requestId),/approved files, inputs or limits changed/);
 assert.equal(f.calls.length,0);
});
test('file changes after Send but before Builder reservation fail closed',t=>{
 const f=fixture(t);f.s.runScope.arm(f.j.id,f.b);const j=f.s.start(f.p.id,{chatId:f.j.id,requestId:f.b.requestId}),repo=f.s.root(f.p.id);
 fs.writeFileSync(path.join(repo.root,'changed.mjs'),'export const changed=true;');
 assert.throws(()=>f.s.runScope.reserve(j,j.state.roles.builder,'builder',repo.root,repo.fingerprint()),/approved files, inputs or limits changed/);
 assert.equal(f.s.executions.list(j.id).length,0);
});
test('owner team proposal requires allowance confirmation and rejects stale file review',t=>{
 const f=fixture(t);f.s.change(f.j.id,'ready',{roles:{builder:'codex-personal',tester:'claude-code',reviewer:'nemotron'}},'fixture');
 f.workers.nemotron={status:()=>({ok:true})};
 const v=f.s.runScope.preview(f.j.id),body={...f.b,roles:v.roles,version:v.version,proposalHash:v.proposalHash,free:v.free};delete body.paid;
 assert.deepEqual(v.issues,[]);
 assert.match(v.allowance,/UNKNOWN/);
 assert.throws(()=>f.s.runScope.arm(f.j.id,body),/included usage/);
 fs.writeFileSync(path.join(f.s.root(f.p.id).root,'new.mjs'),'export const x=1;');
 assert.throws(()=>f.s.runScope.arm(f.j.id,{...body,confirmIncluded:true}),/proposal changed/);
 const current=f.s.runScope.preview(f.j.id);
 const armed=f.s.runScope.arm(f.j.id,{...body,proposalHash:current.proposalHash,confirmIncluded:true});
 assert.equal(armed.state.runApproval.includedConfirmed,true);
 assert.equal(armed.state.runApproval.checkpointHash,current.checkpointHash);
 assert.equal(f.calls.length,0);
});
test('explicit team funding refresh atomically records official price and balance metadata without authorizing work',async t=>{
 const f=fixture(t),paid=f.r.team.paid;
 Object.assign(paid.settings,{key:'MOCK_ONLY_TEAM_KEY',inputPrice:0.3,outputPrice:1.2});
 const html='<table><tr><th>MODEL</th><th>deepseek-flash</th><th>deepseek-v4-pro</th></tr><tr><td>1M INPUT TOKENS (CACHE MISS)</td><td>PEAK $0.3 $1.32</td></tr><tr><td>1M OUTPUT TOKENS</td><td>PEAK $1.2 $3.96</td></tr></table>';
 const requests=[];let balanceUsable=true;
 f.r.team.fetch=async (url,opts)=>{
  assert.equal(opts.method,'GET');requests.push(url);
  if(url.endsWith('/pricing/'))return new Response(html);
  if(url.endsWith('/models'))return Response.json({data:[{id:'deepseek-flash'}]});
  if(url.endsWith('/user/balance'))return Response.json({is_available:balanceUsable,balance_infos:[{currency:'USD',total_balance:'5'}]});
  throw Error('Unexpected mock call');
 };
 await assert.rejects(()=>paid.refreshTeamFunding({approvedBy:'owner',confirmReadOnly:false}),/Confirm/);
 assert.deepEqual(requests,[]);
 const result=await paid.refreshTeamFunding({approvedBy:'owner',confirmReadOnly:true});
 assert.equal(requests.length,3);assert.equal(paid.teamRatesValid(),true);assert.equal(f.s.failover.fundingReady().ok,true);
 assert.equal(f.s.get(f.j.id).state.runApproval,undefined);assert.equal(f.calls.length,0);
 balanceUsable=false;
 await assert.rejects(()=>paid.refreshTeamFunding({approvedBy:'owner',confirmReadOnly:true}),/could not be verified/);
 assert.equal(f.r.db.prepare('SELECT checked_at FROM deepseek_balance_observation').get().checked_at,result.checkedAt);
 f.r.db.prepare("UPDATE studio_deepseek_verification SET checked_at='2000-01-01'").run();
 const stale=f.s.failover.fundingReady();assert.equal(stale.ok,true);assert.equal(stale.displayOnly,true);assert.equal(stale.stale,true);
});
function sendOnce(f,options={}){
 const v=f.s.runScope.sendProposal(f.j.id);
 const body={chatId:f.j.id,requestId:randomUUID(),proposalHash:v.hash,expectedVersion:v.version,...options};
 return {v,body,j:f.s.start(f.p.id,body,{requireTeamProposal:true})};
}
test('one Send stores the task and authorizes exact roles, files and limits without a micro-cap',async t=>{
 const f=fixture(t),message={text:'Add a local chart',submissionId:randomUUID(),attachments:[{name:'notes.txt',content:'Keep it offline'}]};
 const {v,body,j}=sendOnce(f,{message});
 assert.equal(j.state.runApproval.mode,'team-send');
 assert.equal(j.state.runApproval.checkpointHash,v.checkpointHash);
 assert.equal(j.state.runApproval.paid.capUSD,undefined);
 assert.match(j.state.goal,/Add a local chart/);
 assert.equal(f.s.start(f.p.id,body).id,j.id);
 await f.s.drive(j.id,f.s.active.get(j.id));
 assert.deepEqual(f.calls,['builder','tester','reviewer']);
 assert.equal(f.s.get(j.id).status,'awaiting_owner');
 assert.equal(f.s.start(f.p.id,body).status,'awaiting_owner');
 assert.equal(f.calls.length,3);
});
test('stale proposal and write-denied Send roll back the message and authorization',t=>{
 const f=fixture(t),v=f.s.runScope.sendProposal(f.j.id),message={text:'Do not save this',submissionId:randomUUID()};
 const body={chatId:f.j.id,requestId:randomUUID(),proposalHash:v.hash,expectedVersion:v.version,message};
 fs.writeFileSync(path.join(f.s.root(f.p.id).root,'new.mjs'),'export const x=1;');
 assert.throws(()=>f.s.start(f.p.id,body),/changed/);
 const current=f.s.runScope.sendProposal(f.j.id);
 f.s.projectsManager.assertWrite=()=>{throw Error('read-only fixture');};
 assert.throws(()=>f.s.start(f.p.id,{...body,proposalHash:current.hash,expectedVersion:current.version}),/read-only/);
 assert.equal(f.s.get(f.j.id).state.runApproval,undefined);
 assert.equal(f.s.detail(f.j.id).events.filter(e=>e.kind==='message').length,0);
});
for(const scenario of ['recover','provider','ineligible','unavailable','unknown','unverified','stop'])test('authorized one-Send fallback: '+scenario,async t=>{
 const f=fixture(t),roles={builder:'deepseek',tester:'codex-personal',reviewer:'nemotron'};
 f.s.change(f.j.id,'ready',{roles},'fixture');
 f.s.failover.configure(f.j.id,{version:f.s.get(f.j.id).version,approvedBy:'owner',enabled:true,allowedWorkers:scenario==='ineligible'?['deepseek']:['claude-code']});
 const original=f.workers.call,attempts=[];
 f.workers.availability=async()=>({ok:scenario!=='unavailable'});
 f.workers.call=async(agent,packet,...rest)=>{
  attempts.push([agent,packet.phase]);
  if(agent==='codex-personal'){
   if(scenario==='stop')f.s.stop(f.j.id);
   throw Object.assign(Error('Fixture account exhausted'),{code:scenario==='provider'?'provider_outage':'usage_limit',stopped:scenario!=='unverified',unknownOutcome:scenario==='unknown'});
  }
  if(packet.phase==='tester')assert.ok(packet.files.some(p=>p.path==='app.mjs'));
  return original(agent,packet,...rest);
 };
 const {j}=sendOnce(f);await f.s.drive(j.id,f.s.active.get(j.id));
 const end=f.s.detail(j.id),last=end.events.findLast(e=>e.kind==='fallback_decision');
 if(scenario==='stop'){assert.equal(last,undefined);assert.equal(attempts.length,2);assert.equal(end.status,'stopped');return;}
 assert.equal(last.content.from,'codex-personal');
 if(['recover','provider'].includes(scenario)){assert.equal(end.status,'awaiting_owner');assert.deepEqual(attempts,[['deepseek','builder'],['codex-personal','tester'],['claude-code','tester'],['nemotron','reviewer']]);assert.equal(last.content.to,'claude-code');}
 else{assert.equal(attempts.length,2);assert.equal(last.content.allowed,false);assert.equal(end.status,'paused');}
 if(['unknown','unverified'].includes(scenario))assert.equal(f.r.db.prepare('SELECT count(*) n FROM studio_locks WHERE chat_id=?').get(j.id).n,0);
});
