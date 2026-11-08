# Dev Squad AI — Independent Audit and Live-Execution Readiness

**Reviewer:** DeepSeek (independent reviewer, not Builder/Tester/Reviewer of the proposed run)
**Date:** 2026-11-07, approximately 12:00 America/New_York
**Project:** Dev Squad AI, `C:\Users\barri\OneDrive\Desktop\Next Chapter Projects\DevSquadAI`
**Branch:** `feature/workspace-ui-redesign`
**HEAD:** `9983d20` with a heavily modified working tree
**Mode:** READ-ONLY audit. No source, configuration, database, project state, permission, or dependency was changed. No model/provider request, paid call, webhook, commit, push, merge, or deployment was made.

## Evidence basis and limits

- Live backend at `http://127.0.0.1:3000` was inspected read-only (health, dashboard JSON, Expense project/session state).
- Production SQLite was queried read-only: 17 projects, 17 sessions, 1 historical lock, 6 executions; Expense project has zero executions and no run approval; Counter Test 2 still has no managed connection.
- Source and saved evidence were inspected. The saved full-serial log reports **657/657 passed**, focused **43/43**, dashboard **11/11**, mock three-role **20/20**, restart **4/4**, and new-root isolation **6/6**. The source hashes in `docs/verification/nemotron-integration-20261107/final-local-checks.json` match the current files for the reviewed services/tests, so the logs are internally consistent with this tree.
- **Tests were not independently rerun.** The audit restriction forbids tests that can write databases/files or launch workers. The saved logs and code were inspected instead. A passing saved suite is not treated as sole proof.
- A browser was not independently automated in this audit. The saved Chrome evidence was inspected; it shows the regular dashboard **11/11** but does not exercise a team-run approval.
- The working tree contains many uncommitted changes and reports. Historical/failed artifacts were not overwritten.

---

## A. Executive Summary

Dev Squad has moved substantially since the November 6 audit. The independent-Tester gate is now real in Project Studio, role-family independence is enforced for the Studio workflow, the managed project root is in place for new projects, the one-call Builder-only path has been exercised with a real Codex Builder, and NVIDIA Nemotron is integrated as a bounded free API worker through the existing artifact/test/review pipeline. The saved 657/657 and 43/43 logs are consistent with the current source hashes.

The proposed **DeepSeek Builder → Codex Personal Tester → Nemotron Reviewer → Owner acceptance** workflow is *architecturally supportable* and its component contracts are well guarded. However, it is **not ready to launch today through the normal dashboard**, and the paid DeepSeek prerequisite is currently not satisfied:

- There is **no owner-facing team-run approval control**. The dashboard only has “Approve one Builder invocation” for Builder-only mode (`src/dashboard/conversations.js:54`). A team run with Nemotron cannot be armed through the dashboard: `StudioRunScope.assertAvailable` rejects it without a run approval, and only the API route `/studio/chats/:id/run-approval` can create the required paid/free terms (`src/routes/console.js:39`).
- The run-scope approval binds project/session/database/root/goal/roles/request, but **does not bind the file checkpoint**. The report claims “current checkpoint” (`docs/NVIDIA_NEMOTRON_DEVSQUAD_INTEGRATION_20261107.md:20`), but `StudioRunScope.arm` stores no file hash and `check` does not compare files (`src/services/studio-run-scope.js:13-19`). The pending proposal also has no checkpoint field.
- The live DeepSeek pricing lease is **expired** (`2026-10-22T21:49:00.747Z`), and the live database still shows the old $5 balance from 2026-10-23. A separate saved account check recorded $16.42 at 16:39 UTC, but that value was not persisted in the production database (`docs/verification/nemotron-integration-20261107/accounts.json:29-32` vs live `/api/console`). The paid guard therefore refuses DeepSeek dispatch.
- Codex remaining included allowance is **not verifiable from login status**; the owner must confirm it before the one included invocation.

The application does fail closed on the financial prerequisites; no unauthorized paid call is possible through the guarded path. No verified P0 issue was found. The current verdict is **CONDITIONALLY READY — SPECIFIC PREREQUISITES**, not “ready now.”

---

## B. November 6 Audit Comparison

The previous report is [DEEPSEEK_INDEPENDENT_REVIEW.md](DEEPSEEK_INDEPENDENT_REVIEW.md). Its findings and current status:

