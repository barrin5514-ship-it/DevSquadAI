-- Preparing a demo is not permission to run it. The owner grants one exact run later.
CREATE TABLE demo_worker_bindings (
 job_id TEXT PRIMARY KEY REFERENCES shared_jobs(id),
 root TEXT NOT NULL UNIQUE, branch TEXT NOT NULL, base_revision TEXT NOT NULL,
 manifest TEXT NOT NULL CHECK(json_valid(manifest)), created_at TEXT NOT NULL
);
CREATE TRIGGER demo_binding_immutable BEFORE UPDATE ON demo_worker_bindings
BEGIN SELECT RAISE(ABORT,'Demo repository binding is immutable'); END;
CREATE TABLE demo_worker_attempts (
 job_id TEXT NOT NULL REFERENCES demo_worker_bindings(job_id),
 role TEXT NOT NULL CHECK(role IN ('builder','tester','reviewer')),
 worker TEXT NOT NULL, state TEXT NOT NULL, evidence TEXT CHECK(evidence IS NULL OR json_valid(evidence)),
 created_at TEXT NOT NULL, PRIMARY KEY(job_id,role,worker)
);
CREATE TABLE demo_builder_scopes (
 id TEXT PRIMARY KEY, job_id TEXT NOT NULL UNIQUE REFERENCES demo_worker_bindings(job_id),
 terms TEXT NOT NULL CHECK(json_valid(terms)), terms_hash TEXT NOT NULL,
 quote_id TEXT UNIQUE REFERENCES paid_request_quotes(id), outcome TEXT NOT NULL DEFAULT 'prepared'
);
CREATE TRIGGER demo_builder_scope_immutable BEFORE UPDATE OF id,job_id,terms,terms_hash ON demo_builder_scopes
BEGIN SELECT RAISE(ABORT,'Builder scope is immutable'); END;
CREATE TABLE demo_builder_http (
 scope_id TEXT NOT NULL REFERENCES demo_builder_scopes(id),
 kind TEXT NOT NULL CHECK(kind IN ('models','balance','post')),
 state TEXT NOT NULL DEFAULT 'unknown', started_at TEXT NOT NULL,
 evidence TEXT CHECK(evidence IS NULL OR json_valid(evidence)), PRIMARY KEY(scope_id,kind)
);
