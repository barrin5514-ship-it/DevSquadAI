# Worker recovery and live workspace — November 5, 2026

> Current direction update — November 5: the owner subsequently removed active project spending caps, per-request output caps and expiry/approval setup. Usage tracking and all Stop/lock/review protections remain. See FRESH_DEMO_READINESS_20261105.md; budget descriptions below document the earlier implementation.


Status: PARTIALLY VERIFIED. No AI requests are authorized or performed for this implementation. Local worker simulations are explicitly not DeepSeek/Codex/Claude model evidence.

## Preservation and scope

Branch at entry: feature/workspace-ui-redesign; HEAD 79749aa4030a10dec553296987e515831c4ee626. Existing 17 tracked modifications and earlier untracked redesign files were preserved. Supported SQLite backup before migration 017: backups/backup-1793861414802-9ae6c240-c509-46a5-af54-e6f81f0a2510.sqlite.

Original Counter session fc00a59b-c31e-4b93-b448-35ebbc0de048 remains paused, version 11, request b2da3f48-1fab-42c7-8de2-0b44f1100a74. Its existing lock must not be released to demonstrate recovery. Its four DeepSeek revisions remain unchanged. Original Friday session b38be3dd-b586-440c-922b-755c188a900a must remain READY/unstarted.

## Implemented checklist

- Durable execution IDs bound to session/request, agent/phase, root hash and checkpoint; OS spawn acknowledgment, PID/creation identity, start/end, exit/termination evidence where available. Missing evidence stays missing.
- Native process identity includes Windows creation time to avoid PID-reuse mistakes. Termination differentiates known OS launch failure, observed exit, confirmed tree termination and unknown outcomes. No automatic retry/fallback was added.
- Reconcile Worker is guarded by session/version/request, paused state, active-run exclusion, exact root/lock ownership, current file fingerprint, OS identities and recorded process-tree termination evidence. Unsupported legacy attempts remain blocked; reading status never unlocks anything.
- Existing Stop, failed-phase Resume, independent review, owner acceptance and project filesystem guards remain. Reconciliation never starts work or applies a patch.
- SSE uses existing persisted studio_events, ordered IDs, Last-Event-ID replay, deduplication, bounded batches, connection limits, backpressure disconnect and listener/watcher cleanup. One selected session connection replaces regular running-job polling when connected.
- Live Agent Workspace reuses the existing output drawer: agent/role/state/elapsed information, recorded handoffs, test evidence, sanitized event terminal, task spending policy and recovery controls. Empty/disconnected states are explicit.
- Native filesystem observation detects actual creates/modifications/deletions, excludes private/linked paths and records timestamps. Existing inspector/revision views supply file contents and diffs; no fabricated changes or model deletion support were added.
- Codex uses its native JSON events; Claude uses supported stream-json events. Hidden reasoning is discarded. Answer progress uses character counts rather than potentially secret-bearing partial text; final validated reports remain readable in existing conversation/output views.
- DeepSeek streaming uses documented SSE content deltas, finish reason, usage and DONE. Truncated streams never produce complete artifacts. No raw reasoning content is persisted or displayed.
- Task-specific API policy is inactive until an explicit owner action saves model/cap/output/expiry. Dispatch requires current configured price evidence and a conservative atomic reservation. Duplicate execution reservations fail; unknown requests keep reservations. Estimates are application policy, not provider-enforced dollar ceilings or guaranteed token counts. No account/balance/provider requests were made and no billing settings changed.
- Project AGENTS.md now requires targeted/regression tests, actual functional user journeys where available, frontend/backend/database/filesystem evidence, failure/recovery tests and truthful completion labels.

## Timeout settings

Optional local environment settings (defaults shown; no existing .env values were changed):

```dotenv
STUDIO_CODEX_TIMEOUT_MS=300000
STUDIO_CLAUDE_TIMEOUT_MS=300000
STUDIO_DEEPSEEK_TIMEOUT_MS=90000
STUDIO_TEST_TIMEOUT_MS=60000
```

Maximum accepted setting is 1,200,000 ms. CLI authentication preflight remains separately bounded. A timeout preserves earlier revisions; uncertain termination retains the lock. The test runner remains the existing Windows MXC boundary; it is not replaced with an unrestricted generated-code runner.

## Evidence obtained

