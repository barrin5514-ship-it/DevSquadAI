CREATE TABLE team_checkpoints (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 task_id TEXT NOT NULL REFERENCES team_jobs(task_id),
 reason TEXT NOT NULL, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),
 content_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE team_runtime_lease (id INTEGER PRIMARY KEY CHECK(id=1), pid INTEGER NOT NULL);
CREATE INDEX checkpoint_task ON team_checkpoints(task_id,id);
CREATE TRIGGER checkpoint_no_update BEFORE UPDATE ON team_checkpoints BEGIN SELECT RAISE(ABORT,'Checkpoints are immutable'); END;
CREATE TRIGGER checkpoint_no_delete BEFORE DELETE ON team_checkpoints BEGIN SELECT RAISE(ABORT,'Checkpoints are immutable'); END;
CREATE TABLE team_operations (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES team_jobs(task_id),
 policy TEXT NOT NULL CHECK(json_valid(policy)), status TEXT NOT NULL,
 result TEXT CHECK(result IS NULL OR json_valid(result)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE team_task_locks (
 task_id TEXT PRIMARY KEY REFERENCES team_jobs(task_id), operation_id TEXT NOT NULL UNIQUE REFERENCES team_operations(id)
);
CREATE TABLE team_model_health (
 model_key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0,
 retry_at INTEGER NOT NULL DEFAULT 0, last_code TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE paid_request_quotes (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES team_jobs(task_id), model TEXT NOT NULL,
 input_bound INTEGER NOT NULL, output_bound INTEGER NOT NULL,
 reserved_usd REAL NOT NULL CHECK(reserved_usd>=0), status TEXT NOT NULL,
 created_at TEXT NOT NULL, request_hash TEXT NOT NULL, price_snapshot TEXT NOT NULL, expires_at INTEGER NOT NULL
);
