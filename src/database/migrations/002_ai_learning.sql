CREATE TABLE positions (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, permissions TEXT NOT NULL CHECK(json_valid(permissions))
);
CREATE TABLE agent_positions (
 agent_id TEXT NOT NULL REFERENCES agents(id), position_id TEXT NOT NULL REFERENCES positions(id),
 PRIMARY KEY(agent_id, position_id)
);
CREATE TABLE agent_models (
 agent_id TEXT NOT NULL REFERENCES agents(id), provider_id TEXT NOT NULL REFERENCES ai_providers(id),
 model TEXT NOT NULL, PRIMARY KEY(agent_id,provider_id,model)
);
CREATE TABLE generated_drafts (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), execution_id TEXT NOT NULL REFERENCES agent_executions(id),
 files TEXT NOT NULL CHECK(json_valid(files)), checks TEXT NOT NULL CHECK(json_valid(checks)),
 content_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE task_workflows (
 task_id TEXT PRIMARY KEY REFERENCES tasks(id),
 state TEXT NOT NULL CHECK(state IN ('generating','awaiting_senior_review','needs_correction','eligible_for_user_approval','completed','escalation_required','requires_review')),
 current_draft_id TEXT REFERENCES generated_drafts(id), category TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE draft_tests (
 draft_id TEXT PRIMARY KEY REFERENCES generated_drafts(id), passed INTEGER NOT NULL CHECK(passed IN (0,1)),
 evidence TEXT NOT NULL, recorded_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE senior_reviews (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id), draft_id TEXT NOT NULL REFERENCES generated_drafts(id),
 reviewer_identity TEXT NOT NULL, review_method TEXT NOT NULL CHECK(review_method='manual'),
 status TEXT NOT NULL CHECK(status IN ('approved','rejected')), findings TEXT NOT NULL,
 required_corrections TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE user_approvals (
 draft_id TEXT PRIMARY KEY REFERENCES generated_drafts(id), approved_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE agent_mistakes (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), task_id TEXT NOT NULL REFERENCES tasks(id),
 agent_id TEXT NOT NULL REFERENCES agents(id), provider_id TEXT REFERENCES ai_providers(id), model TEXT,
 category TEXT NOT NULL, description TEXT NOT NULL, context TEXT NOT NULL, detection_method TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE corrections (
 id TEXT PRIMARY KEY, mistake_id TEXT NOT NULL REFERENCES agent_mistakes(id), correcting_agent TEXT NOT NULL,
 summary TEXT NOT NULL, verification_status TEXT NOT NULL CHECK(verification_status IN ('unverified','verified')),
 test_results TEXT NOT NULL, senior_review_status TEXT NOT NULL CHECK(senior_review_status IN ('pending','approved','rejected')), created_at TEXT NOT NULL
);
CREATE TABLE learned_lessons (
 id TEXT PRIMARY KEY, correction_id TEXT NOT NULL REFERENCES corrections(id), project_id TEXT NOT NULL REFERENCES projects(id),
 summary TEXT NOT NULL, category TEXT NOT NULL, fingerprint TEXT NOT NULL,
 verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK(verification_status IN ('unverified','verified')),
 approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','rejected')),
 approved_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(project_id,category,fingerprint)
);
CREATE TABLE agent_performance (
 agent_id TEXT NOT NULL REFERENCES agents(id), provider_id TEXT NOT NULL REFERENCES ai_providers(id), model TEXT NOT NULL,
 category TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
 successful_results INTEGER NOT NULL DEFAULT 0 CHECK(successful_results>=0), failed_results INTEGER NOT NULL DEFAULT 0 CHECK(failed_results>=0),
 approved_reviews INTEGER NOT NULL DEFAULT 0, rejected_reviews INTEGER NOT NULL DEFAULT 0,
 reported_tokens INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY(agent_id,provider_id,model,category)
);
-- Request ledger extends legacy token_usage without inventing zero usage or rebuilding existing tables.
CREATE TABLE usage_events (
 id TEXT PRIMARY KEY, execution_id TEXT NOT NULL REFERENCES agent_executions(id), provider_id TEXT NOT NULL REFERENCES ai_providers(id),
 model TEXT NOT NULL, agent_id TEXT NOT NULL REFERENCES agents(id), task_id TEXT NOT NULL REFERENCES tasks(id),
 input_tokens INTEGER CHECK(input_tokens>=0), output_tokens INTEGER CHECK(output_tokens>=0), total_tokens INTEGER CHECK(total_tokens>=0),
 source TEXT NOT NULL CHECK(source IN ('provider_reported','estimated','unknown')), estimated_cost REAL CHECK(estimated_cost>=0),
 reserved_tokens INTEGER NOT NULL CHECK(reserved_tokens>=0), outcome TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX drafts_task ON generated_drafts(task_id);
CREATE INDEX drafts_execution ON generated_drafts(execution_id);
CREATE INDEX reviews_task ON senior_reviews(task_id,created_at);
CREATE INDEX reviews_draft ON senior_reviews(draft_id);
CREATE INDEX mistakes_project ON agent_mistakes(project_id,category);
CREATE INDEX mistakes_task ON agent_mistakes(task_id);
CREATE INDEX mistakes_agent ON agent_mistakes(agent_id);
CREATE INDEX mistakes_provider ON agent_mistakes(provider_id);
CREATE INDEX corrections_mistake ON corrections(mistake_id);
CREATE INDEX lessons_retrieval ON learned_lessons(project_id,category,verification_status,approval_status);
CREATE INDEX lessons_correction ON learned_lessons(correction_id);
CREATE INDEX usage_provider ON usage_events(provider_id);
CREATE INDEX usage_agent ON usage_events(agent_id);
CREATE INDEX usage_task ON usage_events(task_id);
CREATE INDEX usage_execution ON usage_events(execution_id);
CREATE INDEX models_provider ON agent_models(provider_id);
CREATE INDEX performance_provider ON agent_performance(provider_id);
CREATE TRIGGER coding_completion_guard BEFORE UPDATE OF status ON tasks
WHEN NEW.status='completed' AND EXISTS(SELECT 1 FROM task_workflows WHERE task_id=NEW.id)
BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM task_workflows w JOIN draft_tests t ON t.draft_id=w.current_draft_id
  JOIN user_approvals u ON u.draft_id=w.current_draft_id
  WHERE w.task_id=NEW.id AND w.state='completed' AND t.passed=1
  AND (SELECT status FROM senior_reviews WHERE draft_id=w.current_draft_id ORDER BY rowid DESC LIMIT 1)='approved'
 ) THEN RAISE(ABORT,'Coding task requires tests, senior review and user approval') END;
END;
INSERT INTO positions VALUES ('orchestrator','Orchestrator','["coordinate"]'),('project_manager','Project Manager','["plan"]'),('junior_developer','Junior Developer','["generate"]'),('qa_tester','QA Tester','["test"]'),('senior_developer','Senior Developer','["review"]');
INSERT INTO agents VALUES ('manager','Project Manager','project_manager','["plan","decompose"]','ready',NULL,'');
INSERT INTO agent_positions SELECT id,role FROM agents WHERE role IN (SELECT id FROM positions);
UPDATE agents SET status='ready' WHERE id='junior' AND status='disabled';