| Previous ID | Original concern | Current status | Current evidence |
|---|---|---|---|
| P1-01 | No-op Tester could use Builder tests and reach acceptance | **RESOLVED (application logic; live team not run)** | `src/services/studio-independence.js` requires Tester-returned new/changed `.test.*` files, binds identity/hashes/execution/revision, and `ProjectStudio.accept` rechecks `hasIndependentTests` (`project-studio.js:52`). `studio-independence.test.js` covers empty/unchanged Builder tests, acceptance, failed tests, malformed runner and changed evidence. |
| P1-02 | Builder/Tester same family allowed; fallback could self-test | **PARTIALLY RESOLVED** | `StudioRoles.validate` and `ProjectStudio.drive` now call `independentRoles` and `assertIndependentPhase`; Studio fallback uses the same validator. However, legacy `BigThreeCoordinator.validateRoles` still checks only Builder/Reviewer (`big-three.js:21-24`), and `/shared-jobs/:id/roles` calls it directly (`routes/console.js:33`). |
| P1-03 | Existing projects not migrated; Counter Test 2 blocked | **UNRESOLVED (legacy residual)** | Counter Test 2 still has no `studio_project_connections` row and no local Git/AGENTS. The new Expense project is a new managed root with Git/AGENTS, but there is no migration/adoption path for old projects. The previous report’s “do not migrate silently” remains correct. |
| P2-01 | Paid/live flags not enforced by Studio Send | **PARTIALLY RESOLVED** | Bounded team terms now include exact DeepSeek model/cap/output/input (`studio-run-scope.js:17`) and `StudioFailover` reserves/checks them (`studio-failover.js:30-44`). But ordinary team Send with DeepSeek and no approval remains unguarded, the dashboard has no team approval control, and live price/balance prerequisites are stale. |
| P2-02 | Runner launch failure mislabeled as executed tests | **UNRESOLVED** | `StudioWorkers.command` still resolves on a spawn error/no-PID path (`studio-workers.js:51-53`); `tests` returns `executed:true` with `passed:false` (`studio-workers.js:45`). No new launch-failure test was found. |
| P2-03 | Multi-file patch can be partially applied | **UNRESOLVED** | `ProjectStudio.apply` still inserts revisions and applies changes in a loop (`project-studio.js:41`); `ProjectFiles.changes` does not reject file/directory prefix conflicts (`project-files.js:14`). The previous conflicting-path probe (`src/x` + `src/x/y.js`) still describes the code path. |
| P2-04 | External project `AGENTS.md` writable by workers | **UNRESOLVED** | Protection remains conditional on `managedRootState(this.root)` (`project-files.js:14`). External projects do not have that ledger. |
| P2-05 | Managed proof optional; provenance errors become generic 500 | **UNRESOLVED** | `ProjectService.verify` still returns `null` when no proof row exists (`projects.js:7`); `ProjectStudio.start` now verifies before dispatch, but a managed root without a proof still passes. Tampering throws a plain `Error`, mapped to generic 500. |
| P2-06 | Builder-only mode untested; UI recovery issues | **PARTIALLY RESOLVED** | Builder-only now has 17/17 focused tests, the empty-goal approval is disabled (`conversations.js:54`), and a real Codex Builder-only To-Do build was recorded (`FIRST_REAL_DEV_SQUAD_BUILD_20261106.md`, “REAL BUILD VERIFIED”). A real team-run approval UI is still absent; the Resume button after a preflight failure still sends a fresh request ID (`conversations.js:52`), which `StudioRunScope.check` rejects. |
| P2-07 | README/current behavior mismatch | **UNRESOLVED** | `README.md` is still dated Nov 2 and says generated code is never executed, no background execution, live calls off by default, and Codex/Claude integrations retired (`README.md:5,46,58,115,125,135`). Those statements do not describe Project Studio or the Nemotron worker. |
| P2-08 | No Git checkpoint/rollback | **UNRESOLVED** | Studio still writes files and SQLite revisions without a Git commit or restore path (`project-studio.js:41`); `workspace-inspection.js` is read-only Git inspection. |
| P2-09 | Node-only test runner/browser gap | **UNRESOLVED** | `testPlan` selects Node `.test.*` files and only accepts a direct `node --test` script (`studio-test-plan.js:5-19`). The new browser evidence is for the dashboard/mock workflow, not a generated Expense app in a browser. |
| P3-01 | Internal project-link bypass of protected-root checks | **UNRESOLVED (latent)** | `ProjectStudio.project` still accepts a folder directly and does not use `ProjectConnections.selectedFolder` (`project-studio.js:22`). The HTTP `/studio/projects` route still allows only `name` (`routes/console.js:61`), so it remains latent, not user-reachable. |
| P3-02 | Non-loopback HOST / legacy API unauthenticated | **UNRESOLVED** | `config/index.js:6` still accepts arbitrary `HOST`; console has a Host check, legacy `/api` routes do not. |
| P3-03 | No per-test timeout in `scripts/test-serial.js` | **UNRESOLVED** | `scripts/test-serial.js:12` still uses `spawnSync` without `--test-timeout`; the new manual focused commands pass `--test-timeout`. |
| P3-04 | Plain errors become 500; shutdown unbounded | **UNRESOLVED** | `projects.js:7` still throws plain `Error`; `server.js:12` still has no shutdown deadline. |
| UI/render timeout (empty project) | Empty-project status dereference found during the Builder-only work | **RESOLVED** | `conversations.js` `activeNow` now uses optional access; the saved chat-first/UI evidence and current `conversation-ui` tests cover the empty-project state. |

