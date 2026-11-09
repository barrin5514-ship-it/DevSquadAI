import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';

// Exercise the real composer handlers. No browser network or worker can run here.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.style={};this.classList={add(){},remove(){},toggle(){}};this.text='';}
 append(...items){for(const n of items){n.remove?.();n.parent=this;this.children.push(n);}}
 replaceChildren(...items){for(const n of this.children)n.parent=null;this.children=[];this.append(...items);}
 insertBefore(n,before){if(!before)return this.append(n);n.remove();n.parent=this;this.children.splice(this.children.indexOf(before),0,n);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 set textContent(v){this.text=String(v);this.children=[];}
 get textContent(){return this.text+this.children.map(n=>n.textContent??'').join(' ');}
 setAttribute(k,v){this.attributes[k]=String(v);}
 removeAttribute(){}
 addEventListener(k,fn){this.events??={};this.events[k]=fn;}
 focus(){}
 get isConnected(){return !!this.parent;}
 querySelectorAll(selector){return all(this).filter(n=>selector==='[data-event-id]'&&n.dataset.eventId!==undefined);}
 querySelector(selector){return all(this).find(n=>selector==='nav'?n.tagName==='nav':selector[0]==='.'&&n.className?.split(' ').includes(selector.slice(1)))||null;}
}
const all=n=>[n,...n.children.flatMap(all)];
test('project-files refresh redraw preserves pending image thumbnail, filename, size and remove control',async()=>{
 const f=fixture(),attach=all(f.main).find(n=>n.id==='conversation-attachment');
 attach.files=[{name:'refresh.png',size:132000,type:'image/png'}];await attach.onchange();
 for(let cycle=0;cycle<2;cycle++){
  vm.runInContext('main.replaceChildren();window.workspaceConversation.mount(state,main,sidebar)',f.context);
  assert.match(f.main.textContent,/refresh\.png/);
  assert.match(f.main.textContent,/129 KB/);
  assert.equal(all(f.main).filter(n=>n.className==='attachment-thumb').length,1);
  assert.equal(all(f.main).filter(n=>n.className==='attachment-remove').length,1);
 }
 await all(f.main).find(n=>n.className==='attachment-remove').onclick();
 vm.runInContext('main.replaceChildren();window.workspaceConversation.mount(state,main,sidebar)',f.context);
 assert.doesNotMatch(f.main.textContent,/refresh\.png/);assert.equal(f.calls.length,0);
});
function fixture({status='ready',empty=false,events=[],hasReview=false,readOnly=false,teamAvailable=false,statePatch={},detailPatch={}}={}){
 const body=new Element('body'),main=new Element('main'),sidebar=new Element('aside'),nav=new Element('nav'),bottom=new Element('div');bottom.className='sidebar-bottom';sidebar.append(nav,bottom);body.append(main,sidebar);const nodes=new Map();
 const document={body,createElement:t=>new Element(t),createTextNode:text=>{const node=new Element("#text");node.text=text;return node;},querySelectorAll:()=>[],getElementById:id=>all(body).find(n=>n.id===id)||nodes.get(id)||null};for(const id of ['refresh','guide-button','close-guide','notice'])nodes.set(id,new Element('div'));
 const calls=[],context=vm.createContext({document,window:{history:{replaceState(){}},location:{hash:''},addEventListener(){},scrollTo(){}},crypto:{randomUUID},localStorage:{getItem(){return null;},setItem(){}},queueMicrotask(){},setTimeout:()=>0,clearTimeout(){},URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},fetch:()=>new Promise(()=>{})});
 vm.runInContext(fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8'),context);context.calls=calls;context.hasReview=hasReview;context.main=main;context.sidebar=sidebar;context.inputEvents=events;
 vm.runInContext(`state.busy=false;state.studioProject='p';state.studioChat=${empty?'null':"'c'"};state.data={studio:{projects:[{id:'p',name:'Project',agentChangesAllowed:${!readOnly}}],chats:${empty?'[]':"[{id:'c',project_id:'p',status:'"+status+"',title:'Saved chat',state:{goal:'Existing goal',roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'}}}]"},workers:{model:'Configured model'}}};state.studioDetail={id:'c',events:inputEvents};api=async(route,body)=>{if(route.endsWith('/send-proposal'))return {project:'Project',projectId:'p',sessionId:route.split('/')[3],version:4,hash:'displayed-team',roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},policy:{enabled:false,allowedWorkers:[]},issues:[]};calls.push({route,body});return {id:route.endsWith('/messages')?route.split('/')[3]:'new-chat',events:[]};};refresh=async()=>{};notify=()=>{};draw=()=>{};`,context);
 context.detailPatch=detailPatch;context.statePatch=statePatch;vm.runInContext('if(state.data.studio.chats[0])Object.assign(state.data.studio.chats[0].state,statePatch);Object.assign(state.studioDetail,detailPatch)',context);
 if(hasReview)vm.runInContext("state.data.studio.chats[0].state.review={artifactHash:'reviewed-hash'};state.studioDetail.events=[{id:1,kind:'independent_review',content:{artifactHash:'reviewed-hash',decision:'approved',summary:'Recorded review'}}];",context);
 if(teamAvailable)context.window.workspaceRoles={mount(_s,area){const panel=new Element('details');panel.open=false;area.append(panel);return panel;}};vm.runInContext(fs.readFileSync(new URL('../src/dashboard/conversations.js',import.meta.url),'utf8'),context);vm.runInContext('window.workspaceConversation.mount(state,main,sidebar)',context);
 const find=t=>all(main).find(n=>n.tagName===t),button=name=>all(main).find(n=>n.tagName==='button'&&n.textContent===name);
 return {calls,main,context,button,write(text){find('textarea').value=text;find('textarea').oninput();},submit:async name=>{await new Promise(setImmediate);return find('form').onsubmit({preventDefault(){},submitter:button(name)});}};
}
test('Send saves one message then dispatches the existing project runner once',async()=>{
 const f=fixture();f.write('Build this utility');await f.submit('Send');assert.deepEqual(f.calls.map(c=>c.route),['/studio/projects/p/run']);assert.equal(f.calls[0].body.message.text,'Build this utility');assert.equal(f.calls[0].body.chatId,'c');assert.ok(f.calls[0].body.requestId);assert.equal(f.calls[0].body.proposalHash,'displayed-team');assert.match(f.main.textContent,/paid DeepSeek usage/);
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
test('reviewed states without a valid review cannot dispatch',async()=>{
 for(const status of ['awaiting_owner','accepted']){const f=fixture({status});assert.equal(f.button('Send').disabled,true);await f.submit('Send');assert.equal(f.calls.length,0);}
});
test('messages retain chronological event order and render saved agent reports without fake streaming',()=>{
 const f=fixture({events:[{id:3,kind:'worker_report',agent:'deepseek',content:{report:'Actual saved report'}},{id:1,kind:'task',content:{text:'Original owner prompt'}},{id:2,kind:'worker_started',agent:'deepseek',content:{}}]});assert.deepEqual(all(f.main).filter(n=>n.className?.startsWith('chat-message ')).map(n=>n.dataset.eventId),[1,2,3]);assert.match(f.main.textContent,/Actual saved report/);assert.doesNotMatch(f.main.textContent,/The assigned agent is working/);assert.equal(f.calls.length,0);
});
test('feedback after a valid review starts a new build in the same chat without accepting the source',async()=>{
 const f=fixture({status:'awaiting_owner',hasReview:true});assert.equal(f.button('Send').disabled,false);f.write('Please correct the edge cases');await f.submit('Send');assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/retry']);assert.equal(f.calls[0].body.prompt,'Please correct the edge cases');assert.equal(f.calls[0].body.mode,'new');assert.ok(!f.calls.some(c=>c.route.includes('/accept')||c.route.endsWith('/run')));assert.equal(vm.runInContext('state.data.studio.chats[0].status',f.context),'awaiting_owner');
});
test('empty Send after review cannot silently rerun the reviewed task',async()=>{
 const f=fixture({status:'awaiting_owner',hasReview:true});await f.submit('Send');assert.equal(f.calls.length,0);assert.match(f.main.textContent,/Write a message first/);
});

test('mock command events never claim that the real isolated runner executed',()=>{const f=fixture({events:[{id:1,kind:'execution_started',created_at:'2026-11-04',content:{fixtureOnly:true}},{id:2,kind:'execution_finished',created_at:'2026-11-04',content:{fixtureOnly:true,exit:0,durationMs:5}}]});assert.match(f.main.textContent,/MOCK ONLY/);assert.match(f.main.textContent,/no test subprocess ran/);assert.doesNotMatch(f.main.textContent,/The isolated test runner started/);assert.equal(f.calls.length,0);});

test('read-only connected projects can save messages but cannot dispatch workers from the composer',async()=>{const f=fixture({readOnly:true});assert.equal(f.button('Send').disabled,true);f.write('Save locally; do not run');await f.submit('Send');assert.equal(f.calls.length,0);await f.submit('Save message');assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/messages']);assert.match(f.main.textContent,/Read-only project/);});

test('composer collapse hides the entire writing area and Team, preserves the draft and never dispatches',async()=>{const f=fixture();f.write('Keep this unsent draft');await f.button('Minimize composer').onclick();const input=all(f.main).find(n=>n.tagName==='textarea');assert.equal(input.hidden,true);assert.equal(all(f.main).find(n=>n.className==='composer-controls').hidden,true);assert.equal(all(f.main).find(n=>n.className==='conversation-team-settings').hidden,true);assert.equal(input.value,'Keep this unsent draft');assert.ok(f.button('@ Reference'));assert.ok(f.button('Team'));assert.equal(f.calls.length,0);await f.button('Expand composer').onclick();assert.equal(input.hidden,false);assert.equal(input.value,'Keep this unsent draft');assert.equal(f.calls.length,0);assert.match(f.button('Save message').title,/No agent runs/);});
test('Team opens the supported role panel rather than an unsupported model selector',async()=>{const f=fixture({teamAvailable:true});const team=f.button('Team'),panel=all(f.main).find(n=>n.tagName==='details'&&n.open===false);assert.equal(team.disabled,undefined);await team.onclick();assert.equal(panel.open,true);assert.doesNotMatch(f.main.textContent,/Individual agent selection.*not.*supported/);assert.equal(f.calls.length,0);});

test('active chat accepts a typed message without starting another worker and exposes Stop',async()=>{const f=fixture({status:'running'});const input=all(f.main).find(n=>n.tagName==='textarea');assert.equal(input.disabled,false);assert.equal(f.button('Stop').hidden,false);f.write('Save this for next time');await f.submit('Send');assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/messages']);});
test('live activity updates chat without replacing the draft and surfaces idle alert',()=>{const f=fixture({status:'running'});f.write('My unsent draft');const input=all(f.main).find(n=>n.tagName==='textarea');f.context.value={id:'c',status:'paused',state:{phase:'tester',alert:'No worker output for three minutes. Work is paused.'},events:[],executions:[{agent:'codex-school',evidence:{lastActivityAt:new Date().toISOString()}}]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.equal(input.value,'My unsent draft');assert.match(f.main.textContent,/three minutes/);assert.equal(f.button('Stop').hidden,true);});

test('Stop remains usable even while another dashboard save is busy',async()=>{const f=fixture({status:'running'});vm.runInContext('state.busy=true;loadStudioChat=async()=>{}',f.context);await f.button('Stop').onclick();assert.equal(f.calls[0].route,'/studio/chats/c/stop');});

test('collapsed running composer keeps the same working Stop button in its slim bar',async()=>{const f=fixture({status:'running',teamAvailable:true});f.write('Preserved draft');const stop=f.button('Stop');await f.button('Team').onclick();await f.button('Minimize composer').onclick();assert.equal(stop.parent.className,'composer-collapse-bar');assert.equal(stop.hidden,false);assert.equal(all(f.main).find(n=>n.className==='conversation-team-settings').hidden,true);vm.runInContext('loadStudioChat=async()=>{}',f.context);await stop.onclick();assert.equal(f.calls[0].route,'/studio/chats/c/stop');await f.button('Expand composer').onclick();assert.equal(stop.parent.className,'composer-controls');assert.equal(all(f.main).find(n=>n.tagName==='textarea').value,'Preserved draft');});

test('the selected workspace uses its composer Stop instead of a duplicate floating Stop bar; other jobs stay stoppable',()=>{const f=fixture({status:'running'});vm.runInContext("state.view='demo';state.data.studio.chats.push({id:'other',title:'Other active job',status:'running',state:{currentAgent:'deepseek'}});main.replaceChildren();studioStops(main);",f.context);assert.equal(all(f.main).filter(n=>n.tagName==='button'&&n.textContent==='Stop').length,1);assert.match(f.main.textContent,/Other active job/);assert.doesNotMatch(f.main.textContent,/Saved chat/);});

test('technical activity collapses without losing chronological persisted event identities',()=>{const f=fixture({events:[{id:1,kind:'message',content:{text:'Owner task'}},{id:2,kind:'error',content:{alert:'Old saved diagnosis'}},{id:3,kind:'worker_report',content:{report:'Recorded reply'},agent:'codex-personal'}]});const rows=all(f.main).filter(n=>n.dataset.eventId!==undefined);assert.deepEqual(rows.map(n=>n.dataset.eventId),[1,2,3]);const folded=all(f.main).find(n=>n.className==='chat-event');assert.ok(folded);assert.notEqual(folded.open,true);assert.match(folded.textContent,/Old saved diagnosis/);assert.equal(f.calls.length,0);});
test('message code is formatted as inert text without introducing HTML nodes',()=>{const f=fixture({events:[{id:1,kind:'worker_report',agent:'codex-personal',content:{report:'Recorded code\n'+String.fromCharCode(96).repeat(3)+'js\n<script>alert(1)</script>\n'+String.fromCharCode(96).repeat(3)}}]});const code=all(f.main).find(n=>n.tagName==='code');assert.match(code.textContent,/<script>/);assert.equal(all(f.main).some(n=>n.tagName==='script'),false);assert.equal(f.calls.length,0);});
test('released unknown outcomes stay dismissible even when a superseded Tester failure exists',()=>{const f=fixture({status:'paused',events:[{id:1,kind:'error',content:{alert:'Original error preserved'}}]});f.context.value={id:'c',status:'paused',recovery:{needed:true},state:{phase:'tester',roles:{tester:'codex-school'},failure:{phase:'tester',agent:'codex-school',code:'timeout'},alert:'Worker outcome is unknown; no verified checkpoint was accepted.'},events:[],executions:[]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.doesNotMatch(f.main.textContent,/folder stays locked/i);assert.ok(f.button('Dismiss warning'));f.context.value={id:'c',status:'ready',state:{executionMode:'builder-only',builderOnlyAgent:'codex-personal',failure:{phase:'tester',agent:'codex-school',code:'auth_expired'},alert:'Old Tester failure'},events:[],executions:[]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.equal(all(f.main).find(n=>n.className==='chat-notice').hidden,true);assert.match(f.main.textContent,/Original error preserved/);assert.equal(f.calls.length,0);});
test('Attach accepts a real image over 4 KiB with a thumbnail and rejects an oversized image clearly',async()=>{const f=fixture(),input=all(f.main).find(n=>n.type==='file');assert.ok(input);assert.match(input.accept,/image\/\*/);assert.match(input.accept,/video\/\*/);assert.match(input.accept,/\*\/\*/);input.files=[{name:'screenshot.png',size:12000,type:'image/png'}];await input.onchange();assert.match(f.main.textContent,/screenshot\.png/);assert.match(f.main.textContent,/12 KB/);const g=fixture(),huge=all(g.main).find(n=>n.type==='file');huge.files=[{name:'huge.png',size:25*1024*1024+1,type:'image/png'}];await huge.onchange();assert.match(g.main.textContent,/Images must be 25 MiB or smaller/);});
test('pasting an image and dropping an image add the same composer attachment without swallowing text paste',async()=>{const f=fixture(),input=all(f.main).find(n=>n.tagName==='textarea'),file={name:'pasted.png',size:9000,type:'image/png'};let prevented=false;input.events.paste({clipboardData:{items:[{kind:'file',type:'image/png',getAsFile:()=>file}]},preventDefault(){prevented=true;}});await new Promise(setImmediate);assert.equal(prevented,true);assert.match(f.main.textContent,/pasted\.png/);prevented=false;input.events.paste({clipboardData:{items:[{kind:'string',type:'text/plain'}]},preventDefault(){prevented=true;}});assert.equal(prevented,false);const g=fixture(),form=all(g.main).find(n=>n.tagName==='form'),dropped={name:'dropped.png',size:8000,type:'image/png'};prevented=false;form.events.drop({dataTransfer:{files:[dropped]},preventDefault(){prevented=true;}});await new Promise(setImmediate);assert.equal(prevented,true);assert.match(g.main.textContent,/dropped\.png/);});
test('independent review states visibly whether the Reviewer ran or only inspected tests',()=>{const f=fixture({hasReview:true});assert.match(f.main.textContent,/Reviewer did not run tests/);assert.ok(all(f.main).some(n=>n.className==='review-evidence-label'));assert.equal(f.calls.length,0);});
test('expired Builder-only approval keeps Send disabled without dispatch',()=>{const f=fixture({statePatch:{executionMode:'builder-only',builderOnlyAgent:'codex-personal',runApproval:{expiresAt:'2000-01-01T00:00:00Z'}}});assert.equal(f.button('Send').disabled,true);assert.equal(f.calls.length,0);});

test('a requested Stop is shown as status rather than a new paused-error banner',()=>{const f=fixture({status:'running'});f.context.value={id:'c',status:'stopping',state:{phase:'builder',alert:'Stopping the current worker. No new turn will start.'},events:[],executions:[]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.equal(all(f.main).find(n=>n.className==='chat-notice').hidden,true);assert.equal(f.button('Stop').hidden,false);assert.equal(f.button('Stop').disabled,true);assert.equal(f.calls.length,0);});

test('compact status distinguishes approval required, expired approval and pending independent review',()=>{const f=fixture();f.context.samples=[{status:'ready',state:{executionMode:'builder-only'}},{status:'ready',state:{executionMode:'builder-only',runApproval:{expiresAt:'2000-01-01'}}},{status:'paused',state:{builderCompleted:true}},{status:'running',state:{}}];const labels=vm.runInContext('samples.map(window.workspaceConversation.statusLabel)',f.context);assert.deepEqual(Array.from(labels),['Awaiting approval','Approval expired','Review pending','running']);assert.equal(f.calls.length,0);});

test('expired bounded team approval disables recovery with its reason rather than presenting Resume as routine',()=>{const f=fixture({status:'paused',statePatch:{runApproval:{expiresAt:'2000-01-01',requestId:'old',maxCalls:3,perRole:1}},detailPatch:{resume:{available:true,phase:'tester',reason:'Saved Tester step'},executions:[]}});assert.equal(f.button('Resume testing').disabled,true);assert.match(f.button('Resume testing').title,/expired/);assert.match(f.main.textContent,/No worker can resume/);assert.equal(f.calls.length,0);});

test('historical lock wording and a stale recovery flag never create a lock banner',()=>{
 const f=fixture({status:'paused'});
 f.context.value={id:'c',status:'paused',recovery:{needed:true},state:{executionMode:'team',phase:'tester',roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},failure:{phase:'tester',agent:'codex-personal',code:'incomplete'},alert:'Worker outcome is unknown; the folder remains locked until it is reconciled.',writeAccess:{status:'released',unknownOutcome:true}},events:[],executions:[]};
 vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);
 const notice=f.main.querySelector('.chat-notice');assert.equal(notice.hidden,false);assert.doesNotMatch(notice.textContent,/folder stays locked/i);assert.match(notice.textContent,/no verified checkpoint/i);assert.ok(f.button('Dismiss warning'));
});
test('a stopped task with a stale recovery flag no longer shows a folder-lock warning',()=>{const f=fixture({status:'stopped'});f.context.value={id:'c',status:'stopped',recovery:{needed:true},state:{phase:'builder',alert:null},events:[],executions:[]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.equal(all(f.main).find(n=>n.className==='chat-notice').hidden,true);assert.doesNotMatch(f.main.textContent,/folder stays locked/i);assert.equal(f.calls.length,0);});

test('a new project without a selected session or detail renders the composer safely',()=>{const f=fixture({empty:true});assert.doesNotThrow(()=>vm.runInContext('state.studioDetail=null;main.replaceChildren();window.workspaceConversation.mount(state,main,sidebar)',f.context));assert.ok(all(f.main).some(n=>n.tagName==='textarea'));assert.equal(f.calls.length,0);});

test('bounded team Send uses its saved approval request identity rather than minting another',async()=>{const f=fixture({statePatch:{runApproval:{requestId:'approved-team-request',expiresAt:'2099-01-01'}}});await f.submit('Send');assert.equal(f.calls.at(-1).route,'/studio/projects/p/run');assert.equal(f.calls.at(-1).body.requestId,'approved-team-request');});
test('displayed team proposal requires no second consent control and binds an empty Send to the saved task',async()=>{
 const f=fixture();await new Promise(setImmediate);
 assert.equal(f.calls.length,0);assert.match(f.main.textContent,/fallback off/);
 assert.equal(f.main.querySelector('.team-run-approval'),null);
 await f.submit('Send');assert.equal(f.calls.length,1);assert.equal(f.calls[0].body.proposalHash,'displayed-team');assert.equal(f.calls[0].body.expectedVersion,4);assert.equal(f.calls[0].body.message,undefined);
});

test('Send of a new tiny task after a failed attempt dispatches it through same-chat continuation, not the old Run ID',async()=>{
 const f=fixture({status:'paused',statePatch:{runApproval:{requestId:'old-request'}},detailPatch:{resume:{available:true,phase:'builder',reason:'Known failure'}}});
 vm.runInContext("api=async(route,body)=>{calls.push({route,body});return {id:'c',version:9};}",f.context);
 f.write('Build a tiny page with one button that changes its background color.');
 await f.submit('Send');
 assert.equal(f.calls.length,2);
 assert.equal(f.calls[0].route,'/studio/chats/c/messages');
 assert.equal(f.calls[1].route,'/studio/chats/c/retry');
 assert.equal(f.calls[1].body.prompt,f.calls[0].body.text);
 assert.equal(f.calls[1].body.expectedVersion,9);
 assert.notEqual(f.calls[1].body.requestId,'old-request');
 assert.equal(f.calls[1].body.mode,'resume');
 assert.ok(f.calls.every(c=>!c.route.endsWith('/run')&&!c.route.endsWith('/sessions')));
});

test('completed DeepSeek reply failure explains the JSON error and offers same-chat Builder retry on the paused card',async()=>{
 const f=fixture({status:'paused',events:[{id:1,kind:'workspace_write_acquired',content:{writeAccess:{status:'held'}}}]});
 f.context.value={id:'c',status:'paused',version:12,request_id:'demo-request',state:{phase:'builder',roles:{builder:'deepseek'},runApproval:{mode:'team-send'},writeAccess:{status:'released'},failure:{phase:'builder',agent:'deepseek',code:'worker_error'},alert:'DeepSeek final answer is not valid JSON.'},resume:{available:true,phase:'builder'},events:[],executions:[{request_id:'demo-request',agent:'deepseek',phase:'builder',status:'failed',evidence:{deepseekResponse:{failedCheck:'answer_json',completionObserved:true}}}]};
 vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);
 const notice=f.main.querySelector('.chat-notice');
 assert.equal(notice.hidden,false);
 assert.match(notice.textContent,/DeepSeek returned an invalid JSON reply/);
 assert.match(f.main.textContent,/Write access active for this step/);
 const retry=notice.children.find(n=>n.tagName==='button'&&n.textContent==='Retry Builder stage');
 assert.ok(retry);
 assert.equal(f.calls.length,0);
 await retry.onclick();
 assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/retry']);
 assert.equal(f.calls[0].body.expectedVersion,12);
 assert.equal(f.calls[0].body.mode,'resume');
 f.context.value.request_id='different-request';
 vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);
 assert.doesNotMatch(notice.textContent,/invalid JSON reply|Retry Builder stage/);
});

test('the bottom of a paused chat offers current stage retry after the latest edit was saved without dispatch',async()=>{
 const events=[{id:1,kind:'message',content:{text:'Original prompt'}},{id:2,kind:'run_requested',content:{}},{id:3,kind:'message',content:{text:'Edited prompt'}}];
 const f=fixture({status:'paused',events});
 f.context.value={id:'c',status:'paused',version:17,state:{phase:'builder',roles:{builder:'deepseek'},runApproval:{mode:'team-send'}},resume:{available:true,phase:'builder'},events};
 vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);
 const bottom=f.main.querySelector('.chat-live-activity');
 const retry=bottom.children.find(n=>n.tagName==='button'&&n.textContent==='Retry Builder stage');
 assert.ok(retry);
 assert.equal(f.calls.length,0);
 await retry.onclick();
 assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/retry']);
 assert.equal(f.calls[0].body.expectedVersion,17);
 assert.equal(f.calls[0].body.mode,'resume');
 assert.equal(f.calls[0].body.sourceEventId,undefined);
 f.context.value.resume={available:false,reason:'The project changed after the failed step.'};
 vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);
 assert.match(bottom.textContent,/project changed/);
 assert.ok(!bottom.children.some(n=>n.tagName==='button'));
});

test('live events explain actions and setbacks before technical detail',()=>{
 const f=fixture();
 const plain=f.context.window.workspaceConversation.plainEvent;
 const line=(kind,content={},agent='codex-personal')=>plain({kind,agent,content});
 assert.match(line('worker_started',{activePhase:'tester'}),/Codex.*preparing independent tests/i);
 assert.match(line('worker_report',{phase:'tester'}),/tests have not run/i);
 assert.match(line('handoff_local',{phase:'builder',nextPhase:'tester'}),/saved files.*tester/i);
 assert.match(line('test_results',{tests:{executed:true,passed:false}}),/tests ran.*failed/i);
 assert.match(line('runner_missing'),/could not run.*no pass/i);
 assert.match(line('repair_council_started'),/asking.*agents.*why/i);
 assert.match(line('repair_council_result',{outcome:'advice_only'}),/advice.*nothing was applied/i);
 assert.match(line('error',{failure:{agent:'codex-school',phase:'tester',code:'provider_unavailable'}}),/School.*could not.*retry/i);
 assert.match(line('error',{failure:{agent:'deepseek',phase:'builder',code:'body_limit'},writeAccess:{unknownOutcome:true}}),/could not confirm.*completion/i);
 assert.match(line('error',{failure:{agent:'deepseek',phase:'builder',code:'worker_error',message:'DeepSeek final answer is not valid JSON.'}}),/reply.*could not read.*no project files/i);
});
