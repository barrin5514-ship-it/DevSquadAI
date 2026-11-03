CREATE TABLE demo_artifacts (
 job_id TEXT PRIMARY KEY REFERENCES demo_worker_bindings(job_id),
 task_id TEXT NOT NULL UNIQUE REFERENCES team_jobs(task_id),
 draft_id TEXT NOT NULL UNIQUE REFERENCES generated_drafts(id),
 source_hash TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE demo_review_imports (
 job_id TEXT PRIMARY KEY REFERENCES demo_artifacts(job_id),
 draft_id TEXT NOT NULL UNIQUE REFERENCES generated_drafts(id),
 reviewer TEXT NOT NULL, source_hash TEXT NOT NULL, test_hash TEXT NOT NULL,
 decision TEXT NOT NULL CHECK(decision IN ('approved','changes_requested')),
 report TEXT NOT NULL CHECK(json_valid(report)), created_at TEXT NOT NULL
);
CREATE TRIGGER demo_artifact_immutable BEFORE UPDATE ON demo_artifacts
BEGIN SELECT RAISE(ABORT,'Demo artifact binding is immutable'); END;
CREATE TRIGGER demo_review_immutable BEFORE UPDATE ON demo_review_imports
BEGIN SELECT RAISE(ABORT,'Demo review is immutable'); END;
CREATE TRIGGER demo_review_no_delete BEFORE DELETE ON demo_review_imports
BEGIN SELECT RAISE(ABORT,'Demo review history must be preserved'); END;
