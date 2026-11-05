import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';

// Exercise the real composer handlers. No browser network or worker can run here.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.style={};this.classList={add(){},toggle(){}};this.text='';}
 append(...items){for(const n of items){n.remove?.();n.parent=this;this.children.push(n);}}
 replaceChildren(...items){for(const n of this.children)n.parent=null;this.children=[];this.append(...items);}
 insertBefore(n,before){if(!before)return this.append(n);n.remove();n.parent=this;this.children.splice(this.children.indexOf(before),0,n);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 set textContent(v){this.text=String(v);this.children=[];}
 get textContent(){return this.text+this.children.map(n=>n.textContent??'').join(' ');}
 setAttribute(k,v){this.attributes[k]=String(v);}
 removeAttribute(){}
 addEventListener(){}
 focus(){}
 querySelector(selector){return all(this).find(n=>selector==='nav'?n.tagName==='nav':selector[0]==='.'&&n.className?.split(' ').includes(selector.slice(1)))||null;}
}
const all=n=>[n,...n.children.flatMap(all)];
function fixture({status='ready',empty=false,events=[],hasReview=false,readOnly=false,teamAvailable=false}={}){
 const body=new Element('body'),main=new Element('main'),sidebar=new Element('aside'),nav=new Element('nav'),bottom=new Element('div');bottom.className='sidebar-bottom';sidebar.append(nav,bottom);body.append(main,sidebar);const nodes=new Map();
 const document={body,createElement:t=>new Element(t),querySelectorAll:()=>[],getElementById:id=>all(body).find(n=>n.id===id)||nodes.get(id)||null};for(const id of ['refresh','guide-button','close-guide','notice'])nodes.set(id,new Element('div'));
 const calls=[],context=vm.createContext({document,window:{history:{replaceState(){}},location:{hash:''},addEventListener(){},scrollTo(){}},crypto:{randomUUID},setTimeout:()=>0,clearTimeout(){},fetch:()=>new Promise(()=>{})});
 vm.runInContext(fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8'),context);context.calls=calls;context.hasReview=hasReview;context.main=main;context.sidebar=sidebar;context.inputEvents=events;
 vm.runInContext(`state.busy=false;state.studioProject='p';state.studioChat=${empty?'null':"'c'"};state.data={studio:{projects:[{id:'p',name:'Project',agentChangesAllowed:${!readOnly}}],chats:${empty?'[]':"[{id:'c',project_id:'p',status:'"+status+"',title:'Saved chat',state:{goal:'Existing goal',roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'}}}]"},workers:{model:'Configured model'}}};state.studioDetail={id:'c',events:inputEvents};api=async(route,body)=>{calls.push({route,body});return {id:route.endsWith('/messages')?(hasReview?'followup-c':route.split('/')[3]):'new-chat',events:[]};};refresh=async()=>{};notify=()=>{};draw=()=>{};`,context);
 if(hasReview)vm.runInContext("state.data.studio.chats[0].state.review={artifactHash:'reviewed-hash'};state.studioDetail.events=[{id:1,kind:'independent_review',content:{artifactHash:'reviewed-hash',decision:'approved',summary:'Recorded review'}}];",context);
 if(teamAvailable)context.window.workspaceRoles={mount(_s,area){const panel=new Element('details');panel.open=false;area.append(panel);return panel;}};vm.runInContext(fs.readFileSync(new URL('../src/dashboard/conversations.js',import.meta.url),'utf8'),context);vm.runInContext('window.workspaceConversation.mount(state,main,sidebar)',context);
 const find=t=>all(main).find(n=>n.tagName===t),button=name=>all(main).find(n=>n.tagName==='button'&&n.textContent===name);
 return {calls,main,context,button,write(text){find('textarea').value=text;find('textarea').oninput();},submit:async name=>find('form').onsubmit({preventDefault(){},submitter:button(name)})};
}
test('Send saves one message then dispatches the existing project runner once',async()=>{
 const f=fixture();f.write('Build this utility');await f.submit('Send');assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/messages','/studio/projects/p/run']);assert.equal(f.calls[0].body.text,'Build this utility');assert.equal(f.calls[1].body.chatId,'c');assert.ok(f.calls[1].body.requestId);assert.match(f.main.textContent,/paid DeepSeek usage/);
});
test('Save message persists locally without a worker request',async()=>{
 const f=fixture();f.write('Keep this local');await f.submit('Save message');assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/messages']);assert.equal(f.calls[0].body.text,'Keep this local');
});
test('first local message creates its project-bound session before saving, without dispatch',async()=>{
 const f=fixture({empty:true});f.write('First prompt');await f.submit('Save message');assert.deepEqual(f.calls.map(c=>c.route),['/studio/projects/p/sessions','/studio/chats/new-chat/messages']);
});
test('Send with no new text resumes existing work without inventing another owner message',async()=>{
 const f=fixture();await f.submit('Send');assert.deepEqual(f.calls.map(c=>c.route),['/studio/projects/p/run']);
});
test('active/stopping sessions and reviewed states without a valid review cannot dispatch',async()=>{
 for(const status of ['running','stopping','awaiting_owner','accepted']){const f=fixture({status});assert.equal(f.button('Send').disabled,true);await f.submit('Send');assert.equal(f.calls.length,0);}
});
test('messages retain chronological event order and render saved agent reports without fake streaming',()=>{
 const f=fixture({events:[{id:3,kind:'worker_report',agent:'deepseek',content:{report:'Actual saved report'}},{id:1,kind:'task',content:{text:'Original owner prompt'}},{id:2,kind:'worker_started',agent:'deepseek',content:{}}]});assert.deepEqual(all(f.main).filter(n=>n.className?.startsWith('chat-message ')).map(n=>n.dataset.eventId),[1,2,3]);assert.match(f.main.textContent,/Actual saved report/);assert.doesNotMatch(f.main.textContent,/The assigned agent is working/);assert.equal(f.calls.length,0);
});
test('feedback after a valid review sends the new task ID to Builder dispatch without accepting the source',async()=>{
 const f=fixture({status:'awaiting_owner',hasReview:true});assert.equal(f.button('Send').disabled,false);f.write('Please correct the edge cases');await f.submit('Send');assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/messages','/studio/projects/p/run']);assert.equal(f.calls[1].body.chatId,'followup-c');assert.ok(!f.calls.some(c=>c.route.includes('/accept')));assert.equal(vm.runInContext('state.data.studio.chats[0].status',f.context),'awaiting_owner');
});
test('empty Send after review cannot silently rerun the reviewed task',async()=>{
 const f=fixture({status:'awaiting_owner',hasReview:true});await f.submit('Send');assert.equal(f.calls.length,0);assert.match(f.main.textContent,/Write a message first/);
});

test('mock command events never claim that the real isolated runner executed',()=>{const f=fixture({events:[{id:1,kind:'execution_started',created_at:'2026-11-04',content:{fixtureOnly:true}},{id:2,kind:'execution_finished',created_at:'2026-11-04',content:{fixtureOnly:true,exit:0,durationMs:5}}]});assert.match(f.main.textContent,/MOCK ONLY/);assert.match(f.main.textContent,/no test subprocess ran/);assert.doesNotMatch(f.main.textContent,/The isolated test runner started/);assert.equal(f.calls.length,0);});

test('read-only connected projects can save messages but cannot dispatch workers from the composer',async()=>{const f=fixture({readOnly:true});assert.equal(f.button('Send').disabled,true);f.write('Save locally; do not run');await f.submit('Send');assert.equal(f.calls.length,0);await f.submit('Save message');assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/messages']);assert.match(f.main.textContent,/Read-only project/);});

test('composer minimize preserves unsent text, Attach/Reference/Team and never dispatches',async()=>{const f=fixture();f.write('Keep this unsent draft');await f.button('Minimize composer').onclick();const input=all(f.main).find(n=>n.tagName==='textarea');assert.equal(input.hidden,true);assert.equal(input.value,'Keep this unsent draft');assert.ok(f.button('@ Reference'));assert.ok(f.button('Team'));assert.equal(f.calls.length,0);await f.button('Write a message').onclick();assert.equal(input.hidden,false);assert.equal(input.value,'Keep this unsent draft');assert.equal(f.calls.length,0);assert.match(f.button('Save message').title,/No agent runs/);});
test('Team opens the supported role panel rather than an unsupported model selector',async()=>{const f=fixture({teamAvailable:true});const team=f.button('Team'),panel=all(f.main).find(n=>n.tagName==='details'&&n.open===false);assert.equal(team.disabled,undefined);await team.onclick();assert.equal(panel.open,true);assert.doesNotMatch(f.main.textContent,/Individual agent selection.*not.*supported/);assert.equal(f.calls.length,0);});
