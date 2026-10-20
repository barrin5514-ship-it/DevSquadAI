import { Router } from 'express';
import { object,text } from '../middleware/ai-validation.js';
export function aiRoutes(ai){
  const r=Router(),send=(res,data,status=200)=>res.status(status).json({data});
  // Browser-origin mutations are blocked; trusted local API clients remain supported.
  r.use((req,res,next)=>{if(req.method!=='GET'&&req.headers.origin)return res.status(403).json({error:{message:'Browser-origin AI mutations are not permitted'}});next();});
  r.get('/providers/availability',(req,res)=>send(res,ai.available()));
  r.get('/models',(req,res)=>send(res,ai.models()));
  r.post('/providers/:id/check',async(req,res)=>{object(req.body||{},[]);send(res,await ai.provider(req.params.id).check());});
  r.post('/agents/:id/models',(req,res)=>send(res,ai.assign(req.params.id,req.body)));
  r.get('/positions',(req,res)=>send(res,ai.db.prepare('SELECT * FROM positions').all().map(p=>({...p,permissions:JSON.parse(p.permissions)}))));
  r.post('/projects/:id/generate',async(req,res)=>send(res,await ai.generate(req.params.id,req.body),201));
  r.get('/drafts/:id',(req,res)=>send(res,ai.draft(req.params.id)));
  r.get('/tasks/:id/drafts',(req,res)=>send(res,ai.drafts(req.params.id)));
  r.get('/usage',(req,res)=>send(res,ai.usage.list(req.query)));
  r.get('/performance',(req,res)=>send(res,ai.db.prepare('SELECT * FROM agent_performance ORDER BY updated_at DESC LIMIT 100').all()));
  r.post('/mistakes',(req,res)=>send(res,ai.learning.mistake(req.body),201));
  r.get('/projects/:id/mistakes',(req,res)=>send(res,ai.learning.mistakes(req.params.id)));
  r.post('/mistakes/:id/corrections',(req,res)=>send(res,ai.learning.correction(req.params.id,req.body),201));
  r.post('/lessons',(req,res)=>send(res,ai.learning.lesson(req.body),201));
  r.post('/lessons/:id/approve',(req,res)=>send(res,ai.learning.approve(req.params.id,req.body)));
  r.get('/projects/:id/lessons',(req,res)=>send(res,ai.learning.retrieve(req.params.id,text(req.query.category||'coding','category',80),ai.config.ai.lessonChars)));
  r.post('/tasks/:id/tests',(req,res)=>send(res,ai.reviews.tests(req.params.id,req.body)));
  r.post('/tasks/:id/reviews',(req,res)=>send(res,ai.reviews.review(req.params.id,req.body),201));
  r.get('/tasks/:id/reviews',(req,res)=>send(res,ai.reviews.status(req.params.id)));
  r.post('/tasks/:id/approve',(req,res)=>send(res,ai.reviews.approve(req.params.id,req.body)));
  return r;
}
