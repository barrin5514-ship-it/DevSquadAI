# Codex independent bug hunt — 2026-11-07

Status: PARTIALLY VERIFIED. Five live cycles used; no further model calls authorized in this pass. Final regression: 721/721 passed. This hunter made no commit, push, deployment, owner acceptance, or owner-project execution.

## 1. Re-verification results

- Initial serial baseline: 697/697 before the first source change.
- Follow-up repair: 52/52 focused; 699/699 serial.
- Native token/turn limit and stream checks: 29/29 focused; 712/712 serial.
- Shared source after overlapping changes: 713/713 serial. Extra disposable fixtures: 13/13 (including missing finish_reason with/without DONE and feedback after simulated owner acceptance).
- Stage continuation: both tests passed; simulated Tester retry uses the saved Builder checkpoint and makes zero extra Builder calls. Budget-off: all eight tests passed; a fake zero balance/stale price does not block the simulated provider. These are local fixtures, not live balance checks.
- Live paused Send proof: chat 2ad9c0f2-a90f-4c20-96f7-8f227cd03957. Deliberately stopped request 42fb1f46-d3b0-4844-91fa-5df9394aaaca, execution e78dfe5f-9c09-4cd0-a0c5-893ca5c73c33. Chrome then submitted the new button task exactly once under b6a2458f-a912-40bd-a006-43eca235da48 in the same chat/folder. Its actual implementation and independent tests reached owner review. The stopped call remains unknown, with a $0.006831 local reservation; this is not a confirmed charge.
- DeepSeek and Claude limit fixtures reject truncated terminal replies rather than accept parseable partial files. CLI capture-overflow checks are local fixtures; no live Claude limit was induced. Raw/visible DeepSeek safety bounds remain 2000000/512000 bytes.

## 2. Bugs found and stall verdict

### A — confirmed application defect: follow-up created a different chat
Local reproduction failed before repair. The message workflow now keeps the chat/project/folder, starts a fresh request, preserves earlier review/checkpoint history, and scopes independent-author checks to the current task. Files: src/services/studio-conversations.js, src/services/studio-independence.js, src/dashboard/conversations.js; tests/codex-hunt-followup.test.js, tests/workspace-inspection.test.js, tests/conversation-ui.test.js. The other hunter later changed Awaiting Owner Send to an atomic retry/new path; that overlap was recorded and not overwritten. Accepted-task message coverage is a simulation, not acceptance of an owner task.

### E — confirmed application defect: native terminal limits
A Claude result with subtype success and parseable JSON but stop_reason=max_tokens was accepted. Native parsing/transport now reject this as response_truncated, and error_max_turns as session_limit, retaining safe counts/completion metadata. Files: src/services/demo-workers.js, src/services/demo-cli-transport.js, src/services/native-diagnostics.js, src/services/studio-recovery.js, tests/codex-hunt-native-limits.test.js. The other hunter separately owns the later capture-clamp work.

### E/C — confirmed application defect: School credit exhaustion misclassified
Live Reviewer execution 655df730-4495-4389-a6e9-139253a8fefd exited 1 after explicit structured errors: Your workspace is out of credits. Its native login had passed; this was not an authentication failure. nativeFailure omitted that wording, returned worker_error, and the router correctly rejected that unclassified category. The UI emphasized ordinary stdin startup stderr. Small fix: recognize explicit workspace-is-out-of-credits wording as usage_limit in src/services/native-diagnostics.js only. No transport/router/approval changes. New tests/codex-hunt-credit-limit.test.js reproduces the recorded structured-error/stdin pattern and simulates a School-to-Personal review-only handoff with identical tested files. Local reproduction 0/3, then final focused regression 30/30. One fixture assertion initially used testEvidence instead of the actual packet field testResults; corrected the fixture, not production behavior. No live replay after the fix. Historical failed records are not rewritten.

### C — stall/fallback verdict
Live inactivity_timeout switched Personal to School twice: cycle 1 request 719be17f-851c-43b4-b9e7-f7043747cc69 and cycle 3 request fa2f845c-9583-4d40-8502-026f4f89a431. Both transitions retained the role/checkpoint and finished without rerunning the saved Builder. Personal's exact upstream reason remains unknown; inactivity is not proof of quota exhaustion. The original local stalled API fixture proved a safe unknown pause and explicit same-chat retry. The other hunter subsequently changed API stall handling and its fixture to prove local transport shutdown before fallback while leaving usage unknown; final serial results below cover that current shared code. Native termination that cannot be verified must still pause and retain its lock. No hidden reasoning/raw provider bodies were added to diagnostics.

