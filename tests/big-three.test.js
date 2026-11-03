import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {BigThreeCoordinator} from '../src/services/big-three.js';

function fixture(t,workers={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'big-three-'));
 const config=loadConfig({DATABASE_PATH:path.join(root,'data/main.sqlite'),WORKSPACE_DIR:path.join(root,'workspace'),BACKUP_DIR:path.join(root,'backups'),TEAM_FOCUS:'big_three',GROQ_API_KEY:'sentinel-secret'});
 const app=createApp(config,{mockWorkers:workers,fetchImpl:()=>{throw Error('Network must not be called');}});t.after(()=>{app.db.close();fs.rmSync(root,{recursive:true,force:true});});
 const parent=app.team.create(app.service.create({name:'MOCK ONLY'}).id,{request:'Build tiny utility'});app.team.startPlan(parent.task_id);app.team.plan(parent.task_id,{author:'owner',summary:'Build and independently review',steps:['Implement utility']});
 const child=app.team.approvePlan(parent.task_id,{approvedBy:'owner',approve:true}).children[0];
 const engine=app.team.coordinator,job=engine.create(child.task_id,{builder:'codex-personal',tester:'claude-code',reviewer:'claude-code'});return {app,engine,job,child};
}
const limit={code:'usage_limit',stopped:true,retryAt:'2026-10-28T00:00:00Z'};

test('Codex limit -> other profile reads saved work -> Claude independent review; owner gate untouched',async t=>{
 let inherited=false,reviewed=false;
 const f=fixture(t,{
  'codex-personal':{run:async(s,save)=>{save({completedSteps:['Requirements checked'],changedFiles:[{path:'add.js',hash:'first-revision'}]});throw limit;}},
  'codex-school':{run:async(s,save)=>{inherited=s.completedSteps.includes('Requirements checked')&&s.changedFiles[0].hash==='first-revision';save({completedSteps:[...s.completedSteps,'Build finished'],changedFiles:[{path:'add.js',hash:'second-revision'}],testResults:[{kind:'mock',passed:24}]});return {complete:true};}},
  'claude-code':{run:async s=>{reviewed=s.phase==='review'&&s.authors.includes('codex-school');return {complete:true};}}
 });
 const result=await f.engine.run(f.job.id);assert.equal(result.status,'awaiting_owner');assert.ok(inherited&&reviewed);assert.deepEqual(result.state.swaps.map(s=>[s.from,s.to]),[['codex-personal','codex-school']]);
 const h=f.engine.history(f.job.id);assert.ok(h.some(r=>r.snapshot.changedFiles[0]?.hash==='first-revision'));for(const r of h)assert.equal(createHash('sha256').update(JSON.stringify(r.snapshot)).digest('hex'),r.snapshot_hash);
 assert.equal(f.app.team.get(f.child.task_id).state,'PENDING');assert.throws(()=>f.app.team.complete(f.child.task_id,{approvedBy:'owner'}));
 assert.throws(()=>f.app.db.prepare("UPDATE shared_job_history SET kind='changed'").run(),/immutable/);assert.throws(()=>f.app.db.prepare('DELETE FROM shared_job_history').run(),/immutable/);
});
test('all exhausted pauses, preserves retry evidence and never invokes unapproved DeepSeek',async t=>{
 let paid=0;const f=fixture(t,Object.fromEntries(['codex-personal','codex-school','claude-code','deepseek'].map(id=>[id,{run:async()=>{if(id==='deepseek')paid++;throw limit;}}])));
 const result=await f.engine.run(f.job.id);assert.equal(result.status,'paused');assert.equal(result.state.retryAt,limit.retryAt);assert.match(result.state.blocker,/paid authorization/);assert.equal(paid,0);
});
test('unknown outcomes pause without next worker; arbitrary errors never enter diagnostics',async t=>{
 let next=0;const f=fixture(t,{'codex-personal':{run:async()=>{throw Error('sentinel-secret');}},'codex-school':{run:async()=>{next++;return {complete:true};}}});const result=await f.engine.run(f.job.id);assert.equal(next,0);assert.match(result.state.blocker,/Unknown/);assert.ok(!JSON.stringify(f.engine.history(f.job.id)).includes('sentinel-secret'));await assert.rejects(f.engine.run(f.job.id),/safely resume/);
});
test('parallel starts, stale callbacks, secret-bearing progress, and non-approved tasks are rejected',async t=>{
 let finish,late;const f=fixture(t,{'codex-personal':{run:async(s,save)=>{if(s.phase==='build'){late=save;await new Promise(r=>finish=r);}return {complete:true};}}});
 const running=f.engine.run(f.job.id);await assert.rejects(f.engine.run(f.job.id),/safely resume|locked/);assert.throws(()=>late({openIssues:['sentinel-secret']}),/Credential/);finish();await running;assert.throws(()=>late({currentStep:'late'}),/ended/);
 const parent=f.app.team.get(f.child.parent_id);assert.throws(()=>f.engine.create(parent.task_id),/owner-approved/);assert.throws(()=>f.engine.create(f.child.task_id),/UNIQUE/);
});
test('restart fencing preserves history, invalidates a prior worker, and blocks unsafe recovery',async t=>{
 const f=fixture(t);const j=f.engine.read(f.job.id);f.app.db.prepare("UPDATE shared_jobs SET lease='old',status='running' WHERE id=?").run(j.id);f.engine.recover();assert.equal(f.engine.read(j.id).status,'paused');await assert.rejects(f.engine.run(j.id),/safely resume/);assert.throws(()=>f.engine.save(j.id,0,'old','running',j.state,'stale'),/Stale/);assert.equal(f.engine.history(j.id).length,2);
});
test('timeout is bounded; no next worker until termination is proven',async t=>{
 let late,next=0;const f=fixture(t,{'codex-personal':{run:async(s,save)=>{late=save;return new Promise(()=>{});}},'codex-school':{run:async()=>{next++;return {complete:true};}}});f.engine.timeoutMs=10;const result=await f.engine.run(f.job.id);assert.equal(result.status,'paused');assert.equal(next,0);assert.throws(()=>late({currentStep:'late'}),/ended/);
});
test('all recognized stopped limit signals fail over without retries; same-family review excluded',async t=>{
 for(const code of ['rate_limit','quota_exhausted','auth_expired','repeated_timeout']){
  const f=fixture(t,{'codex-personal':{run:async()=>{throw {code,stopped:true};}},'codex-school':{run:async()=>({complete:true})}});const result=await f.engine.run(f.job.id);assert.equal(result.status,'paused');assert.ok(result.state.swaps.some(s=>s.to==='codex-school')); assert.equal(result.state.phase,'review');
 }
});
test('main focus parks backups and no connector or global live routing is enabled',async t=>{
 const f=fixture(t);assert.ok(f.app.team.models().every(m=>!m.available&&m.reason.includes('Parked')));assert.equal(f.app.team.liveOptIn,false);assert.equal(f.engine.status().liveExecutionEnabled,false);const result=await f.engine.run(f.job.id);assert.equal(result.status,'paused');assert.match(result.state.blocker,/connector/);assert.equal(f.app.db.prepare('SELECT count(*) n FROM token_usage').get().n,0);
});