**Net:** The central independent-testing defect is fixed. The core independence defect is fixed for Project Studio but not the legacy Big Three path. Project/approval, file-apply, runner-classification, proof, docs, Git, and Node/browser gaps remain as before, with a new team-approval UI gap created by the Nemotron integration.

---

## C. Nemotron Integration Assessment

### C.1 What is verified

1. **Registered worker with the existing pipeline.** `nemotron` is in `studioWorkerIds` (`nemotron-worker.js:8`), `StudioRoles.workers()` exposes it with `scopeRequired:true` and `automaticFallback:false` (`studio-roles.js:11`), and `StudioWorkers.call` delegates to `NemotronWorker` (`studio-workers.js:19`).
2. **Exact model enforcement.** The model is the literal `nvidia/nemotron-3.5-super-vl:free` (`nemotron-worker.js:7`); it is used in settings, the request body, the scope (`studio-run-scope.js:17`), `assertAuthorized`, and the response-model check (`nemotron-worker.js:39,65-68`). A returned different model is rejected and recorded (`tests/nemotron-worker.test.js`, “model discrepancy fails closed”).
3. **Free-only safeguards.** Catalog and account-filtered models must have all zero prices; the key must be a free tier with positive remaining daily quota; the model must report optional reasoning and required parameters (`nemotron-worker.js:29-34`). The POST sets `allow_fallbacks:false`, `require_parameters:true`, zero max prices, exact 2048 output and reasoning disabled (`nemotron-worker.js:57`). A reported nonzero numeric cost is rejected (`nemotron-worker.js:69`). A test covers paid/retired catalog entries. The worker is excluded from `workerOrder` fallback (`big-three.js:6`).
4. **Task-bound authorization.** `StudioRunScope.arm` requires exact free terms (model, 2048 output, 60 s) and stores them in the run approval. `NemotronWorker.assertAuthorized` rechecks project/session/phase/role/root/execution/request/status/lock/checkpoint/goal/roles/guarded files/review binding (`nemotron-worker.js:38-42`). The focused packet tests cover missing approval, changed goal/roles/files, wrong root/database, expired scope, model discrepancy, duplicate execution and Stop.
5. **One-call/no-retry.** `runScope` gives three total calls/one per role, but a single execution slot and one `adb` POST per role; `execution.usage.start` prevents a duplicate request; retries/fallbacks are not configured. The saved focused evidence says 43/43, including “concurrent use of one execution dispatches at most once” and “Stop aborts the request.”
6. **Malformed/cancelled/failed responses.** `validWorkerResponse` rejects extra/missing fields and role-inappropriate review/files; `assertAuthorized` rejects changed packet/files; `call` rejects model mismatch, nonzero numeric cost, unfinished/malformed generation, and classifies auth/quota/outage. `worker-deadline.test.js` covers late natural completion and surviving descendants.
7. **Dashboard presence, without a live request.** The regular dashboard loads the Expense session, shows Nemotron in all three role selectors, does not change the saved selection, exposes the non-generating access check, and reports seven model rows. The saved `main-browser/result.json` is 11/11 and `modelRequests:0`. The browser access result records exact model, zero price, free tier, 48 remaining requests.
8. **Mock role matrix.** The saved `mock-browser/result.json` is 20/20 with **fake provider responses only** and `liveModelRequests:0`. It exercises Nemotron as Builder, Tester and Reviewer through the real guards and the real MXC Node test runner. `restart.json` is 4/4 in a separate process; `isolation.json` shows six actual sandbox checks on the Expense root, including network denial, and zero model turns.
9. **Full suite.** The saved `full-serial.txt` reports 657/657, zero fail/skip/cancelled, with source hashes matching the current tree (`final-local-checks.json`). This is strong code-level evidence, not a live three-agent run.

### C.2 What remains uncertain

