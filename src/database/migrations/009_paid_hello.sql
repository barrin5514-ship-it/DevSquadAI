-- A connection-only paid scope is not a development/review approval.
CREATE TABLE paid_hello_scopes (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL UNIQUE REFERENCES team_jobs(task_id),
 terms TEXT NOT NULL CHECK(json_valid(terms)), terms_hash TEXT NOT NULL,
 body TEXT NOT NULL CHECK(json_valid(body)), body_hash TEXT NOT NULL,
 held_usd REAL NOT NULL DEFAULT 0, outcome TEXT NOT NULL DEFAULT 'prepared',
 reserved_at TEXT, result TEXT CHECK(result IS NULL OR json_valid(result))
);
CREATE TRIGGER hello_terms_immutable BEFORE UPDATE OF id,task_id,terms,terms_hash,body,body_hash ON paid_hello_scopes
BEGIN SELECT RAISE(ABORT,'Hello scope and payload are immutable'); END;
CREATE TABLE paid_hello_http (
 scope_id TEXT NOT NULL REFERENCES paid_hello_scopes(id),
 kind TEXT NOT NULL CHECK(kind IN ('models','balance','post')),
 state TEXT NOT NULL DEFAULT 'unknown', started_at TEXT NOT NULL,
 evidence TEXT CHECK(evidence IS NULL OR json_valid(evidence)),
 PRIMARY KEY(scope_id,kind)
);
