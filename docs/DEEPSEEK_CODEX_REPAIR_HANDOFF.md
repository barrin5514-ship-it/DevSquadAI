# Codex Repair Handoff — Dev Squad AI

**Prepared by:** DeepSeek, independent reviewer
**Date:** 2026-11-06, approximately 13:36 America/New_York
**Companion report:** [DEEPSEEK_INDEPENDENT_REVIEW.md](DEEPSEEK_INDEPENDENT_REVIEW.md)
**Repository:** `C:\Users\barri\OneDrive\Desktop\Next Chapter Projects\DevSquadAI`
**Branch:** `feature/workspace-ui-redesign`
**HEAD:** `9983d20`
**Review snapshot:** initial source at 13:25 ET; updated after concurrent changes at 13:26 (Builder-only tests), 13:30 (17/17 owner focused log), and 13:31 (source changes). Latest hashes are in the companion report. The tree may still be changing; re-snapshot before editing.

## How to use this handoff

This is a repair backlog, not an instruction to start a live agent or paid request.

- **Do not** start Codex, Claude, DeepSeek, a paid provider, a webhook, a GitHub operation, or a native model turn while implementing these repairs. Use mocks/fixtures.
- **Do not** treat a mock, unit test, compile, or deterministic simulation as functional completion. The project's [AGENTS.md](../AGENTS.md) verification rules apply.
- **Do not** auto-migrate existing projects, force-release locks, remove owner gates, weaken sandbox restrictions, or change spending policy. Several items require an explicit owner decision.
- **Preserve** every existing project, session, execution, revision, review, checkpoint, lock, backup, and credential. The Counter Test 2 historical lock must remain unless the owner explicitly asks for reconciliation.
- **Re-snapshot before editing.** The tree changed during this review; the new Builder-only mode is newer than the 13:12 report. If the files no longer match the hashes in the companion report, re-run the relevant checks and update the findings before changing code.

## Prioritized backlog

| ID | Priority | Status in review | Area | Owner decision needed? |
|---|---|---|---|---|
| P1-01 | P1 | VERIFIED workflow defect | Tester independence / test provenance | No (safety fix) |
| P1-02 | P1 | VERIFIED role-validation defect | Builder/Tester independence | No (safety fix) |
| P1-03 | P1 | VERIFIED limitation/blocker | Existing project migration | **Yes** (exact project, migration) |
| P2-01 | P2 | VERIFIED behavior; policy conflict | Paid/live gates on Studio Send | **Yes** |
| P2-02 | P2 | VERIFIED defect | Test-runner launch classification | No |
| P2-03 | P2 | VERIFIED defect | Partial multi-file patch | No |
| P2-04 | P2 | VERIFIED code gap | External `AGENTS.md` protection | No |
| P2-05 | P2 | VERIFIED code/UX gap | Managed proof optional; generic 500 | No |
| P2-06 | P2 | MIXED: mock pass; owner tests 17/17; UI defects; no independent rerun | New Builder-only mode | No for remaining tests/fixes; **Yes** before live use |
| P2-07 | P2 | VERIFIED documentation defect | README/current behavior mismatch | No |
| P2-08 | P2 | FUNCTIONAL GAP | Git checkpoint/rollback vs SQLite revisions | **Yes** (product contract) |
| P2-09 | P2 | FUNCTIONAL/TEST GAP | Node-only tests; browser gap | No (label; optional adapter) |
| P3-01 | P3 | LATENT | Alternate internal project link | No; keep internal |
| P3-02 | P3 | HARDENING | Non-loopback HOST / legacy API | No (safety hardening) |
| P3-03 | P3 | TEST INFRA | No per-test timeout | No |
| P3-04 | P3 | IMPROVEMENT | Plain Error 500s; shutdown deadline | No |

## P0 — Immediate security/reliability fixes