- **Live role quality.** The only real Nemotron generation evidence is the standalone `calculateTotal` result (`FINAL_NVIDIA_FREE_MODEL_RESULT_20261107.md`): HTTP 200, 0 reasoning, 96/175 tokens, $0, exact code passed 24/24 independent checks. That is one small function, not coding, testing, or review performance in the three-role workflow.
- **Real three-agent collaboration.** No real DeepSeek → Codex → Nemotron handoff exists. The 20/20 evidence uses fake provider responses and a real test runner.
- **Expense Tracker.** No Expense files or execution exist. The project contains only `AGENTS.md`.
- **Free-route data handling.** The free NVIDIA/OpenRouter route is not a confidential-input route; the report notes the free-route notice (`FINAL_FREE_MODEL_AND_TWO_AGENT_PLAN_20261107.md:15`). The worker sends the full packet (goal, guarded project snapshot, test evidence, reviews) to the provider (`nemotron-worker.js:57`). The UI labels it “free OpenRouter” but does not warn about provider data handling. This is a real new privacy/terms risk for non-disposable projects.
- **Free-plan/allowance stability.** Fresh checks are required; the code refreshes while authorized but does not guarantee future free capacity. That is correctly disclosed.
- **String/noncanonical cost.** The nonzero-cost check accepts only a numeric `data.usage.cost` (`nemotron-worker.js:69`). A provider returning `"0.01"` as a string would not be rejected by that check (the provider free-price filters still apply). This is a suspected edge, not a verified live bypass.
- **Team-run approval.** The UI gap below is the largest integration issue; the 11/11 dashboard evidence does not cover creating a team approval or the paid/free terms.

### C.3 New risks introduced

- An API worker sends full project/test context to a free third-party model; the owner must consent to the provider’s free-route terms, not merely the price.
- The team approval is API-only; an owner/script can create a paid/free scope, but a normal dashboard user cannot. This is a control/UX gap, not a sandbox escape.
- `StudioRunScope` approval does not bind the file checkpoint; a file change after approval is not detected by `check`.
- The local `$0.02` cap is a conservative reservation, not a provider-side dollar ceiling; a provider-side overage remains possible in principle. The report discloses this; the owner must accept it.

---

## D. Three-Agent Workflow Assessment

### D.1 Intended path and current support

| Stage | Current implementation | Evidence | Readiness |
|---|---|---|---|
| Owner approval | `StudioRunScope.arm` version/task/root/database/goal/roles/request/paid/free/30-min; no dashboard team control | `studio-run-scope.js:13-17`; `conversations.js:54` only Builder-only | **Blocked at UI**; API/script possible |
| DeepSeek Builder | Bounded paid terms; `StudioFailover.reserve` price/balance/cap/input/output; one execution | `studio-workers.js:24-31`; `studio-failover.js:30-44`; `studio-team-budget.test.js` | Contracts tested; **live prerequisites not met** |
| Codex Tester | Native CLI packet; real MXC Node test runner; independent test files required | `studio-workers.js:20,33-46`; `studio-independence.js`; `studio-independence.test.js` | Logic tested; **real included allowance unverified** |
| Nemotron Reviewer | Exact free model; one POST; review bound to artifact/test hashes; no code files | `nemotron-worker.js:38-79`; `validWorkerResponse`; `mock-browser` 20/20 fake | Contracts and mock roles verified; **no live team review** |
| Owner acceptance | `accept` requires `hasIndependentTests`, approved review, hashes, no reviewer author | `project-studio.js:52` | Logic tested; correct |
| Failure recovery | Bounded failures pause; no retry/fallback; unknown locks | `project-studio.js:46-50`; `studio-executions.js` | Mostly; **Resume/checkpoint gap** |

### D.2 Independence

- **Project Studio:** `independentRoles` rejects Builder=Tester and Tester=Reviewer families; `assertIndependentPhase` rejects a Tester from the Builder family and a Reviewer who was an author/Tester (`studio-independence.js:7-23`). `hasIndependentTests` rechecks family/identity at acceptance. The default roles are three families (`deepseek`, `codex`, `claude`); the proposed `deepseek`/`codex`/`nvidia` is also three families.
- **Tester evidence:** The Tester must return new/changed test files; the test runner receives only Tester paths; `independentTestFiles` records path/hash/execution; `hasIndependentTests` rechecks hashes/current revision at review and acceptance. **This resolves the original false “independent testing” claim at the application level.**
- **Legacy Big Three:** `BigThreeCoordinator.validateRoles` still permits Builder=Tester; `/shared-jobs/:id/roles` retains that path. This does not affect the Project Studio Expense trial, but it is an unresolved independence surface.
- **No agent can self-authorize:** the scope is owner-token/`approvedBy:'owner'`; `runScope.arm` only; the worker cannot create a scope; acceptance is owner only. Good.

### D.3 Handoffs and failures

