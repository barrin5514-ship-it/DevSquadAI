// Project setup is local. Inspect/confirm never starts an AI worker. Opening a
// folder registers it in place; file uploads are not used as folder permission.
(() => {
 let current=null,searchText='',selecting=false;const selected=new Set();const drafts={created:{},folder:{},github:{}};
 async function open(project,s,defaults=false){s.studioProject=project.id;const chat=s.data.studio.chats.find(c=>c.project_id===project.id);s.studioChat=chat?.id||null;if(chat)await loadStudioChat(chat.id);go('demo');if(defaults&&project.defaultLayout)window.workspaceShell?.usePreset(project.defaultLayout);}
 function renderSetup(c){const {kind}=c,setup=el('div','project-setup');c.root.append(setup);
  const form=el('div','project-setup-form'),draft=drafts[kind],fields={name:field('Project name',draft.name||''),description:field('Description',draft.description||'','textarea',{required:false})};
  if(kind==='folder'){fields.folder=field('Existing project folder',draft.folder||'','text',{required:true,placeholder:'C:\\Projects\\MyExistingApp'});form.append(p('Choose a folder in Windows, or right-click it in File Explorer and use Copy as path. Inspect and confirm before connecting. File uploads do not grant access to a project folder.','hint'));}
  else{fields.folder=field('Project location',draft.folder||'','text',{required:kind==='github',placeholder:kind==='created'?'Leave blank for a new Dev Squad managed folder':'Full path to a NEW folder; its parent must exist'});fields.repository=field('GitHub repository URL',draft.repository||'','url',{required:kind==='github',placeholder:'https://github.com/OWNER/REPOSITORY'});if(kind==='created')form.append(p('Optional repository URL initializes a local Git origin only. It does not fetch, commit or push.','hint'));else form.append(p('Public HTTPS repositories only. No login, handoff token, scripts, dependency installation or submodules. Private repositories can be cloned separately with your trusted Git client, then opened as an existing folder.','hint'));}
  fields.defaultLayout=field('Default workspace layout',draft.defaultLayout||'conversation','select',{choices:[['conversation','Conversation focus'],['development','Development focus'],['preview','Preview focus'],['balanced','Balanced workspace']]});for(const item of Object.values(fields))form.append(item.wrap);let initialize=null;if(kind==='created'){const label=el('label','check'),input=el('input');input.type='checkbox';input.checked=draft.initializeGit===true;label.append(input,el('span','','Initialize Git for a custom destination (managed folders include Git automatically)'));initialize=input;form.append(label);}
  const review=el('section','project-confirmation');review.setAttribute('aria-live','polite');const update=()=>{for(const [key,f] of Object.entries(fields))draft[key]=f.input.value;draft.initializeGit=initialize?.checked||false;review.replaceChildren();};for(const f of Object.values(fields)){f.input.oninput=update;f.input.onchange=update;}if(initialize)initialize.onchange=update;
  c.pick=async()=>{if(!c.s.data.studio.fileCapabilities?.nativeFolderDialog){notify('Windows folder selection is unavailable. Paste the existing folder path, then Inspect selection.');return;}notify('Windows folder picker is open. Select an existing folder or Cancel; it closes after five minutes. If behind another window, use Alt+Tab.');const result=await api('/studio/folder-dialog',{});if(current!==c||!c.dialog.modal.isConnected)return;if(result.cancelled){notify('Folder selection cancelled. Nothing was connected.');return;}fields.folder.input.value=result.folder;if(!fields.name.input.value.trim())fields.name.input.value=result.folder.split(/[\\/]/).filter(Boolean).at(-1);update();notify('Folder selected. Inspect it, then confirm registration.');};if(kind==='folder'&&c.s.data.studio.fileCapabilities?.nativeFolderDialog)form.append(button('Choose Folder in Windows',c.pick,'quiet'));
  form.append(button('Inspect selection',async()=>{update();const body={kind,name:draft.name,description:draft.description,defaultLayout:draft.defaultLayout||'conversation',...(draft.folder?.trim()?{folder:draft.folder.trim()}:{}),...(kind!=='folder'&&draft.repository?.trim()?{repository:draft.repository.trim()}:{}),...(kind==='created'?{initializeGit:draft.initializeGit}: {})};const value=await api('/studio/project-connections/inspect',body);if(current!==c||!c.dialog.modal.isConnected)return;review.replaceChildren(el('h3','','Confirm this project'),p(value.name),p(value.folder,'project-root'),p(value.agentChangesAllowed?'Access: writable by the assigned team. No worker starts during creation.':'Access: read-only. No worker starts and no existing source files are changed.','hint'));if(value.repositoryURL)review.append(p('Repository: '+value.repositoryURL));if(value.detected){review.append(p(value.detected.repository.available?'Git branch: '+value.detected.repository.branch:value.detected.repository.reason,'hint'));if(value.detected.package?.name)review.append(p('Detected package: '+value.detected.package.name));const files=el('ul','folder-preview');for(const e of value.detected.entries)files.append(el('li','',(e.type==='directory'?'▸ ':'')+e.path));review.append(files);if(value.detected.truncated)review.append(p('Showing a bounded preview. All supported files remain browsable after registration.','hint'));}review.append(button(kind==='folder'?'Register Existing Folder':kind==='github'?'Clone and register':'Create project',async()=>{const result=await api('/studio/project-connections/confirm',{receipt:value.receipt,confirmed:true});if(result.job){poll(c,result.job,review).catch(e=>{if(review.isConnected)review.append(p(e.message,'form-error'));});return;}await finish(c,result.project,result.warning);},'primary'));},'primary'),review);setup.append(form);
 }
 async function finish(c,project,warning){await refresh(false);if(current!==c||!c.dialog.modal.isConnected)return;if(warning)notify(warning,true);c.dialog.close();await open(project,c.s,true);}
 async function poll(c,job,area){area.replaceChildren(p(job.message,'clone-progress'));for(let attempt=0;attempt<300;attempt++){if(current!==c||!area.isConnected)return;const result=await api('/studio/project-connections/clones/'+job.id);area.replaceChildren(p(result.status.toUpperCase(),'clone-progress'),p(result.message));if(result.status==='complete'){area.append(button('Open cloned workspace',()=>finish(c,result.project),'primary'));await refresh(false);return;}if(result.status==='failed')return;await new Promise(resolve=>setTimeout(resolve,500));}area.append(p('Stopped waiting for progress. No retry was sent. Check the new destination before starting another clone.','form-error'));}
 function gallery(root){root.append(p('Archived design samples only. The active application uses one charcoal/navy design; fictional samples below do not represent live projects.','hint'));const frame=el('iframe','style-archive');frame.title='Archived style comparison — fictional data';frame.src='/team/style-preview/content';frame.setAttribute('sandbox','');root.append(frame);}
 async function guide(root){const box=panel('Zapier setup instructions');root.append(box);const value=await api('/studio/help/zapier');if(box.isConnected)box.append(el('pre','documentation-text',value.text),button('Open integration settings',()=>go('settings'),'quiet'));}

 function setAccess(project){
  return api('/studio/projects/'+project.id+'/access',{enabled:!project.agentChangesAllowed,version:project.accessVersion,approvedBy:'owner'}).then(()=>refresh());
 }
 function edit(project){
  const d=window.workspaceControls.dialog('Edit project'),name=field('Project name',project.name),description=field('Description',project.description||'','textarea',{required:false});
  d.body.append(name.wrap,description.wrap);
  const layout=project.accessVersion==null?null:field('Default workspace layout',project.defaultLayout,'select',{choices:[['conversation','Conversation focus'],['development','Development focus'],['preview','Preview focus'],['balanced','Balanced workspace']]});
  if(layout)d.body.append(layout.wrap);
  d.action('Save project settings',async()=>{
   await api('/studio/projects/'+project.id+'/settings',{name:name.input.value,description:description.input.value,version:project.settingsVersion,...(layout?{defaultLayout:layout.input.value}:{})});
   d.close();await refresh();
   if(layout&&layout.input.value!==project.defaultLayout&&state.studioProject===project.id)window.workspaceShell?.usePreset(layout.input.value);
  });
 }
 async function deleteProject(s,project){
  await api('/studio/projects/'+project.id+'/delete',{approvedBy:'owner',confirm:true});
  selected.delete(project.id);
  if(s.studioProject===project.id){s.studioProject=null;s.studioChat=null;}
 }
 function confirmDelete(s,project){
  const d=window.workspaceControls.dialog('Delete Project');
  d.body.append(p('Delete “'+project.name+'” from Dev Squad? Its files remain on disk and execution history is retained.'));
  d.action('Delete Project',async()=>{await deleteProject(s,project);d.close();await refresh();},'danger');
 }
 function deleteSelection(s,rows){
  const projects=rows.map(row=>row.project).filter(project=>selected.has(project.id));
  if(!projects.length)return;
  const count=projects.length,noun=count===1?'project':'projects';
  const d=window.workspaceControls.dialog('Delete selected projects');
  d.body.append(p('Delete '+count+' selected '+noun+'? This removes them from Dev Squad. Their files remain on disk and execution history is retained.'),p('Projects with running or stopping work will be skipped and reported.','hint'));
  d.action('Delete '+count+' '+noun,async()=>{
   const results=[];
   for(const project of projects){
    try{await deleteProject(s,project);results.push({name:project.name,status:'deleted'});}
    catch(e){results.push({name:project.name,status:'skipped',reason:e.message});}
   }
   d.close();await refresh();
   const report=window.workspaceControls.dialog('Project delete results');
   report.body.append(p(results.filter(r=>r.status==='deleted').length+' deleted; '+results.filter(r=>r.status==='skipped').length+' skipped.','hint'));
   for(const item of results)report.body.append(p(item.name+': '+item.status+(item.reason?' — '+item.reason:''),item.reason?'form-error':''));
   report.action('Close',()=>report.close(),'quiet');
  },'danger');
 }
 async function unfinishedWorkspaces(){
  const items=await api('/studio/workspace-initializations'),d=window.workspaceControls.dialog('Unfinished workspaces');
  if(!items.length)d.body.append(p('No unfinished workspace setup.'));
  for(const item of items)d.body.append(p(item.name+' — '+item.phase),button('Recover '+item.name,async()=>{await api('/studio/workspace-initializations/'+item.id+'/recover',{approvedBy:'owner'});d.close();await refresh();},'quiet'));
 }
 function removedProjects(projects){
  const d=window.workspaceControls.dialog('Removed projects');
  d.body.append(p('Folders and history are preserved. Restoring a project keeps its existing permissions.'));
  for(const project of projects)d.body.append(el('h3','',project.name),button('Restore '+project.name,()=>{d.close();return window.workspaceNavigation.membership(project,false);},'quiet'));
 }
 function mountManagement(panel,projects,s,rows){
  const search=field('Search projects',searchText,'search',{required:false}),toolbar=el('div','sidebar-project-toolbar');
  const select=button('Select projects',()=>{selecting=!selecting;if(!selecting)selected.clear();sync();},'quiet');
  const bulk=el('div','sidebar-project-bulk'),all=el('input'),allLabel=el('label','check'),remove=button('Delete selected',()=>deleteSelection(s,rows),'danger');
  all.type='checkbox';all.setAttribute('aria-label','Select all visible projects');
  allLabel.append(all,el('span','','Select all visible'));
  bulk.append(allLabel,remove);toolbar.append(search.wrap,select,bulk);panel.insertBefore(toolbar,projects);
  const ids=new Set(rows.map(({project})=>project.id));
  for(const id of selected)if(!ids.has(id))selected.delete(id);
  for(const entry of rows){
   const {project,row}=entry,check=el('input','project-select');check.type='checkbox';check.setAttribute('aria-label','Select '+project.name);
   check.onchange=()=>{check.checked?selected.add(project.id):selected.delete(project.id);sync();};
   row.insertBefore(check,row.children[0]);entry.check=check;
  }
  function sync(){
   const query=searchText.trim().toLowerCase();
   for(const {project,section,row,check} of rows){
    section.hidden=!(project.name+' '+(project.description||'')).toLowerCase().includes(query);
    row.dataset.selecting=String(selecting);check.hidden=!selecting;check.checked=selected.has(project.id);
   }
   const visible=rows.filter(({section})=>!section.hidden),visibleSelected=visible.filter(({check})=>check.checked).length;
   all.checked=visible.length>0&&visibleSelected===visible.length;all.indeterminate=visibleSelected>0&&visibleSelected<visible.length;
   bulk.hidden=!selecting;select.textContent=selecting?'Done selecting':'Select projects';select.disabled=!rows.length;
   remove.disabled=!selected.size;remove.textContent=selected.size?'Delete selected ('+selected.size+')':'Delete selected';
  }
  all.onchange=()=>{for(const {project,section} of rows)if(!section.hidden){all.checked?selected.add(project.id):selected.delete(project.id);}sync();};
  search.input.oninput=()=>{searchText=search.input.value;sync();};sync();
  const footer=el('div','sidebar-project-footer'),removed=s.data.studio.projects.filter(p=>p.workspaceHidden);
  if(removed.length)footer.append(button('Removed projects ('+removed.length+')',()=>removedProjects(removed),'text-button'));
  footer.append(button('Unfinished workspaces',unfinishedWorkspaces,'text-button'));panel.append(footer);
 }
 async function start(value,pick=false,s=state){
  const dialog=window.workspaceControls.dialog({created:'Create New Project',folder:'Open Existing Folder',github:'Clone GitHub Repository'}[value]);
  const c={root:dialog.body,dialog,s,kind:value};current=c;renderSetup(c);
  if(pick)await c.pick();
 }
 window.workspaceProjects={mountManagement,open,edit,setAccess,confirmDelete,gallery,guide,start};
})();
