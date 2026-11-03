-- Additive coordinator records. Existing task/review/acceptance records are untouched.
CREATE TABLE shared_jobs (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL UNIQUE REFERENCES team_jobs(task_id),
 version INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL,
 lease TEXT, state TEXT NOT NULL CHECK(json_valid(state)), updated_at TEXT NOT NULL
);
CREATE TABLE shared_job_history (
 id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES shared_jobs(id),
 version INTEGER NOT NULL, kind TEXT NOT NULL, worker TEXT,
 snapshot TEXT NOT NULL CHECK(json_valid(snapshot)), snapshot_hash TEXT NOT NULL,
 created_at TEXT NOT NULL, UNIQUE(job_id,version)
);
CREATE TRIGGER shared_history_no_update BEFORE UPDATE ON shared_job_history
BEGIN SELECT RAISE(ABORT,'Shared job history is immutable'); END;
CREATE TRIGGER shared_history_no_delete BEFORE DELETE ON shared_job_history
BEGIN SELECT RAISE(ABORT,'Shared job history is immutable'); END;
