-- Preserve legacy agents, manual reviews and packets as audit records.
INSERT OR IGNORE INTO ai_providers (id,provider_name,model_name,enabled) VALUES
 ('deepseek','deepseek','',0),('groq','groq','openai/gpt-oss-120b',0),('openrouter','openrouter','',0);
INSERT OR IGNORE INTO agents VALUES ('senior','DeepSeek','senior_developer','["implement","review"]','disabled','deepseek','');
UPDATE agents SET name='DeepSeek',status='disabled',provider_id='deepseek',capabilities='["implement","review"]' WHERE id='senior';
UPDATE agents SET status='disabled' WHERE lower(id) IN ('claude','codex') OR lower(name) LIKE '%claude%' OR lower(name) LIKE '%codex%';
INSERT OR IGNORE INTO agents VALUES
 ('groq','Groq','junior_developer','["implement"]','ready','groq',''),
 ('laguna','Poolside Laguna','junior_developer','["implement","test"]','ready','openrouter',''),
 ('minimax','MiniMax','junior_developer','["implement","debug"]','ready','openrouter','');
INSERT OR IGNORE INTO agent_positions SELECT id,role FROM agents WHERE id IN ('groq','laguna','minimax','senior');
CREATE TABLE active_team_agents (agent_id TEXT PRIMARY KEY REFERENCES agents(id),team TEXT NOT NULL,display_order INTEGER NOT NULL);
INSERT INTO active_team_agents VALUES ('groq','development',1),('laguna','development',2),('minimax','development',3),('senior','senior',4);
CREATE TABLE deepseek_review_requests (
 id TEXT PRIMARY KEY,task_id TEXT NOT NULL REFERENCES team_jobs(task_id),
 draft_id TEXT NOT NULL UNIQUE REFERENCES generated_drafts(id), checkpoint_id INTEGER NOT NULL REFERENCES team_checkpoints(id),
 snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),content_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('awaiting_authorization','running','failed','approved','rejected')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 quote_id TEXT,execution_id TEXT REFERENCES agent_executions(id),model TEXT,
 report TEXT CHECK(report IS NULL OR json_valid(report)),error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX deepseek_review_task ON deepseek_review_requests(task_id);
CREATE TRIGGER deepseek_review_snapshot_immutable BEFORE UPDATE OF task_id,draft_id,checkpoint_id,snapshot,content_hash ON deepseek_review_requests
BEGIN SELECT RAISE(ABORT,'Review snapshots are immutable'); END;
ALTER TABLE paid_request_quotes ADD COLUMN purpose TEXT NOT NULL DEFAULT 'development' CHECK(purpose IN ('development','review'));
ALTER TABLE paid_request_quotes ADD COLUMN review_request_id TEXT REFERENCES deepseek_review_requests(id);
CREATE TABLE deepseek_balance_observation (id INTEGER PRIMARY KEY CHECK(id=1),available_usd REAL NOT NULL,checked_at TEXT NOT NULL);
