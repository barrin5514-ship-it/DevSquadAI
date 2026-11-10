CREATE TABLE studio_project_test_settings (
 project_id TEXT PRIMARY KEY REFERENCES projects(id),
 test_command TEXT,
 version INTEGER NOT NULL CHECK(version > 0)
);
