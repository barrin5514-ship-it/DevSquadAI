import { randomUUID, createHash } from 'node:crypto';
import { ApiError } from '../middleware/errors.js';
import { object, text, choice } from '../middleware/ai-validation.js';
const now=()=>new Date().toISOString();
export class LearningMemory {
  constructor(store){this.store=store;this.db=store.db;}
  mistake(body){
    object(body,['taskId','agentId','providerId','model','category','description','context','detectionMethod'],['taskId','agentId','category','description','detectionMethod']);
    const task=this.store.task(text(body.taskId,'taskId'));const id=randomUUID();
    if(!this.db.prepare('SELECT id FROM agents WHERE id=?').get(text(body.agentId,'agentId')))throw new ApiError(400,'Unknown agent');
    if(body.providerId&&!this.db.prepare('SELECT id FROM ai_providers WHERE id=?').get(text(body.providerId,'providerId')))throw new ApiError(400,'Unknown provider');
    this.db.prepare('INSERT INTO agent_mistakes VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,task.project_id,task.id,body.agentId,body.providerId||null,body.model?text(body.model,'model',200):null,text(body.category,'category',80),text(body.description,'description'),body.context?text(body.context,'context'):'',text(body.detectionMethod,'detectionMethod',200),now());
    return this.db.prepare('SELECT * FROM agent_mistakes WHERE id=?').get(id);
  }
  correction(mistakeId,body){
    object(body,['correctingAgent','summary','verificationStatus','testResults','seniorReviewStatus'],['correctingAgent','summary','verificationStatus','testResults','seniorReviewStatus']);
    if(!this.db.prepare('SELECT id FROM agent_mistakes WHERE id=?').get(mistakeId))throw new ApiError(404,'Mistake not found');
    const id=randomUUID();
    this.db.prepare('INSERT INTO corrections VALUES (?,?,?,?,?,?,?,?)').run(id,mistakeId,text(body.correctingAgent,'correctingAgent',200),text(body.summary,'summary'),choice(body.verificationStatus,['unverified','verified'],'verificationStatus'),text(body.testResults,'testResults'),choice(body.seniorReviewStatus,['pending','approved','rejected'],'seniorReviewStatus'),now());
    return this.db.prepare('SELECT * FROM corrections WHERE id=?').get(id);
  }
  lesson(body){
    object(body,['correctionId','summary','category'],['correctionId','summary','category']);
    const correction=this.db.prepare('SELECT c.*,m.project_id FROM corrections c JOIN agent_mistakes m ON m.id=c.mistake_id WHERE c.id=?').get(text(body.correctionId,'correctionId'));
    if(!correction)throw new ApiError(404,'Correction not found');
    const summary=text(body.summary,'summary',2000),category=text(body.category,'category',80);
    const fingerprint=createHash('sha256').update(summary.toLowerCase().replace(/\s+/g,' ')).digest('hex');
    const existing=this.db.prepare('SELECT * FROM learned_lessons WHERE project_id=? AND category=? AND fingerprint=?').get(correction.project_id,category,fingerprint);
    if(existing)return existing;
    const id=randomUUID(),date=now();
    this.db.prepare('INSERT INTO learned_lessons (id,correction_id,project_id,summary,category,fingerprint,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(id,correction.id,correction.project_id,summary,category,fingerprint,date,date);
    return this.db.prepare('SELECT * FROM learned_lessons WHERE id=?').get(id);
  }
  approve(id,body){
    object(body,['approvedBy'],['approvedBy']);const by=text(body.approvedBy,'approvedBy',200);
    const row=this.db.prepare('SELECT l.*,c.verification_status correction_verified,c.senior_review_status FROM learned_lessons l JOIN corrections c ON c.id=l.correction_id WHERE l.id=?').get(id);
    if(!row)throw new ApiError(404,'Lesson not found');
    if(row.correction_verified!=='verified'||row.senior_review_status!=='approved')throw new ApiError(409,'Lesson needs verified tests and approved senior correction review');
    this.db.prepare("UPDATE learned_lessons SET verification_status='verified',approval_status='approved',approved_by=?,updated_at=? WHERE id=?").run(by,now(),id);
    return this.db.prepare('SELECT * FROM learned_lessons WHERE id=?').get(id);
  }
  retrieve(projectId,category,maxChars=2000){
    this.store.project(projectId);text(category,'category',80);
    const rows=this.db.prepare("SELECT l.id,l.summary FROM learned_lessons l JOIN corrections c ON c.id=l.correction_id WHERE l.project_id=? AND l.category=? AND l.verification_status='verified' AND l.approval_status='approved' AND c.verification_status='verified' AND c.senior_review_status='approved' ORDER BY l.updated_at DESC LIMIT 5").all(projectId,category);
    const selected=[];let size=0;for(const row of rows){const cost=JSON.stringify(row).length;if(size+cost>maxChars)continue;selected.push(row);size+=cost;}return selected;
  }
  mistakes(projectId){this.store.project(projectId);return this.db.prepare('SELECT * FROM agent_mistakes WHERE project_id=? ORDER BY created_at DESC LIMIT 100').all(projectId);}
}
