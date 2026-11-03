CREATE TABLE team_jobs (
 task_id TEXT PRIMARY KEY REFERENCES tasks(id), parent_id TEXT REFERENCES team_jobs(task_id),
 state TEXT NOT NULL CHECK(state IN ('PENDING','PLANNING','AWAITING_APPROVAL','ASSIGNED','IN_PROGRESS','AWAITING_REVIEW','CHANGES_REQUESTED','VERIFIED','COMPLETED','FAILED','BLOCKED')),
 plan TEXT CHECK(plan IS NULL OR json_valid(plan)), plan_author TEXT, owner_plan_approval TEXT,
 model_key TEXT, draft_id TEXT REFERENCES generated_drafts(id), author TEXT,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3), blocker TEXT,
 owner_completion TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE team_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL REFERENCES team_jobs(task_id),
 from_state TEXT, to_state TEXT NOT NULL, actor TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE team_packets (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES team_jobs(task_id), draft_id TEXT NOT NULL REFERENCES generated_drafts(id),
 reviewer TEXT NOT NULL CHECK(reviewer IN ('Claude','Codex')), snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),
 review_id TEXT REFERENCES senior_reviews(id), created_at TEXT NOT NULL, UNIQUE(task_id,draft_id)
);
CREATE TABLE team_provider_limits (provider_id TEXT PRIMARY KEY, cooldown_until INTEGER NOT NULL);
CREATE INDEX team_parent ON team_jobs(parent_id);
CREATE INDEX team_events_task ON team_events(task_id,id);
CREATE TRIGGER team_completion_guard BEFORE UPDATE OF status ON tasks
WHEN NEW.status='completed' AND EXISTS(SELECT 1 FROM team_jobs WHERE task_id=NEW.id)
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM team_jobs WHERE task_id=NEW.id AND state='COMPLETED' AND owner_completion IS NOT NULL)
 THEN RAISE(ABORT,'Team workflow requires owner completion approval') END;
END;