test('default roles rotate three times back to their original assignments, with immutable history',t=>{
 const f=fixture(t);f.engine.setRoles(f.job.id,{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'});
 const original=f.engine.read(f.job.id).state.roles;
 for(let i=0;i<3;i++)f.engine.setRoles(f.job.id,null,true);
 assert.deepEqual(f.engine.read(f.job.id).state.roles,original);
 assert.equal(f.engine.history(f.job.id).filter(h=>h.kind==='roles_changed').length,4);
 assert.throws(()=>f.engine.setRoles(f.job.id,{builder:'codex-personal',tester:'deepseek',reviewer:'codex-school'}),/cannot review/);
});

test('all three agents can fill each role in mock-only jobs; no report grants acceptance',async t=>{
 const workers=Object.fromEntries(['deepseek','codex-personal','claude-code'].map(id=>[id,{simulation:true,run:async(s,save)=>{save({completedSteps:[...s.completedSteps,s.phase+' by '+id],testResults:[...s.testResults,{kind:'mock',phase:s.phase,worker:id}]});return {complete:true};}}]));
 const f=fixture(t,workers);
 const roles=[{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},{builder:'claude-code',tester:'deepseek',reviewer:'codex-personal'},{builder:'codex-personal',tester:'claude-code',reviewer:'deepseek'}];
 for(const assignment of roles){const child=f.app.team.add(f.child.project_id,'MOCK rotation',f.child.parent_id),job=f.engine.create(child.task_id,assignment),result=await f.engine.run(job.id);assert.equal(result.status,'awaiting_owner');assert.deepEqual(result.state.roles,assignment);assert.equal(result.state.testResults.length,3);assert.equal(f.app.team.get(child.task_id).state,'PENDING');}
 assert.equal(f.app.db.prepare('SELECT count(*) n FROM paid_request_quotes').get().n,0);
});

test('DeepSeek mock limit hands saved build to Codex, then tests and independent Claude review finish',async t=>{
 let resumed=false;
 const f=fixture(t,{
  deepseek:{simulation:true,run:async(s,save)=>{save({completedSteps:['Requirements saved'],changedFiles:[{path:'utility.js',hash:'mock-checkpoint'}]});throw {code:'quota_exhausted',stopped:true};}},
  'codex-personal':{run:async(s,save)=>{if(s.phase==='build')resumed=s.completedSteps.includes('Requirements saved')&&s.changedFiles[0].hash==='mock-checkpoint';save({completedSteps:[...s.completedSteps,s.phase+' finished']});return {complete:true};}},
  'claude-code':{run:async()=>({complete:true})}
 });
 f.engine.setRoles(f.job.id,{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'});
 const result=await f.engine.run(f.job.id);assert.equal(result.status,'awaiting_owner');assert.ok(resumed);const swap=result.state.swaps.find(s=>s.reason==='quota_exhausted');assert.equal(swap.from,'deepseek');assert.equal(swap.to,'codex-personal');assert.equal(swap.role,'builder');assert.ok(swap.time);
 assert.throws(()=>f.engine.setRoles(f.job.id,{builder:'claude-code',tester:'deepseek',reviewer:'codex-personal'}),/Pause/);
});

test('late role change cannot make a partial builder its own reviewer',async t=>{
 const f=fixture(t,{'codex-personal':{run:async(s,save)=>{save({completedSteps:['Partial build']});throw {code:'usage_limit',stopped:true};}}});await f.engine.run(f.job.id);
 assert.throws(()=>f.engine.setRoles(f.job.id,{builder:'deepseek',tester:'claude-code',reviewer:'codex-school'}),/cannot review/);
 assert.deepEqual(f.engine.read(f.job.id).state.completedSteps,['Partial build']);
});
