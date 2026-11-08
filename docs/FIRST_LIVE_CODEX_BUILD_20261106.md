# First live Codex build — preparation checkpoint

Date: 2026-11-06. **BLOCKED before live execution.** No model invocation, grant, approval clock, new session or new project was created in this preparation. This is not evidence of a generated application.

## Preparation and preservation

- Branch: `feature/workspace-ui-redesign`; HEAD `9983d20f1ee6394cbfbff484ae9f7345c91195d7`. Existing uncommitted changes preserved. No application code changes, commit, push, merge, deployment or backend restart in this checkpoint.
- Supported backup: `backups/backup-1793988293817-c13e489d-c749-4e9f-96af-131afc2af67e.sqlite`; read-only SQLite `PRAGMA quick_check` returned `ok`; 15 projects.
- Main database currently has 15 projects, 15 sessions, zero running/stopping sessions, runtime lease PID 26848. Its sole historical lock belongs to the original Counter session `fc00a59b-c31e-4b93-b448-35ebbc0de048`; not cleared. No production records were edited.
- Regular dashboard `/team` on port 3000 and separate class simulation `/class-demo` on port 3002 both returned HTTP 200. These are HTTP checks, not new visual verification. Windows port inspection returned Access denied in the current sandbox; no permission change was attempted.
- Prior independent-root startup and six isolation checks remain historical evidence in the production-integration report. They were not repeated or generalized to an uncreated project. Personal native ChatGPT login passed previously; it was not rechecked here. Current quota remains UNKNOWN. No credentials were inspected, copied or printed.

## Remaining test discrepancy

Prior complete runs: 571/571 passed, then 570/571 passed with one fresh Git-initialization fixture failure. The failed Git setup happened before the junction/object-store safety assertion; the assertion itself was not demonstrated faulty. Its preserved journal records `git_unknown`; original spawn error/status details were not retained at that time. Requested Git timeout was 10 seconds, but the affected test took about 186 seconds. Low available memory is a recorded circumstance, not a proven cause.

Current source uses a unique temporary fixture/root, serial test dispatch, an exclusive initialization reservation and fail-closed unknown-outcome handling. No demonstrated shared-fixture collision, ordering defect, file lock or specific OS cause was established. Existing diagnostic capture now retains bounded sanitized spawn/status/timing evidence for subsequent failures. The old unknown journal was neither deleted nor retried. A passing rerun does not establish why the earlier call stalled.

Current command:

```powershell
node --max-old-space-size=128 --test --test-timeout=60000 --test-concurrency=1 tests/studio-run-scope.test.js tests/managed-workspace-root.test.js tests/managed-workspace-production.test.js tests/workspace-inspection.test.js
```

**34 passed, 0 failed, 0 skipped**, about 37 seconds. The previously failing Git inspection case passed in about 0.79 seconds. Evidence: `docs/verification/first-live-preparation-tests-20261106.txt`. This was one relevant serial run, not a new full-suite pass. No assertions were weakened or tests skipped.

## Diagnostic cleanup investigation

Reviewed `scripts/inspect-codex-startup-20261106.js` and its saved startup evidence. Startup succeeded without a model turn, but the diagnostic did not exit after stdin EOF. Its timer requested termination after 30 seconds; saved elapsed time was 30,901 ms and exit was 1.

The script checks the root PID and native birth identity before invoking `taskkill /T /F`. However, it discards taskkill status, does not persist the captured descendant identities, and its final `terminationVerified` checks only absence of the original root identity. Therefore the historical boolean must **not** be read as proof of complete process-tree cleanup. No old diagnostic PID was retained in that report, so retrospective attribution or safe targeted termination cannot be established from this record. No unrelated process was terminated here.

Production execution recovery is stricter: `StudioExecutions.reconcile` requires recorded PID/birth, descendant capture, close observation and confirmed tree termination before releasing a lock. Do not weaken those requirements to accommodate the diagnostic.

