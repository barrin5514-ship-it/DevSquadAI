import { randomUUID } from 'node:crypto';
import { ApiError } from '../middleware/errors.js';
import { object,text,choice,transaction } from '../middleware/ai-validation.js';
const now=()=>new Date().toISOString();
export class ReviewService {
  constructor(store,config){this.store=store;this.db=store.db;this.config=config;}
  workflow(taskId){this.store.task(taskId);const w=this.db.prepare('SELECT * FROM task_workflows WHERE task_id=?').get(taskId);if(!w)throw new ApiError(404,'Coding workflow not found');return w;}
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
  review(taskId,body){
    object(body,['draftId','reviewerIdentity','status','findings','requiredCorrections'],['draftId','reviewerIdentity','status','findings']);
    this.current(taskId,text(body.draftId,'draftId'));const reviewer=text(body.reviewerIdentity,'reviewerIdentity',200);
    if(/codex/i.test(reviewer)&&!this.config.allowCodexReview)throw new ApiError(403,'Codex backup review requires configured authorization');
    const status=choice(body.status,['approved','rejected'],'status'),findings=text(body.findings,'findings'),corrections=body.requiredCorrections?text(body.requiredCorrections,'requiredCorrections'):'';
    const tests=this.db.prepare('SELECT * FROM draft_tests WHERE draft_id=?').get(body.draftId);
    if(status==='approved'&&this.db.prepare("SELECT 1 FROM senior_reviews WHERE draft_id=? AND status='rejected'").get(body.draftId))throw new ApiError(409,'Rejected drafts require a new corrected draft');
    if(status==='approved'&&!tests?.passed)throw new ApiError(409,'Record passing test evidence before approval');
    if(status==='rejected'&&!corrections)throw new ApiError(400,'Rejected review requires corrections');
    const id=randomUUID();
    transaction(this.db,()=>{
      this.db.prepare("INSERT INTO senior_reviews VALUES (?,?,?,?,'manual',?,?,?,?)").run(id,taskId,body.draftId,reviewer,status,findings,corrections,now());
      this.db.prepare('UPDATE task_workflows SET state=?,updated_at=? WHERE task_id=?').run(status==='approved'?'eligible_for_user_approval':'needs_correction',now(),taskId);
      const draft=this.db.prepare('SELECT execution_id FROM generated_drafts WHERE id=?').get(body.draftId);
      const usage=this.db.prepare('SELECT * FROM usage_events WHERE execution_id=?').get(draft.execution_id);
      if(usage)this.db.prepare(`UPDATE agent_performance SET ${status==='approved'?'approved_reviews':'rejected_reviews'}=${status==='approved'?'approved_reviews':'rejected_reviews'}+1,updated_at=? WHERE agent_id=? AND provider_id=? AND model=? AND category=?`).run(now(),usage.agent_id,usage.provider_id,usage.model,this.workflow(taskId).category);
    });return this.db.prepare('SELECT * FROM senior_reviews WHERE id=?').get(id);
  }
  approve(taskId,body){
    object(body,['draftId','approvedBy'],['draftId','approvedBy']);const w=this.current(taskId,text(body.draftId,'draftId')),by=text(body.approvedBy,'approvedBy',200);
    if(w.state!=='eligible_for_user_approval')throw new ApiError(409,'Tests and senior approval are required first');
    transaction(this.db,()=>{
      this.db.prepare('INSERT INTO user_approvals VALUES (?,?,?)').run(body.draftId,by,now());
      this.db.prepare("UPDATE task_workflows SET state='completed',updated_at=? WHERE task_id=?").run(now(),taskId);
      this.db.prepare("UPDATE tasks SET status='completed',completed_at=?,updated_at=? WHERE id=?").run(now(),now(),taskId);
    });return this.workflow(taskId);
  }
  status(taskId){return {workflow:this.workflow(taskId),hierarchy:{primary:'Claude',backup:'Codex',backupAuthorized:this.config.allowCodexReview,automated:false},reviews:this.db.prepare('SELECT * FROM senior_reviews WHERE task_id=? ORDER BY rowid').all(taskId)};}
}
