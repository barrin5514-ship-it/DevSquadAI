# Dev Squad AI current state for BGLAD

Assessment date: November 13, 2026 ET. Scope: evidence handoff and local verification. The working-tree evidence includes changes beyond the starting Git commit.

## Repository and runtime

- **VERIFIED** — Repository https://github.com/barrin5514-ship-it/DevSquadAI. Branch `feature/workspace-ui-redesign`. Starting HEAD `ceaa0a78df82746bd03a5af9349ad2d4bcb5717e` is the Windows audit and larger-project readiness checkpoint. The cached upstream ref is `4c2182b75de8e31f6d55225572cc7431aad7ed4d`, one commit behind the starting HEAD. A read-only git ls-remote confirmed the same SHA on GitHub.
- **VERIFIED** — The regular backend responded healthy on port 3000. Listener PID `29168` matched the SQLite runtime lease. Runtime fingerprint `6babdb15f09c6bda8b95f96a2a0ec8fe66f9e5a9cd914524c938c8aad743f1be` differs from checkout fingerprint `4cdcc878e19382fa49a2f21c349573f9522e441e842510ed9c5bcb1669e027e9`. The fingerprint covers selected service files. It cannot identify the exact Git commit or all browser assets.
- **VERIFIED** — Read-only production SQLite checks returned integrity OK and zero foreign-key violations. Counts were 43 project rows, 11,101 Studio events, 261 file revisions, 123 local-handoff rows, zero running/stopping chats, zero held write claims, zero Studio lock rows, and 11 unknown reservations. The Bike Shop chat remains paused. These database checks do not certify every historic workspace file against its checkpoint.

## Architecture and inputs for the assessment

Dev Squad runs on Windows with Node.js 24 or newer, Express 5, native SQLite in WAL mode, and a JavaScript dashboard rendered by the local server. This host reported Node v26.13.0. Console Send reaches Project Studio, which binds the request to the project root, verifies the approved terms and checkpoint, and claims the workspace. Builder edits become revisions. A separate local runner executes Tester-authored checks. The Reviewer receives the tested revision and recorded results. Final acceptance belongs to the owner.

| Area | Start here |
| --- | --- |
| Entry and API | `src/server.js`, `src/app.js`, `src/routes/console.js`, `src/controllers/api.js` |
| Dashboard | `src/dashboard/conversations.js`, `workspace-shell.js`, `preview.js`, and `output.js` in that directory |
| Run state | `src/services/project-studio.js`, `studio-run-scope.js`, `studio-executions.js`, `studio-handoffs.js`, `studio-recovery.js` |
| Planning and evidence | `src/services/studio-methods.js`, `studio-plan.js`, `studio-project-context.js`, `studio-independence.js`, `studio-verification.js` |
| Providers and failure semantics | `src/services/studio-workers.js`, `studio-failover.js`, `demo-cli-transport.js`, `nemotron-worker.js`, `src/providers/adapter.js`, `deepseek-stream.js` |
| Storage and isolation | `src/database/`, `src/services/project-files.js`, `workspace-preview.js`, `studio-npm-runner.js` |
| Verification | `AGENTS.md`, `scripts/test-serial.js`, `tests/studio-*.test.js`, `tests/workflow-debug-*.test.js`, and `docs/verification/autonomous-20261110/` |

The local BMAD manifest identifies official BMAD 6.12.4. Python and uv are available, and the project config resolver started successfully. This handoff used the installed BGLAD guidance and the Project Context skill as a file-loaded audit reference. No complete BMAD delivery or independent skill execution was performed. Dev Squad's BMAD-style routing remains its own subset. Review the existing untracked installer files and local configuration before selecting or publishing any BGLAD artifacts.

## Feature evidence and remaining behavior

| Classification | Feature and evidence |
| --- | --- |
| VERIFIED | Historical real Chrome, simulated providers. All five owner question types survived refresh and a real backend process restart. The exact answer resumed the same request, only the Reviewer reran, and the existing files and two passing tests were preserved. See [restart and question evidence](verification/autonomous-20261110/INTERACTIVE_RECOVERY_RECHECK_20261111.md). |
| VERIFIED | Historical real Chrome, simulated providers. While Builder was active, the owner queued an instruction, edited it to dark mode, and cancelled another. Both decisions survived restart. Only the applicable batch ran. Fresh local tests and independent simulated review brought the same request to Awaiting Owner. The linked report carries the PID and screenshot locations. |
| PARTIALLY VERIFIED | Queue application currently handles a narrow set of appearance additions at approved Builder checkpoints. General requirement classification, conflict questions, late Tester/Reviewer plan adoption, dependency recovery and context-exhaustion recovery remain gaps. |
| VERIFIED | Simulated one-Send and scope tests cover actual fixture files, revision-bound independent results, approval hashes, stale checkpoints, inappropriate roles, duplicate dispatch and unknown outcomes. Recent reported suites were 66/66 execution and scope, 48/48 handoff and fallback, and 18/18 Nemotron. The suites overlap. |
| VERIFIED | Real Chrome on the regular dashboard at the prior maintenance. Demo Six opened saved `repair-form.html`; `repair-form.js` returned HTTP 200. Empty input showed three errors and valid fixture input showed confirmation. Screenshots remain in the host Temp folder `devsquad-six-preview-vUogUT`. The earlier 15 preview checks passed. |
| PARTIALLY VERIFIED | Recent continuation uses 32,768 requested DeepSeek tokens and one smaller continuation per role, provider and unchanged checkpoint. It discards incomplete edits, retains verified batches, and can recover the durable pre-dispatch boundary on restart. The exact Bike Shop prompt and a second reporting prompt each reached Awaiting Owner in Chrome with simulated workers and three real local fixture tests. Screenshots remain in host Temp folder `devsquad-continuation-browser-TkiGx2`. The fixtures do not prove actual portfolio or Bike Shop implementation quality. |
| FAILED | The historical real Bike Shop attempt used `deepseek-flash`, requested 8,192 output tokens, and returned HTTP 200 with a completed stream ending in `length` at exactly 8,192 output tokens. Its checkpoint contained only `AGENTS.md`, and no edits were saved. Codex Personal and School conflicted with the Tester family, and Claude conflicted with the Reviewer role. The continuation change awaiting activation has no live retest. |
| BLOCKED | Live retest and regular-backend activation are outside assessment authority. Unknown provider outcomes and historical reservations remain fenced from automatic replay. |

