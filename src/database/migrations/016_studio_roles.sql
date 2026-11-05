-- Role preferences are separate from saved conversations and review evidence.
CREATE TABLE studio_role_preferences (project_id TEXT PRIMARY KEY REFERENCES projects(id), roles TEXT NOT NULL, display_order TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
