import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual view's button handlers with a tiny display-only DOM.
// This is separate from the real-browser visual check and makes no model calls.
function render(results=[]){
 const source=fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8');const view=source.slice(source.indexOf('function bigThreeView('),source.indexOf('\nfunction teamView('));
 const buttons=[],badges=[],calls=[],checks=[],fields=[],node=()=>({children:[],append(...v){this.children.push(...v);}}),make=()=>node();
 const context={state:{data:{bigThree:{connections:{last:{result:results}},jobs:[{id:'job-id',task_id:'task-id',version:7,status:'ready',state:{goal:'Mock job',roles:{builder:'deepseek',tester:'codex-personal',reviewer:'claude-code'},currentStep:'Build',completedSteps:[],swaps:[]}}]},tasks:[]}},teamSection:make,el:make,add:(parent,...children)=>{parent.append(...children);return parent;},badge:text=>{badges.push(text);return text;},p:text=>text,callout:text=>text,panel:make,facts:make,date:String,button:(label,click)=>{const b={label,click};buttons.push(b);return b;},check:()=>{const c={wrap:node(),input:{checked:false}};checks.push(c);return c;},field:(name,value)=>{const f={name,wrap:node(),input:{value}};fields.push(f);return f;},api:async(route,body)=>{calls.push({route,body});return {};},refresh:async()=>{},notify:()=>{},openProject:()=>{}};
 vm.runInNewContext(view+'\nbigThreeView({});',context);return {buttons,badges,calls,checks,fields};
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
