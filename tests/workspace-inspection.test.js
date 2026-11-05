import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
import {fileTree,projectFile,repository,gitChange,revision,inspection} from '../src/services/workspace-inspection.js';
import {hashText} from '../src/services/project-files.js';

const gitExe=process.platform==='win32'?'C:/Program Files/Git/cmd/git.exe':'/usr/bin/git';
async function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workspace-inspection-'));let calls=0;const packets=[];
 const workers={call:async(agent,packet)=>{calls++;packets.push(packet);return {report:'MOCK report only',files:packet.phase==='builder'?[{path:'add.mjs',content:'export const add=(a,b)=>a+b;'}]:[],...(packet.phase==='reviewer'?{review:{...packet.reviewBinding,decision:'approved',summary:'MOCK review of supplied evidence',findings:[]}}:{})};},tests:async()=>({executed:true,passed:true,count:1,fixtureOnly:true,summary:'MOCK test evidence'})};
 const r=createApp(loadConfig({DATABASE_PATH:path.join(dir,'main.sqlite'),WORKSPACE_DIR:path.join(dir,'projects'),BACKUP_DIR:path.join(dir,'backups'),DEEPSEEK_API_KEY:'fixture-private-key-123456'}),{fetchImpl:async()=>{throw Error('No network permitted');},studioOptions:{workers}}),studio=r.team.studio,p=studio.project({name:'Fixture project'}),c=studio.create(p.id,'Build a fixture utility'),root=studio.root(p.id).root;
 t.after(async()=>{await studio.close();r.team.messenger.close();r.db.close();fs.rmSync(dir,{recursive:true,force:true});});
 return {r,studio,p,c,root,dir,packets,get calls(){return calls;}};
}
function git(root,args){return execFileSync(gitExe,['-c','safe.directory='+root,'-c','user.name=UI Fixture','-c','user.email=fixture@example.invalid',...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:5000,stdio:['ignore','pipe','pipe']});}
test('real tree includes nested/empty directories and excludes private files and hard links',async t=>{
 const f=await fixture(t);fs.mkdirSync(path.join(f.root,'src'));fs.mkdirSync(path.join(f.root,'empty'));fs.writeFileSync(path.join(f.root,'src/add.js'),'export const add=(a,b)=>a+b;');fs.writeFileSync(path.join(f.root,'.env'),'private');fs.mkdirSync(path.join(f.root,'data'));fs.writeFileSync(path.join(f.root,'data/private.sqlite'),'private');fs.writeFileSync(path.join(f.dir,'outside.txt'),'outside');fs.linkSync(path.join(f.dir,'outside.txt'),path.join(f.root,'linked.txt'));
 const tree=fileTree(f.studio,f.p.id);assert.ok(tree.entries.some(e=>e.path==='empty'&&e.type==='directory'));assert.ok(tree.entries.some(e=>e.path==='src/add.js'));assert.ok(!tree.entries.some(e=>/\.env|private|linked/.test(e.path)));assert.equal(tree.repository.available,false);assert.equal(f.calls,0);
});
test('viewer rejects traversal, outside paths, credentials, binary and oversized files without returning content',async t=>{
 const f=await fixture(t);for(const relative of ['../outside.txt','.env','.git/config','C:/owner.txt','src/../../outside.txt'])assert.throws(()=>projectFile(f.studio,f.p.id,relative));fs.writeFileSync(path.join(f.root,'private.js'),'const value="fixture-private-key-123456";');assert.throws(()=>projectFile(f.studio,f.p.id,'private.js'),/Credential|credential/);fs.writeFileSync(path.join(f.root,'large.js'),'x'.repeat(131073));assert.throws(()=>projectFile(f.studio,f.p.id,'large.js'),/128 KB/);fs.writeFileSync(path.join(f.root,'binary.txt'),'a\0b');assert.throws(()=>projectFile(f.studio,f.p.id,'binary.txt'),/Binary/);assert.equal(f.calls,0);
});
test('Git reports its actual branch plus added, modified and deleted files using real committed contents',async t=>{
 const f=await fixture(t);git(f.root,['init','-b','fixture-main']);fs.writeFileSync(path.join(f.root,'add.js'),'export const add=(a,b)=>a-b;\n');fs.writeFileSync(path.join(f.root,'remove.txt'),'old\n');git(f.root,['add','.']);git(f.root,['commit','-m','Fixture baseline']);fs.writeFileSync(path.join(f.root,'add.js'),'export const add=(a,b)=>a+b;\n');fs.unlinkSync(path.join(f.root,'remove.txt'));fs.writeFileSync(path.join(f.root,'new.txt'),'new\n');
 const repo=repository(f.studio,f.p.id);assert.equal(repo.available,true);assert.equal(repo.branch,'fixture-main');assert.equal(repo.latestCommit.subject,'Fixture baseline');assert.ok(repo.latestCommit.hash);assert.equal(repo.changes.find(c=>c.path==='new.txt').untracked,true);assert.deepEqual(new Set(repo.changes.map(c=>c.status)),new Set(['added','modified','deleted']));const modified=gitChange(f.studio,f.p.id,'add.js');assert.match(modified.before,/a-b/);assert.match(modified.after,/a\+b/);assert.equal(gitChange(f.studio,f.p.id,'remove.txt').after,null);assert.equal(gitChange(f.studio,f.p.id,'new.txt').before,null);assert.equal(f.calls,0);
});
test('viewer does not borrow a parent repository or enable an external Git monitor',async t=>{
 const f=await fixture(t);git(f.root,['init','-b','bounded']);git(f.root,['config','core.fsmonitor','untrusted-monitor-not-to-run']);assert.equal(repository(f.studio,f.p.id).available,true);const nested=path.join(f.root,'nested');fs.mkdirSync(nested);const p=f.studio.project({name:'Nested fixture',folder:nested});assert.equal(repository(f.studio,p.id).available,false);assert.equal(f.calls,0);
});
test('custom Git filters and includes stop metadata inspection instead of running helpers',async t=>{
 const f=await fixture(t);git(f.root,['init','-b','bounded']);git(f.root,['config','filter.fixture.clean','a-helper-that-must-never-run']);const result=repository(f.studio,f.p.id);assert.equal(result.available,false);assert.match(result.reason,/custom filters/);assert.equal(f.calls,0);
 const config=path.join(f.root,'.git/config'),before=fs.readFileSync(config,'utf8');assert.match(before,/filter/);assert.equal(fs.readFileSync(config,'utf8'),before);
});
test('saved revision reads are bound to the actual session and verified content hashes',async t=>{
 const f=await fixture(t),r={id:crypto.randomUUID(),chatId:f.c.id,path:'add.mjs',before:'// before',after:'export const n=1;'};f.r.db.prepare('INSERT INTO studio_revisions VALUES (?,?,?,?,?,?,?,?)').run(r.id,r.chatId,r.path,r.before,r.after,hashText(r.before),hashText(r.after),new Date().toISOString());const result=revision(f.studio,f.c.id,r.id);assert.equal(result.before,r.before);assert.equal(result.after,r.after);const same=crypto.randomUUID();f.r.db.prepare('INSERT INTO studio_revisions VALUES (?,?,?,?,?,?,?,?)').run(same,r.chatId,r.path,r.after,r.after,hashText(r.after),hashText(r.after),new Date().toISOString());assert.equal(revision(f.studio,f.c.id,same).status,'unchanged');const other=f.studio.create(f.p.id,'Other');assert.throws(()=>revision(f.studio,other.id,r.id),/does not belong/);const bad=crypto.randomUUID();f.r.db.prepare('INSERT INTO studio_revisions VALUES (?,?,?,?,?,?,?,?)').run(bad,r.chatId,r.path,null,r.after,null,'tampered',new Date().toISOString());assert.throws(()=>revision(f.studio,f.c.id,bad),/integrity/);
});
test('review eligibility uses current independent evidence and rejects changed reviewed files',async t=>{
 const f=await fixture(t);f.studio.start(f.p.id,{chatId:f.c.id,requestId:crypto.randomUUID()});await new Promise(setImmediate);await f.studio.wait(f.c.id);const before=inspection(f.studio,f.p.id,f.c.id);assert.equal(before.acceptance.eligible,true);assert.equal(before.capabilities.reject,false);assert.equal(before.chat.status,'awaiting_owner');assert.equal(f.calls,3);fs.appendFileSync(path.join(f.root,'add.mjs'),'\n// owner changed');assert.equal(inspection(f.studio,f.p.id,f.c.id).acceptance.eligible,false);assert.throws(()=>f.studio.accept(f.c.id),/Current independent/);assert.equal(f.studio.get(f.c.id).status,'awaiting_owner');
});
test('inspection keeps registry, session context and history scoped, without provider or CLI calls',async t=>{
 const f=await fixture(t),other=f.studio.project({name:'Other project'});assert.throws(()=>inspection(f.studio,other.id,f.c.id),/does not belong/);const result=inspection(f.studio,f.p.id,f.c.id);assert.equal(result.project.id,f.p.id);assert.equal(result.workers.length,3);assert.ok(result.registry.some(a=>a.id==='orchestrator'));assert.ok(result.workers.every(a=>a.connection.includes('not checked')));assert.equal(f.calls,0);assert.equal(f.studio.detail(f.c.id).events.length,1);
});
test('same-origin APIs serve files and revision data read-only while acceptance remains protected',async t=>{
 const f=await fixture(t);fs.writeFileSync(path.join(f.root,'notes.md'),'Fixture notes');const server=f.r.app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port;
 const good=await fetch(base+'/api/console/studio/projects/'+f.p.id+'/file?path=notes.md');assert.equal(good.status,200);assert.equal((await good.json()).data.content,'Fixture notes');const bad=await fetch(base+'/api/console/studio/projects/'+f.p.id+'/file?path=..%2Foutside.txt');assert.equal(bad.status,403);const response=await fetch(base+'/api/console/studio/chats/'+f.c.id+'/accept',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,403);assert.equal(f.calls,0);
});
test('chat feedback after review creates a linked Builder task without accepting or rewriting the reviewed task',async t=>{
 const f=await fixture(t);f.studio.start(f.p.id,{chatId:f.c.id,requestId:crypto.randomUUID()});await new Promise(setImmediate);await f.studio.wait(f.c.id);const original=f.studio.detail(f.c.id),submissionId=crypto.randomUUID(),body={text:'Please improve the invalid-input checks',submissionId};
 const next=f.studio.message(original.id,body);assert.notEqual(next.id,original.id);assert.equal(next.status,'ready');assert.equal(next.state.phase,'builder');assert.equal(next.state.review,null);assert.equal(next.events.find(e=>e.kind==='message').content.sourceChatId,original.id);assert.deepEqual(f.studio.detail(original.id),original);assert.equal(f.calls,3);
 assert.equal(f.studio.message(original.id,body).id,next.id);assert.equal(f.r.db.prepare('SELECT count(*) n FROM studio_chats').get().n,2);assert.throws(()=>f.studio.message(original.id,{...body,text:'Different feedback'}),/different content/);
 f.studio.start(f.p.id,{chatId:next.id,requestId:crypto.randomUUID()});await new Promise(setImmediate);await f.studio.wait(next.id);assert.equal(f.packets[3].phase,'builder');assert.equal(f.packets[3].priorReviewContext[0].sourceChatId,original.id);assert.equal(f.packets[3].priorReviewContext[0].review.artifactHash,original.state.review.artifactHash);assert.equal(f.studio.get(original.id).status,'awaiting_owner');assert.equal(f.studio.get(next.id).status,'awaiting_owner');
});
test('invalid feedback cannot fork a reviewed task or consume its previous review',async t=>{
 const f=await fixture(t);f.studio.start(f.p.id,{chatId:f.c.id,requestId:crypto.randomUUID()});await new Promise(setImmediate);await f.studio.wait(f.c.id);const original=f.studio.detail(f.c.id);assert.throws(()=>f.studio.message(original.id,{text:'Bad attachment',submissionId:crypto.randomUUID(),attachments:[{name:'.env',content:'private'}]}));assert.equal(f.r.db.prepare('SELECT count(*) n FROM studio_chats').get().n,1);assert.deepEqual(f.studio.detail(original.id),original);
});

test('Git inspection rejects object-store junctions and shared metadata without following outside files',async t=>{const f=await fixture(t);git(f.root,['init','-b','bounded']);const outside=path.join(f.dir,'outside-objects');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'private.txt'),'DO_NOT_READ');fs.symlinkSync(outside,path.join(f.root,'.git','objects','outside-link'),process.platform==='win32'?'junction':'dir');const result=repository(f.studio,f.p.id);assert.equal(result.available,false);assert.match(result.reason,/metadata contains links/);fs.writeFileSync(path.join(f.root,'.git','commondir'),outside);assert.match(repository(f.studio,f.p.id).reason,/Shared Git directories/);assert.equal(f.calls,0);assert.equal(fs.readFileSync(path.join(outside,'private.txt'),'utf8'),'DO_NOT_READ');});