## Real provider evidence

**VERIFIED for those two small historical builds.** AutoTest Final 5 reached Awaiting Owner twice in the same chat. Build 1 used Claude Code for Builder, DeepSeek for Tester, and Nemotron for Reviewer. Three independently executed tests passed. Build 2 used Codex Personal as eligible Builder fallback after Claude Code failed, DeepSeek for Tester, and Nemotron for Reviewer. Four independent tests passed. Both saved browser interactions were verified. The reviewers inspected test evidence. See the request IDs and screenshots in the [live two-build report](verification/autonomous-20261110/FINAL_LIVE_TWO_BUILD_PASS.md).

**PARTIALLY VERIFIED** — Demo Six initially hit a Codex Personal routing discovery timeout before it produced independent test files. The trace recorded process exit 1 and confirmed termination. Its Builder's saved form passed isolated smoke checks. Later preview verification is browser evidence for the saved form. These records do not prove current account usage, reliability across providers, or recovery for arbitrary projects. No fresh provider calls were made for this handoff.

## Full serial gate

**FAILED historically** — The FINISH TESTING pass reached 890 passed, 1 failed, 0 skipped out of 891, exit 1. Windows MXC did not confirm termination of the isolated owner-configured npm test fixture. The same file passed 3/3 alone. Its functional Chrome restart checks completed. The overall assignment was incomplete at the serial gate, despite an older 884/884 baseline.

## Local work and checkpoint boundary

The initial working tree had 60 modified tracked files and 331 untracked paths. The index had no staged changes. The changes include adaptive DeepSeek streaming, durable plans and tool execution, on-demand context, local handoffs, evidence and privacy checks, question/restart recovery, queue and draft UI, provider diagnostics and role fallback, static preview selection, and current response-limit continuation. Related tests, reports, temporary maintenance and pilot scripts, an extra root-level run-scope copy, and separate BMAD/local harness setup are also present. Use `git status --short --branch`, `git diff --stat`, and `git ls-files --others --exclude-standard` to enumerate paths. The broad overlapping work needs review in coherent groups. The handoff checkpoint is documentation only. Keep private databases, credentials, local agent configuration, screenshots, and diagnostic logs outside that commit.

## Recommended BGLAD priorities

1. Establish a shareable source baseline and compare candidate source hashes with the running build. Diagnose the Windows MXC serial-suite timeout using nested-command and process-termination evidence before declaring the local gate green.
2. Assess state transitions around checkpoint persistence, continuation and fresh independent evidence. Preserve unknown outcomes, task and workspace binding, role independence, and final owner approval.
3. Plan a separately approved controlled live pilot after maintenance and local gates. Verify continuation on realistic provider output, including large existing plan items. The current smaller attempt does not automatically subdivide an oversized saved plan item. Track results for that exact revision and preserve earlier evidence.


## November 13 serial result and assessment disposition

**FAILED** — Fresh Windows command: npm test (Node test runner, 104 test files, concurrency 1, 128 MiB heap). The shell excluded credential and production database environment variables. Results: **903 passed, 5 failed, 0 skipped, 0 cancelled, 908 total**, exit 1, Node duration 814.348 seconds. The full local log is at `%TEMP%/devsquad-bglad-full-serial-20261113.log`. The previous MXC npm-test timeout did not recur in this run.

- tests/reviewer-capture.test.js: three cases expected Reviewer retry after an outcome without verified termination. The current workflow refused recovery or returned HTTP 409 before dispatch. The findings and usage-limit assertions consequently never ran in those scenarios.
- tests/studio-retry-delete.test.js: two tests expected Retry and Edit & Retry to proceed after the fixture deliberately returned unknownOutcome. Both stopped with HTTP 409 and the saved unknown-outcome message.
- These failures expose a mismatch between retry fixtures and the current unknown-outcome fence. Before changing behavior, BGLAD should establish the intended recovery contract and use positively terminated fixture outcomes to test allowed retry separately from rejected replay. Independent evidence is still required for any production change.

**VERIFIED** — Read-only checks also compared the actual project files to saved checkpoint hashes. The paused Bike Shop checkpoint matched (6cf19313407d0e113b8a0cde311addca8d270c0d1ea1c01fe6bda00cab7cb771). Demo Six remained Awaiting Owner and matched (9b742a5c4f6edbf55d5f3479039ca8cea85c9615fa8abb784a1ab304a9977333).

This assessment preserves the existing source, including the mixed uncommitted application changes. The documentation commit may be reviewed independently. GitHub publishing and activation of the later backend source remain pending owner approval.
