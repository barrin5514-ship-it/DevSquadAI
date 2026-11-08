# First real Dev Squad build — preparation and approval gate

Date: 2026-11-06. Branch: feature/workspace-ui-redesign. Initial checkpoint was BLOCKED pending owner approval. The owner subsequently approved the exact bounded call and confirmed included Personal allowance. FINAL VERDICT: REAL BUILD VERIFIED (Builder-only plus local functional verification; no independent agent review or final acceptance).

## Exact prepared target

Project: Dev Squad First Live Build
Project ID: 479acbbc-9cf1-410c-a276-b45ec2159ed6
Session ID: 9e17abb3-8e65-4c35-8bb4-c33908264db4
Canonical workspace: C:\Users\barri\OneDrive\Desktop\Next Chapter Projects\DevSquadAI\workspaces\479acbbc-9cf1-410c-a276-b45ec2159ed6
Dashboard: http://127.0.0.1:3000/team#project/479acbbc-9cf1-410c-a276-b45ec2159ed6/chat/9e17abb3-8e65-4c35-8bb4-c33908264db4

Task saved through the normal dashboard Save message flow:

> Build a small, clean, responsive To-Do List web application using HTML, CSS and vanilla JavaScript, with no external dependencies, database, API keys or deployment. Required files: index.html, style.css, app.js, README.md. Support adding and displaying tasks, marking them complete/incomplete, deleting them, showing the remaining task count, and saving/restoring tasks with browser localStorage. Use plain-English comments and README instructions. Return the implementation through the existing artifact workflow. Do not claim independent tests or review ran.

Current state: ready, version 2; Builder-only selected; Codex Personal; zero executions; no run approval or approval clock. New-project agent-write permission remains OFF until owner approval. No duplicate project or session was created. Original Counter records/lock were not operated on; their filesystem fingerprints remain unchanged.

## Preflight evidence

- Supported SQLite backup: C:\Users\barri\OneDrive\Desktop\Next Chapter Projects\DevSquadAI\backups\backup-1794006212689-3c5f0da8-77d3-4fb9-bbbb-4c91a977d621.sqlite (supported helper performs integrity and foreign-key validation).
- Actual regular dashboard created the project HTTP 201 via Inspect selection / Create project, opened its sidebar Conversation control, saved instructions, and selected Builder-only. Screenshot: docs/verification/first-real-build-20261106/prepared-awaiting-owner.png. The initial browser script incorrectly expected the composer on Projects, and a second expected the per-session header before any session existed; both timed out without dispatch. Read-only inspection identified the actual sidebar Conversation entry; preparation then succeeded. The browser also exposed an existing empty-project render error, “Cannot read properties of undefined (reading status)”: conversations.js activeNow compares absent selected/detail IDs as equal and then dereferences the absent detail. The project sidebar Conversation control remained available and created the normal session; its fresh session page subsequently passed read-only checks. This is a real empty-project UI defect, not merely an automation assumption. No application source fix is included in this bounded build-preparation task.
- Dedicated Personal login status passed using the same CodexProfiles.check selection used by production preflight. CLI version codex-cli 0.166.0. No credentials read, copied or displayed; no login changed. Native profile: C:\Users\barri\.devsquad\codex\personal.
- Production transport forces ChatGPT authentication, uses https://chatgpt.com/backend-api/codex, strips API-key environment variables and disables transport retries. This is subscription authentication, not an API-key request. Remaining included allowance and any account credit/overage availability are UNKNOWN from login status; owner must confirm included allowance before dispatch. Official distinction: https://learn.chatgpt.com/docs/auth (accessed 2026-11-06).
- Model is NOT explicitly pinned by the existing adapter. It ignores user config and uses the native CLI default; exact resolved model is unverified before an actual invocation. Do not infer a model from the Personal config or silently add one. Approval must acknowledge the existing native default; record any actual reported model afterward.
- Managed root verification passed; independent Git root matches canonical workspace, local mandatory AGENTS.md verified, root instruction hash 3f68e8ba89cde2217ade20d0fbc8ee42b1b5d9dc05a4049d2a22e53df40e94bd. Initial checkpoint 6cf19313407d0e113b8a0cde311addca8d270c0d1ea1c01fe6bda00cab7cb771. Application files do not yet exist (only local instructions).
- Six actual MXC local checks passed: local instructions readable; parent read/write denied; hub instructions denied; child parent read denied; network denied. Fake decoys were removed. No Windows permissions changed. New project has no execution/folder lock. Existing historical Counter lock retained.
- Existing safety regression: 13/13 tests passed, serial, zero skipped or failed. No full suite rerun was necessary: application source unchanged; previous frozen UI full suite 593/593 is historical, not a new run.

## Proposed bounded approval (not yet armed)

Exactly one Codex Personal Builder invocation through production Dev Squad only; native CLI default model; confirmed included subscription access only. At most five minutes and 32 KiB captured output. One task/session/root/database/profile/goal binding, 30-minute approval window recorded only after actual approval. No retry, fallback, Tester, Reviewer, paid provider, GitHub publishing or Zapier delivery. Enable agent changes only for this new project using existing owner-access controls after approval. Existing global routing/spending controls unchanged.

Model tools are disabled. The trusted native login broker uses only Personal authentication; the model receives the bounded task packet. Returned files go through guarded path validation/artifact/revision/checkpoint handling, not arbitrary model shell commands. The existing MXC filesystem policy and network denial remain. Authenticated broker network access to the ChatGPT service is distinct from disabled generated-tool network access.

Stop remains available. Timeout/output/unknown termination preserve evidence; uncertain outcomes retain the lock and require safe reconciliation. No automatic retries or force-release. Successful Builder completion pauses with independent tests, review and owner acceptance outstanding. It does not mark the project accepted.

