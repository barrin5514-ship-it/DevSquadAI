CREATE TABLE studio_executions (
 id TEXT PRIMARY KEY, chat_id TEXT NOT NULL REFERENCES studio_chats(id), request_id TEXT NOT NULL,
 agent TEXT NOT NULL, phase TEXT NOT NULL, root_hash TEXT NOT NULL, checkpoint_hash TEXT NOT NULL,
 status TEXT NOT NULL, evidence TEXT NOT NULL CHECK(json_valid(evidence)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX studio_execution_chat ON studio_executions(chat_id,created_at);
CREATE TABLE studio_api_policy (
 chat_id TEXT PRIMARY KEY REFERENCES studio_chats(id), model TEXT NOT NULL, cap_usd REAL NOT NULL CHECK(cap_usd>0),
 max_output INTEGER NOT NULL, expires_at TEXT NOT NULL, approved_at TEXT NOT NULL
);
CREATE TABLE studio_api_reservations (
 execution_id TEXT PRIMARY KEY REFERENCES studio_executions(id), chat_id TEXT NOT NULL REFERENCES studio_chats(id),
 reserved_usd REAL NOT NULL, status TEXT NOT NULL, usage TEXT CHECK(usage IS NULL OR json_valid(usage)), created_at TEXT NOT NULL
);
