import {randomUUID} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
import {transaction,choice,text} from '../middleware/ai-validation.js';
import {selectModels,categories} from './routing.js';
const now=()=>new Date().toISOString();

// One authorized operation, at most three distinct free models. Never a background loop.
export async function dispatchWithHandoffs(team,id,body,planning){
 team.fields(body,planning?['authorizeRequest','modelKey','allowFallback','category','operationId']:['authorizeRequest','allowFallback','category','operationId'],['authorizeRequest']);
 if(body.authorizeRequest!==true||!team.liveAllowed(id))throw new ApiError(403,'Live requests require server opt-in and separate explicit request authorization');
 if(body.allowFallback!==undefined&&typeof body.allowFallback!=='boolean')throw new ApiError(400,'Invalid fallback policy');
 if(team.taskGrant?.status(id)&&(planning||body.allowFallback===true))throw new ApiError(403,'Task scope forbids planning and fallback');
 const category=planning?'planning':choice(body.category||'coding',categories.filter(x=>x!=='review'),'category');
 const policy={planning,category,allowFallback:body.allowFallback===true,modelKey:body.modelKey||null};
 const operationId=body.operationId?text(body.operationId,'operationId',100):randomUUID();
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(operationId))throw new ApiError(400,'Invalid operation identifier');
 const old=team.db.prepare('SELECT * FROM team_operations WHERE id=?').get(operationId);
 if(old){if(old.task_id!==id||old.policy!==JSON.stringify(policy))throw new ApiError(409,'Operation identifier conflicts with an existing request');if(old.status==='completed')return JSON.parse(old.result);throw new ApiError(409,'Operation already started or interrupted; reconcile saved checkpoint before authorizing a new operation');}
 const initial=team.expect(id,planning?['PLANNING']:['ASSIGNED']);
 if(initial.attempts>=3)throw new ApiError(409,'Three-attempt task limit reached');
 if(!planning&&(!initial.parent_id||!team.get(initial.parent_id).owner_plan_approval))throw new ApiError(403,'Owner-approved plan required');
 const requested=planning?(body.modelKey||'groq'):initial.model_key;
 if(!team.models(id).find(m=>m.key===requested)?.available)throw new ApiError(409,'Assigned model is unavailable');
 transaction(team.db,()=>{
  if(team.db.prepare('SELECT 1 FROM team_task_locks WHERE task_id=?').get(id))throw new ApiError(409,'Task workspace is locked by another operation');
  team.db.prepare('INSERT INTO team_operations VALUES (?,?,?,\'started\',NULL,?,?)').run(operationId,id,JSON.stringify(policy),now(),now());
  team.db.prepare('INSERT INTO team_task_locks VALUES (?,?)').run(id,operationId);
  team.checkpoints.save(id,'Before authorized operation');
 });
 const tried=[];let result;
 try{
  let key=requested;
  while(key&&tried.length<3&&team.get(id).attempts<3){
   if(!team.liveAllowed(id))break;
   const model=team.models(id).find(m=>m.key===key);
   if(policy.allowFallback&&!selectModels(team,category).some(m=>m.key===key)){
    tried.push(key);key=selectModels(team,category,tried)[0]?.key;continue;
   }
   tried.push(key);
   if(key!==requested||tried.length>1){
    const checkpoint=team.checkpoints.packet(id);
    transaction(team.db,()=>{
     team.checkpoints.save(id,'Before switching providers');
     team.db.prepare('UPDATE team_jobs SET model_key=? WHERE task_id=?').run(key,id);
     const j=team.get(id);if(['FAILED','BLOCKED'].includes(j.state))team.move(id,planning?'PLANNING':'ASSIGNED','orchestrator','Resuming task from checkpoint '+checkpoint.checkpointId);
     team.event(id,team.get(id).state,team.get(id).state,'orchestrator',`SWITCHING PROVIDERS: ${tried[tried.length-2]} → ${key}; checkpoint ${checkpoint.checkpointId}; reason ${j.blocker||'Capacity unavailable'}`);
    });
   }
   // Old dispatch performs local budget, current-price, input and immutable-draft checks.
   const nextBody={authorizeRequest:true,...(planning?{modelKey:key}:{})};
   try{result=await team.dispatchAttempt(id,nextBody,planning);}
   catch(error){
    if(!policy.allowFallback)throw error;
    if(![429,503].includes(error.status))throw error;
    const state=team.get(id).state;
    if(['ASSIGNED','PLANNING'].includes(state))team.move(id,'BLOCKED','system',error.status===429?'Local budget or provider cooldown':'Provider unavailable');
    result=team.get(id);
   }
   if(!['FAILED','BLOCKED'].includes(result.state)){
    team.db.prepare('INSERT INTO team_model_health VALUES (?,0,0,NULL,?) ON CONFLICT(model_key) DO UPDATE SET failures=0,retry_at=0,last_code=NULL,updated_at=excluded.updated_at').run(key,now());
    break;
   }
   team.checkpoints.save(id,'After failed provider request');
   const health=team.db.prepare('SELECT failures FROM team_model_health WHERE model_key=?').get(key),failures=(health?.failures||0)+1;
   const limit=team.db.prepare('SELECT cooldown_until FROM team_provider_limits WHERE provider_id=?').get(model.provider);
   const retryAt=Math.max(limit?.cooldown_until||0,Date.now()+Math.min(3600000,1000*2**Math.min(failures,12))+Math.floor(Math.random()*251));
   team.db.prepare('INSERT INTO team_model_health VALUES (?,?,?,?,?) ON CONFLICT(model_key) DO UPDATE SET failures=excluded.failures,retry_at=excluded.retry_at,last_code=excluded.last_code,updated_at=excluded.updated_at').run(key,failures,retryAt,result.blocker,now());
   if(!policy.allowFallback)break;
   key=selectModels(team,category,tried)[0]?.key;
  }
  result=result||team.get(id);
  if(policy.allowFallback&&['ASSIGNED','PLANNING','BLOCKED','FAILED'].includes(result.state)){
   const exhausted=team.get(id).attempts>=3;
   const reason=exhausted?'Attempt limit reached; owner action required':'Waiting for free capacity; authorize resume when eligible';
   if(result.state!=='BLOCKED')team.move(id,'BLOCKED','system',reason);
   else {team.db.prepare('UPDATE team_jobs SET blocker=? WHERE task_id=?').run(reason,id);team.event(id,'BLOCKED','BLOCKED','system',reason);}
   result=team.get(id);
  }
  transaction(team.db,()=>{team.checkpoints.save(id,'Before operation pause or completion');team.db.prepare("UPDATE team_operations SET status='completed',result=?,updated_at=? WHERE id=?").run(JSON.stringify(result),now(),operationId);});
  return result;
 }catch(error){
  team.db.prepare("UPDATE team_operations SET status='interrupted',updated_at=? WHERE id=?").run(now(),operationId);
  throw error;
 }finally{team.db.prepare('DELETE FROM team_task_locks WHERE task_id=? AND operation_id=?').run(id,operationId);}
}

