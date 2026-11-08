import {ApiError} from '../middleware/errors.js';
import {transaction} from '../middleware/ai-validation.js';
import {hashText} from './project-files.js';
const now=()=>new Date().toISOString();

// A Studio handoff is a durable checkpoint transfer, not a worker. The trigger
// carries hashes and identities only. The callback is idempotent and can only
// release the one next role for the exact saved execution.
export class StudioHandoffs {
 constructor(studio,{waiters=new Map()}={}){
  this.studio=studio;this.db=studio.db;this.waiters=waiters;
 }
 get(id){const row=this.db.prepare('SELECT * FROM studio_handoffs WHERE id=?').get(id);if(!row)throw new ApiError(404,'Studio handoff not found');return {...row,detail:JSON.parse(row.detail)};}
 list(chat){return this.db.prepare('SELECT id FROM studio_handoffs WHERE chat_id=? ORDER BY created_at,id').all(chat).map(r=>this.get(r.id));}
 latest(chat){const rows=this.list(chat);return rows.at(-1)||null;}
 mode(){return this.studio.team.config.studioZapier?.enabled?'zapier':'local';}
 create({chat,phase,nextPhase,checkpointHash,testEvidenceHash=null,executionId=null}){
  const j=this.studio.get(chat);
  if(!['builder','tester'].includes(phase)||!['tester','reviewer'].includes(nextPhase)||!/^[a-f0-9]{64}$/.test(checkpointHash||''))throw new ApiError(409,'The saved checkpoint is not eligible for a Studio handoff.');
  const id='hof_'+hashText(JSON.stringify({chatId:chat,requestId:j.request_id,phase,checkpointHash,testEvidenceHash:testEvidenceHash||''})).slice(0,48);
  const existing=this.db.prepare('SELECT id FROM studio_handoffs WHERE id=?').get(id);
  if(existing)return this.get(id);
  const time=now(),mode=this.mode();
  const detail={handoffId:id,phase,nextPhase,checkpointHash,testEvidenceHash:testEvidenceHash||null,executionId:executionId||null,mode};
  transaction(this.db,()=>{
   this.db.prepare("INSERT INTO studio_handoffs(id,chat_id,project_id,request_id,phase,next_phase,checkpoint_hash,test_evidence_hash,status,mode,detail,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,? ,?,?,?,?)").run(id,chat,j.project_id,j.request_id,phase,nextPhase,checkpointHash,testEvidenceHash||null,'pending',mode,JSON.stringify(detail),time,time);
   this.studio.event(chat,'handoff_created',detail);
  });
  return this.get(id);
 }
 set(id,status,extra={}){
  const row=this.get(id),detail={...row.detail,...extra};
  this.db.prepare('UPDATE studio_handoffs SET status=?,detail=?,updated_at=?,delivered_at=CASE WHEN ? IS NOT NULL THEN ? ELSE delivered_at END,accepted_at=CASE WHEN ? IS NOT NULL THEN ? ELSE accepted_at END WHERE id=?').run(status,JSON.stringify(detail),now(),extra.deliveredAt||null,extra.deliveredAt||null,extra.acceptedAt||null,extra.acceptedAt||null,id);
  this.studio.event(row.chat_id,'handoff_'+status,detail);
  return this.get(id);
 }
 async send(id,{signal}={}){
  const row=this.get(id);
  if(['accepted','local','sent','delivered'].includes(row.status))return {status:row.status,handoffId:id};
  if(row.status!=='pending')return {status:row.status,handoffId:id,reason:row.detail.reason||'This handoff is no longer pending.'};
  if(row.mode==='local'){
   const saved=this.set(id,'local',{reason:'Zapier Studio handoffs are not enabled; the existing local checkpoint transition was used.'});
   return {status:'local',handoffId:id,handoff:saved};
  }
  const webhook=this.studio.team.webhook;
  if(!webhook?.status().configured||!webhook?.status().enabled){
   const saved=this.set(id,'blocked',{reason:'Enable the saved Zapier Catch Hook before starting a Studio run.'});
   return {status:'blocked',handoffId:id,reason:saved.detail.reason,handoff:saved};
  }
  if(!this.studio.team.config.studioZapier?.callbackToken){
   const saved=this.set(id,'blocked',{reason:'STUDIO_ZAPIER_CALLBACK_TOKEN is not configured; no Next-role callback can be verified.'});
   return {status:'blocked',handoffId:id,reason:saved.detail.reason,handoff:saved};
  }
  this.set(id,'sending',{delivery:'sending'});
  const delivered=await webhook.sendStudioHandoff({handoffId:id,projectId:row.project_id,chatId:row.chat_id,requestId:row.request_id,phase:row.phase,nextPhase:row.next_phase,checkpointHash:row.checkpoint_hash,testEvidenceHash:row.test_evidence_hash,executionId:row.detail.executionId||null,createdAt:row.created_at},{signal});
  if(this.get(id).status==='accepted')return {status:'delivered',handoffId:id,handoff:this.get(id)};
  if(delivered.status==='delivered'||delivered.status==='already_attempted'){
   if(this.get(id).status==='accepted')return {status:'delivered',handoffId:id,handoff:this.get(id)};
   const saved=this.set(id,'sent',{deliveredAt:now(),delivery:delivered.status,httpStatus:delivered.httpStatus??null});
   return {status:'delivered',handoffId:id,handoff:saved};
  }
  const reason=delivered.status==='disabled'?'Zapier delivery is disabled.':delivered.status==='unknown'?'Zapier delivery outcome is unknown; no retry was made.':'Zapier delivery failed'+(delivered.httpStatus?' HTTP '+delivered.httpStatus:'')+'; no retry was made.';
  const saved=this.set(id,delivered.status==='unknown'?'unknown':'failed',{reason,delivery:delivered.status,httpStatus:delivered.httpStatus??null});
  return {status:saved.status,handoffId:id,reason,handoff:saved};
 }
 fallback(id,reason){
  const row=this.get(id);
  if(row.status==='local')return {status:'local',handoffId:id,handoff:row};
  if(row.status==='accepted')return {status:'accepted',handoffId:id,handoff:row};
  if(!['pending','sending','sent','failed','unknown','timed_out'].includes(row.status))throw new ApiError(409,'This handoff is not eligible for a local fallback.');
  const saved=this.set(id,'local',{fallback:true,fallbackReason:reason,fallbackAt:now()});
  return {status:'local',handoffId:id,handoff:saved};
 }
 wait(id,{signal,timeoutMs=this.studio.team.config.studioZapier?.handoffTimeoutMs||120000}={}){
  const row=this.get(id);
  if(row.status==='accepted'||row.status==='local')return Promise.resolve({accepted:true,status:row.status});
  if(row.status!=='sent')return Promise.resolve({accepted:false,status:row.status,reason:row.detail.reason||'The handoff is not awaiting a callback.'});
  return new Promise(resolve=>{
   let done=false,timer;
   const finish=value=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',stop);this.waiters.delete(id);resolve(value);};
   const stop=()=>finish({accepted:false,status:'stopped',reason:'The owner stopped the run while waiting for the callback.'});
   if(signal?.aborted)return stop();
   signal?.addEventListener('abort',stop,{once:true});
   this.waiters.set(id,value=>finish(value));
   timer=setTimeout(()=>{const saved=this.set(id,'timed_out',{reason:'No verified Zapier callback arrived before the handoff timeout. No retry was started.'});finish({accepted:false,status:'timed_out',reason:saved.detail.reason});},Math.max(1000,Math.min(900000,Number(timeoutMs)||120000)));
   timer.unref?.();
  });
 }
 accept(id,body={}, {source='zapier'}={}){
  const row=this.get(id);
  if(row.status==='accepted')return {status:'already_accepted',handoffId:id};
  if(!['sending','sent'].includes(row.status))throw new ApiError(409,'This handoff is not awaiting a verified callback.');
  if(body.handoffId!==id||body.chatId!==row.chat_id||body.requestId!==row.request_id||body.phase!==row.phase||body.nextPhase!==row.next_phase||body.checkpointHash!==row.checkpoint_hash||(body.testEvidenceHash??null)!==(row.test_evidence_hash??null)||body.action!=='continue')throw new ApiError(409,'The callback does not match the saved handoff, checkpoint and next role.');
  const j=this.studio.get(row.chat_id);
  if(j.request_id!==row.request_id||j.status!=='running'||j.state.phase!==row.phase||j.state.activeExecutionId)throw new ApiError(409,'The run moved before this callback; no duplicate next role was started.');
  const repo=this.studio.root(j.project_id);
  if(repo.fingerprint()!==row.checkpoint_hash)throw new ApiError(409,'The saved checkpoint changed after the handoff; no next role was started.');
  return transaction(this.db,()=>{
   const live=this.db.prepare('SELECT status FROM studio_handoffs WHERE id=?').get(id);
   if(!live||!['sending','sent'].includes(live.status))throw new ApiError(409,'This handoff was already consumed or expired.');
   const saved=this.set(id,'accepted',{acceptedAt:now(),source,action:'continue'});
   this.waiters.get(id)?.({accepted:true,status:'accepted',handoffId:id,handoff:saved});
   return {status:'accepted',handoffId:id,nextPhase:row.next_phase};
  });
 }
}
