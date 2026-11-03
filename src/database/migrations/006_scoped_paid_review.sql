-- A startup-only owner capability. No HTTP endpoint can mint or replenish it.
CREATE TABLE paid_review_scopes (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL UNIQUE REFERENCES team_jobs(task_id),
 terms TEXT NOT NULL CHECK(json_valid(terms)), terms_hash TEXT NOT NULL,
 body TEXT NOT NULL CHECK(json_valid(body)), body_hash TEXT NOT NULL,
 quote_id TEXT UNIQUE REFERENCES paid_request_quotes(id), held_usd REAL NOT NULL DEFAULT 0,
 outcome TEXT NOT NULL DEFAULT 'prepared', result TEXT CHECK(result IS NULL OR json_valid(result))
);
CREATE TRIGGER paid_scope_immutable BEFORE UPDATE OF id,task_id,terms,terms_hash,body,body_hash ON paid_review_scopes
BEGIN SELECT RAISE(ABORT,'Paid review scope and payload are immutable'); END;
CREATE TABLE paid_review_http (
 scope_id TEXT NOT NULL REFERENCES paid_review_scopes(id),
 kind TEXT NOT NULL CHECK(kind IN ('models','balance','review')),
 state TEXT NOT NULL DEFAULT 'unknown', started_at TEXT NOT NULL,
 diagnostics TEXT CHECK(diagnostics IS NULL OR json_valid(diagnostics)),
 evidence TEXT CHECK(evidence IS NULL OR json_valid(evidence)),
 PRIMARY KEY(scope_id,kind)
);
