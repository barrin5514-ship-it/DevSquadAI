// Use real Chrome and a disposable database: Save message never starts an AI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';
const require=createRequire(import.meta.url),{chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const before=process.argv.includes('--before'),folder=fs.mkdtempSync(path.join(os.tmpdir(),'attachment-refresh-')),out=path.resolve('data/attachment-refresh');fs.mkdirSync(out,{recursive:true});
let runtime,server,browser;const errors=[],requests=[];
try {
 runtime=createApp(loadConfig({DATABASE_PATH:path.join(folder,'db.sqlite'),WORKSPACE_DIR:path.join(folder,'projects'),BACKUP_DIR:path.join(folder,'backups')}),{fetchImpl:async()=>{throw Error('Provider calls forbidden');},messengerAutoPoll:false});
 const s=runtime.team.studio,project=s.project({name:'DISPOSABLE attachment refresh verification'}),chat=s.create(project.id,'',true),root=s.root(project.id).root;
 server=runtime.app.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<body style="background:linear-gradient(30deg,purple,blue);font:40px Arial;color:white">'+Array.from({length:60},(_,i)=>'<p>Attachment refresh fixture '+i+'</p>').join(''));
 const png=await page.screenshot();assert.ok(png.length>4096);await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());page.on('request',r=>{if(r.method()==='POST')requests.push(new URL(r.url()).pathname);});
 if(before)await page.route('**/team-conversations.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(new URL('../src/dashboard/conversations.js',import.meta.url),'utf8').replace('  // File refresh rebuilds this panel; paint the existing draft instead of hiding its files.\n  redrawExtras();\n','')}));
 await page.goto(base+'/team#project/'+project.id+'/chat/'+chat.id);await page.waitForFunction(id=>state.studioDetail?.id===id&&!state.busy,chat.id);
 const input=page.locator('#conversation-attachment');await input.setInputFiles({name:'refresh-fixture.png',mimeType:'image/png',buffer:png});await page.locator('.attachment-thumb').waitFor();
 const refs=()=>fs.existsSync(path.join(root,'references'))?fs.readdirSync(path.join(root,'references')):[];
 const result={browser:'Playwright-controlled local Chrome',pngBytes:png.length,initialThumbnail:true,uploadsBeforeSave:refs().length,cycles:[]};
 await page.waitForFunction(()=>window.workspaceLive?.connected);
 for(let i=0;i<2;i++){await page.waitForTimeout(8000);const refreshed=page.waitForResponse(r=>r.url()===base+'/api/console/studio/projects/'+project.id+'/files'&&r.status()===200);fs.writeFileSync(path.join(root,'refresh-observation.txt'),'Disposable filesystem refresh fixture '+i);await refreshed;await page.waitForTimeout(500);result.cycles.push({thumbnail:await page.locator('.attachment-thumb').count(),filename:await page.locator('.composer-attachments').innerText(),remove:await page.locator('.attachment-remove').count()});}
 result.uploadsAfterRefresh=refs().length;result.refreshSource='two real filesystem changes observed over SSE, followed by automatic project-files GET and redraw';await page.screenshot({path:path.join(out,before?'before.png':'after.png')});
 if(before)assert.ok(result.cycles.every(c=>c.thumbnail===0&&c.remove===0),'Old composer must reproduce the disappearing attachment');
 if(!before){for(const c of result.cycles){assert.equal(c.thumbnail,1);assert.match(c.filename,/refresh-fixture.png/);assert.equal(c.remove,1);}await page.locator('.attachment-remove').click();assert.equal(await page.locator('.attachment-thumb').count(),0);await input.setInputFiles({name:'refresh-fixture.png',mimeType:'image/png',buffer:png});await page.locator('#conversation-message').fill('DISPOSABLE attachment save only; no AI request.');await page.getByRole('button',{name:'Save message',exact:true}).click();await page.waitForFunction(()=>!state.busy&&state.studioDetail.events.some(e=>e.content.attachments?.length));await page.reload();await page.locator('.message-attachment img').waitFor();await page.waitForFunction(()=>document.querySelector('.message-attachment img')?.naturalWidth>0);result.savedImageAfterReload=true;result.uploadsAfterSave=refs().length;assert.equal(result.uploadsAfterSave,1);assert.ok(!requests.some(p=>/\/run$|\/retry$/.test(p)));assert.equal(errors.length,0);await page.screenshot({path:path.join(out,'saved.png')});}
 result.errors=errors;result.posts=requests;result.executions=runtime.db.prepare('SELECT count(*) n FROM studio_executions').get().n;assert.equal(result.executions,0);fs.writeFileSync(path.join(out,before?'before.json':'after.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(runtime){await runtime.team.studio.close();runtime.team.messenger.close();runtime.team.preview.close();runtime.team.fileActions.close();runtime.db.close();}}
