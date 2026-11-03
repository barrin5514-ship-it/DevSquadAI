CREATE TABLE messenger_jobs (
 job_id TEXT PRIMARY KEY REFERENCES shared_jobs(id), status TEXT NOT NULL,
 round INTEGER NOT NULL DEFAULT 0, max_rounds INTEGER NOT NULL DEFAULT 3 CHECK(max_rounds BETWEEN 1 AND 10),
 wait_ms INTEGER NOT NULL DEFAULT 300000 CHECK(wait_ms BETWEEN 1000 AND 1800000),
 deadline INTEGER, run_token TEXT, reason TEXT, updated_at TEXT NOT NULL
);
-- One mailbox file can safely serve only one active loop at a time.
CREATE UNIQUE INDEX one_active_messenger ON messenger_jobs((1)) WHERE status IN ('running','waiting');
CREATE TABLE messenger_rounds (
 job_id TEXT NOT NULL REFERENCES messenger_jobs(job_id), round INTEGER NOT NULL,
 step_id TEXT NOT NULL UNIQUE, role TEXT NOT NULL, agent TEXT NOT NULL,
 report TEXT NOT NULL, created_at TEXT NOT NULL,
 report_state TEXT NOT NULL DEFAULT 'prepared', sent_at TEXT,
 prompt_json TEXT CHECK(prompt_json IS NULL OR json_valid(prompt_json)), prompt_sha TEXT, received_at TEXT,
 PRIMARY KEY(job_id,round)
);
CREATE TRIGGER messenger_report_immutable BEFORE UPDATE OF job_id,round,step_id,role,agent,report,created_at ON messenger_rounds
BEGIN SELECT RAISE(ABORT,'Round reports are immutable'); END;
CREATE TRIGGER messenger_prompt_immutable BEFORE UPDATE OF prompt_json,prompt_sha,received_at ON messenger_rounds WHEN OLD.prompt_json IS NOT NULL
BEGIN SELECT RAISE(ABORT,'Received prompts are immutable'); END;
CREATE TRIGGER messenger_round_no_delete BEFORE DELETE ON messenger_rounds
BEGIN SELECT RAISE(ABORT,'Messenger history cannot be deleted'); END;
CREATE TABLE messenger_events (
 id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES messenger_jobs(job_id),
 round INTEGER NOT NULL, kind TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TRIGGER messenger_event_no_update BEFORE UPDATE ON messenger_events
BEGIN SELECT RAISE(ABORT,'Messenger events are immutable'); END;
CREATE TRIGGER messenger_event_no_delete BEFORE DELETE ON messenger_events
BEGIN SELECT RAISE(ABORT,'Messenger events cannot be deleted'); END;