- Focused checks: 41/41 passed, zero failed/skipped. Includes real Windows creation-identity/termination observation of its own harmless Node fixture, actual native filesystem create/change/delete observation, HTTP SSE replay/reconnect cleanup, simulated launch/timeout distinctions, recovery rejection, exact checkpoint preservation and API reservations.
- An earlier 44/46 focused run exposed two migration-count assertions (16 vs new 17); corrected to reflect the new schema, without weakening the underlying migration/FK tests.
- First local HTTP fixture attempt failed because the verifier supplied task text to the empty-session endpoint. Corrected verifier to use the existing task/chat endpoint. No provider call occurred.
- Corrected `node --max-old-space-size=128 scripts/verify-studio-local.js` passed the actual HTTP application pipeline using three trusted local Node fixture workers, a temporary isolated database and no keys. Builder source and Tester tests were saved through the existing revision workflow. Existing MXC executed **8 tests, 8 passed, 0 failed**. Independent fixture review followed; task reached awaiting_owner, never accepted. Spawn PIDs, observed exit zero, reports, revisions and test evidence persisted.
- That fixture is clearly labeled LOCAL WORKER SIMULATION. It proves application plumbing and actual isolated test execution, not AI quality, included usage or live provider collaboration. Its temporary project/database were preserved outside the main business database.
- Browser tool check returned “Local browser use is disabled in Work settings.” No browser bypass was attempted. Live panel rendering, resizing/scrolling, visual SSE updates, native folder-selection UI and complete browser recovery journey remain BLOCKED. Prior native-picker history does not verify this new UI.
- Full serial regression and final main-app/preservation checks: results to be appended after completion, never inferred from earlier runs.

## Original Counter recovery

The original timeout predates process-identity tracking. It has no reliable PID/birth or tree termination receipt. Current absence of a matching child process alone cannot reconstruct that receipt. The new control must explain the missing evidence and retain its lock. Do not fabricate a new execution record, clear the lock manually, rerun Builder, or modify its original history merely to show a successful recovery. This is an explicit remaining limitation requiring a separately designed legacy recovery procedure and owner approval.

## Sources and limits

Official DeepSeek stream/thinking/JSON/usage contract inspected November 5: https://api-docs.deepseek.com/api/create-chat-completion/ . No authenticated request was used for documentation research.

Current native login facts from the preceding read-only investigation: Claude CLI reports claude.ai Pro; Codex status timed out, although an earlier saved attempt passed its authentication preflight. Current included quota and extra usage were not freshly verified. No claims of free/unlimited operation are made; DeepSeek remains usage-billed.

## Remaining mandatory verification

1. Restore authorized browser access, inspect real workspace and error/connection states, exercise SSE refresh/reconnect, Stop and safe/unsafe recovery using local fixtures, and verify native folder selection.
2. Resolve the original legacy lock only under a separately justified recovery design; do not force it.
3. Separately approve any actual AI end-to-end test with explicit paid scope. No live provider calls are part of this task.
4. Do not call this complete or Friday-ready solely because automated tests pass. No push, merge or deployment is authorized.

## Final local results

- Full serial regression: **483 passed, 0 failed, 0 skipped, 0 cancelled**, 229.66 seconds. Command: node --max-old-space-size=128 scripts/test-serial.js. Local full log: TEMP/devsquad-worker-recovery-final-20261105.log. Earlier full attempt: 478 passed / 1 failed; the remaining retired-policy assertion was corrected to require the newly authorized task spending policy.
- Subsequent small shutdown correction closes SSE HTTP responses as well as subscriptions, so graceful backend shutdown cannot hang on a connected live panel. **18/18 follow-up recovery/shutdown/preview tests passed**, zero skipped/failed. The full suite was not repeated after this isolated cleanup correction.
- Real local-process workflow repeated successfully: actual HTTP dispatch, three local worker processes, eight actual MXC tests, independent fixture review, real Windows fixture termination followed by safe reconciliation through the HTTP endpoint, and a supported temporary-backend restart preserving reports/results/status. No owner acceptance. Zero provider requests. Fixture database preserved at the location printed by scripts/verify-studio-local.js; it is not the main database.
- Main app loaded migration 017 and serves /team plus /team-live-workspace.js with HTTP 200. Actual Counter detail API exposes blocked legacy recovery with the explicit missing-PID reason. No recovery/Run action was taken on it.
- Supported-backup comparison: all **296 pre-existing business rows** unchanged, excluding 16 prior schema-migration rows and the runtime lease. No added rows in existing business tables. Migration 017 adds one schema record; zero main-app execution records or API policies were created. SQLite integrity ok, no foreign-key errors. Counter version 11/request unchanged, four file hashes unchanged, original lock unchanged; Friday READY with no request.
- Configured credential scan: zero matches across 105 changed/untracked files at the time of scanning. .env remains untracked/ignored; data, backups and node_modules ignored. Git whitespace checks passed; line-ending warnings are informational. No staging, commit, push, merge or deployment.
- Browser check: BLOCKED by Work settings. No visual confirmation, screenshots, native chooser interaction or original real-provider replay is claimed. Final status remains **PARTIALLY VERIFIED**, not fully complete or certified for Friday.

## Task-specific changed files

AGENTS.md; migration 017_studio_execution.sql; services studio-executions.js, studio-budget.js, studio-live.js, project-studio.js, studio-workers.js and demo-cli-transport.js; providers adapter.js and deepseek-stream.js; config/index.js; app.js and routes/console.js; dashboard live-workspace.js, output.js, dashboard.js, index.html and dashboard.css; tests studio-executions.test.js, live-workspace-ui.test.js, studio-protocol.test.js, project-studio.test.js and foundation.test.js; tests/fixtures/studio-local-worker.mjs; scripts/verify-studio-local.js; this report, the existing explorer verification report and docs/PROMPT_LOG.md. Shared files retain earlier uncommitted work; their entire diff is not attributed to this task.
