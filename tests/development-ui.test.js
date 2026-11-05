import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
class Node{
 constructor(tag,text=''){this.tagName=tag;this.text=text;this.children=[];this.attrs={};this.dataset={};this.classList={toggle(){},remove(){}};}
 append(...nodes){for(const n of nodes.filter(Boolean)){n.remove();n.parent=this;this.children.push(n);}}
 replaceChildren(...nodes){for(const n of this.children)n.parent=null;this.children=[];this.append(...nodes);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 insertBefore(n,before){if(!before)return this.append(n);n.remove();n.parent=this;this.children.splice(this.children.indexOf(before),0,n);}
 setAttribute(k,v){this.attrs[k]=String(v);}
 get lastChild(){return this.children.at(-1);}
 get textContent(){return this.text+this.children.map(n=>n.textContent).join('');}
 set textContent(v){this.text=String(v);this.children=[];}
 focus(){}
 querySelector(selector){return all(this).find(n=>selector[0]==='.'&&n.className?.split(' ').includes(selector.slice(1)))||null;}
}
const all=n=>[n,...n.children.flatMap(all)],tick=()=>new Promise(setImmediate);
async function fixture(){
 const body=new Node('body'),sidebar=new Node('aside'),pane=new Node('section'),header=new Node('header'),close=new Node('button');header.className='workspace-pane-head';header.append(close);pane.append(header);body.append(sidebar,pane);const calls=[];
 const document={body,createElement:t=>new Node(t),createTextNode:t=>new Node('#text',t),getElementById:id=>all(body).find(n=>n.id===id)||null,querySelector:()=>null};
 const el=(tag,cls,text)=>{const n=new Node(tag,text===undefined?'':String(text));n.className=cls||'';return n;},button=(label,fn)=>{const n=el('button','',label);n.onclick=fn;return n;};
 const state={view:'demo',studioProject:'p',studioChat:'c',data:{studio:{projects:[{id:'p',name:'Project P',folder:'C:/Fixtures/Project P'},{id:'q',name:'Project Q',folder:'C:/Fixtures/Project Q'}],chats:[{id:'c',version:1}]}}};
 const api=async(route)=>{calls.push(route);const project=route.split('/')[3];if(route.includes('/files'))return {entries:[{path:'notes.txt',type:'file',supported:true}],repository:{name:project,available:false,reason:'No Git repository',changes:[]}};if(route.includes('/file?'))return {path:'notes.txt',content:'Saved file from '+project,summary:{overview:'Project notes',parts:[]}};return {project:{id:project,name:project},chat:{id:'c',title:'Reviewed task',status:'awaiting_owner',state:{goal:'Goal',roles:{},review:null,tests:null,problems:[]},events:[{kind:'independent_review',agent:'reviewer',content:{decision:'approved',summary:'Recorded review',findings:[],artifactHash:'hash'}}],revisions:[{id:'revision',relative_path:'notes.txt',previous_hash:'before',next_hash:'after'}]},workers:[],registry:[],acceptance:{eligible:true,reason:'Current evidence'},capabilities:{accept:true}};};
 const visiblePanels=[];const context=vm.createContext({window:{workspaceShell:{showDevelopment(){visiblePanels.push("development");}}},document,el,button,api,refresh:async()=>{},p:(text,cls)=>el('p',cls,text),badge:text=>el('span','',text),callout:text=>el('aside','',text),add:(n,...children)=>{n.append(...children);return n;},date:v=>v||'No date',Date});
 for(const file of ['code-view.js','development.js'])vm.runInContext(fs.readFileSync(new URL('../src/dashboard/'+file,import.meta.url),'utf8'),context);
 const mount=()=>context.window.workspaceDevelopment.mount(state,pane,sidebar);mount();await tick();
 return {state,pane,sidebar,calls,mount,visiblePanels,group(){const group=el('details','');group.id='workspace-explorer-group';sidebar.append(group);return group;},tab:async name=>{await all(pane).find(n=>n.attrs.role==='tab'&&n.textContent===name).onclick();},open:async()=>all(sidebar).find(n=>n.attrs['aria-label']==='Open file notes.txt').onclick()};
}
test('review panel shows evidence and chat feedback instructions without decision buttons or acceptance dispatch',async()=>{const f=await fixture();await f.tab('Review');assert.match(f.pane.textContent,/Recorded review/);assert.match(f.pane.textContent,/Modified: notes.txt/);assert.match(f.pane.textContent,/Type feedback in the chat/);const buttons=all(f.pane).filter(n=>n.tagName==='button').map(n=>n.textContent);for(const label of ['Approve','Reject','Request Changes','Accept completed work'])assert.ok(!buttons.includes(label));assert.ok(!f.calls.some(c=>/accept|run|messages/.test(c)));});
test('selected project file survives switching development tabs',async()=>{const f=await fixture();await f.open();assert.match(f.pane.textContent,/Saved file from p/);await f.tab('Task');await f.tab('Context');assert.match(f.pane.textContent,/Saved file from p/);assert.equal(f.calls.filter(c=>c.includes('/file?')).length,1);});
test('project switch clears the prior selected file from the visible context',async()=>{const f=await fixture();await f.open();f.state.studioProject='q';f.state.studioChat=null;f.mount();assert.doesNotMatch(f.pane.textContent,/Saved file from p/);await tick();await f.tab('Context');assert.doesNotMatch(f.pane.textContent,/Saved file from p/);});

test('asynchronous explorer refresh stays inside its collapsible sidebar group',async()=>{const f=await fixture(),group=f.group();await f.open();assert.ok(group.children.some(n=>n.id==='workspace-explorer'));assert.match(group.textContent,/notes.txt/);assert.match(f.pane.textContent,/Saved file from p/);});

test('explorer and context show the selected backend-verified root and switch it with the project',async()=>{const f=await fixture();assert.match(f.sidebar.textContent,/C:\/Fixtures\/Project P/);await f.tab('Context');assert.match(f.pane.textContent,/Root folder: C:\/Fixtures\/Project P/);f.state.studioProject='q';f.state.studioChat=null;f.mount();await tick();await f.tab('Context');assert.match(f.pane.textContent,/Root folder: C:\/Fixtures\/Project Q/);assert.doesNotMatch(f.pane.textContent,/C:\/Fixtures\/Project P/);});

test("opening a project file reveals the development panel even when conversation focus hid it",async()=>{const f=await fixture();assert.equal(f.visiblePanels.length,0);await f.open();assert.deepEqual(f.visiblePanels,["development"]);assert.match(f.pane.textContent,/Saved file from p/);assert.ok(!f.calls.some(c=>/run|messages|accept/.test(c)));});