### Provider/model-output events, not invented application fixes
Cycle 2 DeepSeek returned unchanged Builder tests; the independence guard rejected them before writing Tester artifacts. Cycle 3 had two failing test rounds and used the existing bounded correction loop before passing. Cycle 5 also retained Try me although the first task required Change color; its three generated tests missed this. A read-only Chrome check confirmed the mismatch at the unchanged tested checkpoint 9237b73a60bfed2b3b3ac4f31e8486b507a103ac362708a74e088dd107eef7c8. This is a model/test-quality failure, not proof of an application parser defect. No generated file was edited by this hunter. No real partial multi-file apply was observed; that remains out of scope and is not proven safe.

## 3. Live rotation scoreboard

| Cycle | Initial Builder / Tester / Reviewer | Outcome | Independent tests | Browser | Clean? |
| --- | --- | --- | --- | --- | --- |
| 1 | DeepSeek / Personal / Nemotron | Both builds Awaiting Owner; Tester fell back to School | 2, then 3 passed | Both passed | No: timeout and source reload between builds |
| 2 | Personal / DeepSeek / Nemotron | Paused at first Tester; no second build sent | Unchanged Builder tests rejected | Not counted | No |
| 3 | Nemotron / Personal / DeepSeek | Both Awaiting Owner; School fallback, two correction turns | 2, then final 2 passed; two earlier failed rounds retained | Both passed | No |
| 4 | School / DeepSeek / Nemotron | Both Awaiting Owner | 4, then 9 passed | Both passed | Yes, before final classifier fix |
| 5 | DeepSeek / Nemotron / School | First build tests passed; Reviewer reported exhausted credits; no second build sent | 3 passed | FAIL: wrong initial label despite 3 passing generated tests | No |

Five cycles attempted, three completed. Codex actually built in cycles 2 and 4; DeepSeek built in cycles 1 and 5. Completed cycles used three independent families: DeepSeek, Codex and Nemotron. Claude was not invoked before the Sunday reset, so none proves the requested DeepSeek/Codex/Claude combination. The required final three clean cycles were not achieved. After the final credit-classifier change, the clean live streak is zero; no extra sixth cycle was dispatched.

### Exact live IDs

- Cycle 1: chat 2ad9c0f2-a90f-4c20-96f7-8f227cd03957; build 1 Send b6a2458f-a912-40bd-a006-43eca235da48, final b6a2458f-a912-40bd-a006-43eca235da48 (awaiting_owner); build 2 Send 719be17f-851c-43b4-b9e7-f7043747cc69, final 719be17f-851c-43b4-b9e7-f7043747cc69 (awaiting_owner).
- Cycle 2: chat a6f74948-4421-4932-854d-a22ff9e5db13; build 1 Send a889c394-3d82-4b17-9011-a2bef339b590, final a889c394-3d82-4b17-9011-a2bef339b590 (paused).
- Cycle 3: chat c1a4f527-2df3-4e62-9ac9-6c073d0caebf; build 1 Send fa2f845c-9583-4d40-8502-026f4f89a431, final fa2f845c-9583-4d40-8502-026f4f89a431 (awaiting_owner); build 2 Send 211d2ced-8ef5-4905-a305-4038cf590ac1, final b07556ff-017b-421d-b784-7d265d2971eb (awaiting_owner).
- Cycle 4: chat 8c9059a0-97b3-4464-97d5-dea2c80f5a58; build 1 Send 590b6865-abab-407c-a7bc-1d20cc0badc9, final 590b6865-abab-407c-a7bc-1d20cc0badc9 (awaiting_owner); build 2 Send d8f91a9d-d7dd-4498-8880-a4c6235b0477, final d8f91a9d-d7dd-4498-8880-a4c6235b0477 (awaiting_owner).
- Cycle 5: chat 4a52f62a-dc16-48ff-9732-c667ec7f7af6; build 1 Send 86b37e7b-a53b-4b22-ac34-d6b749d0c515, final 86b37e7b-a53b-4b22-ac34-d6b749d0c515 (paused).