- Context is bounded and hashed (goal, snapshot, test evidence, review binding, files). The Nemotron `assertAuthorized` compares the packet goals/roles/files/review binding to current state.
- A no-op Tester pauses before review; a Reviewer cannot modify files or claim executed tests; a test failure cannot become a success; `hasIndependentTests` is rechecked at acceptance.
- Bounded runs pause on test failure/review corrections; no automatic Builder retry or fallback. Unknown outcomes retain the reservation/lock. Good.
- **Checkpoint binding gap:** the approval does not capture the file fingerprint; a file change after arm is not a `check` failure. The execution slot records the current checkpoint, but that is after approval, not the approved state. The `FIRST_THREE` report says the scope binds task/project/session/database/root/goal/roles; it does **not** claim files. The later `NVIDIA` report’s “current checkpoint” claim is inaccurate.
- **Bounded Resume gap:** the UI Resume button sends `crypto.randomUUID()` (`conversations.js:52`), while a bounded approval requires the saved request ID (`studio-run-scope.js:19`). A preflight failure with no execution has `resume.available:true` but the UI Resume returns 409. The Send path reuses the saved approval ID and may work. This is a UI recovery defect, not a false success.
- **Team approval UI gap:** no dashboard control creates a team scope. A script can, but the normal owner cannot. This is the primary readiness blocker.

---

## E. Remaining Issues

### P0 — Critical

**None verified.** No remote unauthenticated execution, arbitrary filesystem escape, unauthorized paid dispatch, or irreversible data-loss defect was found. The paid guard fails closed on the stale lease/balance; read-only projects are blocked before dispatch by `ProjectStudio.start` (`service.verify` + `projectsManager.assertWrite`).

### P1 — High (resolve before the live trial or explicitly accept a justified safeguard)

#### P1-01 — No owner-facing team-run approval; proposed three-agent cannot be armed from the dashboard

- **Component:** Dashboard / StudioRunScope.
- **Evidence:** `conversations.js:54` creates the “Approve one Builder invocation” button only inside `if(single)`; there is no `else` for a team. `runScope.arm` requires `paid` and `free` terms when DeepSeek/Nemotron are in the roles (`studio-run-scope.js:17`). `assertAvailable` rejects Nemotron without a run approval (`studio-run-scope.js:12`). The API route exists (`routes/console.js:39`), but the normal dashboard has no form for the terms.
- **Impact:** The proposed DeepSeek → Codex → Nemotron run cannot be approved or started through the normal UI. A developer script can POST the exact `run-approval` body, but that is not the owner-facing control the report implies.
- **Smallest correction:** Add one team approval panel (task saved; roles; paid model/cap/input/output; free model/output/timeout; native-included acknowledgement; exact expiry; no retry/fallback) or provide a single documented protected owner action that produces the same exact scope. Do not add a permanent role assignment.
- **Verification:** Browser test creates a team approval, verifies exact scope, sends one mock team run, restarts and confirms no duplicate; no live model.
- **Status:** VERIFIED gap; P1.

#### P1-02 — DeepSeek paid prerequisites are not satisfied in the live application

- **Component:** DeepSeek config/price lease/balance; `StudioFailover`.
- **Evidence:** Live `/api/console` reports `paid.enabled:false`, `pricingKnown:false`, `prices.verifiedUntil:2026-10-22T21:49:00.747Z`, balance `5` at `2026-10-23T19:23:28.909Z`. `StudioFailover.paidReady` requires `paid.ratesValid()` and a balance less than 5 minutes old (`studio-failover.js:30-37`). The saved `accounts.json` at 16:39 UTC records $16.42, but the production `deepseek_balance_observation` still shows the old $5; that check was not reflected in the live database. The report itself lists fresh price/balance as a prerequisite (`docs/FIRST_THREE_AGENT_WORKFLOW_PREPARATION_20261106.md:72`).
- **Impact:** The DeepSeek Builder POST will be refused before dispatch. No unauthorized spend occurs, but the proposed run cannot start.
- **Smallest correction:** Owner-authorized refresh of the public price lease (`DEEPSEEK_PRICES_VERIFIED_UNTIL` / supported preparation path) and one official balance GET, persisted to the production database; verify `/api/console` reports fresh pricing/balance. Then arm the team scope.
- **Verification:** Read-only status shows valid lease and fresh balance; a mock paid dispatch succeeds; a stale lease/balance test still refuses. No real paid request until separately approved.
- **Status:** VERIFIED prerequisite; P1.

#### P1-03 — Codex included allowance is unverified and cannot be checked from login status

- **Component:** Codex preflight / owner confirmation.
- **Evidence:** `StudioWorkers.preflight` uses `profiles.check` (native login) only (`studio-workers.js:15`, `codex-profiles.js:16`). The account evidence says `codex.ok:true` but allowance `UNKNOWN` (`accounts.json:46-52`); the report says owner confirmation required (`FIRST_THREE...:76,94`).
- **Impact:** The one included Tester invocation may fail on quota, pausing the run. No API spend, but the trial may not complete.
- **Smallest correction:** Owner explicitly confirms current included usage for the exact Codex Personal profile and records it in the approval/evidence; keep the one-call limit. No app change strictly required, but the team approval panel should require this acknowledgement.
- **Verification:** Approval cannot be created without the confirmation; a failed login/quota test pauses without retry.
- **Status:** VERIFIED prerequisite; P1.