**None verified.** Do not invent a P0. The closest high-impact item is P2-01 (paid/live ambiguity), but the owner's [AGENTS.md](../AGENTS.md) explicitly says Send authorizes the assigned workflow and money-approval steps were removed. Treat P2-01 as an owner decision, not permission to reintroduce a removed policy.

---

## P1-01 — Require real Tester-authored test evidence

**Why:** A Tester can return zero files; the runner then uses Builder-authored tests; `accept()` still succeeds. This invalidates the “independent testing” claim. Evidence and exact probe output are in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p1-01--independent-tester-phase-can-be-satisfied-by-builder-authored-tests).

**What to change:**

- Record tester-authored test file paths and hashes in the chat state (for example, `state.tests.testAuthors`, `state.tests.testFiles`).
- In the Tester branch of `ProjectStudio.drive`, reject or pause when `response.files` contains no `.test.*` file. A clear alert should say the Tester supplied no independent tests.
- In `StudioWorkers.tests`/`studio-test-plan.js`, run the Tester-authored test files as the independent evidence. Running Builder tests in addition is acceptable only if they are labeled separately and cannot satisfy independence.
- In `ProjectStudio.accept`, require `state.tests.independent === true` and at least one tester-authored file. A missing/empty Tester run must not be accepted as independently tested.
- Preserve the existing immutable test-evidence hash binding.

**What must remain untouched:** test-evidence hash checks, reviewer binding, owner acceptance, folder lock, no-self-review.

**Required regression tests:**

- Builder writes one passing test; Tester returns `files: []`; status pauses, `accept()` throws, and the alert/evidence says “no independent tests”.
- Tester writes a passing test; the run reaches `awaiting_owner`, records the tester file hash, and accepts.
- Tester test fails; no owner acceptance, and the failure cannot be converted into success by a later Builder test.
- Builder test passes but Tester test is absent; not accepted as independent.

**Risk:** Projects whose owners intentionally rely on Builder tests only will need a labeled “Builder tests only” path; do not silently keep the independent claim. This is a safety/product change, not a formatting fix.

---

## P1-02 — Reject same-family Builder/Tester and fallback

**Why:** A Builder can be assigned as its own Tester, and automatic Tester fallback can select the Builder family. The Reviewer rule is enforced; the Tester rule is not. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p1-02--builder-and-tester-can-be-the-same-workerfamily-including-through-fallback).

**What to change:**

- In `BigThreeCoordinator.validateRoles` (used by both Big Three and Studio role validation), reject `family(roles.builder) === family(roles.tester)`.
- Keep the existing Builder/Reviewer and author/reviewer checks.
- In `StudioFailover.tryNext`, for the `tester` phase, exclude candidates whose family is in `job.state.authors`; the Builder must be an author before testing.
- Update the role picker text: “Builder and Tester must be different workers; a worker can never review its own changes.”
- Do not change the class demo’s intentionally distinct roles (`codex-personal` / `claude-code` / `deepseek`) unless the new rule requires an explicit exception; it should not.

**What must remain untouched:** reviewer family checks, role-rotation behavior (the existing swapped fixture is distinct), owner role controls, folder locks.

**Required regression tests:**

- `validateRoles({builder:'deepseek',tester:'deepseek',reviewer:'claude-code'},[])` throws.
- `validateRoles({builder:'codex-personal',tester:'codex-personal',reviewer:'deepseek'},[])` throws.
- A Tester usage-limit fallback never selects the Builder family; it pauses with a clear reason.
- Existing role-rotation/queued-role tests still pass.
- The default three roles remain valid.

**Risk:** The owner loses the option to use one fast worker for both stages; that is the intended safety tradeoff. If a deliberate exception is required, it must be an explicit owner-labeled “non-independent” mode, not the default.

---

## P1-03 — Decide and safely handle existing projects

**Why:** New managed projects have an independent Git root and local `AGENTS.md`; the existing 14 projects do not. Counter Test 2 still has no `.git`/`AGENTS.md` and cannot be used for the repaired Codex startup. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p1-03--existing-projects-remain-outside-the-managed-root-repair-counter-test-2-still-has-no-local-gitagents).

