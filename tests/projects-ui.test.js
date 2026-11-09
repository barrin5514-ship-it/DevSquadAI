import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class N{
 constructor(tag,text=''){this.tagName=tag;this.text=text;this.children=[];this.dataset={};this.isConnected=true;}
 append(...items){for(const n of items){n.parent=this;this.children.push(n);}}
 insertBefore(node,before){const at=this.children.indexOf(before);this.children.splice(at<0?this.children.length:at,0,node);node.parent=this;}
 replaceChildren(...items){this.children=[];this.append(...items);}
 setAttribute(k,v){this[k]=v;}
 get textContent(){return this.text+this.children.map(n=>n.textContent).join('');}
 set textContent(v){this.text=String(v);this.children=[];}
}
const all=n=>[n,...n.children.flatMap(all)];
function fixture(native=true){
 const panel=new N('section'),projects=new N('div'),calls=[],dialogs=[],deleteFailures=new Set(),fields={};
 const data=['Alpha','Beta','Gamma'].map((name,index)=>({id:['a','b','c'][index],name,folder:'C:/Fixture/'+name,agentChangesAllowed:false,accessVersion:0,settingsVersion:'fixture',defaultLayout:'conversation'}));
 const state={studioProject:'a',data:{studio:{projects:data,fileCapabilities:{nativeFolderDialog:native}}}};
 const rows=data.map(project=>{const section=new N('section'),row=new N('div');row.append(new N('button',project.name));section.append(row);projects.append(section);return {project,row,section};});panel.append(projects);
 const el=(t,cls,text)=>Object.assign(new N(t,text),{className:cls||''}),button=(label,fn,cls)=>Object.assign(el('button',cls,label),{onclick:fn});
 const context=vm.createContext({window:{workspaceControls:{dialog:title=>{
  const d={title,modal:new N('dialog'),body:new N('div'),actions:[],close(){this.modal.isConnected=false;},action(label,fn,cls){this.actions.push({label,fn,cls});}};
  dialogs.push(d);return d;
 }}},state,el,button,p:t=>el('p','',t),field:(label,value)=>{
  const wrap=el('label','',label),input=el('input');input.value=value;wrap.append(input);fields[label]=input;return {wrap,input};
 },api:async(route,body)=>{
  calls.push({route,body});
  if(route.endsWith('/delete')&&deleteFailures.has(route.split('/')[3]))throw Error('Project not deleted. Active run is running');
  return {cancelled:true};
 },refresh:async()=>{},notify(){}});
 vm.runInContext(fs.readFileSync(new URL('../src/dashboard/projects.js',import.meta.url),'utf8'),context);
 const ui=context.window.workspaceProjects;ui.mountManagement(panel,projects,state,rows);
 return {panel,rows,state,fields,calls,ui,dialogs,deleteFailures,button:label=>all(panel).find(n=>n.tagName==='button'&&n.text===label)};
}

test('sidebar search and bulk selection use the existing project rows',()=>{
 const f=fixture(),[a,b]=f.rows;
 assert.equal(a.check.hidden,true);
 f.fields['Search projects'].value='Beta';f.fields['Search projects'].oninput();
 assert.equal(a.section.hidden,true);assert.equal(b.section.hidden,false);
 f.button('Select projects').onclick();
 assert.equal(b.check.hidden,false);
 const selectAll=all(f.panel).find(n=>n['aria-label']==='Select all visible projects');selectAll.checked=true;selectAll.onchange();
 assert.equal(a.check.checked,false);assert.equal(b.check.checked,true);
 assert.ok(f.button('Delete selected (1)'));
});

test('sidebar bulk delete confirms once, deletes selected IDs only and reports skips',async()=>{
 const f=fixture();f.button('Select projects').onclick();
 for(const {check} of f.rows.slice(0,2)){check.checked=true;check.onchange();}
 const remove=f.button('Delete selected (2)');assert.ok(remove);
 f.deleteFailures.add('b');remove.onclick();
 assert.equal(f.dialogs.length,1);assert.match(f.dialogs[0].body.textContent,/Delete 2 selected projects/);
 assert.equal(f.calls.length,0);
 await f.dialogs[0].actions[0].fn();
 assert.deepEqual(f.calls.map(x=>x.route),['/studio/projects/a/delete','/studio/projects/b/delete']);
 assert.match(f.dialogs[1].body.textContent,/1 deleted; 1 skipped/);assert.match(f.dialogs[1].body.textContent,/Beta: skipped/);
});

test('sidebar setup opens create, clone and folder dialogs without acting until confirmation',async()=>{
 const f=fixture();
 await f.ui.start('created');assert.equal(f.dialogs.at(-1).title,'Create New Project');assert.ok(f.fields['Project name']);
 f.dialogs.at(-1).close();await f.ui.start('github');assert.equal(f.dialogs.at(-1).title,'Clone GitHub Repository');assert.ok(f.fields['GitHub repository URL']);
 f.dialogs.at(-1).close();assert.equal(f.calls.length,0);
 for(const native of [true,false]){
  const g=fixture(native);await g.ui.start('folder',true);
  assert.equal(g.dialogs.at(-1).title,'Open Existing Folder');
  assert.ok(g.fields['Existing project folder']);
  assert.equal(g.calls.filter(x=>x.route==='/studio/folder-dialog').length,native?1:0);
 }
});

test('project options edit settings and use the separate owner access control',async()=>{
 const f=fixture(),project=f.rows[0].project;f.ui.edit(project);
 const d=f.dialogs.at(-1);assert.equal(d.title,'Edit project');
 f.fields['Project name'].value='Renamed Alpha';
 await d.actions[0].fn();await f.ui.setAccess(project);
 assert.equal(f.calls[0].route,'/studio/projects/a/settings');
 assert.equal(f.calls[0].body.name,'Renamed Alpha');
 assert.equal(f.calls[0].body.version,'fixture');
 assert.equal(f.calls[1].route,'/studio/projects/a/access');
 assert.equal(f.calls[1].body.approvedBy,'owner');
});
