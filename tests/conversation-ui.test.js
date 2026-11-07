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
 get isConnected(){return !!this.parent;}
 querySelectorAll(selector){return all(this).filter(n=>selector==='[data-event-id]'&&n.dataset.eventId!==undefined);}
 querySelector(selector){return all(this).find(n=>selector==='nav'?n.tagName==='nav':selector[0]==='.'&&n.className?.split(' ').includes(selector.slice(1)))||null;}
}
const all=n=>[n,...n.children.flatMap(all)];
function fixture({status='ready',empty=false,events=[],hasReview=false,readOnly=false,teamAvailable=false,statePatch={},detailPatch={}}={}){
 const body=new Element('body'),main=new Element('main'),sidebar=new Element('aside'),nav=new Element('nav'),bottom=new Element('div');bottom.className='sidebar-bottom';sidebar.append(nav,bottom);body.append(main,sidebar);const nodes=new Map();
 const document={body,createElement:t=>new Element(t),createTextNode:text=>{const node=new Element("#text");node.text=text;return node;},querySelectorAll:()=>[],getElementById:id=>all(body).find(n=>n.id===id)||nodes.get(id)||null};for(const id of ['refresh','guide-button','close-guide','notice'])nodes.set(id,new Element('div'));
 const calls=[],context=vm.createContext({document,window:{history:{replaceState(){}},location:{hash:''},addEventListener(){},scrollTo(){}},crypto:{randomUUID},localStorage:{getItem(){return null;},setItem(){}},queueMicrotask(){},setTimeout:()=>0,clearTimeout(){},fetch:()=>new Promise(()=>{})});
 vm.runInContext(fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8'),context);context.calls=calls;context.hasReview=hasReview;context.main=main;context.sidebar=sidebar;context.inputEvents=events;
 vm.runInContext(`state.busy=false;state.studioProject='p';state.studioChat=${empty?'null':"'c'"};state.data={studio:{projects:[{id:'p',name:'Project',agentChangesAllowed:${!readOnly}}],chats:${empty?'[]':"[{id:'c',project_id:'p',status:'"+status+"',title:'Saved chat',state:{goal:'Existing goal',roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'}}}]"},workers:{model:'Configured model'}}};state.studioDetail={id:'c',events:inputEvents};api=async(route,body)=>{calls.push({route,body});return {id:route.endsWith('/messages')?(hasReview?'followup-c':route.split('/')[3]):'new-chat',events:[]};};refresh=async()=>{};notify=()=>{};draw=()=>{};`,context);
 context.detailPatch=detailPatch;context.statePatch=statePatch;vm.runInContext('if(state.data.studio.chats[0])Object.assign(state.data.studio.chats[0].state,statePatch);Object.assign(state.studioDetail,detailPatch)',context);
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
test('reviewed states without a valid review cannot dispatch',async()=>{
 for(const status of ['awaiting_owner','accepted']){const f=fixture({status});assert.equal(f.button('Send').disabled,true);await f.submit('Send');assert.equal(f.calls.length,0);}
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

test('composer collapse hides the entire writing area and Team, preserves the draft and never dispatches',async()=>{const f=fixture();f.write('Keep this unsent draft');await f.button('Minimize composer').onclick();const input=all(f.main).find(n=>n.tagName==='textarea');assert.equal(input.hidden,true);assert.equal(all(f.main).find(n=>n.className==='composer-controls').hidden,true);assert.equal(all(f.main).find(n=>n.className==='conversation-team-settings').hidden,true);assert.equal(input.value,'Keep this unsent draft');assert.ok(f.button('@ Reference'));assert.ok(f.button('Team'));assert.equal(f.calls.length,0);await f.button('Expand composer').onclick();assert.equal(input.hidden,false);assert.equal(input.value,'Keep this unsent draft');assert.equal(f.calls.length,0);assert.match(f.button('Save message').title,/No agent runs/);});
test('Team opens the supported role panel rather than an unsupported model selector',async()=>{const f=fixture({teamAvailable:true});const team=f.button('Team'),panel=all(f.main).find(n=>n.tagName==='details'&&n.open===false);assert.equal(team.disabled,undefined);await team.onclick();assert.equal(panel.open,true);assert.doesNotMatch(f.main.textContent,/Individual agent selection.*not.*supported/);assert.equal(f.calls.length,0);});

test('active chat accepts a typed message without starting another worker and exposes Stop',async()=>{const f=fixture({status:'running'});const input=all(f.main).find(n=>n.tagName==='textarea');assert.equal(input.disabled,false);assert.equal(f.button('Stop').hidden,false);f.write('Save this for next time');await f.submit('Send');assert.deepEqual(f.calls.map(c=>c.route),['/studio/chats/c/messages']);});
test('live activity updates chat without replacing the draft and surfaces idle alert',()=>{const f=fixture({status:'running'});f.write('My unsent draft');const input=all(f.main).find(n=>n.tagName==='textarea');f.context.value={id:'c',status:'paused',state:{phase:'tester',alert:'No worker output for three minutes. Work is paused.'},events:[],executions:[{agent:'codex-school',evidence:{lastActivityAt:new Date().toISOString()}}]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.equal(input.value,'My unsent draft');assert.match(f.main.textContent,/three minutes/);assert.equal(f.button('Stop').hidden,true);});

test('Stop remains usable even while another dashboard save is busy',async()=>{const f=fixture({status:'running'});vm.runInContext('state.busy=true;loadStudioChat=async()=>{}',f.context);await f.button('Stop').onclick();assert.equal(f.calls[0].route,'/studio/chats/c/stop');});

test('collapsed running composer keeps the same working Stop button in its slim bar',async()=>{const f=fixture({status:'running',teamAvailable:true});f.write('Preserved draft');const stop=f.button('Stop');await f.button('Team').onclick();await f.button('Minimize composer').onclick();assert.equal(stop.parent.className,'composer-collapse-bar');assert.equal(stop.hidden,false);assert.equal(all(f.main).find(n=>n.className==='conversation-team-settings').hidden,true);vm.runInContext('loadStudioChat=async()=>{}',f.context);await stop.onclick();assert.equal(f.calls[0].route,'/studio/chats/c/stop');await f.button('Expand composer').onclick();assert.equal(stop.parent.className,'composer-controls');assert.equal(all(f.main).find(n=>n.tagName==='textarea').value,'Preserved draft');});

test('the selected workspace uses its composer Stop instead of a duplicate floating Stop bar; other jobs stay stoppable',()=>{const f=fixture({status:'running'});vm.runInContext("state.view='demo';state.data.studio.chats.push({id:'other',title:'Other active job',status:'running',state:{currentAgent:'deepseek'}});main.replaceChildren();studioStops(main);",f.context);assert.equal(all(f.main).filter(n=>n.tagName==='button'&&n.textContent==='Stop').length,1);assert.match(f.main.textContent,/Other active job/);assert.doesNotMatch(f.main.textContent,/Saved chat/);});

test('technical activity collapses without losing chronological persisted event identities',()=>{const f=fixture({events:[{id:1,kind:'message',content:{text:'Owner task'}},{id:2,kind:'error',content:{alert:'Old saved diagnosis'}},{id:3,kind:'worker_report',content:{report:'Recorded reply'},agent:'codex-personal'}]});const rows=all(f.main).filter(n=>n.dataset.eventId!==undefined);assert.deepEqual(rows.map(n=>n.dataset.eventId),[1,2,3]);const folded=all(f.main).find(n=>n.className==='chat-event');assert.ok(folded);assert.notEqual(folded.open,true);assert.match(folded.textContent,/Old saved diagnosis/);assert.equal(f.calls.length,0);});
test('message code is formatted as inert text without introducing HTML nodes',()=>{const f=fixture({events:[{id:1,kind:'worker_report',agent:'codex-personal',content:{report:'Recorded code\n'+String.fromCharCode(96).repeat(3)+'js\n<script>alert(1)</script>\n'+String.fromCharCode(96).repeat(3)}}]});const code=all(f.main).find(n=>n.tagName==='code');assert.match(code.textContent,/<script>/);assert.equal(all(f.main).some(n=>n.tagName==='script'),false);assert.equal(f.calls.length,0);});
test('critical unresolved outcomes cannot be dismissed while superseded Tester failures stay historical',()=>{const f=fixture({status:'paused',events:[{id:1,kind:'error',content:{alert:'Original error preserved'}}]});f.context.value={id:'c',status:'paused',recovery:{needed:true},state:{phase:'tester',roles:{tester:'codex-school'},failure:{phase:'tester',agent:'codex-school',code:'timeout'},alert:'Worker outcome is unknown; folder remains locked.'},events:[],executions:[]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.match(f.main.textContent,/folder stays locked/);assert.equal(f.button('Dismiss warning'),undefined);f.context.value={id:'c',status:'ready',state:{executionMode:'builder-only',builderOnlyAgent:'codex-personal',failure:{phase:'tester',agent:'codex-school',code:'auth_expired'},alert:'Old Tester failure'},events:[],executions:[]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.equal(all(f.main).find(n=>n.className==='chat-notice').hidden,true);assert.match(f.main.textContent,/Original error preserved/);assert.equal(f.calls.length,0);});
test('expired Builder-only approval keeps Send disabled without dispatch',()=>{const f=fixture({statePatch:{executionMode:'builder-only',builderOnlyAgent:'codex-personal',runApproval:{expiresAt:'2000-01-01T00:00:00Z'}}});assert.equal(f.button('Send').disabled,true);assert.equal(f.calls.length,0);});

test('a requested Stop is shown as status rather than a new paused-error banner',()=>{const f=fixture({status:'running'});f.context.value={id:'c',status:'stopping',state:{phase:'builder',alert:'Stopping the current worker. No new turn will start.'},events:[],executions:[]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.equal(all(f.main).find(n=>n.className==='chat-notice').hidden,true);assert.equal(f.button('Stop').hidden,false);assert.equal(f.button('Stop').disabled,true);assert.equal(f.calls.length,0);});

test('compact status distinguishes approval required, expired approval and pending independent review',()=>{const f=fixture();f.context.samples=[{status:'ready',state:{executionMode:'builder-only'}},{status:'ready',state:{executionMode:'builder-only',runApproval:{expiresAt:'2000-01-01'}}},{status:'paused',state:{builderCompleted:true}},{status:'running',state:{}}];const labels=vm.runInContext('samples.map(window.workspaceConversation.statusLabel)',f.context);assert.deepEqual(Array.from(labels),['Awaiting approval','Approval expired','Review pending','running']);assert.equal(f.calls.length,0);});

test('expired bounded team approval disables recovery with its reason rather than presenting Resume as routine',()=>{const f=fixture({status:'paused',statePatch:{runApproval:{expiresAt:'2000-01-01',requestId:'old',maxCalls:3,perRole:1}},detailPatch:{resume:{available:true,phase:'tester',reason:'Saved Tester step'},executions:[]}});assert.equal(f.button('Resume testing').disabled,true);assert.match(f.button('Resume testing').title,/expired/);assert.match(f.main.textContent,/No worker can resume/);assert.equal(f.calls.length,0);});

test('a stopped task with an unresolved folder lock still shows the non-dismissible safety warning',()=>{const f=fixture({status:'stopped'});f.context.value={id:'c',status:'stopped',recovery:{needed:true},state:{phase:'builder',alert:null},events:[],executions:[]};vm.runInContext('window.workspaceConversation.updateActivity(value)',f.context);assert.equal(all(f.main).find(n=>n.className==='chat-notice').hidden,false);assert.equal(f.button('Dismiss warning'),undefined);assert.match(f.main.textContent,/folder stays locked/);assert.equal(f.calls.length,0);});

test('a new project without a selected session or detail renders the composer safely',()=>{const f=fixture({empty:true});assert.doesNotThrow(()=>vm.runInContext('state.studioDetail=null;main.replaceChildren();window.workspaceConversation.mount(state,main,sidebar)',f.context));assert.ok(all(f.main).some(n=>n.tagName==='textarea'));assert.equal(f.calls.length,0);});

test('bounded team Send uses its saved approval request identity rather than minting another',async()=>{const f=fixture({statePatch:{runApproval:{requestId:'approved-team-request',expiresAt:'2099-01-01'}}});await f.submit('Send');assert.equal(f.calls.at(-1).route,'/studio/projects/p/run');assert.equal(f.calls.at(-1).body.requestId,'approved-team-request');});
test('team approval mounts in the regular composer and sends only the explicitly approved proposal',async()=>{
 const f=fixture(),panel=f.main.querySelector('.team-run-approval');
 assert.ok(panel);
 const proposal={project:'Project',session:'Saved chat',version:4,projectId:'p',rootHash:'root',checkpointHash:'checkpoint',proposalHash:'current-proposal',roles:{builder:'deepseek',tester:'codex-personal',reviewer:'nemotron'},paid:{model:'deepseek-flash',maxOutput:4096,capUSD:0.02,inputBytes:24000},free:{model:'nvidia/nemotron-3.5-super-vl:free',maxOutput:2048,timeoutMs:60000},maxCalls:3,timeoutMs:300000,maxOutputBytes:32768,deepseekTimeoutMs:90000,estimateUSD:0.013344,needsIncludedConfirmation:true,allowance:'UNKNOWN',issues:[]};
 f.context.proposal=proposal;
 vm.runInContext('api=async(route,body)=>{calls.push({route,body});return proposal;}',f.context);
 assert.deepEqual(f.calls,[]);
 panel.open=true;await panel.ontoggle();
 assert.deepEqual(f.calls.map(c=>[c.route,c.body]),[['/studio/chats/c/run-approval',undefined]]);
 assert.match(panel.textContent,/checkpoint/);
 const approve=f.button('Approve one three-agent run'),confirm=all(panel).find(x=>x.type==='checkbox');
 assert.equal(approve.disabled,true);
 confirm.checked=true;confirm.onchange();assert.equal(approve.disabled,false);
 await approve.onclick();
 assert.equal(f.calls.length,2);
 assert.equal(f.calls[1].route,'/studio/chats/c/run-approval');
 assert.equal(f.calls[1].body.proposalHash,proposal.proposalHash);
 assert.equal(f.calls[1].body.confirmIncluded,true);
 assert.ok(!f.calls.some(c=>c.route.endsWith('/run')));
});