**What to change:** This is an **owner decision**, not a default code change.

- If the owner approves migration: add a narrow, exact-project-ID operation that (1) snapshots the folder and all applicable instruction sources, (2) creates an independent local Git root only if absent, (3) writes local `AGENTS.md` with preserved precedence, (4) preserves every file, ID, session, execution, revision, review, checkpoint, and lock, (5) records the change, and (6) runs non-generating startup verification. It must refuse without `approvedBy:'owner'` and an exact project ID, and must be idempotent.
- If the owner declines migration: document clearly that the repaired startup is for **new managed projects only**; existing projects remain read-only/blocked for native Codex until separately migrated. Do not silently initialize Counter Test 2.
- Do not reuse the consumed diagnostic script or approval.
- Do not clear the historical Counter lock.

**What must remain untouched:** Counter Test 2 contents, its paused state, its one failed execution, the original Counter historical lock, all other projects, `.env`, provider keys.

**Required regression tests:**

- A disposable nested folder migration preserves file hashes and instructions and is idempotent.
- Migration without owner approval is rejected.
- A project not named in the request is untouched.
- A refusal path leaves the folder, DB records, and lock unchanged.
- Counter Test 2 is not modified in any test.

**Risk:** High if done implicitly. OneDrive, instruction precedence, and Git history make silent adoption unsafe. Keep it opt-in and exact.

---

## P2-01 — Resolve paid/live policy before any paid Send

**Why:** Live config says `paid.enabled=false`, `liveEnabled=false`, `deepseekConfigured=true`; the default Studio Builder is DeepSeek. The Studio DeepSeek branch checks only key/base/model, and the adapter intentionally has no spending cap. The README and legacy UI imply safeguards that the Studio path does not honor, while [AGENTS.md](../AGENTS.md) says Send authorizes the workflow. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p2-01--global-paidlive-flags-do-not-gate-the-studio-send-path-owner-intent-must-be-clarified).

**What to change:** **Owner decision first.**

- Option A (Send is the authorization): keep the current behavior, add a clear pre-Send summary naming the paid worker and “uncapped by this project workflow”, retire or re-label the stale `TEAM_LIVE_ENABLED` / `DEEPSEEK_PAID_ENABLED` claims in docs/status, and apply the existing configured input bound.
- Option B (flags are a hard gate): enforce `DEEPSEEK_PAID_ENABLED` and `team.liveOptIn` in `StudioWorkers.call` before any DeepSeek request, and add a mock test that asserts zero requests when either is false.
- In both cases, apply `settings.maxInputBytes`/a documented token bound to the Studio packet; do not add a dollar spending cap unless the owner changes their stated policy.
- Do not make the change silently; record the owner decision in the report.

**What must remain untouched:** provider keys, `.env`, paid quotas, the owner's no-money-approval policy, existing DeepSeek reservations/observations.

**Required regression tests:**

- With a DeepSeek key configured and the chosen gate false, the decided behavior (blocked or explicitly labeled bypass) is asserted with a mock fetch and zero real requests.
- The input bound rejects an oversized packet before any request.
- No test performs a real provider request.

**Risk:** High financial/trust impact. Do not “fix” by changing the owner's policy without approval.

---

## P2-02 — Classify test-runner launch failure as unavailable, not failed tests

**Why:** A spawn error returns `{exit:null}`; `tests()` reports `executed:true, passed:false`. A beginner sees “tests failed” instead of “runner unavailable”. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p2-02--test-runner-launch-failure-is-reported-as-tests-executed-failed).

**What to change:**

- In `StudioWorkers.command`, reject on spawn error/no PID (or return a distinct `launched:false` result).
- In `StudioWorkers.tests`, return `executed:false` and a clear runner-unavailable reason when the launch failed; do not record PASS/FAIL evidence.
- Keep the lock/unknown-outcome behavior conservative if the process may exist.

