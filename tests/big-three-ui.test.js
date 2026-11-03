import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual view's button handlers with a tiny display-only DOM.
// This is separate from the real-browser visual check and makes no model calls.
function render(results=[],loop=null,demo=false,ready=false){
 const source=fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8');const view=source.slice(source.indexOf('function messengerView('),source.indexOf('\nfunction teamView('));
 const buttons=[],badges=[],calls=[],checks=[],fields=[],elements=[],node=()=>({children:[],append(...v){this.children.push(...v);},replaceChildren(...v){this.children=[...v];}}),make=()=>node();
 const context={state:{data:{bigThree:{messenger:{loops:loop?[loop]:[],github:{ready},liveWorkersAvailable:demo},demoWorkers:demo?{isolation:{ready:true,reason:'Mock verified boundary'},includedUsage:'Owner confirmed',paid:'No active scope',executionScopes:ready?[{jobId:'job-id',valid:true}]:[]}:null,webhook:{configured:ready,enabled:ready},connections:{last:{result:results}},jobs:[{id:'job-id',task_id:'task-id',version:7,status:'ready',state:{goal:'Mock job',demoJobId:demo?'job-id':undefined,roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},currentStep:'Build',completedSteps:[],swaps:[]}}]},tasks:[]}},teamSection:make,el:(tag,cls,text)=>{const n=node();n.text=text;elements.push(n);return n;},add:(parent,...children)=>{parent.append(...children);return parent;},badge:text=>{badges.push(text);return text;},p:text=>text,callout:text=>text,panel:make,facts:make,date:String,button:(label,click)=>{const b={label,click};buttons.push(b);return b;},check:label=>{const c={label,wrap:node(),input:{checked:false}};checks.push(c);return c;},field:(name,value)=>{const f={name,wrap:node(),input:{value}};fields.push(f);return f;},api:async(route,body)=>{calls.push({route,body});return {};},refresh:async()=>{},notify:()=>{},openProject:()=>{}};
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

test('demo scope preparation needs its own exact-cost consent and never starts the loop',async()=>{
 const loop={job_id:'job-id',status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true),prepare=ui.buttons.find(b=>b.label==='Prepare approved demo scopes');assert.ok(prepare);await assert.rejects(()=>prepare.click(),/Confirm/);assert.equal(ui.calls.length,0);ui.checks.find(c=>c.label.includes('exact demo scopes')).input.checked=true;await prepare.click();assert.equal(ui.calls[0].route,'/demo-workers/job-id/approve-scopes');assert.equal(ui.calls[0].body.maximumUSD,0.01);assert.equal(ui.calls[0].body.confirmExactPaid,true);assert.ok(ui.calls.every(c=>!c.route.includes('/messenger/start')&&!c.route.includes('/hello')));assert.equal(ui.buttons.find(b=>b.label==='Start messenger loop').disabled,true);
});

test('Start stays visible and explains missing scopes, webhook and unchecked loop consent',()=>{
 const loop={job_id:'job-id',status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true);assert.ok(ui.buttons.find(b=>b.label==='Start messenger loop'));assert.equal(ui.buttons.find(b=>b.label==='Start messenger loop').disabled,true);const info=ui.context.state.data.bigThree,job=info.jobs[0],missing=ui.context.messengerStartMissing(info,job,loop,null,false).join(' ');assert.match(missing,/Catch Hook URL/);assert.match(missing,/Prepare approved demo scopes/);assert.match(missing,/Check I approve/);assert.ok(ui.elements.some(e=>e.text==='Why Start is not available yet'));assert.equal(ui.calls.length,0);
});
test('even valid scopes cannot enable Start until its separate consent is checked',async()=>{
 const loop={job_id:'job-id',status:'ready',round:0,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true,true),start=ui.buttons.find(b=>b.label==='Start messenger loop');assert.equal(start.disabled,true);await assert.rejects(()=>start.click(),/Check I approve/);const consent=ui.checks.find(c=>c.label.startsWith('I approve this bounded loop'));consent.input.checked=true;consent.input.onchange();assert.equal(start.disabled,false);assert.equal(ui.calls.length,0);consent.input.checked=false;consent.input.onchange();assert.equal(start.disabled,true);
});
test('non-ready loop still shows disabled Start and names its state without offering a reset',()=>{
 const loop={job_id:'job-id',status:'paused',round:1,max_rounds:3,wait_ms:300000,rounds:[],events:[]},ui=render([],loop,true,true);assert.equal(ui.buttons.find(b=>b.label==='Start messenger loop').disabled,true);assert.match(ui.context.messengerStartMissing(ui.context.state.data.bigThree,ui.context.state.data.bigThree.jobs[0],loop,{valid:true},true).join(' '),/loop is paused/);assert.equal(ui.calls.length,0);
});
test('saving delivery choice keeps a saved URL private; clearing is an explicit separate action',async()=>{
 const ui=render([],null,false,true);await ui.buttons.find(b=>b.label==='Save webhook setting').click();assert.equal(ui.calls[0].route,'/settings/webhook');assert.equal(Object.hasOwn(ui.calls[0].body,'url'),false);assert.equal(ui.calls[0].body.enabled,true);await ui.buttons.find(b=>b.label==='Clear saved webhook').click();assert.equal(ui.calls[1].body.url,'');assert.equal(ui.calls[1].body.enabled,false);
});
