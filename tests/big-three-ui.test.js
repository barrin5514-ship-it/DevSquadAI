import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual view's button handlers with a tiny display-only DOM.
// This is separate from the real-browser visual check and makes no model calls.
function render(results=[],loop=null,demo=false,ready=false,hasScope=ready){
 const source=fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8');const view=source.slice(source.indexOf('function messengerView('),source.indexOf('\nfunction teamView('));
 const buttons=[],badges=[],calls=[],checks=[],fields=[],elements=[],node=()=>({children:[],append(...v){this.children.push(...v);},replaceChildren(...v){this.children=[...v];}}),make=()=>node();
 const context={state:{data:{bigThree:{messenger:{loops:loop?[loop]:[],github:{ready},liveWorkersAvailable:demo},demoWorkers:demo?{isolation:{ready:true,reason:'Mock verified boundary'},includedUsage:'Owner confirmed',paid:'No active scope',executionScopes:hasScope?[{jobId:'job-id',valid:true}]:[]}:null,webhook:{configured:ready,enabled:ready},connections:{last:{result:results}},jobs:[{id:'job-id',task_id:'task-id',version:7,status:'ready',state:{goal:'Mock job',demoJobId:demo?'job-id':undefined,roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},currentStep:'Build',completedSteps:[],swaps:[]}}]},tasks:[]}},teamSection:make,el:(tag,cls,text)=>{const n=node();n.text=text;elements.push(n);return n;},add:(parent,...children)=>{parent.append(...children);return parent;},badge:text=>{badges.push(text);return text;},p:text=>text,callout:text=>text,panel:make,facts:make,date:String,button:(label,click)=>{const b={label,click};buttons.push(b);return b;},check:label=>{const c={label,wrap:node(),input:{checked:false}};checks.push(c);return c;},field:(name,value)=>{const f={name,wrap:node(),input:{value}};fields.push(f);return f;},api:async(route,body)=>{calls.push({route,body});return {};},refresh:async()=>{},notify:()=>{},openProject:()=>{}};
 vm.runInNewContext(view+'\nbigThreeView({});',context);return {buttons,badges,calls,checks,fields,elements,context};
}
test('dashboard sends rotation and selected roles only to the exact saved job/version',async()=>{
 const ui=render();await ui.buttons.find(b=>b.label==='Rotate roles').click();assert.equal(ui.calls[0].route,'/shared-jobs/job-id/roles');assert.equal(ui.calls[0].body.version,7);assert.equal(ui.calls[0].body.rotate,true);
 ui.fields.find(f=>f.name==='Builder').input.value='claude-code';await ui.buttons.find(b=>b.label==='Save job roles').click();assert.equal(ui.calls[1].body.roles.builder,'claude-code');assert.ok(ui.calls.every(c=>!c.route.includes('complete')));
});
test('mock success cannot display VERIFIED, and hello requires included-usage confirmation',async()=>{
 const mock=render([{agent:'codex',kind:'mock',ok:true,text:'hello'}]);assert.ok(!mock.badges.includes('VERIFIED'));await assert.rejects(mock.buttons.find(b=>b.label==='Test all 3').click(),/Confirm/);assert.equal(mock.calls.length,0);
 mock.checks[0].input.checked=true;await mock.buttons.find(b=>b.label==='Test all 3').click();assert.equal(mock.calls[0].route,'/big-three/hello');
 const live=render([{agent:'codex',kind:'live',ok:true,text:'hello'}]);assert.equal(live.badges.filter(b=>b==='VERIFIED').length,1);
});
test('messenger Stop works while the ordinary view is busy and targets only that job',async()=>{
 const loop={job_id:'job-id',status:'waiting',round:1,max_rounds:3,wait_ms:300000,rounds:[{round:1,role:'builder',agent:'deepseek',report_state:'delivered',sent_at:'2026-11-02T00:00:00Z',received_at:null,report:'Clean mock report'}],events:[]};
 const ui=render([],loop);ui.context.state.busy=true;const stop=ui.elements.find(n=>n.text==='Stop messenger');assert.ok(stop&&!stop.disabled);await stop.onclick();assert.equal(ui.calls[0].route,'/shared-jobs/job-id/messenger/stop');assert.ok(ui.calls.every(c=>!c.route.includes('hello')&&!c.route.includes('/run')));
});
test('preparing a messenger uses bounded defaults and makes no start/pickup request',async()=>{
 const ui=render();await ui.buttons.find(b=>b.label==='Prepare messenger loop').click();assert.equal(ui.calls[0].route,'/shared-jobs/job-id/messenger/prepare');assert.equal(ui.calls[0].body.maxRounds,3);assert.equal(ui.calls[0].body.timeoutSeconds,300);assert.equal(ui.calls.length,1);
});

test('one explicit run consent prepares exact scopes, verifies fresh state, then starts only the same job',async()=>{
 const loop={job_id:'job-id',status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true,true,false),run=ui.buttons.find(b=>b.label==='Run Big Three');assert.ok(run);assert.equal(ui.buttons.some(b=>b.label==='Prepare approved demo scopes'||b.label==='Start messenger loop'),false);await assert.rejects(()=>run.click(),/Check I approve/);assert.equal(ui.calls.length,0);ui.context.api=async(route,body)=>{ui.calls.push({route,body});return {};};ui.context.refresh=async()=>{ui.context.state.data.bigThree.demoWorkers.executionScopes=[{jobId:'job-id',valid:true}];};const consent=ui.checks.find(c=>c.label.startsWith('I approve this run:'));consent.input.checked=true;await run.click();assert.equal(ui.calls.length,2);assert.equal(ui.calls[0].route,'/demo-workers/job-id/approve-scopes');assert.equal(ui.calls[0].body.maximumUSD,0.01);assert.equal(ui.calls[0].body.confirmExactPaid,true);assert.equal(ui.calls[0].body.confirmNativeIncluded,true);assert.equal(ui.calls[1].route,'/shared-jobs/job-id/messenger/start');assert.equal(ui.calls[1].body.confirmLoop,true);
});

test('Run shows only missing setup and does not require a separate preparation action',()=>{
 const loop={job_id:'job-id',status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true);assert.equal(ui.buttons.find(b=>b.label==='Run Big Three').disabled,true);const info=ui.context.state.data.bigThree,missing=ui.context.demoRunMissing(info,info.jobs[0],loop,null).join(' ');assert.match(missing,/Catch Hook URL/);assert.doesNotMatch(missing,/Prepare approved demo scopes|Check I approve/);assert.ok(ui.elements.some(e=>e.text==='What is still needed'));assert.equal(ui.calls.length,0);
});

test('valid setup hides the yellow checklist but Run still requires its one consent',async()=>{
 const loop={job_id:'job-id',status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true,true),run=ui.buttons.find(b=>b.label==='Run Big Three');assert.equal(run.disabled,true);await assert.rejects(()=>run.click(),/Check I approve/);const consent=ui.checks.find(c=>c.label.startsWith('I approve this run:'));consent.input.checked=true;consent.input.onchange();assert.equal(run.disabled,false);assert.equal(ui.calls.length,0);const checklist=ui.elements.find(e=>e.className==='callout warn');assert.ok(checklist.hidden);consent.input.checked=false;consent.input.onchange();assert.equal(run.disabled,true);assert.ok(checklist.hidden);
});

test('non-ready demo still shows disabled Run and names its state without a reset',()=>{
 const loop={job_id:'job-id',status:'paused',round:1,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true,true);assert.equal(ui.buttons.find(b=>b.label==='Run Big Three').disabled,true);const info=ui.context.state.data.bigThree;assert.match(ui.context.demoRunMissing(info,info.jobs[0],loop,{valid:true}).join(' '),/loop is paused/);assert.equal(ui.calls.length,0);
});

test('saving delivery choice keeps a saved URL private; clearing is an explicit separate action',async()=>{
 const ui=render([],null,false,true);await ui.buttons.find(b=>b.label==='Save webhook setting').click();assert.equal(ui.calls[0].route,'/settings/webhook');assert.equal(Object.hasOwn(ui.calls[0].body,'url'),false);assert.equal(ui.calls[0].body.enabled,true);await ui.buttons.find(b=>b.label==='Clear saved webhook').click();assert.equal(ui.calls[1].body.url,'');assert.equal(ui.calls[1].body.enabled,false);
});

test('failed or unknown preparation never sends Start or retries preparation',async()=>{
 const loop={job_id:'job-id',status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true,true,false);ui.checks.find(c=>c.label.startsWith('I approve this run:')).input.checked=true;ui.context.api=async(route,body)=>{ui.calls.push({route,body});throw Error('Preparation outcome unknown');};await assert.rejects(()=>ui.buttons.find(b=>b.label==='Run Big Three').click(),/unknown/);assert.equal(ui.calls.length,1);assert.ok(ui.calls[0].route.endsWith('/approve-scopes'));
});
test('a Stop or stale scope after preparation prevents Start using the refreshed state',async()=>{
 const loop={job_id:'job-id',status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true,true,false);ui.checks.find(c=>c.label.startsWith('I approve this run:')).input.checked=true;ui.context.refresh=async()=>{const info=ui.context.state.data.bigThree;info.messenger.loops[0].status='stopped';info.demoWorkers.executionScopes=[{jobId:'job-id',valid:true}];};await assert.rejects(()=>ui.buttons.find(b=>b.label==='Run Big Three').click(),/loop is stopped/);assert.equal(ui.calls.length,1);assert.ok(!ui.calls.some(c=>c.route.endsWith('/start')));
});
test('concurrent clicks cannot prepare twice; an existing valid scope is never replenished',async()=>{
 const loop={job_id:'job-id',status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true,true,false);ui.checks.find(c=>c.label.startsWith('I approve this run:')).input.checked=true;let release;ui.context.api=async(route,body)=>{ui.calls.push({route,body});if(route.endsWith('/approve-scopes'))await new Promise(resolve=>release=resolve);return {};};ui.context.refresh=async()=>{ui.context.state.data.bigThree.demoWorkers.executionScopes=[{jobId:'job-id',valid:true}];};const run=ui.buttons.find(b=>b.label==='Run Big Three'),first=run.click();await run.click();assert.equal(ui.calls.length,1);release();await first;assert.equal(ui.calls.length,2);
 const valid=render([],loop,true,true);valid.checks.find(c=>c.label.startsWith('I approve this run:')).input.checked=true;await valid.buttons.find(b=>b.label==='Run Big Three').click();assert.equal(valid.calls.length,1);assert.ok(valid.calls[0].route.endsWith('/start'));
});
test('expired scope and completed demo cannot prepare, start, reset or spend again',async()=>{
 for(const complete of [false,true]){const loop={job_id:'job-id',status:complete?'finished':'ready',round:complete?3:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true,true);const info=ui.context.state.data.bigThree;info.demoWorkers.executionScopes[0].valid=false;if(complete)info.jobs[0].status='awaiting_owner';ui.checks.find(c=>c.label.startsWith('I approve this run:')).input.checked=true;await assert.rejects(()=>ui.buttons.find(b=>b.label==='Run Big Three').click(),complete?/finished/:/expired/);assert.equal(ui.calls.length,0);}
});
