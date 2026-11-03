import { validate } from '../middleware/validation.js';
import { listProviders } from '../providers/registry.js';
export function controllers(store, service, config={}) {
  const send = (res, data, status=200) => res.status(status).json({ data });
  return {
    health: (req,res) => { store.db.prepare('SELECT 1').get(); send(res,{status:'ok'}); },
    projects: (req,res) => send(res,store.projects()),
    createProject: (req,res) => send(res,service.create(validate(req.body,['name','description'],['name'])),201),
    project: (req,res) => send(res,store.project(req.params.id)),
    updateProject: (req,res) => send(res,store.updateProject(req.params.id,validate(req.body,['name','description','status']))),
    tasks: (req,res) => send(res,store.tasks(req.params.id)),
    createTask: (req,res) => send(res,store.createTask(req.params.id,validate(req.body,['description','assigned_agent'],['description'])),201),
    task: (req,res) => send(res,store.task(req.params.id)),
    agents: (req,res) => send(res,config.teamFocus==='big_three'?[
      {id:'codex',name:'ChatGPT / Codex',role:'rotating',capabilities:['implement','test','review'],status:'connector_required',provider_id:null},
      {id:'claude',name:'Claude Code',role:'rotating',capabilities:['implement','test','review'],status:'connector_required',provider_id:null},
      {id:'senior',name:'DeepSeek',role:'rotating',capabilities:['implement','test','review'],status:'authorization_required',provider_id:'deepseek'}
    ]:store.db.prepare('SELECT a.id,a.name,a.role,a.capabilities,a.status,a.provider_id FROM agents a JOIN active_team_agents t ON t.agent_id=a.id ORDER BY t.display_order').all().map(a=>({...a,capabilities:JSON.parse(a.capabilities)}))),
    providers: (req,res) => send(res,listProviders(store.db))
  };
}
