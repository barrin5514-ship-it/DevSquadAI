# Step 3 — Worker recovery and testing repairs

November 6, 2026, America/New_York. Branch: `feature/workspace-ui-redesign`. **VERIFIED for the bounded local worker/recovery scope**; Step 4 readiness **CONDITIONAL**. This report concerns local worker/process simulation and actual isolated tests, not real AI generation.

## A. Initial diagnosis

Read AGENTS.md, the Step 2 report, execution/recovery, transport, profile, preview, runner and existing tests. Much of the earlier repair already existed: separate native login folders, process birth identities, bounded native transports, safe diagnostic categories, timeout/cancellation events, checkpoint hashing, reconciliation, MXC isolation probes and Step 2 handoffs. These were reused.

Confirmed remaining defects:

1. Reconciliation accepted an older execution from the same request instead of requiring the latest execution.
2. The AI Tester record was completed before application tests launched. The separate test process had no execution row of its own, so recovery could inspect the wrong process.
3. The test command cleanup requested a kill but always reported an unknown outcome; it did not persist the test launcher's process identity or confirmed close/tree termination.
4. Restart paused chats but did not explicitly mark active execution rows interrupted.
5. The runner assumed Node test filenames without inspecting the declared package test framework, lacked some result metadata, and could count an all-skipped run as success.

Original Counter project `c25dcd14-322c-4004-9ef4-412584640600`, session `fc00a59b-c31e-4b93-b448-35ebbc0de048`, request `b2da3f48-1fab-42c7-8de2-0b44f1100a74`: paused with its original folder lock and **zero execution rows**. Its missing process evidence cannot be reconstructed. No safe supported recovery applies. Its four application files and lock were preserved. Jest/jsdom and direct-Node DOM incompatibility are separate from the earlier native-authentication failure; the historical exit-1 cause remains unknown.

## B. Changes and backup

Supported backup taken before changes: `node scripts/backup.js`, producing ignored `backups/backup-1793941931190-e9161b88-3c8e-4863-b31a-cf2d1518ce1d.sqlite`.

- New `src/services/native-process-observer.js` and `windows-process-observer.cs`: read-only direct Windows process snapshot/creation-time helper, using the existing installed compiler pattern, bounded launch, stripped environment and source/binary-verified atomic cache. Replaces the slow PowerShell/WMI dependency; no package installation, elevation or sandbox change.
- `src/services/demo-cli-transport.js`: cancellation now verifies the current PID creation identity before killing; a reused PID is never targeted.
- `src/services/studio-executions.js`: initial project/session/provider/profile/stage/checkpoint evidence; latest-execution reconciliation; remote unknown API outcomes cannot borrow native process evidence.
- `src/services/project-studio.js`: separate `application-tests` execution, lifecycle event persistence, interrupted/unknown states, accurate test-runner failure naming. Assigned agents, review and acceptance gates remain intact.
- `src/services/studio-workers.js`: per-process lifecycle for sandbox probe/tests, confirmed timeout/Stop cleanup, retained test copy when termination is unknown, result command/framework/cwd/count/skip/exit/time/hash metadata and sanitized output. No broad shell.
- New `src/services/studio-test-plan.js`: bounded package inspection and validated Node test command selection; clear blocked explanations for unsupported commands/frameworks.
- `src/services/studio-recovery.js`: plain-English test-runner identity in failures.
- New `tests/studio-worker-recovery.test.js` and `tests/native-process-observer.test.js`; `tests/studio-protocol.test.js` adds PID-reuse protection, and the legacy `tests/demo-workers.test.js` now forbids signalling without identity. Existing project/failover tests now count the additional test-process execution explicitly. Their four AI-worker attempts remain four; the fifth ledger entry is the application test runner.
- New `scripts/verify-studio-worker-recovery.js` and `scripts/verify-studio-interrupted.js`; Step 2 verifier's expected execution count adjusted to include that runner.
- This report, verification logs, preservation evidence and the standing manual prompt log.

**No schema migration**: existing JSON evidence and execution tables were reused. Earlier uncommitted composer/redesign/Step 2 changes were preserved. No account, billing, routing, dependency or preview configuration changes.

## C. Lifecycle and recovery

New execution records bind execution/request IDs, project/session, agent/provider, selected Codex profile ID, root hash, phase, checkpoint and start time. Native transport already records PID/birth, launch acknowledgment, progress, close, exit, termination request and sanitized diagnostics. The application test process now supplies its own equivalent evidence, including the isolation probe.