**What must remain untouched:** the real test command, MXC isolation, output limits, stop/timeout handling.

**Required regression tests:**

- Mock `spawn` emits `error`; `command` rejects or returns `launched:false`; `tests` reports `executed:false`.
- A real test file still executes under the normal path.
- No false “independent tests failed” alert on runner setup failure.

**Risk:** Low; improves diagnosis.

---

## P2-03 — Make multi-file patches conflict-safe or atomic

**Why:** `src/x` + `src/x/y.js` is accepted by `changes()`; the first file is written, the second fails `EEXIST`, no `files_saved` event/rollback. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p2-03--multi-file-worker-patch-can-be-partially-applied).

**What to change:**

- Reject any two patch paths where one is a file-prefix of the other.
- Preflight all parents/targets before writing.
- Apply as a batch: either stage all files and swap, or restore previous content for already-applied files on a later failure; record a durable partial-failure event.
- Keep the existing per-file `before` hash check and hard-link/symlink protections.

**What must remain untouched:** revision immutability, file hash checks, lock behavior, path restrictions.

**Required regression tests:**

- Conflicting paths are rejected before any write.
- A forced failure on the second file leaves the project unchanged and records an error/partial event.
- Normal two-file patches still record revisions and a `files_saved` event.

**Risk:** Medium; touch only the apply path, not the path resolver.

---

## P2-04 — Protect instruction files in every project root

**Why:** `ProjectFiles.changes` protects `AGENTS.md` only for managed roots; external projects can have it overwritten by a worker. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p2-04--external-project-agentsmd-can-be-overwritten-by-a-worker).

**What to change:**

- Reject `AGENTS.md` and `AGENTS.override.md` in `ProjectFiles.changes` for **all** roots, not only roots with `managedRootState`.
- Keep the same protection in `WorkspaceFileActions`; if owners need to edit instructions, provide a separate explicit policy action.
- Do not change the managed-root hash/verifier.

**What must remain untouched:** managed `AGENTS.md`, existing instructions, owner file actions, path restrictions.

**Required regression tests:**

- External root with `AGENTS.md`: worker patch is rejected 403.
- Managed root: still rejected.
- A normal source file still writes.
- The owner-only instruction path, if added, is separately confirmed.

**Risk:** Low; might surprise owners who want workers to edit instructions, which is exactly the behavior to prevent by default.

---

## P2-05 — Require managed proof and map failures to clear 409/403

**Why:** A managed root without a `project_files` proof is treated as unverified-but-allowed; tampered proof throws plain `Error` and becomes a generic 500. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p2-05--managed-security-provenance-is-optional-and-provenance-failures-surface-as-generic-500s).

**What to change:**

- In `ProjectService.verify`, if `workspace.status(project)` indicates a managed ready root, require the proof row and verify it. Do not return `null` for a managed root.
- Throw `ApiError(409, 'Managed security provenance changed; execution blocked')` or an equivalent safe message.
- Keep legacy/external projects explicitly unmanaged.
- Optionally add a durable event for blocked provenance.

**What must remain untouched:** the managed-root ledger/hash/source provenance, existing external projects, error envelope.

**Required regression tests:**

- Missing proof blocks `ProjectStudio.start` with 409.
- Tampered proof blocks with 409 and a clear message.
- External/legacy projects are unaffected.
- Existing managed project creation/storage tests still pass.

**Risk:** Low; do not accidentally classify old unmanaged projects as managed.

---

## P2-06 — Finish the remaining Builder-only UI/recovery cases and independently rerun

**Why:** The mode appeared after the 13:12 “BLOCKED” report. A mock one-call probe passed, and the owner then added focused tests at 13:26 with saved logs at 13:25/13:30 (7/7 then 17/17). Those tests cover the core one-call/no-Tester/no-Reviewer matrix, but they do **not** cover the UI preflight-resume or empty-goal cases. The Resume button still sends a fresh request id after a preflight failure, and approval can be armed before a task exists. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p2-06--builder-only-mode-focused-tests-now-exist-but-ui-recovery-defects-remain).

