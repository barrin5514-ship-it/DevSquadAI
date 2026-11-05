import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';

// A small DOM fixture exercises layout controls without starting workers or a browser.
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.classes=new Set();this.style={setProperty:(k,v)=>this.attrs[k]=v};this.classList={add:k=>this.classes.add(k),toggle:(k,on)=>on?this.classes.add(k):this.classes.delete(k)};this.events=new Map();}
 append(...items){for(const item of items){item.remove();item.parent=this;this.children.push(item);}}
 prepend(item){item.remove();item.parent=this;this.children.unshift(item);}
 insertBefore(item,before){if(!before)return this.append(item);item.remove();item.parent=this;this.children.splice(this.children.indexOf(before),0,item);}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}}
 replaceChildren(...items){for(const c of [...this.children])c.remove();this.append(...items);}
 setAttribute(k,v){this.attrs[k]=String(v);}
 addEventListener(k,fn){this.events.set(k,fn);}
 removeEventListener(k){this.events.delete(k);}
 setPointerCapture(){}
 get firstChild(){return this.children[0];}
 get lastChild(){return this.children.at(-1);}
 get textContent(){return (this.text||'')+this.children.map(c=>c.textContent).join(' ');}
 set textContent(v){this.text=String(v);this.replaceChildren();}
 querySelector(selector){const direct=selector.startsWith(':scope > ');const name=selector.replace(':scope > ','');return (direct?this.children:all(this).slice(1)).find(x=>name[0]==='.'?x.className?.split(' ').includes(name.slice(1)):false)||null;}
}
const all=n=>[n,...n.children.flatMap(all)];
function fixture(saved='{}',unavailable=false){
 const body=new Element('body'),sidebar=new Element('aside'),bottom=new Element();sidebar.className='sidebar';bottom.className='sidebar-bottom';sidebar.append(bottom);body.append(sidebar);
 const root=new Element(),menu=new Element(),layoutButton=new Element();const ids={content:root,'layout-options':menu,'workspace-layout':layoutButton,'page-label':new Element()};menu.hidden=true;body.append(root,menu,layoutButton);
 const storage=new Map([['devsquad.workspace.layout.v1',saved]]),listeners={};
 const document={body,createElement:t=>new Element(t),querySelector:s=>s==='.sidebar'?sidebar:null,getElementById:id=>ids[id]||all(body).find(n=>n.id===id),addEventListener:(k,fn)=>listeners[k]=fn};
 const context=vm.createContext({document,window:{},localStorage:{getItem:k=>{if(unavailable)throw Error('disabled');return storage.get(k);},setItem:(k,v)=>{if(unavailable)throw Error('disabled');storage.set(k,v);}}});
 vm.runInContext(fs.readFileSync(new URL('../src/dashboard/workspace-shell.js',import.meta.url),'utf8'),context);
 return {body,root,menu,layoutButton,sidebar,storage,listeners,render:state=>context.window.workspaceShell.render(state),get:(name)=>all(body).find(n=>n.attrs['aria-label']===name)};
}
test('layout controls persist, reset, and close by Escape without provider access',()=>{
 const f=fixture();f.layoutButton.onclick();assert.equal(f.menu.hidden,false);f.menu.children.find(b=>b.textContent==='Show Live preview').onclick();assert.equal(JSON.parse([...f.storage.values()][0]).previewClosed,false);f.listeners.keydown({key:'Escape'});assert.equal(f.menu.hidden,true);f.menu.children.find(b=>b.textContent==='Reset layout').onclick();assert.equal(JSON.parse([...f.storage.values()][0]).previewClosed,true);
});
test('keyboard and pointer resizing clamp widths and clean up pointer handlers',()=>{
 const f=fixture(),bar=f.get('Resize sidebar');bar.onkeydown({key:'ArrowRight',preventDefault(){}});assert.equal(bar.attrs['aria-valuenow'],'246');bar.onkeydown({key:'End',preventDefault(){}});assert.equal(bar.attrs['aria-valuenow'],'320');bar.onpointerdown({button:0,clientX:100,pointerId:1});bar.events.get('pointermove')({clientX:-1000});assert.equal(bar.attrs['aria-valuenow'],'180');bar.events.get('pointerup')();assert.equal(bar.events.size,0);
});
test('invalid or unavailable saved preferences do not break the workspace',()=>{
 for(const value of ['bad json','null','{"sidebar":99999,"previewClosed":"yes"}']){const f=fixture(value);assert.ok(Number.parseInt(f.body.attrs['--workspace-sidebar'])<=320);assert.ok(f.body.classes.has('preview-closed'));}assert.doesNotThrow(()=>fixture('{}',true));
});
test('focus presets preserve manual sizes, persist selection, restore balanced panes and still allow resizing',()=>{const f=fixture('{"sidebar":246,"development":332,"preview":356,"output":180}');for(const [label,mode] of [['Conversation focus','conversation'],['Development focus','development'],['Preview focus','preview'],['Balanced workspace','balanced']]){f.menu.children.find(b=>b.textContent===label).onclick();const saved=JSON.parse(f.storage.get('devsquad.workspace.layout.v1'));assert.equal(saved.mode,mode);assert.equal(saved.development,332);assert.equal(saved.preview,356);assert.equal(saved.sidebar,246);}let saved=JSON.parse(f.storage.get('devsquad.workspace.layout.v1'));assert.equal(saved.developmentClosed,false);assert.equal(saved.previewClosed,false);const restored=fixture(JSON.stringify(saved));assert.ok(restored.body.classes.has('layout-balanced'));restored.get('Resize sidebar').onkeydown({key:'ArrowRight',preventDefault(){}});saved=JSON.parse(restored.storage.get('devsquad.workspace.layout.v1'));assert.equal(saved.mode,'custom');assert.equal(saved.sidebar,262);});
test('shell reuses original controls, keeps acceptance and Stop, and shows honest pending panes',()=>{
 const f=fixture(),heading=new Element(),composer=new Element(),grid=new Element(),projects=new Element(),history=new Element(),accept=new Element('button'),stop=new Element('button');heading.className='page-heading';composer.className='panel';grid.className='grid';accept.textContent='Accept completed work';stop.textContent='Stop';history.append(accept);grid.append(projects,history);f.root.append(heading,composer,stop,grid);
 f.render({view:'demo',studioProject:'p',studioChat:'c',data:{studio:{projects:[{id:'p',name:'Real project'}],chats:[{id:'c',project_id:'p',title:'Real task',status:'awaiting_owner',state:{}}]}}});
 assert.ok(all(f.root).includes(accept));assert.ok(all(f.root).includes(stop));assert.ok(all(f.root).includes(composer));assert.ok(all(f.sidebar).includes(projects));assert.match(f.root.textContent,/Preview is not connected yet/);assert.match(f.root.textContent,/Status: awaiting owner/);assert.equal(all(f.root).filter(n=>n.tag==='iframe').length,0);
 f.render({view:'approvals'});assert.ok(!f.body.classes.has('coding-workspace'));
});
test('normal dashboard serves shell asset under existing same-origin policy without provider calls',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workspace-shell-'));let calls=0;const r=createApp(loadConfig({DATABASE_PATH:path.join(dir,'main.sqlite'),WORKSPACE_DIR:path.join(dir,'projects'),BACKUP_DIR:path.join(dir,'backups')}),{fetchImpl:async()=>{calls++;throw Error('No outbound calls');}}),server=r.app.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await r.team.studio.close();await new Promise(resolve=>server.close(resolve));r.db.close();fs.rmSync(dir,{recursive:true,force:true});});const base='http://127.0.0.1:'+server.address().port;
 const response=await fetch(base+'/team'),html=await response.text();assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);assert.match(html,/src="\/team-workspace.js" defer/);const asset=await fetch(base+'/team-workspace.js');assert.equal(asset.status,200);assert.match(await asset.text(),/window.workspaceShell/);assert.equal(calls,0);
});

test('all secondary pages retain one studio shell and shared navigation without constructing a second workspace',()=>{const f=fixture();f.body.classes.delete('coding-workspace');for(const view of ['projects','team','tasks','tools','history','workspace','approvals','activity','settings','styles','zapier']){f.render({view,data:{studio:{projects:[],chats:[]}}});assert.ok(f.body.classes.has('studio-app'));assert.ok(f.body.classes.has('workspace-secondary'));assert.ok(!f.body.classes.has('coding-workspace'));assert.equal(all(f.root).some(n=>n.className==='workspace-canvas'),false);}});