Timeout/Stop first inspect the exact launched process instance, capture descendants and request tree termination. A close plus verified absence and successful requested tree kill establishes stopped status. Unknown inspection/termination retains the project lock and test copy. No fallback starts on an uncertain prior outcome. Restart marks active records interrupted and leaves locks intact. Reconciliation checks the latest execution, identity/descendants, close/termination evidence, root, checkpoint, version and lock ownership. It does not kill anything or start a worker.

An interrupted process without reliable close/tree evidence remains blocked even if its PID is absent. That conservative limitation is intentional; no evidence is fabricated to unlock historical work.

## D. Lock safety and isolation

Original Counter lock remains byte-for-byte unchanged. A local fixture proves a separate folder completes while another is locked. Unknown local/remote outcomes retain ownership. The real test-command fixtures verify timeout and Stop against only their own spawned sandbox process. No sandbox is bypassed or disabled. Git branches/worktrees are not described as security isolation.

Production preservation evidence is in `docs/verification/step3-preservation-20261106.json`. Before regular-backend restart, every production table matched the supported backup; 13 projects, 14 sessions and Studio event high-water mark 93 remained unchanged. Original Counter fingerprint: `76ce5a26ce603064a14a266dede55595dd80011dbc981b1a0e77f6a6a7c2d785`.

## E. Bounded test compatibility

Supported: the installed Node built-in test runner for `*.test.js`, `*.test.mjs`, `*.test.cjs`; explicit compatible npm `test` scripts of `node --test` with validated known flags and exact test paths. These scripts launch Node directly inside the existing MXC boundary, **not npm or a shell**. Package pretest/posttest hooks never execute.

Unsupported: Jest/jsdom, arbitrary npm commands, shell operators, unknown flags, wildcard paths and missing dependencies. These pause with an actionable blocked explanation before test dispatch; nothing is installed. This does not claim support for every generated framework or that an installed Jest adapter was tested. A future independently authorized framework adapter is needed for those projects.

Browser-only code is not automatically imported or rewritten. The Tester instructions already specify a small Node `vm` DOM fixture where appropriate. A `document is not defined` failure remains a real failure, not success. Missing tests, malformed package metadata, nonzero exits, zero exercised/all-skipped tests and stale revisions cannot pass.

Evidence records command, relative isolated working directory, framework/source, exit, count, passed/failed/skipped, duration, timeout/cancellation failure events, sanitized stderr and tested revision/output hashes. The source and isolated copy must match. Reviewer bindings include artifact and test-evidence hashes; a written AI claim is not test execution.

## F. Step 2 compatibility

Existing failover service remains authoritative. Simulated Personal quota → School preserves Builder files and Tester phase. No repeated Builder call or self-review. Unknown outcomes block handoff. Prepaid reservations and approval gates are unchanged; no paid request was made. Real provider failover and live Zapier connectivity remain **UNVERIFIED**.

## G. Automated evidence

Baseline (serial, normal Windows access, disposable fixtures):

```powershell
node --max-old-space-size=128 --test --test-concurrency=1 tests/studio-executions.test.js tests/studio-protocol.test.js tests/studio-recovery.test.js tests/studio-failover.test.js
```

35 passed, 0 failed/skipped. Note: `tests/studio-recovery.test.js` does not exist; Node's discovery did not add tests for that argument. Actual recovery coverage is in execution/project/new worker-recovery tests. Do not count the absent file as tested.

Targeted regression command:

```powershell
node --max-old-space-size=128 --test --test-concurrency=1 tests/studio-worker-recovery.test.js tests/studio-executions.test.js tests/studio-protocol.test.js tests/studio-failover.test.js tests/workspace-output.test.js tests/project-studio.test.js
```

An intermediate 70/70 targeted run passed before the last two added cases. After adding them, one fixture attempted to mutate frozen config; corrected by supplying fixture-only configuration. The resulting new recovery file passed **11/11**, including real Windows sandbox timeout/Stop. A temporary edit syntax error was corrected before final validation. No tests were removed or safety assertions weakened. Execution-count assertions now separately account for the test-process record.

Final full regression command:

```powershell
node --max-old-space-size=128 scripts/test-serial.js
```

Earlier full result (before the resumed observer repair): **529 passed, 0 failed, 0 cancelled, 0 skipped**, 595.623 seconds. It ran serially under normal Windows access with a 128 MiB heap per test process. No memory-blocked test was skipped. All provider transports in these suites are fixtures/mocks; no model generation is authorized.

Scenario mapping:

