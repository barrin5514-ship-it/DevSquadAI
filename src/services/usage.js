import { randomUUID } from 'node:crypto';
import { ApiError } from '../middleware/errors.js';
import { transaction } from '../middleware/ai-validation.js';
const now=()=>new Date().toISOString();
export class UsageService {
  constructor(db,config){this.db=db;this.config=config;}
  reserve(task,agent,provider,inputBytes,executionId){
    // Reservation is usage/tracking evidence, never a provider-reported charge.
    const reserved=inputBytes+provider.tokenLimit;
    return transaction(this.db,()=>{
      // Usage is recorded for visibility, but local request/token budget
      // configuration is never a dispatch gate.
      const id=randomUUID();
      this.db.prepare("INSERT INTO usage_events (id,execution_id,provider_id,model,agent_id,task_id,source,reserved_tokens,outcome,created_at) VALUES (?,?,?,?,?,?,'unknown',?,'started',?)").run(id,executionId,provider.id,provider.model,agent.id,task.id,reserved,now());
      return id;
    });
  }
  finish(id,usage,outcome){
    this.db.prepare('UPDATE usage_events SET input_tokens=?,output_tokens=?,total_tokens=?,source=?,estimated_cost=?,outcome=? WHERE id=?').run(usage?.input??null,usage?.output??null,usage?.total??null,usage?.source||'unknown',usage?.estimatedCost??null,outcome,id);
  }
  list(filters={}){
    const names={provider:'u.provider_id',agent:'u.agent_id',project:'t.project_id',task:'u.task_id'};
    if(Object.keys(filters).some(k=>!Object.hasOwn(names,k)||typeof filters[k]!=='string'||filters[k].length>200))throw new ApiError(400,'Invalid usage filters');
    const clauses=Object.keys(filters).map(k=>`${names[k]}=?`);
    return this.db.prepare(`SELECT u.*,t.project_id FROM usage_events u JOIN tasks t ON t.id=u.task_id ${clauses.length?'WHERE '+clauses.join(' AND '):''} ORDER BY u.created_at DESC LIMIT 500`).all(...Object.values(filters));
  }
}