Official OpenAI app-server documentation describes `thread/unsubscribe` as removing a subscription, with delayed thread unloading; that is not itself proof of server exit. A future diagnostic correction needs installed-version compatibility checks, explicit graceful shutdown/exit observation, identity-bound descendant snapshots, termination-result capture, and verification of every captured descendant. A forced stop must remain explicitly classified. No new native diagnostic was launched using the insufficient existing harness.

Sources inspected on 2026-11-06:
- https://learn.chatgpt.com/docs/app-server
- https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md

## Exact production workflow blocker

The current mechanism does not represent this approval safely:

1. `StudioRunScope.arm` requires saved Builder, Tester and Reviewer assignments, all among the native workers; it hardcodes three total calls and one per role.
2. `StudioWorkers.preflight` checks subsequent assigned roles, not just the Builder.
3. `ProjectStudio.drive` saves Builder files and immediately transitions to Tester; there is no supported Builder-only completion/pause mode.

Using the ordinary Send path could dispatch agents forbidden by this task. Assigning extra roles and relying on a later failure or manual Stop would not enforce one-call authorization. Direct transport invocation would bypass the required production pipeline. None was done. In accordance with the instruction to stop when additional role assignments are required, new-project registration/task activation is deferred; no inactive proposal is misrepresented as a saved supported configuration.

## Proposed configuration — inactive, not authorization

- New name: **Dev Squad Live Build Test**; actual project/session IDs and canonical root must come from normal Create New Project after the blocker is resolved. No previous verification root or Counter project may be reused.
- Builder: Codex Personal through its dedicated native ChatGPT profile. Tester/Reviewer: not dispatched. Fallback, paid providers, DeepSeek, Zapier and GitHub publishing: off for this task only. Persistent settings unchanged.
- Exact task: Build a local HTML/CSS/vanilla-JavaScript counter starting at 0, with Increase (+1), Decrease (-1) and Reset (0), a clean simple interface, and index.html, style.css, app.js and README.md. Include Node built-in tests if practical. No dependencies, external network requests, authentication, database or deployment.
- Proposed bound: one native Builder invocation, five minutes, 32 KiB captured output, no retry/fallback. Native default model must be recorded before approval; no model substitution. Subscription usage and available quota are unknown; no separate API-key billing is authorized.
- Keep the existing sandbox/root-deny, project folder lock, Stop control, durable execution/checkpoint records and owner gate. Preserve incomplete outcomes; do not automatically release unresolved locks. Rollback preserves evidence and stops the worker; no automatic Git reset or deletion.

## Live execution, generated code and browser results

Owner approval for this Step 5 model turn: **not requested or granted**. Actual model invocations: **0**. Execution ID: none. Generated files/features: none. Generated application browser tests and isolated generated tests: **NOT RUN**. No full development workflow, review or owner acceptance occurred.

## Next action and verdict

**BLOCKED**, not ready to request live execution yet. Safety evidence for diagnostic descendants remains insufficient, and production cannot enforce Builder-only dispatch.

Next narrowly scoped work to approve: repair and locally test diagnostic lifecycle evidence, and extend the existing optional run scope with an exact task-bound Builder-only phase allowlist, atomic one-call reservation, phase-limited preflight and a durable post-Builder pause. Preserve ordinary multi-agent behavior, sandbox restrictions and owner acceptance. Verify no Tester/Reviewer/fallback can dispatch even after restart/resume. Then create the new project through normal UI, verify its exact IDs/root/authentication and present the separate explicit live-YES proposal. Do not start an approval clock now.

Independent Tester, independent Reviewer, GitHub/Zapier handoffs and final owner acceptance remain pending and unauthorized in this bounded build phase.

## Subsequent repair checkpoint

The later authorized repair is documented in [BUILDER_ONLY_EXECUTION_REPAIR_20261106.md](BUILDER_ONLY_EXECUTION_REPAIR_20261106.md): final serial 585/585 passed; optional one-Builder approval/dispatch/pause and diagnostic cleanup verified with simulated workers and trusted native fixtures. This earlier BLOCKED checkpoint remains historical evidence. No real Builder execution was authorized or performed by the repair; a new isolated project and separate explicit live approval remain next steps after owner review.