| Case | Evidence |
|---|---|
| A normal completion | Actual Chrome workflow plus isolated Node runner; five ledger records, no lock left |
| B unsuccessful worker | Native protocol/exit tests; error classification, saved Builder files |
| C timeout | Real Windows sandbox fixture; PID/birth, kill, close and no pass |
| D Stop | Real Windows fixture and real Chrome button; no next phase |
| E restart | Real database reconstruction of active interrupted execution; browser completed-work restart |
| F unknown termination | Deterministic native/remote unknown tests; retained locks/copies |
| G fallback | Existing Step 2 tests plus browser Personal → School simulation |
| H isolation | Locked local project plus independently completed separate folder |
| I Node | Eight actual isolated behavior tests in browser workflow |
| J existing command | Compatible npm Node test script executed directly through approved adapter |
| K unsupported | Jest/shell/flags/missing tests blocked, no install or reviewer dispatch |
| L revision | Existing stale-source test, checkpoint/review hash bindings |
| M review | Separate fixture reviewer only after real tests; awaiting owner |
| N failed tests | Nonzero/failed/skip evidence preserved; never successful build |
| O history | Original Counter DB/lock equality and four files fingerprinted |

## H. Real browser checks

```powershell
node scripts/verify-studio-worker-recovery.js "C:\Users\barri\.codex\visualizations\2026\10\20\01a15721-9f6d-7e52-9209-7d64d043b76c\worker-recovery-step3-20261106"
```

**15 checks passed** using installed Chrome/Playwright, a real separate application/database, actual local Node worker processes, real HTTP/SSE and the actual MXC test runner. Verified task-scoped settings, composer submission, selected project/checkpoint, progress, handoff notification, test results, independent review/owner gate, history after supported restart, Stop, visible unsupported-framework pause and no leftover fixture locks/workers. Eight actual behavior tests passed. No browser JavaScript errors. No mocked HTTP page or provider response is being presented as real AI.

Initial verifier attempts navigated to backend-created sessions before refreshing the dashboard catalog and failed their checks. Corrected the verifier to reload and verify exact selected session IDs, and wait for the actual Stop response. These failed attempts remain recorded, not counted as passes. Production data was not involved.

Screenshots: the folder in the command contains `school-handoff-checkpoint.png`, `verified-local-failover-after-restart.png`, `owner-stop.png`, and `framework-blocked.png`. Rendered screenshots were visually inspected.

**Resumed verification:** actual abrupt backend termination during an active local Node worker is now Chrome-verified (five checks; details below). This is a local process simulation, not an authenticated AI turn. No live AI/provider build or failover was attempted.

## I. Safety audit

Personal and School passed fresh non-generating native ChatGPT status checks independently. Claude passed its native subscription status check. No credentials were displayed/read/copied or authentication settings changed. Existing default/native logins remain separate. No quota/model request, paid API request, webhook, account configuration change, original Counter write, Counter Test 2 creation, acceptance, commit, push, merge, deploy or Git reset occurred. Existing provider/spending approvals were preserved. Disposable test processes were bounded and cleaned; unverified outcomes remain protected.

## J–L. Blockers, status and Step 4

Legacy Counter remains locked because termination cannot be proven. It must not be reused for Step 4. Unsupported Jest/jsdom projects need a separately designed and authorized isolated framework adapter; no dependency install is justified here. Abrupt backend interruption is now browser-verified using a local worker; authenticated AI-turn interruption remains outside this task. Real-provider availability, paid approval and full pipeline quality must be established during the separately approved Step 4.

**Final status: VERIFIED for the tested local scope.** Lifecycle/recovery, bounded Node compatibility, failover, protected review and abrupt-backend interruption now have actual local functional evidence. This does not establish a live AI development pipeline or universal framework/provider compatibility.

**Is Dev Squad ready to attempt a real application build in a separate Counter Test 2 project? CONDITIONAL.** Use a fresh isolated folder, Node-compatible independent tests (a DOM fixture for the browser page), current assigned native logins, and separately approved DeepSeek spending. Stop on unknown worker outcomes. Owner must approve Step 4 first. No Step 4 work was started.

## Resumed bounded-recheck repair — November 6

The earlier 529/529 result was followed by **71/73 targeted passes (2 failures)** and **22/24 OS recheck passes (2 failures)**. Both failures concerned Windows process identity/termination. The WMI observer exceeded its 10-second bound; narrowing its fields did not resolve the issue. RAM availability was about 2.2 GiB at one snapshot; memory alone was not proven to be the cause. These failures superseded the earlier readiness claim until repair and re-verification. No unknown outcome was treated as safe, and no historical lock was released.

