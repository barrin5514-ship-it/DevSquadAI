-- Connection checks are separate from work, reviews and owner acceptance.
CREATE TABLE hub_connection_checks (
 id TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('running','finished','interrupted')),
 result TEXT NOT NULL CHECK(json_valid(result)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
-- A second click cannot start another batch while the first is still running.
CREATE UNIQUE INDEX one_hub_connection_check ON hub_connection_checks(status) WHERE status='running';
