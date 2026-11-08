CREATE TABLE studio_retry_requests_new (
 request_id TEXT PRIMARY KEY,
 chat_id TEXT NOT NULL REFERENCES studio_chats(id),
 project_id TEXT NOT NULL REFERENCES projects(id),
 attempt INTEGER NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('resume','rebuild','new')),
 phase TEXT NOT NULL,
 checkpoint_hash TEXT NOT NULL,
 status TEXT NOT NULL,
 detail TEXT NOT NULL CHECK(json_valid(detail)),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
INSERT INTO studio_retry_requests_new SELECT request_id,chat_id,project_id,attempt,mode,phase,checkpoint_hash,status,detail,created_at,updated_at FROM studio_retry_requests;
DROP TABLE studio_retry_requests;
ALTER TABLE studio_retry_requests_new RENAME TO studio_retry_requests;
CREATE INDEX studio_retry_chat ON studio_retry_requests(chat_id,created_at);