Replaced only the process-inspection mechanism with a small first-party read-only helper, consistent with the project's existing Windows-helper compilation pattern. It uses a Tool Help process snapshot plus `GetProcessTimes` under `PROCESS_QUERY_LIMITED_INFORMATION`, returns only PID/parent/birth, and preserves WMI's microsecond birth-string convention for historical comparisons. It cannot kill, change permissions, read process memory, read credentials or make network calls. Compilation is capped at 15 seconds; each observation remains capped at 10 seconds. The temporary executable is source/hash-bound and integrity checked; compiler/observer environments contain no provider or native-login credentials. Failed preparation, inspection or integrity checks return unverified, never an empty verified tree.

New regressions cover the real child tree and repeated birth identity, disappearance, invalid input, stripped environment, tampered executable cache, failed preparation, and PID-reuse cancellation. Results after the replacement: exact formerly failing OS files **24/24 passed**; broader targeted set **77/77 passed**; subsequent PID-reuse protocol file **8/8 passed**. The real Chrome workflow was repeated with the new observer: **15/15 checks passed**, eight actual isolated behavior tests, final stopped state and corrected cancellation explanation visible after reload. No provider or webhook calls. Final full-suite rerun: **535/535 passed, 0 failed/cancelled/skipped**, 671.051 seconds, serial with 128 MiB per test process. An earlier observer full run was 534/535: an old mock expected a kill attempt without any PID/identity. Its safety expectation was corrected to require zero kill attempts, preserving its unknown-outcome assertion; legacy/transport regressions then passed **34/34**, followed by the final all-green full suite.

Exact additional commands:

```powershell
node --max-old-space-size=128 --test --test-concurrency=1 tests/studio-executions.test.js tests/studio-worker-recovery.test.js
node --max-old-space-size=128 --test --test-concurrency=1 tests/native-process-observer.test.js tests/studio-executions.test.js tests/studio-worker-recovery.test.js tests/studio-protocol.test.js tests/studio-failover.test.js tests/workspace-output.test.js tests/project-studio.test.js
node --max-old-space-size=128 --test --test-concurrency=1 tests/studio-protocol.test.js
```

Official read-only API references checked November 6: [Tool Help process snapshots](https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/nf-tlhelp32-createtoolhelp32snapshot), [GetProcessTimes and required access rights](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes). These document the API; local tests supply the evidence that this implementation works on this PC.

### Final active-backend interruption evidence

```powershell
node scripts/verify-studio-interrupted.js "C:\Users\barri\.codex\visualizations\2026\10\20\01a15721-9f6d-7e52-9209-7d64d043b76c\worker-recovery-step3-20261106"
```

**5/5 real Chrome/backend checks passed**: an actual local worker launched with durable birth identity; only the disposable backend was terminated; the same database was reopened; the saved identity, project, file and checkpoint survived; status became interrupted/paused with its lock retained; a protected HTTP Run request returned 409 and did not create a duplicate execution. The original worker was absent at the post-restart observation; absence alone was correctly not accepted as termination evidence. The first verifier attempt incorrectly required the worker to survive backend termination. The final check records either observed presence or absence and verifies the required protection rather than assuming a Windows child-lifetime behavior. No production data, native login or AI request was used.

Screenshot: `active-backend-restart-protected.png`; structured evidence: `active-restart-evidence.json`, in the screenshot folder above. The disposable interrupted lock is intentionally retained in its own temporary database for audit. Its known local worker and fixture backend were cleaned up using exact identities; this is distinct from the regular application and original Counter lock.

Final totals: full serial **535/535**, broad targeted **77/77**, exact formerly failing OS files **24/24**, termination regressions **34/34**, regular functional fixture **15 browser checks + 8 actual behavior tests**, interruption fixture **5 browser checks**. These runs overlap; do not add them as unique test totals. A separate read-only observation under load verified its own identity in 570 ms; this single measurement is not a guaranteed latency bound. Earlier failures remain in the audit logs.

### Final preservation and audit

The regular backend loaded the repair while idle and responds HTTP 200 at `http://127.0.0.1:3000/team`. Compared with the supported Step 3 backup, only `team_runtime_lease` changed. All 13 projects, 14 sessions, event high-water mark 93, original Counter lock and original four-file fingerprint remain unchanged; no regular-app execution is active. Final working-tree diff check passed and configured credential-value matching found no secret values in changed/untracked source or evidence files. No commit, push, merge or deployment occurred. `docs/PROMPT_LOG.md` records both the failed earlier rechecks and the completed continuation.

The previous PowerShell/WMI path was the failing monitoring dependency; the exact Windows-internal service/resource cause was not independently established. This repair removes that dependency without claiming that future OS calls can never fail. Any unverified observation still protects the folder rather than allowing overlapping work.