#### P1-04 — Approval does not bind the file checkpoint; report claim is inaccurate

- **Component:** StudioRunScope.
- **Evidence:** `arm` stores project/chat/database/root/goal/roles/request/paid/free, but no file/checkpoint hash (`studio-run-scope.js:13-17`). `check` compares project/root/goal/roles/request/expiry/fallback, not files (`:19`). `ProjectStudio.start` only checks an optional `checkpointHash` for resume (`project-studio.js:32-34`). `NVIDIA_NEMOTRON_DEVSQUAD_INTEGRATION_20261107.md:20` says “current checkpoint”; the inactive proposal has no checkpoint field.
- **Impact:** A file change between owner approval and Send is not detected by the approval check; the worker sees the changed files. The owner may believe the approval binds the exact state. The project is currently empty except `AGENTS.md`, so impact is low for this first run, but the safety claim is false.
- **Smallest correction:** Add `checkpointHash: repo.fingerprint()` to the scope at arm and verify it in `check`/before the first dispatch; display the hash in the approval UI. Alternatively, explicitly document task-level (not file-level) approval and require a re-arm after any file change.
- **Verification:** Change a file after arm; start is rejected; no worker; unchanged file starts. Mock test.
- **Status:** VERIFIED discrepancy; P1 if exact-file approval is intended, otherwise P2. For this trial, **explicitly accept task-level approval or add the hash**.

### P2 — Medium (schedule after the demo if it does not undermine the trial)

#### P2-01 — Runner launch failure is still reported as executed tests

- **Evidence:** `StudioWorkers.command` returns `finish(null,false)` on spawn error/no PID; `tests` returns `executed:true` based on the command result (`studio-workers.js:51-53,45`). No launch-failure test exists.
- **Impact:** A sandbox launch failure says “tests failed” rather than “runner unavailable”; no false acceptance, but misleading and can consume a bounded Tester slot.
- **Smallest correction:** Reject/return `launched:false` on no child; `tests` sets `executed:false`; add a spawn-error test.
- **Status:** UNRESOLVED previous P2-02.

#### P2-02 — Multi-file worker patch can be partially applied

- **Evidence:** `ProjectStudio.apply` writes revisions/files in a loop (`project-studio.js:41`); `ProjectFiles.changes` does not reject a file path that is a parent of another (`project-files.js:14`). A worker returning `src/x` and `src/x/y.js` writes the first then fails the second, without a `files_saved` event or rollback.
- **Impact:** Partial project mutation on a malformed/conflicting patch. No loss of previous revision, but inconsistent state.
- **Smallest correction:** Reject prefix conflicts before writes; preflight all targets; apply with rollback or staged swap; record a partial outcome if any failure.
- **Status:** UNRESOLVED previous P2-03.

#### P2-03 — External-project `AGENTS.md` is not protected

- **Evidence:** `ProjectFiles.changes` protects `AGENTS.md` only when `managedRootState(this.root)` is true (`project-files.js:14`). External registered folders have no ledger. A worker can return `AGENTS.md`.
- **Impact:** Instruction integrity for existing/external projects.
- **Smallest correction:** Protect `AGENTS.md`/`AGENTS.override.md` for all roots; separate owner-only policy edit; add an external-root test.
- **Status:** UNRESOLVED previous P2-04.

#### P2-04 — Managed proof is optional; provenance errors become 500

- **Evidence:** `ProjectService.verify` returns `null` when the proof row is missing (`projects.js:7`); `ProjectStudio.start` now calls it before dispatch (`project-studio.js:32`), but a managed root without proof passes. Plain `Error` on tampering maps to generic 500 (`middleware/errors.js`).
- **Impact:** a managed root could run without verified provenance; diagnostics are unclear.
- **Smallest correction:** If `workspace.status(project)` is a managed ready root, require the proof; throw `ApiError(409)`. Add a missing-proof test.
- **Status:** UNRESOLVED previous P2-05.

#### P2-05 — Legacy Big Three/shared-jobs path still permits same-family Builder/Tester

- **Evidence:** `BigThreeCoordinator.validateRoles` only checks Builder/Reviewer (`big-three.js:21-24`); `routes/console.js:33` calls `coordinator.setRoles` directly. The new `StudioRoles` wrapper is not used there.
- **Impact:** Legacy shared-job/demo path can self-test, contrary to the new independence claim; the Project Studio path is fixed.
- **Smallest correction:** Add the Tester family check to `BigThreeCoordinator.validateRoles` or deprecate the path; test.
- **Status:** New residual, P2.

#### P2-06 — Bounded-run Resume and checkpoint recovery are incomplete

