import { randomUUID } from 'node:crypto';
import { ApiError } from '../middleware/errors.js';
const now = () => new Date().toISOString();
export class Store {
  constructor(db) { this.db = db; }
  project(id) { const row = this.db.prepare('SELECT * FROM projects WHERE id=?').get(id); if (!row) throw new ApiError(404,'Project not found'); return row; }
  projects() { return this.db.prepare('SELECT * FROM projects ORDER BY created_at, id').all(); }
  createProject(input, workspace) { const id = randomUUID(), time = now(); const relative = workspace.create(id); this.db.prepare('INSERT INTO projects VALUES (?,?,?,?,?,?,?)').run(id,input.name,input.description || '', 'active',relative,time,time); return this.project(id); }
  updateProject(id, input) { const p = this.project(id); this.db.prepare('UPDATE projects SET name=?,description=?,status=?,updated_at=? WHERE id=?').run(input.name ?? p.name,input.description ?? p.description,input.status ?? p.status,now(),id); return this.project(id); }
  tasks(id) { this.project(id); return this.db.prepare('SELECT * FROM tasks WHERE project_id=? ORDER BY created_at,id').all(id); }
  task(id) { const row = this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id); if (!row) throw new ApiError(404,'Task not found'); return row; }
  createTask(projectId, input) { this.project(projectId); if (input.assigned_agent && !this.db.prepare('SELECT id FROM agents WHERE id=?').get(input.assigned_agent)) throw new ApiError(400,'Unknown agent'); const id = randomUUID(), time = now(); this.db.prepare("INSERT INTO tasks VALUES (?,?,?,?,'pending',?,?,NULL)").run(id,projectId,input.description,input.assigned_agent || null,time,time); return this.task(id); }
  saveContext(projectId, summary, decisions) { this.project(projectId); if (typeof summary !== 'string' || !Array.isArray(decisions) || decisions.some(d => typeof d !== 'string')) throw new ApiError(400,'Invalid context'); this.db.prepare('INSERT INTO project_context VALUES (?,?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET context_summary=excluded.context_summary,important_decisions=excluded.important_decisions,updated_at=excluded.updated_at').run(randomUUID(),projectId,summary,JSON.stringify(decisions),now()); return this.context(projectId); }
  context(projectId) { this.project(projectId); return this.db.prepare('SELECT * FROM project_context WHERE project_id=?').get(projectId) ?? null; }
  trackFile(projectId, relative, metadata = {}) { this.project(projectId); this.db.prepare('INSERT INTO project_files VALUES (?,?,?,?,?) ON CONFLICT(project_id,relative_path) DO UPDATE SET file_metadata=excluded.file_metadata,modified_at=excluded.modified_at').run(randomUUID(),projectId,relative,JSON.stringify(metadata),now()); }
  startExecution(taskId, agentId) { this.task(taskId); const id = randomUUID(); this.db.prepare("INSERT INTO agent_executions (id,task_id,agent_id,status,started_at) VALUES (?,?,?,'running',?)").run(id,taskId,agentId,now()); return id; }
  executions(taskId) { this.task(taskId); return this.db.prepare('SELECT * FROM agent_executions WHERE task_id=? ORDER BY started_at').all(taskId); }
}
