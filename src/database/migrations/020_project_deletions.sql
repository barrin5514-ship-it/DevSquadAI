CREATE TABLE studio_project_deletions (
 project_id TEXT PRIMARY KEY REFERENCES projects(id),
 deleted_at TEXT NOT NULL,
 deleted_by TEXT NOT NULL,
 workspace TEXT NOT NULL,
 detail TEXT NOT NULL CHECK(json_valid(detail))
);
CREATE INDEX studio_project_deletion_time ON studio_project_deletions(deleted_at);