export async function resumeTask(team,id,body){
 team.fields(body,['authorizeRequest','allowFallback','category','operationId'],['authorizeRequest']);
 if(body.authorizeRequest!==true||!team.liveAllowed(id))throw new ApiError(403,'Owner must authorize resumed free requests');
 const j=team.expect(id,['BLOCKED','FAILED']);
 if(j.attempts>=3)throw new ApiError(409,'Attempt limit reached; preserve evidence and use manual review');
 const packet=team.checkpoints.packet(id);if(!packet)throw new ApiError(409,'No verified checkpoint exists');
 const planning=!j.parent_id;
 if(planning&&j.owner_plan_approval||!planning&&!team.get(j.parent_id).owner_plan_approval)throw new ApiError(409,'Outstanding owner plan approval blocks resume');
 const category=planning?'planning':choice(body.category||'coding',['coding','debugging','testing'],'category');
 const model=selectModels(team,category)[0];if(!model)throw new ApiError(429,'No eligible free capacity; wait for retry availability');
 transaction(team.db,()=>{team.db.prepare('UPDATE team_jobs SET model_key=? WHERE task_id=?').run(model.key,id);team.move(id,planning?'PLANNING':'ASSIGNED','owner','RESUMING TASK from verified checkpoint '+packet.checkpointId);});
 return dispatchWithHandoffs(team,id,{...body,...(planning?{modelKey:model.key}:{})},planning);
}
