# Builder-only execution and diagnostic cleanup repair

Date: 2026-11-06. Branch: `feature/workspace-ui-redesign`. Base HEAD: `9983d20f1ee6394cbfbff484ae9f7345c91195d7`. No commit/push, permission change, live model execution, paid request or production grant was performed.

## Root causes and targeted repair

The old optional run scope represented a three-role demonstration, not a single Builder turn. Preflight checked future roles and `drive` advanced directly from Builder to Tester. A normal Send was therefore not a safe substitute for this particular one-call approval.

An unused ready session can now explicitly select **Builder only — one Codex draft**. Selection saves intent; it does not approve or dispatch. A separate owner action approves the saved task, project/session IDs, canonical-root hash, database-path identity, selected dedicated Codex profile, goal hash, request identity and 30-minute approval window. The existing scope remains unchanged for ordinary three-agent runs. No schema migration was needed: mode and approval live in the existing versioned session state; attempts use the existing durable execution table.

Builder-only approval authorizes one native Builder invocation, five minutes and 32 KiB captured output. It needs no Tester/Reviewer assignment and cannot use a paid provider. Preflight checks only its selected Builder. Fallback is disabled by the effective task policy regardless of project defaults. The atomic existing SQLite transaction checks/reserves the one execution slot before transport dispatch. Unknown, failed and completed attempts consume it; another request, task mutation, changed folder/database/profile, expiry, restart or rearming cannot replenish it.

Validated Builder files use the same guarded production patch/revision workflow. Completion records the post-write checkpoint and durably pauses with independent tests, review and owner acceptance pending. It does not mark the task accepted, invent test evidence or dispatch another role. Repeated Send with the same request is idempotent; a different request cannot resume a consumed approval. Existing folder locks, sandbox controls, Stop and no-self-review checks are retained. `StudioExecutions.reconcile` was not modified or weakened.

## Cleanup implementation

The former diagnostic saved only the parent-exit boolean and discarded taskkill status/descendant identities. The new helper records native root and descendant PID/birth identities, close observation, timeout/output limits, graceful-disconnect request, forced-stop results, individual exit checks and explicit cleanup classification: `graceful-verified`, `forced-verified` or `uncertain`.

Only a creation-time-consistent ancestry chain is owned; a stale parent PID cannot authorize an older unrelated process. Children stop before parents. The Windows stop helper verifies creation time and terminates using the **same OS process handle**, avoiding the gap between checking a PID and terminating a reused PID. This extends no filesystem permission and grants no Windows ACL change. Unknown ownership or observation remains uncertain. A forced stop is reported as forced even when exit is subsequently verified.

The native startup diagnostic now requests documented `thread/unsubscribe` when it receives a thread identity, then closes stdin. It sends no `turn/start` or other model-generation method. Unsubscribe/EOF are attempts to release a session/disconnect; they are not proof the server exited. Timeout may still require a verified forced stop. The previously generated installed CLI protocol definitions at the local devsquad-codex-protocol-qLNzCq fixture confirm ThreadUnsubscribeParams.threadId and the unsubscribe response/status types. No new authenticated Codex diagnostic was run merely to test cleanup: trusted Node fixtures exercise the OS lifecycle separately without an account or model.

Official protocol references consulted during this investigation:
- https://learn.chatgpt.com/docs/app-server
- https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md

## Files touched by this repair

- `src/services/studio-run-scope.js`: explicit selection, separate approval, single-call phase and identity enforcement.
- `src/services/project-studio.js`: scoped Builder dispatch, final pre-start binding check, idempotency and durable draft-only pause/checkpoint.
- `src/services/studio-workers.js`, `studio-failover.js`, `studio-recovery.js`: phase-limited preflight, task-only fallback prohibition and no consumed-scope resume.
- `src/routes/console.js`: selection endpoint behind existing same-origin/dashboard-capability protection.
- `src/dashboard/conversations.js`, `development.js`, `live-workspace.js`: mode/approval controls, disabled future roles, correct worker/status presentation.
- `src/services/diagnostic-lifecycle.js`, `diagnostic-process-stop.js`, `diagnostic-process-stop.cs`: bounded identity-aware diagnostic cleanup and native same-handle termination.
- `scripts/inspect-codex-startup-20261106.js`: use the diagnostic lifecycle helper and retain sanitized cleanup evidence.
- `tests/studio-run-scope.test.js`, `diagnostic-lifecycle.test.js`, `studio-executions.test.js`: scope, failure/restart and process-lifecycle regressions.
- `scripts/verify-builder-only-repair.js`, `verify-diagnostic-lifecycle.js`: disposable Chrome/database verification and trusted native process fixtures.
- `scripts/verify-class-handoff-demo.js`: optional evidence directory so this check preserves earlier screenshots.
- This report, local verification evidence and `docs/PROMPT_LOG.md`. All earlier unrelated uncommitted changes remain present.

## Verification evidence

Focused scope/cleanup run: **18/18 passed** initially. Final affected host regressions: **71/71 passed**, zero failures/cancellations/skips, about 59 seconds, covering conversation UI, diagnostic lifecycle, production execution/recovery, native protocol, run scope and native workspace-file safety. Command: node --max-old-space-size=128 --test --test-timeout=90000 --test-concurrency=1 tests/conversation-ui.test.js tests/diagnostic-lifecycle.test.js tests/studio-executions.test.js tests/studio-protocol.test.js tests/studio-run-scope.test.js tests/workspace-file-actions.test.js. Evidence: docs/verification/builder-only-host-focused-20261106.txt.

