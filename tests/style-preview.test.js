import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
test('preview serves identical fictional sample screens, isolated styles and no live requests',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'devsquad-preview-'));let calls=0;
 const r=createApp(loadConfig({DATABASE_PATH:path.join(dir,'db.sqlite'),WORKSPACE_DIR:path.join(dir,'workspace'),BACKUP_DIR:path.join(dir,'backups')}),{fetchImpl:async()=>{calls++;throw Error('No provider allowed');}}),server=r.app.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await new Promise(resolve=>server.close(resolve));r.db.close();fs.rmSync(dir,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+server.address().port,redirect=await fetch(base+'/team/style-preview',{redirect:'manual'}),response=await fetch(base+'/team/style-preview/content'),html=await response.text();assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'/team#styles');assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/script-src 'none'/);assert.match(html,/fictional/);assert.doesNotMatch(html,/<script|<form|\/api\//i);
 const screens=['dark','light','bold'].map(theme=>{const marker='<div class="theme-'+theme+'">',start=html.indexOf(marker)+marker.length,end=html.indexOf('</main></div>',start);assert.ok(start>=marker.length&&end>start);return html.slice(start,end);});assert.equal(new Set(screens).size,1);
 for(const text of ['Sample navigation','Orbit calculator kit','VERIFIED','ACCEPTED','Your AI team','In plain English'.toUpperCase(),'Number.isFinite'])assert.ok(screens[0].includes(text));
 assert.equal((await fetch(base+'/team-style-preview.css')).status,200);const regular=await(await fetch(base+'/team')).text();assert.doesNotMatch(regular,/team-style-preview.css/);assert.equal(calls,0);assert.equal(r.db.prepare('SELECT count(*) n FROM projects').get().n,0);
});
