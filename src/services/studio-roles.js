import {ApiError} from '../middleware/errors.js';
import {transaction} from '../middleware/ai-validation.js';
import {defaultRoles} from './big-three.js';
export const studioRoleOrder=['builder','tester','reviewer'];
// Only transports actually supported by this runner appear here. Parked APIs and
// the unconfigured second Codex profile are not silently mapped to another CLI.
export class StudioRoles {
 constructor(studio){this.studio=studio;this.team=studio.team;this.db=studio.db;}
 workers(){const c=this.team.hubConnections.status();return [{id:'deepseek',name:'DeepSeek',configured:c.deepseekConfigured,model:c.deepseekModel},{id:'codex-personal',name:'Codex — Personal',configured:c.codexInstalled&&!!this.studio.workers.profiles?.configured('codex-personal'),model:null},{id:'codex-school',name:'Codex — School',configured:c.codexInstalled&&!!this.studio.workers.profiles?.configured('codex-school'),model:null},{id:'claude-code',name:'Claude Code',configured:c.claudeInstalled,model:null}].map(w=>({...w,compatible:true,accountStatus:'Current login, quota and inference not checked by saving roles'}));}
 get(projectId){this.team.store.project(projectId);const row=this.db.prepare('SELECT * FROM studio_role_preferences WHERE project_id=?').get(projectId);return {projectId,roles:row?JSON.parse(row.roles):{...defaultRoles},order:row?JSON.parse(row.display_order):[...studioRoleOrder],version:row?.version||0,workers:this.workers()};}
 validate(roles,authors=[]){if(!roles||Object.values(roles).some(id=>!['deepseek','codex-personal','codex-school','claude-code'].includes(id)))throw new ApiError(400,'Choose a compatible project worker; parked providers have no project-worker transport');return this.team.coordinator.validateRoles(roles,authors);}
 update(projectId,body){this.team.fields(body,['version','chatId','chatVersion','roles','rotate','order'],['version']);return transaction(this.db,()=>{
  const prior=this.get(projectId);if(!Number.isSafeInteger(body.version)||body.version!==prior.version)throw new ApiError(409,'Role settings changed. Refresh before saving.');
  const chat=body.chatId?this.studio.get(body.chatId):null;if(chat&&(chat.project_id!==projectId||!Number.isSafeInteger(body.chatVersion)||body.chatVersion!==chat.version))throw new ApiError(409,'The session changed or belongs to another project. Refresh first.');
  if(body.rotate!==undefined&&typeof body.rotate!=='boolean'||body.roles&&body.rotate===true)throw new ApiError(400,'Choose assignments or rotation, not both');
  const changesRoles=body.roles!==undefined||body.rotate===true,before=chat?.state.pendingRoles||chat?.state.roles||prior.roles;
  const next=changesRoles?this.validate(body.rotate?{builder:before.reviewer,tester:before.builder,reviewer:before.tester}:body.roles,chat?.state.authors||[]):prior.roles;
  const order=body.order??prior.order;if(!Array.isArray(order)||order.length!==3||[...order].sort().join(',')!==[...studioRoleOrder].sort().join(','))throw new ApiError(400,'Move the three role cards without changing their assignments');
  this.db.prepare('INSERT INTO studio_role_preferences VALUES (?,?,?,1,?) ON CONFLICT(project_id) DO UPDATE SET roles=excluded.roles,display_order=excluded.display_order,version=version+1,updated_at=excluded.updated_at').run(projectId,JSON.stringify(next),JSON.stringify(order),new Date().toISOString());
  let queued=false;if(chat&&changesRoles){queued=['running','stopping','awaiting_owner','accepted'].includes(chat.status)||!!this.db.prepare('SELECT 1 FROM studio_locks WHERE chat_id=?').get(chat.id);this.studio.change(chat.id,chat.status,queued?{pendingRoles:next}:{roles:next,pendingRoles:null},queued?'roles_queued':'roles_changed','owner');}
  if(!chat||!changesRoles)this.team.fileActions?.record(projectId,changesRoles?'project_roles_changed':'role_positions_changed',{roles:next,order});
  return {...this.get(projectId),queued,chat:chat?this.studio.get(chat.id):null};
 });}
}
