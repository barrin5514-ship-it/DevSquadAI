-- Removal is a reversible workspace preference. It never deletes a project row
-- or its directory, drafts, conversations, reviews or checkpoints.
CREATE TABLE studio_workspace_preferences (
 project_id TEXT PRIMARY KEY REFERENCES projects(id),
 hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)),
 version INTEGER NOT NULL DEFAULT 0
);
-- A durable reservation/audit trail for owner-confirmed local actions. Unknown
-- outcomes keep the root reserved; a restart never silently repeats an action.
CREATE TABLE studio_file_operations (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
 action TEXT NOT NULL, detail TEXT NOT NULL CHECK(json_valid(detail)), root TEXT,
 status TEXT NOT NULL CHECK(status IN ('reserved','complete','failed','unknown')),
 created_at TEXT NOT NULL, finished_at TEXT
);
CREATE UNIQUE INDEX studio_file_operation_root ON studio_file_operations(root COLLATE NOCASE)
 WHERE root IS NOT NULL AND status IN ('reserved','unknown');
CREATE TRIGGER studio_file_operation_final BEFORE UPDATE ON studio_file_operations
 WHEN OLD.status <> 'reserved'
 BEGIN SELECT RAISE(ABORT,'Completed file action evidence is immutable'); END;
