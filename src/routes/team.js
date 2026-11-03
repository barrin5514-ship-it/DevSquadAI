import {Router} from 'express';
import {object} from '../middleware/ai-validation.js';
export function teamRoutes(team){
 const r=Router(),send=(res,data,status=200)=>res.status(status).json({data});
 r.use((req,res,next)=>{if(req.method!=='GET'&&(req.headers.origin||req.headers['sec-fetch-site']==='cross-site'))return res.status(403).json({error:{message:'Use a trusted local API client for team actions'}});next();});
 r.get('/',(req,res)=>send(res,team.dashboard()));r.get('/tasks/:id',(req,res)=>send(res,team.detail(req.params.id)));
 r.post('/projects/:id/requests',(req,res)=>send(res,team.create(req.params.id,req.body),201));
 for(const [route,method] of [['plan','plan'],['approve-plan','approvePlan'],['assign','assign'],['manual-draft','manualDraft'],['tests','tests'],['packet','packet'],['review','review'],['complete','complete']])r.post('/tasks/:id/'+route,(req,res)=>send(res,team[method](req.params.id,req.body)));
 for(const [route,method] of [['start-plan','startPlan'],['verify-children','verifyParent']])r.post('/tasks/:id/'+route,(req,res)=>{object(req.body||{},[]);send(res,team[method](req.params.id));});
 r.post('/tasks/:id/run',async(req,res)=>send(res,await team.run(req.params.id,req.body)));
 return r;
}