**What to change:**

- Do not duplicate the owner's new core tests; add the missing cases listed below.
- Fix the UI Resume path: for Builder-only, reuse the saved `runApproval.requestId` (or make the server accept the same immutable approval for a preflight-only failure where no execution was created). The current button sends `crypto.randomUUID()`.
- Require a non-empty goal at `StudioRunScope.arm` time for Builder-only, and disable the approval control until a task is saved. Alternatively, make the approval binding explicitly include “task will be saved later” — but the simpler safe behavior is to require the task first.
- Keep the one-call, no-fallback, no-Tester/Reviewer behavior. Do not broaden it.
- Update the UI text so the owner knows the draft pauses for independent testing/review and is not accepted automatically.
- Do not claim the mode is fully verified until the missing cases are green and a non-generating native login/startup check has passed. The owner's 17/17 log is not an independent rerun.

**What must remain untouched:** the one-call scope, folder lock, sandbox, owner approval, no test/reviewer dispatch, no paid provider.

**Existing coverage (owner log 17/17; add missing cases to these tests):**

1. One Builder call, exactly one execution; no Tester, no Reviewer, no application test runner. — covered.
2. Restart during/after the Builder; the mode cannot re-dispatch. — covered.
3. Reuse/expiry/wrong-project/wrong-root/wrong-database/wrong-goal/wrong-role approval rejected. — covered.
4. Successful Builder pauses with `builderCompleted:true`, acceptance rejects, resume unavailable. — covered.
5. Concurrent `start` cannot consume two calls. — covered.
6. Fallback policy cannot broaden the one-call scope. — covered.

**Missing cases to add:**

7. Arm requires a non-empty saved goal; arming before a task is saved is rejected or disabled in the UI.
8. Preflight login failure pauses with no execution; the UI resume path works with the saved approval identity.
9. The UI test covers the Builder-only approval control and the Resume button. The 13:35 browser attempt currently fails: `locator.selectOption` timed out waiting for `getByLabel('Execution mode')`; confirm whether the backend running on port 3000 is stale after the 13:31 source change, restart it only as supported, and get a real browser pass before any live test.

**Risk:** This is the mode for the proposed first live draft. Do not test it live before the missing UI cases and the independent focused rerun.

---

## P2-07 — Update README and current status docs

**Why:** README says generated code is never executed/applied, no background execution, live calls off, and Codex/Claude retired; the current Studio does execute generated code in an isolated runner, applies files, starts after Send, and uses those workers. Git is also an undocumented hard dependency. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p2-07--readme-and-architecture-safety-claims-contradict-the-current-studio).

**What to change:**

- Add a current feature/limits table: what is real, what is simulated, what is live-verified, what is blocked.
- Explain exactly where generated code runs (isolated MXC test copy, no host execution outside the sandbox) and what is never run/pushed.
- Document the paid/Send behavior chosen in P2-01.
- List Git and Node 24 as prerequisites; document the fixed Git path/fallback.
- Replace the “current AI team” section and legacy provider claims.
- Link the current reports and the Builder-only status.
- Do not delete historical reports; mark them historical.

**What must remain untouched:** historical evidence files, owner policy, AGENTS.md.

**Required verification:** A documentation review against the route/service list; no code test. If possible, add a short “docs match current functionality” checklist to the verification record.

**Risk:** Low code risk; high trust benefit.

---

## P2-08 — Decide Git checkpoint/rollback contract

**Why:** Git is initialized and inspected, but no commits/rollback are made; SQLite revisions are the real checkpoint. The requested Git-checkpoint workflow is not implemented. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p2-08--studio-has-no-git-checkpointrollback-sqlite-revisions-are-the-only-checkpoint).

**What to change:** Owner decision.

- Option A: Add owner-authorized local Git commits after a reviewed/accepted phase; never push; no commit on failed/unknown outcomes; test.
- Option B: Keep SQLite revisions and add an owner-facing “restore this revision” action, with clear labeling that it is not a Git commit.
- Do not auto-commit or auto-reset without explicit approval.