All execution IDs, actual agents, test command/revision evidence, corrections, swaps, usage and reservation states: [live-evidence.json](verification/codex-bug-hunt-20261107/live-evidence.json). Browser screenshots: data/codex-hunt-browser/ (local ignored test evidence). First-build starts used the regular dashboard API; paused/follow-up Sends used real Chrome. Generated pages were inspected and rendered in Chrome behind a temporary loopback server with outside requests blocked. This is not a claim that every dispatch was clicked visually.

30 native/API model invocation attempts: DeepSeek 9, Nemotron 9, Codex Personal 4, Codex School 8. This excludes non-generating catalog/auth checks. Known token-based API estimate: $0.0113151, not an invoice; one DeepSeek call has unknown usage/cost. Native included-usage calls do not establish remaining allowance. No Claude model call, Zapier send, credit purchase, or billing change.

## 4. Shared ledger and preservation

[BUG_HUNT_LEDGER.md](BUG_HUNT_LEDGER.md) records claims, fixes, verified tests, overlaps and restart announcements. Did not edit the other hunter's claimed final-sweep transport/router/stream/timer/resume areas during the credit fix. Owner-project database rows and registered folder hashes: 20 protected projects matched on earlier comparisons. A later separate live execution in demo 2 (chat 700fed1b-60ce-4bde-812a-cee27b6f624e) changed that project while this hunter was running local regressions. This hunter did not dispatch or stop it. Final all-owner snapshot equality therefore cannot be claimed; its changes were preserved. Original locks/reservations, including the owner Expense Tracker reservation, were not released or rewritten. Own five test chats currently hold no folder lock. No owner work was accepted.

## 5. Still not proven by either hunter

- Three consecutive clean final cycles after the latest source fix.
- The latest credit-classifier fix under a new live response (all five cycles are used); three passing generated tests missed cycle 5's wrong initial label.
- Claude after its reset, and the full intended Claude-inclusive rotation.
- Root cause of Personal's silent turns; remaining Personal/School quota. School explicitly reported exhausted workspace credits on the recorded attempt.
- The other hunter's complete ten-cycle / hundred-simulation result; an active AutoTest run and IN PROGRESS ledger claims cannot be treated as green evidence.
- Atomic safety of partial multi-file application.
- Live external Zapier callback behavior; this pass used the existing local replay/lease tests and kept callback delivery disabled.

## 6. Owner-facing conclusion

NOT BOTH GREEN: the live clean-streak gate failed, the School workspace reported exhausted credits, and the final classifier fix needs a later separately authorized live proof. No further live calls were sent.

## Final local verification and loaded-backend state

- Final focused command: node --test --test-concurrency=1 tests/codex-hunt-credit-limit.test.js tests/native-diagnostics.test.js tests/studio-failover.test.js — 30/30, 38.836 seconds.
- Final full command: node scripts/test-serial.js — 721/721, zero failed/skipped/cancelled, 509.934 seconds. Tests ran serially.
- The classifier fix was loaded by a supported restart after verified backup and zero active chats/executions immediately before stopping only PID 2200. New backend PID 32676, 22 migrations. /api/health and /team returned 200; /health is not the application's health route and returned 404 during the initial probe.
- Own evidence before/after restart matched exactly after excluding its collection timestamp. All five own chats retain their states, review/test history, reservations and released locks; model-invocation count remains 30.
- Read-only Chrome dashboard check: HTTP 200, expected paused chat and request, two revisions, original credit diagnostic visible, no lock needed, zero page errors, zero mutation requests. Screenshot: verification/codex-bug-hunt-20261107/dashboard-paused-review.png.
- A concurrent owner demo 2 execution resumed after restart. Its changes were not reverted or attributed to AutoTest-Codex. Fresh maintenance comparison therefore also cannot establish all-owner-row equality, while own live evidence is unchanged. No further restart was attempted.
- git diff --check exited 0; Git emitted ordinary LF/CRLF warnings for pre-existing mixed-line-ending files. No Git staging/commit/push/reset.
- Verification-helper corrections: initially used the wrong root table, later expected /run instead of the overlapping atomic /retry/new UI action, and initially omitted an exact first-button-label assertion. Corrected the local helpers and final evidence; no failed check was promoted to a pass. The first cycle 5 browser observation is superseded by its recorded expected-label failure.
- Source/runtime changes from the other hunter are covered by the final full suite, but their ledger still has IN PROGRESS items; this report does not certify their separate ten live / hundred simulated cycles.

