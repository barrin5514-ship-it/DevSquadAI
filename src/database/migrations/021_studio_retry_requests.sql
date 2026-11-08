CREATE TABLE studio_retry_requests (
 request_id TEXT PRIMARY KEY,
 chat_id TEXT NOT NULL REFERENCES studio_chats(id),
 project_id TEXT NOT NULL REFERENCES projects(id),
 attempt INTEGER NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('resume','rebuild')),
 phase TEXT NOT NULL,
 checkpoint_hash TEXT NOT NULL,
 status TEXT NOT NULL,
 detail TEXT NOT NULL CHECK(json_valid(detail)),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX studio_retry_chat ON studio_retry_requests(chat_id,created_at);