- **Evidence:** `conversations.js:52` Resume sends a fresh `crypto.randomUUID()`; `StudioRunScope.check` requires the saved request ID (`studio-run-scope.js:19`). A preflight failure has no execution and `resume.available:true`, but the UI Resume fails 409. For a bounded team after a Tester/Reviewer failure, the per-role one-call slot is consumed; `resumePlan` does not inspect runApproval, and the UI can show Resume where no call remains.
- **Impact:** The owner sees a recovery control that cannot work; a bounded run cannot be resumed after a preflight failure through the normal button. Send with the saved approval ID can work; that is not explained.
- **Smallest correction:** Use the saved approval request ID on Resume; make `resumePlan`/UI mark bounded consumed phases unavailable; add preflight-failure/consumed-phase tests.
- **Status:** PARTIALLY RESOLVED previous P2-06; new UI defect.

#### P2-07 — No Git checkpoint/rollback

- **Evidence:** Studio writes files + SQLite revisions; no Git commit or restore path (`project-studio.js:41`; `workspace-inspection.js` read-only).
- **Impact:** The requested Git-checkpoint workflow is not implemented; SQLite revisions are the real checkpoint. The owner can inspect but not restore through UI.
- **Smallest correction:** Decide the product contract; if commits, only after review/accept, no push; if not, add a revision restore action and label it. Owner decision.
- **Status:** UNRESOLVED previous P2-08.

#### P2-08 — Test runner remains Node-only; no real browser test of generated app

- **Evidence:** `testPlan` accepts Node `.test.*` only (`studio-test-plan.js:5-19`); packet says no browser/Jest (`project-studio.js:43`). The 11/11 Chrome evidence is dashboard/mock, not the Expense app.
- **Impact:** A browser app can pass Node tests without browser behavior verification; the “independent test” is real Node execution but not UI execution.
- **Smallest correction:** Label the limitation in UI/acceptance; optionally add a browser adapter later. Do not call `node:vm` a browser.
- **Status:** UNRESOLVED previous P2-09.

#### P2-09 — README is stale and contradicts current behavior

- **Evidence:** `README.md` still says generated code is never executed, no background execution, live calls off by default, and Codex/Claude integrations retired (`README.md:5,46,58,115,125,135`); current Project Studio executes generated code in MXC, applies files, starts after Send, and uses Codex/Claude/Nemotron.
- **Impact:** Owner/beginner trust; wrong safety expectations.
- **Smallest correction:** Update README with current architecture, exact sandbox, paid/Send behavior, roles, Git prerequisite, Node-only tests, and links to current reports.
- **Status:** UNRESOLVED previous P2-07.

#### P2-10 — Free-route data handling is not surfaced

- **Evidence:** `NemotronWorker.call` sends the guarded packet (goal, project snapshot, test evidence) to the free provider (`nemotron-worker.js:57`); the free-route notice prohibits confidential/personal input (`FINAL_FREE_MODEL_AND_TWO_AGENT_PLAN_20261107.md:15`); the dashboard says “free OpenRouter” but not the data-handling constraint.
- **Impact:** A future user could send sensitive project code to a free third party without a clear warning. For the disposable Expense project, no sensitive data; new risk.
- **Smallest correction:** Add a clear UI label/warning and an owner acknowledgement for the free route; never default free Nemotron for sensitive projects.
- **Status:** New risk, P2.

#### P2-11 — Existing Counter Test 2 remains unmigrated

- **Evidence:** No `studio_project_connections` row; no local `.git`/`AGENTS.md`; the historical lock remains. The new Expense project is a new managed root.
- **Impact:** Existing projects cannot use the repaired native Codex startup; not on the Expense path, but previous P1-03 remains for legacy work.
- **Smallest correction:** Owner-approved exact-project migration; never auto-adopt; preserve files/instructions/history; test. Or document new-project-only.
- **Status:** UNRESOLVED previous P1-03 (legacy residual; not a proposed-run blocker).

### P3 — Low / optional

1. **`ProjectStudio.project` direct-folder bypass** (`project-studio.js:22`): not reachable through `/studio/projects` (only `name`); keep internal or route through `ProjectConnections.selectedFolder`/duplicate checks.
2. **Non-loopback HOST / legacy `/api`** (`config/index.js:6`; `routes/api.js`): default loopback, but no authentication/Host restriction on legacy mutations. Refuse non-loopback unless an explicit auth mode exists.
3. **No per-test timeout in `scripts/test-serial.js`** (`scripts/test-serial.js:12`): add `--test-timeout=60000`; the manual 34/34 run used it, `npm test` does not.
4. **Plain errors/shutdown** (`projects.js:7`; `server.js:12`): use `ApiError(409)` for known provenance/initialization failures and add a shutdown deadline.
5. **Nonzero cost as string** (`nemotron-worker.js:69`): reject any numeric/string nonzero cost before accepting a free response. Suspected edge, not live-verified.
6. **Inactive proposal fields** (`inactive-execution-proposal.json:19-32`): `paid.timeoutMs`/`thinking` and `free.reasoning` are not accepted by `StudioRunScope.arm`’s strict field list; a copy-paste body will get 400. Keep templates descriptive or generate a valid body.
7. **`testProvenance` not cleared on a new/follow-up task** (`project-studio.js:33`): tests/review are cleared, but old testProvenance remains; low risk because `hasIndependentTests` checks the new tests/execution, but clearing it is safer.
8. **`runScope.arm` does not preflight DeepSeek price/balance** before creating the approval clock; a failed paid guard consumes the approval/slot. A preflight or clearer UI would reduce stuck sessions.

