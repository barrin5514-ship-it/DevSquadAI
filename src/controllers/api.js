import { validate } from '../middleware/validation.js';
import { listProviders } from '../providers/registry.js';
export function controllers(store, service) {
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
    agents: (req,res) => send(res,store.db.prepare('SELECT id,name,role,capabilities,status,provider_id FROM agents').all().map(a=>({...a,capabilities:JSON.parse(a.capabilities)}))),
    providers: (req,res) => send(res,listProviders(store.db))
  };
}
