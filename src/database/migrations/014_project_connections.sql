-- Browsing a newly connected folder does not grant agents permission to edit it.
-- Existing projects keep their previous policy unless an explicit row is added.
CREATE TABLE studio_project_connections (
 project_id TEXT PRIMARY KEY REFERENCES projects(id),
 root TEXT NOT NULL, identity TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('created','folder','github')),
 repository_url TEXT, default_layout TEXT NOT NULL,
 agent_changes INTEGER NOT NULL DEFAULT 0 CHECK(agent_changes IN (0,1)),
 version INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
