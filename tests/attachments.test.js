import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';

const png=(size=5000)=>{const b=Buffer.alloc(size);Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(b);return b;};
async function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'attachments-')),runtime=createApp(loadConfig({DATABASE_PATH:path.join(root,'data/main.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup')}),{studioOptions:{schedule:()=>{}}}),app=runtime.app;
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,studio=runtime.team.studio,project=studio.project({name:'Attachment fixture'});fs.writeFileSync(path.join(studio.root(project.id).root,'index.html'),'<!doctype html><title>Attachment fixture</title>');
 const session=await request(base+'/api/console/session');const token=session.body.data.token;
 t.after(async()=>{await studio.close();runtime.team.messenger.close();runtime.team.fileActions.close();runtime.team.preview.close();runtime.db.close();server.closeAllConnections();server.close();fs.rmSync(root,{recursive:true,force:true});});
 return {base,token,studio,project,root,preview:runtime.team.preview};
}
async function request(url,{method='GET',headers={},body}={}){const response=await fetch(url,{method,headers,body});const type=response.headers.get('content-type')||'';return {status:response.status,headers:response.headers,body:type.includes('json')?await response.json():Buffer.from(await response.arrayBuffer())};}
async function upload(f,name,bytes){const response=await fetch(f.base+'/api/console/studio/projects/'+f.project.id+'/attachments',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Dashboard-Token':f.token,'X-File-Name':encodeURIComponent(name)},body:bytes});const value=await response.json();return {status:response.status,value};}
test('real PNG and MP4 attachments are stored under references and blocked from static preview',async t=>{
 const f=await fixture(t),image=await upload(f,'screenshot.png',png(12000));assert.equal(image.status,201);assert.match(image.value.data.attachment.path,/^references\/[a-f0-9-]{36}\.png$/);assert.equal(image.value.data.attachment.kind,'image');assert.equal(image.value.data.attachment.bytes,12000);
 const video=await upload(f,'recording.mp4',Buffer.concat([Buffer.from([0,0,0,0x18]),Buffer.from('ftypisom'),Buffer.alloc(8000)]));assert.equal(video.status,201);assert.equal(video.value.data.attachment.kind,'video');
 const file=path.join(f.studio.root(f.project.id).root,image.value.data.attachment.path);assert.ok(fs.existsSync(file));
 const served=await request(f.base+'/api/console/studio/projects/'+f.project.id+'/references/'+path.basename(file),{headers:{'X-Dashboard-Token':f.token}});assert.equal(served.status,200);assert.equal(served.body.length,12000);
 const value=await f.preview.authorizeStatic(f.project.id,'http://127.0.0.1:3000'),session=f.preview.current(f.project.id,value.generation);const outer=await new Promise((ok,no)=>{const req=http.get({hostname:'127.0.0.1',port:session.server.address().port,path:'/references/'+path.basename(file),headers:{Host:new URL(session.origin).host}},res=>{res.resume();res.on('end',()=>ok(res.statusCode));});req.on('error',no);});assert.equal(outer,403);
 const snapshot=f.studio.root(f.project.id).snapshot();assert.equal(snapshot.files.some(x=>x.path.startsWith('references/')),false);
 const chat=f.studio.create(f.project.id,'Attachment message fixture'),saved=f.studio.message(chat.id,{text:'Build this image',attachments:[image.value.data.attachment],references:[],submissionId:crypto.randomUUID()}),detail=f.studio.detail(saved.id),event=detail.events.find(e=>Array.isArray(e.content?.attachments)&&e.content.attachments.length);assert.ok(event);assert.equal(event.content.attachments[0].path,image.value.data.attachment.path);assert.equal(event.content.attachments[0].kind,'image');
});
test('upload rejects oversize images, fake images, traversal names and unsupported types',async t=>{
 const f=await fixture(t);
 assert.equal((await upload(f,'huge.png',png(25*1024*1024+1))).status,413);
 assert.equal((await upload(f,'fake.png',Buffer.from('not a png'))).status,415);
 assert.equal((await upload(f,'../escape.png',png())).status,400);
 assert.equal((await upload(f,'notes.txt',Buffer.from('hello'))).status,415);
});
