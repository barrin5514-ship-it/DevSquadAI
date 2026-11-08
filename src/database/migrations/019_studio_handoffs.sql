CREATE TABLE studio_handoffs (
 id TEXT PRIMARY KEY,
 chat_id TEXT NOT NULL REFERENCES studio_chats(id),
 project_id TEXT NOT NULL REFERENCES projects(id),
 request_id TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('builder','tester')),
 next_phase TEXT NOT NULL CHECK(next_phase IN ('tester','reviewer')),
 checkpoint_hash TEXT NOT NULL,
 test_evidence_hash TEXT,
 status TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('local','zapier')),
 detail TEXT NOT NULL CHECK(json_valid(detail)),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 delivered_at TEXT,
 accepted_at TEXT
);
CREATE INDEX studio_handoff_chat ON studio_handoffs(chat_id,created_at);
