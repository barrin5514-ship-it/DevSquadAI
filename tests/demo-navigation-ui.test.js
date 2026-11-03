import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.text='';this.style={};this.checked=false;this.disabled=false;this.classList={add(){},toggle(){}};}
 append(...nodes){this.children.push(...nodes);}
 set textContent(v){this.text=String(v);this.children=[];}
 get textContent(){return this.text+this.children.map(n=>n.textContent??String(n)).join(' ');}
 setAttribute(){} removeAttribute(){} addEventListener(){} replaceChildren(...nodes){this.children=nodes;}
}
function fixture(){
 const elements=new Map(),calls=[],window={location:{hash:''},history:{replaceState(_a,_b,url){window.location.hash=url.includes('#')?url.slice(url.indexOf('#')):'';}},scrollTo(){},addEventListener(){}};
 const document={body:new Element('body'),createElement:t=>new Element(t),querySelectorAll:()=>[],getElementById:id=>{if(!elements.has(id))elements.set(id,new Element('div'));return elements.get(id);}};
 const c=vm.createContext({document,window,setTimeout:()=>0,clearTimeout(){},fetch:()=>new Promise(()=>{}),console});
 vm.runInContext(fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8')+'\nstate.busy=false;',c);
 const task={task_id:'actual-task',project_id:'actual-project',parent_id:'actual-plan',state:'PENDING',description:'Same name',attempts:0},job={id:'actual-job',task_id:task.task_id,version:4,status:'ready',state:{demoJobId:'actual-job',goal:'Demo task',roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},completedSteps:[],swaps:[],currentStep:'Build'}};
 c.task=task;c.job=job;c.target=new Element('section');c.calls=calls;
 vm.runInContext(`state.data={tasks:[task],capacity:[],projects:[],models:[{key:'groq',provider:'groq',model:'test',available:false,reason:'Parked'}],bigThree:{jobs:[job],demoWorkers:{prepared:[{job_id:job.id}],executionScopes:[],isolation:{ready:true,reason:'Verified fixture'},includedUsage:'Owner confirmed',paid:'No scope'},webhook:{enabled:false},messenger:{github:{ready:true},liveWorkersAvailable:true,loops:[{job_id:job.id,status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]}]}}};state.detail={task,history:[],checkpoints:[],drafts:[],usage:[],packets:[],reviews:[]};api=async(route,body)=>{calls.push({route,body});return {};};refresh=async()=>{};notify=()=>{};`,c);
 const all=(n=c.target)=>[n,...n.children.flatMap(x=>x instanceof Element?all(x):[])];
 return {c,task,job,calls,window,run:code=>vm.runInContext(code,c),all,button:(label,root=c.target)=>all(root).find(n=>n.tagName==='button'&&n.textContent===label),content:()=>elements.get('content')};
}
test('bound demo task replaces the legacy picker with three roles and its direct messenger link',async()=>{
 const f=fixture();f.run('taskDetail(target,task)');assert.match(f.c.target.textContent,/Builder.*Tester.*Reviewer/s);assert.doesNotMatch(f.c.target.textContent,/Development model|Select eligible free developer/);const open=f.button('Open Big Three demo controls');assert.ok(open);await open.onclick();assert.equal(f.window.location.hash,'#demo/actual-job');assert.equal(f.run('state.view'),'demo');const view=f.content();assert.ok(f.button('Prepare approved demo scopes',view));assert.equal(f.button('Start messenger loop',view).disabled,true);assert.equal(f.calls.length,0);
});
test('direct demo URL restores the exact saved job on refresh without preparing scopes or dispatching',()=>{
 const f=fixture();f.window.location.hash='#demo/actual-job';assert.equal(f.run('openDashboardLink()'),true);assert.equal(f.run('state.demoJob'),'actual-job');assert.match(f.content().textContent,/exact demo scopes/);assert.equal(f.calls.length,0);
});
test('unknown URL and matching names cannot redirect an unrelated task into the demo',()=>{
 const f=fixture();f.run("task.task_id='different-task'");assert.equal(f.run('demoForTask(task)'),undefined);f.window.location.hash='#demo/not-a-job';assert.throws(()=>f.run('openDashboardLink()'),/does not match/);assert.equal(f.calls.length,0);
});
test('ordinary task keeps its existing assignment workflow and has no demo controls',()=>{
 const f=fixture();f.run("task.task_id='ordinary';modelInfo=()=>el('p','','Parked');taskDetail(target,task)");assert.match(f.c.target.textContent,/Development model/);assert.equal(f.button('Open Big Three demo controls'),undefined);assert.equal(f.calls.length,0);
});
test('role edits on the task use only the saved job/version and never authorize or start work',async()=>{
 const f=fixture();f.run('taskDetail(target,task)');await f.button('Save job roles').onclick();assert.equal(f.calls.length,1);assert.equal(f.calls[0].route,'/shared-jobs/actual-job/roles');assert.equal(f.calls[0].body.version,4);assert.equal(f.calls[0].body.roles.builder,'deepseek');assert.ok(!f.calls.some(x=>/approve-scopes|messenger\/start|hello/.test(x.route)));
});

test('blocked demo exposes messenger controls instead of legacy free-provider resume',()=>{
 const f=fixture();f.run("task.state='BLOCKED';state.detail.checkpoints=[{created_at:'2026-11-03',reason:'Saved demo'}];taskDetail(target,task)");assert.ok(f.button('Open Big Three demo controls'));assert.equal(f.button('Resume with free capacity'),undefined);assert.equal(f.button('Select eligible free developer'),undefined);assert.equal(f.calls.length,0);
});