---

## F. Final Verdict

**CONDITIONALLY READY — SPECIFIC PREREQUISITES**

The implementation is **not** ready to launch the proposed three-agent run today through the normal dashboard, but it is close and the remaining obstacles are specific, testable, and targeted. The core workflow is sound: the independence gate is real, the paid/free terms are bounded, Nemotron is exact-model/free-only, the test evidence is independent, and failures fail closed. The app also refuses paid dispatch when the price lease/balance are stale, which is the correct safety behavior.

The conditions are:

1. **Owner approval path:** add/execute a protected team-run approval control (or a documented owner action) that creates the exact paid/free scoped approval; the current dashboard only offers Builder-only approval, so the proposed team cannot be armed normally.
2. **Fresh paid prerequisites:** refresh the DeepSeek price lease and official balance in the production database; confirm `/api/console` shows fresh pricing/known balance. The saved $16.42 check is not reflected in the live database.
3. **Codex included allowance:** owner must confirm current included usage; login status cannot prove it.
4. **Exact approval binding:** either add the file checkpoint hash to the run approval or explicitly accept task-level (not file-level) approval and ensure nothing changes between arm and Send.
5. **Expense permissions:** enable agent changes on the read-only Expense project (`agent_changes:0` now) only for the trial; confirm no executions/approval; preserve read-only until then.
6. **Optional but recommended before the demo:** fix the bounded Resume/request-ID and launch-failure classification; do not change the sandbox or acceptance gates.

If the owner accepts a scripted, exact 30-minute approval and the fresh account checks, the trial can be controlled. It should not be described as a fully verified multi-agent platform: only one real Codex Builder and one standalone Nemotron coding probe have run; the three-agent chain itself is still mock-only.

---

## G. Minimal Next Steps

### Required blockers (in order)

1. **Re-snapshot and preserve.** Confirm the working tree, current database 17 projects/17 chats/1 historical lock, Expense zero executions/no approval, and Counter Test 2 preservation. Do not reset/stash/commit over existing work.
2. **Provide a team approval control or exact owner script.** The control must show the task, project/session/root hash, Builder/Tester/Reviewer roles, DeepSeek model/$0.02/max 4096/input 24,000, Nemotron exact free model/2048/60 s, Codex included confirmation, 30-minute expiry, no retry, no fallback, and owner acceptance. It must not permanently assign roles. Verify it creates a scope but starts nothing.
3. **Refresh DeepSeek prerequisites.** Use only the supported owner-authorized price/account checks; update the price lease and fetch/persist one fresh balance. Do not send a generation request. Confirm live status: pricing known, balance fresh, reservation within cap.
4. **Confirm Codex allowance and Nemotron access.** Record the owner confirmation for Codex Personal included usage; run the existing non-generating Nemotron check; confirm exact `nvidia/nemotron-3.5-super-vl:free`, zero price and >0 remaining.
5. **Prepare Expense safely.** Enable agent changes only for the trial; keep read-only while not running. Set temporary reviewer to Nemotron; do not change defaults permanently. Confirm no execution/approval, only `AGENTS.md`.
6. **Arm the exact team scope.** Verify a file checkpoint/hash is included or explicitly accept task-level approval; verify no file/task/role change after arm. Confirm no automatic fallback.
7. **One controlled run.** Send one bounded team, monitor with the live view, do not retry/fallback, and do not auto-accept. If any mandatory gate fails, stop and preserve evidence.
8. **Owner acceptance.** Review the actual generated files, independent Tester evidence, and Nemotron review; accept only if all hashes/revisions match. Record the result as live evidence, not a mock.

### Optional enhancements after the demo

- Fix launch-failure classification, partial multi-file apply, external `AGENTS.md` protection, proof requirement, bounded Resume/request-ID, README, Git checkpoint contract, and Node/browser labeling.
- Add a free-route data-handling acknowledgement and a team approval browser test.
- Add per-test timeout to `npm test`.
- Split legacy Big Three/shared-jobs from the new independence rules or retire that path.

**Do not** run the Expense workflow, a paid request, or a live model as part of this audit. No source, configuration, database, permission, or project state was changed by this review.
