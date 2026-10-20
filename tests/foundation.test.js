import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';
import { openDatabase, backupDatabase } from '../src/database/index.js';

function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dev-squad-test-'));
  const config=loadConfig({DATABASE_PATH:path.join(root,'data','db.sqlite'),WORKSPACE_DIR:path.join(root,'workspace'),BACKUP_DIR:path.join(root,'backups')});
  let runtime=createApp(config);
  t.after(()=>{runtime.db.close();fs.rmSync(root,{recursive:true,force:true});});
  return {root,config,get runtime(){return runtime;},restart(){runtime.db.close();runtime=createApp(config);return runtime;}};
}
async function api(t) {
  const f=fixture(t), server=f.runtime.app.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const request=async(url,method='GET',body)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api${url}`,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json()};};
  return {...f,request};
}
test('initializes all nine domain tables with foreign keys and migrations',t=>{
 const {runtime:{db}}=fixture(t); const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
 for(const name of ['projects','tasks','agents','agent_executions','ai_providers','token_usage','project_context','project_files','error_logs']) assert.ok(names.includes(name));
 assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
 assert.equal(db.prepare('SELECT count(*) n FROM schema_migrations').get().n,1);
 assert.throws(()=>db.prepare("INSERT INTO tasks VALUES ('x','missing','task',NULL,'pending','now','now',NULL)").run());
});
test('migrations and agent seeding are idempotent',t=>{const f=fixture(t);f.restart(); assert.equal(f.runtime.db.prepare('SELECT count(*) n FROM schema_migrations').get().n,1);assert.equal(f.runtime.db.prepare('SELECT count(*) n FROM agents').get().n,4);});
test('project creation, retrieval, listing and update API',async t=>{const {request}=await api(t);const p=await request('/projects','POST',{name:'Example',description:'Test'});assert.equal(p.status,201);assert.equal(path.isAbsolute(p.data.workspace_path),false);assert.equal((await request(`/projects/${p.data.id}`)).data.name,'Example');assert.equal((await request('/projects')).data.length,1);assert.equal((await request(`/projects/${p.data.id}`,'PATCH',{name:'Updated',status:'paused'})).data.status,'paused');});
test('tasks persist after restart and pending tasks are not rerun',t=>{const f=fixture(t);const p=f.runtime.service.create({name:'P'});const task=f.runtime.store.createTask(p.id,{description:'Implement'});f.restart();assert.equal(f.runtime.store.task(task.id).status,'pending');assert.equal(f.runtime.store.tasks(p.id).length,1);});
test('context and decisions persist after restart',t=>{const f=fixture(t);const p=f.runtime.service.create({name:'P'});f.runtime.store.saveContext(p.id,'Summary',['SQLite']);f.runtime.store.saveContext(p.id,'Updated',['No AI yet']);f.restart();assert.equal(f.runtime.store.context(p.id).context_summary,'Updated');assert.deepEqual(JSON.parse(f.runtime.store.context(p.id).important_decisions),['No AI yet']);});
test('interrupted tasks and executions require review after restart',t=>{const f=fixture(t);const p=f.runtime.service.create({name:'P'});const task=f.runtime.store.createTask(p.id,{description:'Work'});f.runtime.store.startExecution(task.id,'junior');f.runtime.db.prepare("UPDATE tasks SET status='running' WHERE id=?").run(task.id);f.restart();assert.equal(f.runtime.store.task(task.id).status,'requires_review');assert.equal(f.runtime.store.executions(task.id)[0].status,'requires_review');});
test('all registry, health and task endpoints return expected data',async t=>{const {request}=await api(t);assert.equal((await request('/health')).data.status,'ok');assert.equal((await request('/agents')).data.length,4);assert.deepEqual((await request('/providers')).data,[]);const p=(await request('/projects','POST',{name:'P'})).data;const task=await request(`/projects/${p.id}/tasks`,'POST',{description:'Work',assigned_agent:'junior'});assert.equal(task.status,201);assert.equal((await request(`/tasks/${task.data.id}`)).data.description,'Work');assert.equal((await request(`/projects/${p.id}/tasks`)).data.length,1);});
test('invalid inputs and unknown agents return 400',async t=>{const {request}=await api(t);for(const body of [{},{name:''},{name:1},{name:'P',workspace_path:'../x'},[],{name:'x'.repeat(201)}])assert.equal((await request('/projects','POST',body)).status,400);const p=(await request('/projects','POST',{name:'P'})).data;assert.equal((await request(`/projects/${p.id}`,'PATCH',{status:'bad'})).status,400);assert.equal((await request(`/projects/${p.id}/tasks`,'POST',{description:'Work',assigned_agent:'unknown'})).status,400);});
test('missing project and task IDs return 404',async t=>{const {request}=await api(t);for(const url of ['/projects/missing','/projects/missing/tasks','/tasks/missing','/unknown'])assert.equal((await request(url)).status,404);assert.equal((await request('/projects/missing/tasks','POST',{description:'Work'})).status,404);});
test('SQL-like user text remains data',t=>{const {runtime:r}=fixture(t);const name="'); DROP TABLE projects; --";const p=r.service.create({name});assert.equal(r.store.project(p.id).name,name);assert.equal(r.store.projects().length,1);});
test('workspace traversal and Windows special paths are rejected',t=>{const {runtime:r}=fixture(t);for(const value of ['../outside','/outside','C:/outside','a/../b','a\\b','a//b','a/./b','a/file:stream','NUL','a/trailing.','a/trailing '])assert.throws(()=>r.workspace.resolve(value));});
test('workspace rejects directory symlinks or junctions',t=>{const f=fixture(t);const external=path.join(f.root,'outside');fs.mkdirSync(external);fs.symlinkSync(external,path.join(f.config.workspace,'link'),process.platform==='win32'?'junction':'dir');assert.throws(()=>f.runtime.workspace.resolve('link/file.txt'));});
test('files are tracked, never executed and require overwrite approval',t=>{const f=fixture(t),r=f.runtime,p=r.service.create({name:'P'});r.service.writeFile(p.id,'src/demo.js','throw new Error("not executed")');assert.throws(()=>r.service.writeFile(p.id,'src/demo.js','new'));r.service.writeFile(p.id,'src/demo.js','approved',{approveOverwrite:true});assert.equal(fs.readFileSync(path.join(f.config.workspace,p.id,'src/demo.js'),'utf8'),'approved');assert.equal(r.db.prepare('SELECT relative_path FROM project_files').get().relative_path,'src/demo.js');});
test('configuration validates required values, ranges and storage separation',()=>{assert.throws(()=>loadConfig({}),/Missing configuration/);const base={DATABASE_PATH:'db/d.sqlite',WORKSPACE_DIR:'workspace',BACKUP_DIR:'backups'};for(const extra of [{PORT:'no'},{TOKEN_LIMIT:'0'},{REQUEST_TIMEOUT_MS:'-1'},{LOG_LEVEL:'debug'},{AI_API_KEY_ENV:'bad-key'},{DATABASE_PATH:'workspace/d.sqlite'}])assert.throws(()=>loadConfig({...base,...extra}));});
test('unexpected API errors hide internal details',async t=>{const {runtime:r,request}=await api(t);r.store.projects=()=>{throw new Error('SECRET internal stack path');};const result=await request('/projects');assert.equal(result.status,500);assert.deepEqual(result.error,{message:'Internal server error'});assert.ok(!JSON.stringify(result).includes('SECRET'));});
test('safe provider registry excludes private metadata',async t=>{const {runtime:r,request}=await api(t);r.db.prepare('INSERT INTO ai_providers VALUES (?,?,?,?,?)').run('test','example','offline',JSON.stringify({internal:'not public'}),0);const result=await request('/providers');assert.equal(result.data[0].provider_name,'example');assert.ok(!JSON.stringify(result).includes('internal'));});
test('active database backups verify and restore into isolated fresh storage',async t=>{const f=fixture(t),r=f.runtime,p=r.service.create({name:'Backup project'});r.store.createTask(p.id,{description:'Persist task'});r.store.saveContext(p.id,'Remember',['Decision']);const first=await backupDatabase(r.db,f.config.backups),second=await backupDatabase(r.db,f.config.backups);assert.notEqual(first,second);assert.ok(fs.existsSync(first));const restore=path.join(f.root,'restored','db.sqlite');fs.mkdirSync(path.dirname(restore));fs.copyFileSync(first,restore,fs.constants.COPYFILE_EXCL);const restored=openDatabase(restore);try {assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(restored.prepare('SELECT name FROM projects').get().name,'Backup project');assert.equal(restored.prepare('SELECT count(*) n FROM tasks').get().n,1);assert.equal(restored.prepare('SELECT context_summary FROM project_context').get().context_summary,'Remember');}finally{restored.close();}assert.equal(r.store.project(p.id).name,'Backup project');});
test('backup failure preserves source data',async t=>{const f=fixture(t);f.runtime.service.create({name:'Safe'});const block=path.join(f.root,'file');fs.writeFileSync(block,'occupied');await assert.rejects(()=>backupDatabase(f.runtime.db,block));assert.equal(f.runtime.store.projects().length,1);});
import { spawn } from 'node:child_process';
import net from 'node:net';
test('actual server starts from environment and serves health',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dev-squad-server-'));
 const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=spawn(process.execPath,['src/server.js'],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATABASE_PATH:path.join(root,'db','app.sqlite'),WORKSPACE_DIR:path.join(root,'workspace'),BACKUP_DIR:path.join(root,'backup')},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{if(child.exitCode===null){child.kill();await once(child,'exit');}fs.rmSync(root,{recursive:true,force:true});});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Startup timed out')),10000);child.stdout.on('data',data=>{if(data.toString().includes('listening')){clearTimeout(timer);resolve();}});child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Server exited ${code}`));});});
 const response=await fetch(`http://127.0.0.1:${port}/api/health`);assert.equal(response.status,200);assert.equal((await response.json()).data.status,'ok');
});
test('malformed and oversized JSON return safe client errors',async t=>{
 const f=fixture(t),server=f.runtime.app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const url=`http://127.0.0.1:${server.address().port}/api/projects`;
 for(const [body,status] of [['{broken',400],[JSON.stringify({name:'x'.repeat(40000)}),413]]){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body});assert.equal(response.status,status);assert.ok(!(await response.text()).includes('stack'));}
});
test('dangling workspace junctions are rejected before writes',t=>{const f=fixture(t);const target=path.join(f.root,'gone');fs.mkdirSync(target);fs.symlinkSync(target,path.join(f.config.workspace,'dangling'),process.platform==='win32'?'junction':'dir');fs.rmdirSync(target);assert.throws(()=>f.runtime.workspace.resolve('dangling/file.txt'),/links are not allowed/);});
test('backup directory failures return a safe message',async t=>{const f=fixture(t);const target=path.join(f.root,'occupied');fs.writeFileSync(target,'file');await assert.rejects(()=>backupDatabase(f.runtime.db,target),{message:'Backup failed; existing database and backups were preserved'});});