**Final full serial suite: 585/585 passed**, zero failures, cancellations or skips, about 462 seconds. Command: node scripts/test-serial.js (128 MiB heap, test-concurrency=1), on the local Windows host. Evidence: docs/verification/builder-only-full-final-20261106.txt. This includes the final cleanup edge cases and test-harness repair; no test assertions were weakened or skipped.

The first tool-sandbox full run recorded 584 tests: 577 passed, 6 failed and 1 cancelled, about 975 seconds including the stalled fixture. Preserve docs/verification/builder-only-full-20261106.txt as the failed attempt. Beyond the two corrected compatibility/cleanup issues, Windows native tests returned pin-directories permission errors or could not verify nested process termination in that tool context. The unchanged native file-safety cases passed on the Windows host. This demonstrates an execution-context difference; it does not identify an exact Windows policy or prove low RAM caused it. Running trusted hub tests on the host did not disable the application's MXC/root-deny sandbox or change OS permissions.

Chrome/Playwright: **16 checks passed**, zero page errors, actual regular dashboard components/backend against a disposable SQLite database, simulated workers only. It exercised mode selection, no execution before approval, approval without dispatch, Send dispatching one Builder, draft/status display, absent fabricated tests/review, refresh and application/database reopen, consumed approval staying disabled, a truthful mock limit failure, and the unchanged normal Builder/Tester/Reviewer chain. Evidence: `docs/verification/builder-only-browser-20261106/result.json`, `before-approval.png`, `builder-paused.png`, `mock-failure.png`. These are real browser interactions with fake workers, not real AI output.

The separate class simulation also passed **12/12 real Chrome checks** on a new disposable fixture/database, including handoffs, its actual trusted Node fixture tests, Stop, failure display, restart and pending owner acceptance. The owner's existing simulation was not started. Evidence: docs/verification/builder-only-class-browser-20261106.txt and the corresponding screenshot directory.

An initial exact-label locator exposed missing explicit accessible names on the new selects; those were added. A later harness navigation used a stale cached session list after adding a fixture through its setup code; the harness now reloads that list. Neither issue is represented as a successful first attempt.

Real Windows fixtures: trusted parent/child EOF shutdown **graceful-verified**, with three identified descendants exited; trusted timeout shutdown **forced-verified**, with one identified descendant exited; unrelated sentinel remained running. Evidence: `docs/verification/builder-only-native-cleanup-20261106.json`. No model/account was invoked. An earlier sandboxed probe returned `uncertain` after a forced stop could not confirm close within its settle window. It was not counted as success. Cleanup was corrected to stop children first, capture each stop result, wait for close observation and avoid duplicate signals; the native recheck passed.

The first full run exposed (1) the normal Team-button fixture expecting an untouched disabled property, corrected without changing the original assertion; and (2) an existing Windows observer test that ignored taskkill results and waited without a bound for child close. Its exact owned fixture remained running after the timeout. Native PID/birth/parent evidence identified only that fixture; the same-handle stop helper terminated it and verified absence, allowing the suite to continue. The test now retains its observer/identity/exit assertions while using bounded trusted EOF/lifecycle cleanup. Initial results/logs are preserved rather than rewritten as all-green.

## Production preservation

Supported backup first: `backups/backup-1793989048633-174d4672-0821-49ef-9a27-37d3ed2848a5.sqlite`; read-only quick-check returned `ok`. SQL set comparisons found **zero changed rows across 63 application tables**, excluding the runtime lease. Main database remains 15 projects, 15 sessions, zero active runs; original Counter lock remains. Both Counter file fingerprints match their pre-repair values. Existing authentication profiles, spending settings, provider routing, webhook settings and class simulation records were not changed. After verification, only the proven idle main Dev Squad backend was reloaded with its normal node --use-system-ca src/server.js procedure (PID 26848 to 28976). Native creation identity, port ownership and zero active sessions/executions were checked before the stop; old-process exit was verified. Post-reload comparisons again found zero changes across the 63 application tables; only the runtime PID lease changed. A real Chrome read-only check on http://127.0.0.1:3000/team found the new Builder-only choice, zero page errors and zero POST attempts. No mode was selected, grant created or Send pressed in production. Class server port 3002 still returned HTTP 200. Evidence: docs/verification/builder-only-backend-reload-20261106.json and builder-only-main-browser-20261106.json. Evidence: `docs/verification/builder-only-preservation-20261106.json`.

## Final results and next action

**READY FOR SEPARATELY APPROVED LIVE BUILDER TEST.** The repair passed local regressions, real Chrome/disposable database checks, native Windows process fixtures and a read-only regular-dashboard check. Zero real model invocations, zero paid calls, zero webhooks, zero production approvals/clocks and zero Git commits/pushes.

This verifies the production dispatch controls with simulated workers, not a genuine Codex-built application. Real Codex inference, current included quota, real generated counter behavior and graceful exit of an actual authenticated Codex app-server under the updated harness remain unverified. The helper will report a necessary forced stop as forced and any incomplete observation as uncertain. The earlier intermittent Git fixture stall still has no demonstrated cause; its case passed in the final full run and the old unknown journal remains untouched.

Exact next action: owner reviews this repair report. Then resume Step 5 preparation of a NEW disposable project through normal registration, record its actual project/session/root/task/profile details, confirm included allowance, and obtain separate explicit approval for one bounded Builder turn. Do not resume either Counter project and do not infer live authorization from these simulated tests. No live approval is requested in this repair task.

After review of this repair, a later task may create the new isolated counter project through normal registration and present its exact IDs/root/account/task/output/duration/Stop proposal. That future live invocation still requires separate explicit owner approval and confirmation of included allowance. No live test starts as a consequence of this repair.
