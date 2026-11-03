import {createHash} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
const digest=value=>createHash('sha256').update(value).digest('hex');

// Snapshots contain app-owned draft data only; never read production files or .env.
export class Checkpoints {
 constructor(team){this.team=team;this.db=team.db;}
 save(id,reason){
  const t=this.team.get(id),parent=t.parent_id?this.team.get(t.parent_id):t;
  const draft=t.draft_id?this.db.prepare('SELECT id,files,content_hash,checks FROM generated_drafts WHERE id=?').get(t.draft_id):null;
  const children=this.db.prepare('SELECT task_id,state,description FROM team_jobs JOIN tasks ON tasks.id=team_jobs.task_id WHERE parent_id=? ORDER BY team_jobs.rowid').all(parent.task_id);
  const events=this.db.prepare('SELECT id,actor,detail,created_at FROM team_events WHERE task_id=? ORDER BY id DESC LIMIT 12').all(id);
  const tests=t.draft_id?this.db.prepare('SELECT * FROM draft_tests WHERE draft_id=?').get(t.draft_id)||null:null;
  const files=draft?JSON.parse(draft.files):[];
  const snapshot={version:1,projectId:t.project_id,taskId:id,originalRequirements:parent.description,taskObjective:t.description,approvedPlan:parent.owner_plan_approval?parent.plan:null,planApprovedAt:parent.owner_plan_approval||null,assignedDeveloper:t.model_key,author:t.author,completedSubtasks:children.filter(c=>c.state==='COMPLETED'),remainingSubtasks:children.filter(c=>c.state!=='COMPLETED'),codeChanges:files,modifiedFileReferences:files.map(f=>f.path),draftId:draft?.id||null,draftHash:draft?.content_hash||null,testResults:tests,knownErrors:events.filter(e=>/failed|provider_error|rate_limit|timeout|interrupted|unavailable|validation/i.test(e.detail)),stage:t.state,lastSuccessfulOperation:events.find(e=>/persisted|approved|recorded|accepted|Saved plan/i.test(e.detail))||null,nextAction:t.state==='COMPLETED'?'None':t.state==='AWAITING_REVIEW'?'External tests and owner-authorized DeepSeek review':t.state==='AWAITING_APPROVAL'?'Owner plan approval':t.blocker?'Owner-authorized resume from this checkpoint':'Continue remaining draft work; preserve completed changes',timestamp:new Date().toISOString()};
  const raw=JSON.stringify(snapshot);this.team.safe(snapshot);
  if(Buffer.byteLength(raw)>1000000)throw new ApiError(413,'Checkpoint exceeds safe storage policy');
  return this.db.prepare('INSERT INTO team_checkpoints(task_id,reason,snapshot,content_hash,created_at) VALUES (?,?,?,?,?) RETURNING id').get(id,reason,raw,digest(raw),snapshot.timestamp).id;
 }
 latest(id){const row=this.db.prepare('SELECT * FROM team_checkpoints WHERE task_id=? ORDER BY id DESC LIMIT 1').get(id);if(!row)return null;if(digest(row.snapshot)!==row.content_hash)throw new ApiError(409,'Checkpoint integrity verification failed');return {...row,snapshot:JSON.parse(row.snapshot)};}
 packet(id){const checkpoint=this.latest(id);if(!checkpoint)return null;const s=checkpoint.snapshot;
  if(s.draftId){const d=this.db.prepare('SELECT content_hash,files FROM generated_drafts WHERE id=? AND task_id=?').get(s.draftId,id);if(!d||d.content_hash!==s.draftHash||JSON.stringify(JSON.parse(d.files))!==JSON.stringify(s.codeChanges))throw new ApiError(409,'Checkpoint draft reconciliation failed');}
  const previous=s.draftId?this.db.prepare('SELECT files FROM generated_drafts WHERE task_id=? AND rowid<(SELECT rowid FROM generated_drafts WHERE id=?) ORDER BY rowid DESC LIMIT 1').get(id,s.draftId):null;
  const before=new Map((previous?JSON.parse(previous.files):[]).map(f=>[f.path,f.content])),after=new Map(s.codeChanges.map(f=>[f.path,f.content]));
  const existingDiffs=[...new Set([...before.keys(),...after.keys()])].filter(file=>before.get(file)!==after.get(file)).map(file=>({path:file,before:before.get(file)??null,after:after.get(file)??null}));
  return {checkpointId:checkpoint.id,checkpointHash:checkpoint.content_hash,...s,existingDiffs,diffBasis:previous?'Previous immutable draft':'Empty draft baseline; production files are not read',continuation:'Resume verified durable draft state, not an interrupted response. Inspect supplied draft files and test evidence; do not overwrite completed work. No production files have been applied.'};
 }
 list(id){return this.db.prepare('SELECT id,reason,content_hash,created_at FROM team_checkpoints WHERE task_id=? ORDER BY id DESC LIMIT 100').all(id);}
}
