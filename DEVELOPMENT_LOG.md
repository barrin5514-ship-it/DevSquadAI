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

## Checkpoint 2 — 2026-10-19

Independently reviewed the existing project, nine domain tables, ten REST endpoints, agent registry, configuration and documentation. Ran the original suite before edits: 22 passed, 0 failed. Kept the existing backend and used one additive migration. No unrelated project or existing project data was modified.

Checked official Cerebras, Groq, Gemini, OpenRouter and Hugging Face API documentation before implementing adapters. Sources and model/free-tier caveats are in PROVIDER_SETUP.md. Checked only presence flags for provider credentials: all five were absent. No secrets were displayed. No real AI calls occurred; live connectivity/generation is not claimed.

Implemented configurable adapters, free-only bounded routing, draft validation/persistence, separate positions/agents/models, nullable usage measurements and persistent request/token reservations, learning records/retrieval, and a manual test/senior-review/user-approval gate. Generated code is parsed for syntax but never executed or written into project files. No dependency was added.

Actual issues and corrections:
- The first integrated baseline run had three assertion failures because it still expected one migration and four agents. Updated those cardinalities to two migrations and five agents while keeping the original behavior assertions.
- Review caught a fresh-database seeding order issue: migration-time position mapping ran before initial agents existed. Agent registration now attaches known positions, and the junior seed is ready. Existing upgrades also receive mappings in the additive migration.
- Review caught a review-state loophole: replacing test evidence could let a rejected draft be reconsidered. Rejected drafts now require a new corrected draft; regression tests check both the test-evidence and review paths.
- Review caught performance review updates applying to every category for the same model. Scoped the update to the workflow category.
- Hardened malformed/null provider JSON handling and rejection of credential echoes before content could be persisted.

Validation progressed from 50 passing tests to 59 passing tests after added concurrency, recovery and review regressions. Final verification results are recorded after the last implementation changes below.

Deferred by design: frontend, arbitrary code/test execution, publishing draft files, automated Claude/Codex review calls, paid-provider spending authorizations and autonomous recovery. No fabricated senior reviews or live provider success. The remaining live-generation demonstration requires a locally configured key, exact model and verified free account access, followed by an authorized smoke test. Stop before Checkpoint 3.

Final Checkpoint 2 validation: **62 tests passed, 0 failed, 0 skipped**. This includes the original 22 cases (with only expected migration/agent count changes), five provider protocol mocks, upgrade preservation, restart persistence, backups, bounded fallback, concurrent budget reservations, draft security, usage/cost reporting, lesson trust boundaries and completion gates. No live provider was tested; credentials were absent.

Final diff review also caught inherited object-property names being accepted as usage filter keys. Changed the allowlist check to Object.hasOwn and added a regression test. Rejected escaped credential echoes and canceled rejected HTTP response bodies. Corrective generation now receives the previous draft and review findings as untrusted reference data, subject to the same input-size limit.

Source commits: 46b7b5b (providers and additive schema), 00b029e (generation, learning, review, usage and 62-test suite). Documentation is committed separately. No GitHub push. No new dependency. Existing .env was preserved. Common credential-pattern scanning and ignore-rule checks found no committed credentials.

Acceptance: implementation and automated/mock verification are complete, but live-generation acceptance is **pending**, not claimed complete. Configure one provider key and current model locally, verify free account/model access, and run the documented explicitly authorized smoke test. Paid-provider execution remains disabled; neither a spending-allowance system nor automated senior integrations are claimed implemented. Checkpoint 3 has not started.

Changed-file inventory:
- Created: AI_DATA_FLOW.md, LEARNING_MEMORY.md, PROVIDER_SETUP.md; scripts/smoke.js; src/database/migrations/002_ai_learning.sql; src/middleware/ai-validation.js; src/orchestrator/generation.js; src/providers/adapter.js and config.js; src/routes/ai.js; src/services/draft-validation.js, learning.js, reviews.js and usage.js; tests/ai.test.js.
- Updated: .env.example; README.md, ARCHITECTURE.md, DATABASE_SCHEMA.md, PROMPT_LOG.md and DEVELOPMENT_LOG.md; src/agents/registry.js, src/app.js and src/config/index.js; tests/foundation.test.js.
