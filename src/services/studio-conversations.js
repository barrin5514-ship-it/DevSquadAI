import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
import {transaction} from '../middleware/ai-validation.js';
import {hashText} from './project-files.js';

const editable=['ready','paused','stopped'];
// Text attachments are stored with their message, never written into project source.
function attachment(studio,projectId,file){
 studio.team.fields(file,['name','content']);
 if(typeof file.name!=='string'||file.name.includes('/')||!/^.+\.(?:[cm]?js|jsx|tsx?|json|md|txt|html|css|py|go|rs|ya?ml)$/i.test(file.name))throw new ApiError(400,'Attach a small text or code file with a supported extension');
 studio.root(projectId).resolve(file.name);
 if(typeof file.content!=='string'||file.content.includes('\0')||Buffer.byteLength(file.content)>4096)throw new ApiError(400,'Each attachment must be text and at most 4 KB');
 return {name:file.name,content:file.content,bytes:Buffer.byteLength(file.content),hash:hashText(file.content)};
}
export function createSession(studio,projectId,body){
 studio.team.fields(body,[]);return studio.create(projectId,'',true);
}
export function saveMessage(studio,id,body,{inTransaction=false}={}){
 studio.team.fields(body,['text','attachments','references','submissionId'],['text','submissionId']);
 if(typeof body.text!=='string'||!body.text.trim()||body.text.length>4000)throw new ApiError(400,'Write a message of at most 4,000 characters');
 if(typeof body.submissionId!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(body.submissionId))throw new ApiError(400,'Invalid message submission');
 if(!Array.isArray(body.attachments||[])||(body.attachments||[]).length>2||!Array.isArray(body.references||[])||(body.references||[]).length>3)throw new ApiError(400,'Use at most two attachments and three project references');
 const save=()=>{
  let chat=studio.get(id);const original=chat,prior=studio.db.prepare("SELECT chat_id,content FROM studio_events WHERE kind IN ('message','message_queued') AND json_extract(content,'$.submissionId')=?").get(body.submissionId);
  const requestHash=hashText(JSON.stringify([body.text,body.attachments||[],body.references||[]]));
  if(prior){if(prior.chat_id!==id&&JSON.parse(prior.content).sourceChatId!==id)throw new ApiError(409,'This message belongs to another session');if(JSON.parse(prior.content).requestHash!==requestHash)throw new ApiError(409,'Message submission already used for different content');return studio.detail(prior.chat_id);}
  const followup=['awaiting_owner','accepted'].includes(chat.status);
  if(followup&&(!chat.state.review||!studio.detail(id).events.some(e=>e.kind==='independent_review'&&e.content.artifactHash===chat.state.review.artifactHash)))throw new ApiError(409,'No completed review record is available for a follow-up task');
  const active=['running','stopping'].includes(chat.status);if(!followup&&!active&&!editable.includes(chat.status))throw new ApiError(409,'Stop active work before adding a message.');
  const attachments=(body.attachments||[]).map(f=>attachment(studio,chat.project_id,f)),repo=studio.root(chat.project_id);
  const references=(body.references||[]).map(relative=>{const target=repo.resolve(relative);if(!fs.existsSync(target)||!fs.statSync(target).isFile()||fs.statSync(target).size>4096)throw new ApiError(400,'Choose an existing project text file of at most 4 KB');return {...attachment(studio,chat.project_id,{name:relative.split('/').at(-1),content:fs.readFileSync(target,'utf8')}),path:relative};});
  const text=body.text.trim(),goal=!followup&&chat.state.goal?chat.state.goal+'\nOwner follow-up: '+text:text;
  if(goal.length>16000)throw new ApiError(400,'This conversation is full. Start a new session to keep worker context bounded.');
  const content={text,attachments,references,submissionId:body.submissionId,requestHash,...(followup?{sourceChatId:id,reviewContext:{sourceChatId:id,reviewer:original.state.roles.reviewer,goal:original.state.goal,review:original.state.review,tests:original.state.tests}}:{})};studio.team.safe(content);
  for(const secret of studio.team.coordinator.configuredSecrets())if(secret&&JSON.stringify(content).includes(secret))throw new ApiError(400,'Credential values cannot be attached to a conversation');
  if(active){studio.event(chat.id,'message_queued',{...content,summary:'Saved while the worker is active. This message will be added when you explicitly resume this unfinished session.'});return studio.detail(chat.id);}
  if(followup){
   // Keep the conversation and its immutable review events, but start a new task attempt.
   const roles=studio.roleManager.validate(original.state.pendingRoles||original.state.roles,[]);
   chat={...original,state:{...original.state,roles,pendingRoles:null,goal:'',authors:[],tests:null,review:null,testProvenance:null,runApproval:null,failure:null,alert:null,currentAgent:null,activeExecutionId:null,writeAccess:null,requestId:null,builderCompleted:false,corrections:0,problems:[],repeat:{key:null,count:0,streaks:{}}}};
   delete chat.state.acceptedAt;
   studio.db.prepare('UPDATE studio_chats SET status=?,request_id=? WHERE id=? AND version=?').run('ready','followup-pending-'+randomUUID(),chat.id,original.version);
   studio.event(chat.id,'followup_origin',{sourceChatId:id,sourceRequestId:original.request_id,artifactHash:original.state.review.artifactHash,summary:'New Builder task in this conversation. Earlier reviews and owner decisions remain in history.'});
  }
  const explicitlyNamed=studio.db.prepare("SELECT 1 FROM studio_file_operations WHERE action='session_renamed' AND status='complete' AND json_extract(detail,'$.chatId')=? LIMIT 1").get(chat.id);
  studio.db.prepare('UPDATE studio_chats SET title=?,state=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(chat.state.goal||explicitlyNamed?chat.title:text.slice(0,100),JSON.stringify({...chat.state,goal,phase:'builder',tests:null,review:null}),new Date().toISOString(),chat.id,chat.version);
  studio.event(chat.id,'message',content);return studio.detail(chat.id);
 };
 return inTransaction?save():transaction(studio.db,save);
}
export function conversationContext(studio,id,maxBytes=16000){
 const files=[],reviews=[];let bytes=0,truncated=false;
 const all=studio.detail(id).events,applied=new Set(all.filter(e=>e.kind==='queued_message_applied').map(e=>e.content.messageId));
 for(const event of all.filter(e=>e.kind!=='message_queued'||applied.has(e.id)))for(const file of [...(event.content.attachments||[]),...(event.content.references||[])]){const size=Buffer.byteLength(file.content);if(bytes+size>maxBytes){truncated=true;continue;}bytes+=size;files.push({name:file.path||file.name,content:file.content,hash:file.hash});}
 for(const event of studio.detail(id).events){const review=event.content.reviewContext;if(!review)continue;const size=Buffer.byteLength(JSON.stringify(review));if(bytes+size>maxBytes){truncated=true;reviews.push({sourceChatId:review.sourceChatId,artifactHash:review.review?.artifactHash,contextOmitted:true});continue;}bytes+=size;reviews.push(review);}
 return {files,reviews,truncated};
}
