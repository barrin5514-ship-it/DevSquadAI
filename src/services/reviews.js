import { randomUUID } from 'node:crypto';
import { ApiError } from '../middleware/errors.js';
import { object,text,choice,transaction } from '../middleware/ai-validation.js';
const now=()=>new Date().toISOString();
export class ReviewService {
  constructor(store,config){this.store=store;this.db=store.db;this.config=config;}
  workflow(taskId){if(this.db.prepare('SELECT 1 FROM team_jobs WHERE task_id=?').get(taskId))throw new ApiError(409,'Use team review endpoints for team tasks');this.store.task(taskId);const w=this.db.prepare('SELECT * FROM task_workflows WHERE task_id=?').get(taskId);if(!w)throw new ApiError(404,'Coding workflow not found');return w;}
  current(taskId,draftId){const w=this.workflow(taskId);if(w.current_draft_id!==draftId)throw new ApiError(409,'Review must reference the current draft');if(['completed','generating'].includes(w.state))throw new ApiError(409,'Task cannot be changed in its current state');return w;}
  tests(taskId,body){
    object(body,['draftId','passed','evidence','recordedBy'],['draftId','passed','evidence','recordedBy']);
    this.current(taskId,text(body.draftId,'draftId'));if(typeof body.passed!=='boolean')throw new ApiError(400,'Invalid passed');
    if(this.db.prepare("SELECT 1 FROM senior_reviews WHERE draft_id=? AND status='rejected'").get(body.draftId))throw new ApiError(409,'Rejected drafts require a new corrected draft');
    const evidence=text(body.evidence,'evidence'),by=text(body.recordedBy,'recordedBy',200);
    transaction(this.db,()=>{
      this.db.prepare('INSERT INTO draft_tests VALUES (?,?,?,?,?) ON CONFLICT(draft_id) DO UPDATE SET passed=excluded.passed,evidence=excluded.evidence,recorded_by=excluded.recorded_by,created_at=excluded.created_at').run(body.draftId,Number(body.passed),evidence,by,now());
      this.db.prepare("UPDATE task_workflows SET state=?,updated_at=? WHERE task_id=?").run(body.passed?'awaiting_senior_review':'needs_correction',now(),taskId);
    });return this.workflow(taskId);
  }
  review(){throw new ApiError(410,'Manual senior review workflows are retired. Use the owner-authorized DeepSeek team review workflow.');}

  approve(){throw new ApiError(410,'Legacy manual completion is retired. Preserve history and use the owner-authorized DeepSeek team workflow.');}

  status(taskId){return {workflow:this.workflow(taskId),hierarchy:{primary:'DeepSeek',reviewMode:'owner_authorized_paid',legacyWorkflowRetired:true},reviews:this.db.prepare('SELECT * FROM senior_reviews WHERE task_id=? ORDER BY rowid').all(taskId)};}
}