**What must remain untouched:** owner repositories, files, Git history, existing revisions, no push.

**Required regression tests:** If commits: exactly one local commit on acceptance, none on failure, no push; if restore: content restored, event recorded, previous revision preserved.

**Risk:** High for owner repositories; product decision required.

---

## P2-09 — Label or close the Node-only/browser test gap

**Why:** The test runner supports Node `node:test` JS only; the UI suite uses fake DOM; browser checks are outside `npm test`. A beginner web project can pass Node tests without browser verification. Evidence is in [the review](DEEPSEEK_INDEPENDENT_REVIEW.md#p2-09--test-runner-and-test-suite-are-narrower-than-the-product-claims).

**What to change:**

- In the UI and acceptance language, state “Node tests only; browser behavior not verified” unless a browser adapter runs.
- Optionally add a future browser adapter behind the same isolation; do not pretend `node:vm` is a browser.
- Keep the existing screenshots/Chrome scripts as separate manual evidence.

**What must remain untouched:** sandbox, test command, acceptance binding.

**Required regression tests:** Browser-only project gets a clear blocked reason; Node tests still run.

**Risk:** Low; honesty.

---

## P3 — Optional cleanup/hardening

### P3-01 — Keep the alternate internal project link from becoming a bypass

- `ProjectStudio.project({folder})` bypasses `ProjectConnections.selectedFolder` and duplicate checks; not currently exposed via the `/studio/projects` HTTP route (only `name` is allowed).
- Keep it internal, or route all external links through `ProjectConnections`. Add a test that `/studio/projects` rejects `folder`.
- Do not expose a generic folder-link API without protected-path and duplicate checks.

### P3-02 — Constrain non-loopback HOST / legacy API

- Validate `HOST` is loopback by default; require an explicit remote/auth mode for anything else, or refuse startup.
- Legacy `/api` project/task/generate routes have no authentication/Host restriction. Add a test that non-loopback startup is refused.
- Do not weaken the console capability.

### P3-03 — Add a per-test timeout to `scripts/test-serial.js`

- Add `--test-timeout=60000` (or a configured bound) and record it. The owner's focused run already used it; `npm test` does not.
- Do not skip or delete the previously failing Git fixture.

### P3-04 — Use ApiError for known security failures; bound shutdown

- Replace plain `Error` for managed provenance/initialization failures with `ApiError(409)`.
- Add a shutdown deadline around `studio.close()`/`messenger.close()`; preserve state and report interruption.
- Do not force-release an unresolved lock.

---

## Dependencies and recommended repair order

1. **Freeze/re-snapshot.** Confirm current hashes; preserve uncommitted work; do not rely on the 13:12 report.
2. **P2-06 — Builder-only tests and UI fixes.** Highest relevance to the next proposed live test; no production code path change beyond the new mode.
3. **P1-01 + P1-02 — Tester independence.** These can be implemented independently of each other but should land together for a coherent multi-agent claim.
4. **P2-02, P2-03, P2-04, P2-05 — Evidence integrity and file safety.** These reduce false success/partial writes/instruction tampering.
5. **P2-01 — Owner paid/live decision.** No paid run until decided. If the choice is “Send authorizes”, update docs and add the input bound; if “flags gate”, enforce and test.
6. **P1-03 — Existing-project migration.** Owner-only; do not block the new-project path on it.
7. **P2-07, P2-08, P2-09 — Docs, Git contract, test scope.**
8. **P3 cleanup.**

**Dependency notes:**

- P2-06 must be green before any Builder-only live test.
- P1-01 depends on a clear test-authoring mechanism; keep `ProjectFiles`/runner changes compatible.
- P1-02 changes role validation; update UI/role tests and the class demo only if their roles violate the new rule (they should not).
- P2-01 must be decided before a DeepSeek Send; it does not block a Codex-only Builder draft if the mode is fixed.
- P1-03 is owner-gated and must not be bundled with unrelated changes.

## Required regression commands

Use the owner's normal terminal, not this review's confined sandbox. Run serially on the low-RAM PC.

```powershell
node --max-old-space-size=128 --test --test-timeout=60000 --test-concurrency=1 `
  tests/studio-run-scope.test.js `
  tests/studio-builder-only.test.js `
  tests/project-studio.test.js `
  tests/studio-worker-recovery.test.js `
  tests/studio-executions.test.js `
  tests/studio-failover.test.js `
  tests/studio-roles.test.js `
  tests/studio-protocol.test.js `
  tests/native-diagnostics.test.js `
  tests/managed-workspace-production.test.js `
  tests/workspace-file-actions.test.js `
  tests/project-connections.test.js `
  tests/workspace-inspection.test.js
```

Then the full suite:

```powershell
node scripts/test-serial.js
```

Then, only if the owner has separately authorized a non-generating native login/startup check, run the existing bounded check (not a model turn). Do not run a real Codex/Claude/DeepSeek generation, a Zapier delivery, or a GitHub push as part of these repairs.

**Record** exact commands, elapsed time, pass/fail/skip counts, environment, and any test that could not run. Do not add the owner's prior counts to new counts.

## Preservation requirements

- Do not modify, delete, or re-seed: Counter Test 2, the original Counter project, its historical lock, any existing project/session/execution/revision/review/checkpoint/approval, `data/`, `backups/`, `.env`, `webhook-out.json`, provider/verification files, or the class demo’s stored jobs.
- Do not clear `studio_locks` by force. Do not reconcile unresolved work merely to make a test pass.
- Do not modify Windows permissions, root-deny/MXC policy, sandbox configuration, or `AGENTS.md`.
- Do not commit, push, merge, deploy, or publish. Do not send Zapier webhooks. Do not clone/initialize a user’s existing folder without the exact owner approval.
- Preserve historical reports and verification artifacts; add new evidence rather than rewriting old results.

## Acceptance criteria

A repair is accepted only when:

1. The targeted regression tests pass with zero skipped and no weakened assertions.
2. The relevant failure/recovery path is exercised, not only the happy path.
3. The actual running UI/API is inspected where tooling permits; requests and resulting DB/filesystem evidence are recorded.
4. The repair does not broaden sandbox/filesystem/project-root access, remove a lock, or bypass owner acceptance.
5. No real model/provider/webhook/GitHub operation was used to make a test pass.
6. The evidence distinguishes implemented, tested, simulated, live-verified, and still-unverified.
7. The owner has approved any paid/live/migration/commit policy change.
8. The working tree and snapshot hashes are recorded before/after; unrelated uncommitted work is preserved.

## What Codex must not do

- Do not start a live worker, paid request, native model turn, webhook, or GitHub operation to validate a repair.
- Do not auto-migrate existing projects, reuse the consumed diagnostic, or clear the Counter lock.
- Do not remove or weaken folder locks, no-self-review, owner acceptance, timeline/token accounting, Stop/stuck detection, or sandbox restrictions.
- Do not add a spending cap or money-approval step that the owner explicitly removed, unless the owner requests it.
- Do not claim simulations/mocks are live integrations.
- Do not commit/push/merge/deploy.
- Do not modify application source just to make a test pass; fix the cause and add a regression test.

## Bottom line for Codex

The safest immediate sequence is: **freeze the tree → finish and test Builder-only (P2-06) → enforce Tester independence (P1-01/P1-02) → fix runner/partial-apply/external-AGENTS/proof issues (P2-02/03/04/05) → get the owner’s paid/live decision (P2-01) → decide existing-project migration (P1-03) → update docs → full serial regression.**

Do not present any of this as a completed live multi-agent build. At this snapshot the app has strong local safety scaffolding and a promising Builder-only shape, but the full Codex → independent Tester → independent Reviewer → owner chain remains unverified with real agents.
