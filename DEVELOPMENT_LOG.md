# Development log

## Checkpoint 1 — 2026-10-19

Inspected the parent directory and found existing projects, including CoachLab. Created a separate DevSquadAI directory; existing projects were not modified. Chose Node 24 built-in SQLite to keep dependencies small. Implemented the requested backend layers, schema, persistence, workspace controls, safe REST responses, agent registry and online backup utility.

Environment issue: the first npm installation failed with UNABLE_TO_VERIFY_LEAF_SIGNATURE. Retried using Node's system CA support with TLS verification enabled and a local ignored cache. This is an environment issue, not a fabricated coding mistake.

Validation results and review findings are recorded below after execution.

Review caught two genuine implementation mistakes before the first commit: backup-directory creation was outside the safe error wrapper, and workspace link checks used existsSync, which can miss dangling links. Moved directory creation into the protected backup block and switched to lstat with only ENOENT tolerated. Added regression tests for both cases.

The initial 18 tests passed. Expanded validation covers actual server-process startup, malformed and oversized JSON, and both review corrections. All tests use temporary data; no production restoration was attempted. Windows system CA support resolved dependency installation. No TLS verification was disabled.

Final verification: 22 tests passed, 0 failed, 0 skipped. Verified database creation and idempotent migrations, all 10 API endpoints, restart persistence for tasks and context, interruption review states, workspace traversal/junction/overwrite protection, generic API errors, safe provider output, malformed/oversized requests, and actual server startup. Online backups passed SQLite integrity and foreign-key checks and were restored to a separate temporary database with project/task/context data intact. Backup failure tests preserved source data.

Reviewed staged source diffs and checked whitespace. Scanned tracked content for common secret patterns; no matches. Confirmed `.env`, SQLite files, workspace data, backups, dependencies and npm cache are excluded. Commit 023de6c contains the backend foundation; the following documentation/test commit completes this checkpoint. Nothing was pushed.

Checkpoint 1 definition of done is satisfied for the local single-process backend. No unresolved checkpoint blockers. Context/file/history functionality is internal; authentication, network hosting, automated resumption, live providers, token metering and the frontend are not implemented. Await user review before Checkpoint 2.
