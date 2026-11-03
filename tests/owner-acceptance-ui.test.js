import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the actual browser rendering/actions against a tiny in-memory DOM.
// No browser package, network, real database, or owner decision is involved.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.text='';this.style={};this.attributes={};this.checked=false;this.disabled=false;this.classList={add(){},toggle(){}};}
 append(...nodes){this.children.push(...nodes);}
 set textContent(value){this.text=String(value);this.children=[];}
 get textContent(){return this.text+this.children.map(n=>n.textContent??String(n)).join(' ');}
 setAttribute(k,v){this.attributes[k]=v;}
 removeAttribute(k){delete this.attributes[k];}
 addEventListener(){}
 replaceChildren(...nodes){this.children=nodes;}
}
function fixture(){
 const elements=new Map(),document={body:new Element('body'),createElement:tag=>new Element(tag),querySelectorAll:()=>[],getElementById:id=>{if(!elements.has(id))elements.set(id,new Element('div'));return elements.get(id);}};
 const context=vm.createContext({document,window:{scrollTo(){}},setTimeout:()=>0,clearTimeout(){},fetch:()=>new Promise(()=>{}),console});
 vm.runInContext(fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8')+'\nstate.busy=false; openProject=async(project,task)=>actions.push({project,task}); mutate=async(action,body)=>actions.push({action,body});',context);
 const parent={task_id:'plan',project_id:'project',parent_id:null,state:'ASSIGNED',description:'Owner plan'},child={task_id:'child',project_id:'project',parent_id:'plan',state:'VERIFIED',description:'Finite-number utility',draft_id:'revision'};
 Object.assign(context,{parent,child,actions:[],target:new Element('section')});
 vm.runInContext("state.data={tasks:[parent,child],capacity:[]};state.detail={draft:{id:'revision'},seniorReviews:[{task_id:'child',draft_id:'revision',status:'approved'}],checkpoints:[],history:[],packets:[],reviews:[],drafts:[],usage:[]};",context);
 const all=(node=context.target)=>[node,...node.children.flatMap(n=>n instanceof Element?all(n):[])];
 return {context,parent,child,get actions(){return context.actions;},all,render(code){vm.runInContext(code,context);},button(label){return all().find(n=>n.tagName==='button'&&n.textContent===label);}};
}
test('parent view identifies the pending owner decision and links to the exact child without accepting it',async()=>{
 const f=fixture();f.render('state.detail.draft=null;taskDetail(target,parent)');assert.match(f.context.target.textContent,/ACTIVE is the project status/);assert.match(f.context.target.textContent,/Awaiting your acceptance/);assert.equal(f.button('Verify completed project').disabled,true);
 const open=f.button('Open owner acceptance · Finite-number utility');assert.ok(open);await open.onclick();assert.equal(f.actions.length,1);assert.equal(f.actions[0].project,'project');assert.equal(f.actions[0].task,'child');assert.equal(f.actions[0].action,undefined);
});
test('project verification names unmet review/correction requirements and never offers acceptance for them',()=>{
 for(const [state,reason] of [['AWAITING_REVIEW',/Independent review is still pending/],['CHANGES_REQUESTED',/Corrections and a new independent review/],['ASSIGNED',/Task is ASSIGNED/]]){
  const f=fixture();f.child.state=state;f.render('projectCompletionControls(target,parent)');assert.match(f.context.target.textContent,reason);assert.equal(f.button('Verify completed project').disabled,true);assert.equal(f.button('Open owner acceptance · Finite-number utility'),undefined);assert.deepEqual(f.actions,[]);
 }
});
test('project verification becomes available only with completed children in this project and plan',()=>{
 const f=fixture();f.child.state='COMPLETED';f.render("state.data.tasks.push({task_id:'unrelated',parent_id:'other-plan',project_id:'other-project',state:'ASSIGNED'});projectCompletionControls(target,parent)");assert.equal(f.button('Verify completed project').disabled,false);assert.deepEqual(f.actions,[]);
 const empty=fixture();empty.render('state.data.tasks=[parent];projectCompletionControls(target,parent)');assert.equal(empty.button('Verify completed project').disabled,true);assert.match(empty.context.target.textContent,/no development tasks/);
});
test('eligible revision renders existing acceptance but still requires an explicit checked acknowledgement',async()=>{
 const f=fixture();f.render('acceptance(target,child)');const accept=f.button('Accept completed work');assert.ok(accept);assert.deepEqual(f.actions,[]);
 await accept.onclick();assert.equal(f.actions.length,0);const checkbox=f.all().find(n=>n.tagName==='input'&&n.type==='checkbox');assert.equal(checkbox.checked,false);checkbox.checked=true;await accept.onclick();assert.equal(f.actions.length,1);assert.equal(f.actions[0].action,'complete');assert.equal(f.actions[0].body.approvedBy,'owner');assert.equal(f.actions[0].body.approve,true);
});
test('missing current draft and historical/wrong-task/unapproved review never render acceptance',()=>{
 for(const setup of ["state.detail.draft=null","state.detail.seniorReviews=[]","state.detail.seniorReviews[0].draft_id='old'","state.detail.seniorReviews[0].task_id='other'","state.detail.seniorReviews[0].status='awaiting_authorization'","state.detail.seniorReviews[0].status='rejected'"]){const f=fixture();f.render(setup+';acceptance(target,child)');assert.equal(f.button('Accept completed work'),undefined);assert.match(f.context.target.textContent,/Owner acceptance unavailable/);assert.equal(f.actions.length,0);}
});
test('plain-English explanation appears above unchanged code and test pass meaning stays explanatory',()=>{
 const f=fixture();f.context.draft={id:'revision',files:JSON.stringify([{path:'test/add.test.js',content:'<script>doNotExecute()</script>'}])};
 f.render("state.detail.artifactSummaries={revision:[{path:'test/add.test.js',overview:'Checks addition.',parts:['Examples — try several inputs.'],testMeaning:'Pass means every check finished without failure.'}]};draftFiles(target,draft)");
 const nodes=f.all(),section=nodes.find(n=>n.className==='code-summary'),pre=nodes.find(n=>n.tagName==='pre');assert.ok(nodes.indexOf(section)<nodes.indexOf(pre));assert.match(section.textContent,/Checks addition/);assert.match(section.textContent,/Pass means/);assert.equal(pre.textContent,'<script>doNotExecute()</script>');assert.equal(pre.children.length,0);assert.equal(f.actions.length,0);
});
test('future or stale summaries have an honest fallback and still allow inspection of exact code',()=>{const f=fixture();f.context.draft={id:'new-revision',files:JSON.stringify([{path:'src/new.js',content:'export const value=1;'}])};f.render('draftFiles(target,draft)');assert.match(f.context.target.textContent,/has not been written for this version/);assert.equal(f.all().find(n=>n.tagName==='pre').textContent,'export const value=1;');assert.equal(f.actions.length,0);});