## Work after approval

Arm only this scope using the existing owner gate and dispatch once through the production pipeline. Record actual process/model/usage/lifecycle evidence and generated files. If successful, inspect code before isolated real-Chrome functional checks (add/display/complete/reopen/delete/count/localStorage refresh/no JS errors). Do not call these independent multi-agent tests. Preserve checkpoints/history; no deployment or acceptance. On failure, stop and report without another attempt.

## Original preparation outcome (before approval)

At the original preparation checkpoint: zero model invocations, no generated application or browser application tests. Owner approval was then required; see the authorized outcome below. No application source changes, commits, pushes, authentication changes, lock cleanup, billing/routing changes or webhooks.

Fresh prepared-session dashboard: 5/5 read-only Chrome checks passed, no page errors, no write/external attempts; screenshot `docs/verification/first-real-build-20261106/read-only-dashboard/regular-dashboard-1366.png`. The earlier screenshot retains the historical empty-project toast; the fresh screenshot is current evidence. Source diff whitespace check passed.

## Authorized live execution — actual outcome

The owner explicitly approved ONE native-default Codex Personal Builder invocation and confirmed included subscription allowance in this session. Existing project-specific write access and the normal run-approval gate were used, then the real dashboard Send control dispatched through the production pipeline. No direct Codex generation command was substituted. Dispatch journal: `docs/verification/first-real-build-20261106/live-dispatch.json`. Exactly one durable execution: `5ec42662-abe0-495c-994c-c29d676370f0`, agent codex-personal, phase builder, completed. Native stdout reported a completed turn and usage; returned files were actually persisted. Native process elapsed 64.879 seconds, exit code 0, close observed; fresh identity-aware observation found no original process/descendants. No forced stop was necessary.

Limits preserved: one invocation, 300,000 ms, 32,768 captured bytes, no retries/fallback, Tester/Reviewer/paid workers disabled for this turn. No DeepSeek, Zapier, GitHub publishing, deployment, commit, push or auth/permission changes. The native login broker used ChatGPT subscription authentication; no API-key billing path was used. Exact resolved model and HTTP status were not supplied by the CLI adapter, so both remain unreported rather than invented. Tokens reported: 15056 input, 2426 output, 17482 total, 0 cached input. Reasoning-token breakdown not supplied. Dollar cost not supplied by this subscription CLI response; no fabricated per-token API price or claim of unlimited usage.

Generated files: index.html, style.css, app.js, README.md, and additional app.test.cjs. Existing local AGENTS.md and managed-root metadata remain. Builder-created tests were not claimed as independent multi-agent testing. Main source implementation was not written or corrected by the maintenance assistant.

## Actual functional verification

Code was inspected before execution: dependency-free static HTML/CSS/JS, localStorage, inert textContent task rendering, no fetch/eval/external scripts. Only the five generated files were copied into a fresh temporary folder. Static loopback server used a fixed file allowlist/CSP, Chrome external requests were blocked, generated child environments excluded API credentials, test processes had bounded timeouts. The temporary server/browser closed afterward. No app test state was written into the original generated project.

JavaScript syntax passed. Builder-authored Node tests were executed separately: 3/3 passed. Combined functional verification checks: 19/19 passed (real Chrome behavior/error checks, syntax, Builder-test exit status and file-integrity check), 0 failures, zero page errors or external requests. They covered load, initial zero count, adding/displaying two tasks, completion/count, reopening, deletion/count, localStorage refresh, completion-state refresh, blank input, literal HTML text, 390px responsive overflow, malformed-storage recovery, continued editing, and unchanged original file hashes. Desktop and mobile screenshots: `docs/verification/first-real-build-20261106/todo-desktop.png` and `docs/verification/first-real-build-20261106/todo-mobile.png`. These are local independent functional checks, not Codex Tester/Claude Reviewer calls.

The initial harness falsely failed on Node output formatting: it expected TAP `# pass 3`, while this Node emitted `ℹ pass 3`. The generated tests had actually exited 0 and passed 3/3. Only the harness parser was corrected to accept both documented output shapes; initial evidence was retained under initial-browser-functional*. No model retry, generated-code edit or weakened app assertion occurred. Current authoritative result: `docs/verification/first-real-build-20261106/browser-functional.json`. Historical `browser-functional-error.json` describes that initial parser issue, not the final verdict.

## Persistence, preservation and final status

A fresh read-only SQLite connection verified exactly one completed Builder execution, paused session, builderCompleted=true, no Tester/Reviewer, no fabricated internal independent test/review records, zero active jobs, no lock on this project, and quick_check OK. Saved post-build checkpoint and current file fingerprint both equal `e3c2d205f4f35621d61941abfa25b61325832ae1652ebcb17f4707dacf0274d2`. A fresh dashboard reload restored the result and screenshot after-live-execution.png. No backend restart was needed or performed. Both original Counter fingerprints are unchanged; original historical Counter lock remains untouched.

The run approval is consumed, not reset or replenished. No output was accepted automatically. Independent Tester and Reviewer remain a separate future phase; local browser evidence is in this report rather than falsely setting the app’s independent-agent status. The previously observed empty-project composer defect remains outside this bounded build task; the prepared session works. No full application regression rerun was needed because this task changed no application source; the earlier 593/593 suite and preparation 13/13 scope tests are prior evidence, not new full-suite results.

FINAL VERDICT: **REAL BUILD VERIFIED**, narrowly for one genuine Codex Builder-created application and its inspected local functional verification. Multi-agent review and owner acceptance are still pending. Stop here; no further provider call is authorized by this completed one-shot scope.
