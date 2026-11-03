CREATE TABLE studio_roots (
 project_id TEXT PRIMARY KEY REFERENCES projects(id), root TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
);
CREATE TABLE studio_chats (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), title TEXT NOT NULL,
 status TEXT NOT NULL, state TEXT NOT NULL CHECK(json_valid(state)), version INTEGER NOT NULL DEFAULT 0,
 request_id TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE studio_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL REFERENCES studio_chats(id),
 kind TEXT NOT NULL, agent TEXT, content TEXT NOT NULL CHECK(json_valid(content)), created_at TEXT NOT NULL
);
CREATE TABLE studio_locks (
 root TEXT PRIMARY KEY, chat_id TEXT NOT NULL UNIQUE REFERENCES studio_chats(id), created_at TEXT NOT NULL
);
CREATE TABLE studio_revisions (
 id TEXT PRIMARY KEY, chat_id TEXT NOT NULL REFERENCES studio_chats(id), relative_path TEXT NOT NULL,
 previous_content TEXT, next_content TEXT NOT NULL, previous_hash TEXT, next_hash TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TRIGGER studio_revision_immutable BEFORE UPDATE ON studio_revisions
BEGIN SELECT RAISE(ABORT,'File history is immutable'); END;
CREATE TRIGGER studio_event_immutable BEFORE UPDATE ON studio_events
BEGIN SELECT RAISE(ABORT,'Chat history is immutable'); END;
