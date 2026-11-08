# Production workspace-root integration — November 6, 2026

Branch: `feature/workspace-ui-redesign`. Preserved HEAD: `9983d20f1ee6394cbfbff484ae9f7345c91195d7`. No application commit, push, merge, deployment, permission widening or model-generating turn.

**Verdict: READY FOR SEPARATELY APPROVED LIVE TEST — bounded Codex-only verification, not a verified multi-agent build.** The actual production-created root initialized a real Codex session and passed filesystem isolation checks. The diagnostic app-server required bounded forced cleanup after its successful initialization; graceful app-server shutdown remains a diagnostic limitation, detailed below.

## 1. Changes implemented

New projects in Dev Squad's **managed storage** now receive their own Git root and local security instructions before becoming active in SQLite. The shared creation service covers normal dashboard creation and managed API creation. The regular dashboard's Inspect/Confirm flow remains intact. No existing project is initialized on startup.

The existing helper now has an application-owned initialization record, project/database/root identity binding, source hashes, atomic control-file writes, and an exclusive initialization reservation. Verified completed initialization is idempotent. Known post-Git interruptions can finish without running `git init` again. Live/unverified owners, unknown Git outcomes, mismatched identities, changed instructions and foreign/partial Git metadata fail closed. Partial folders remain preserved and unregistered; Projects exposes their recovery action through the existing dashboard capability and explicit owner confirmation. Recovery keeps the original ID and restores **read-only** access. Git failures retain sanitized status, signal, error code, elapsed time and bounded stderr for diagnosis; an unknown result is not replenished or retried. Registration and its security metadata use an atomic SQLite savepoint; no schema migration.

Instruction handling copies effective bounded ancestor instruction sources into the new root, respecting `AGENTS.override.md` selection per inherited directory, then keeps mandatory hub security controls last. Source text and hashes are preserved. Worker patches, ordinary file writes and create/rename actions cannot replace or shadow managed instructions. Before Start or applying returned files, the backend checks the managed root and recorded security provenance. Project notes cannot authorize broader filesystem access or bypass backend gates.

Git initialization reuses the existing fixed Git executable with hooks, inherited configuration, credential helpers and network protocols disabled. No Git commit is made by project creation. Canonical local paths are required; traversal, junctions, symlinked/hard-linked control files and foreign journals are rejected.

**Scope boundaries:** existing folders, cloned repositories and owner-selected external destinations remain registered in place under their existing setup controls. They are not silently migrated or certified by this repair. For automatic managed-root setup, leave **Project location** blank. The retired sealed demo keeps its own existing repository initializer, avoiding a second `git init`; its closed dispatch routes were not re-enabled. The class simulation is preserved separately.

## 2. Files modified in this phase

- `src/services/managed-workspace-root.js`, `src/workspace/index.js`, `src/app.js`: journaled managed-root lifecycle and production wiring.
- `src/models/store.js`, `src/services/projects.js`: atomic registration, provenance, pending recovery and verification.
- `src/services/project-studio.js`, `project-connections.js`: guarded Start/apply, correct registered-folder treatment, and no duplicate Git initialization.
- `src/services/project-files.js`, `workspace-file-actions.js`: protected security documents and write-time provenance checks.
- `src/services/project-git.js`, `demo-workers.js`: reuse fixed Git executable; retain the legacy sealed initializer without duplication.
- `src/routes/console.js`, `src/dashboard/projects.js`: protected recovery endpoints, pending-workspace UI and truthful managed-Git label.
- `tests/managed-workspace-production.test.js`: eleven focused lifecycle/security tests. Relevant existing fixture assertions in foundation, project UI, failover and workspace-inspection tests now account for real Git roots/security documents without dropping their safety checks.
- Verification scripts: `verify-production-workspace-root.js`, `verify-managed-root-isolation.js`, `verify-managed-root-recovery.js`; the existing non-generating startup inspector additionally records returned workspace roots.
- This report, `docs/PROMPT_LOG.md` and task-specific verification files. Earlier uncommitted work remains preserved.

## 3. Actual production and browser evidence

Supported backup before edits: `node scripts/backup.js`, verified at `backups/backup-1793981339722-dd8fb64f-3655-451d-92a9-1e9679544515.sqlite`.

Created through real Chrome on the regular port-3000 dashboard, using **Create New Project → Inspect selection → Create project**:

- Name: **DISPOSABLE · Production workspace startup verification · 2026-11-06**.
- Project ID: `9a28ca1c-ff7e-46f5-8f69-86987d867a2a`.
- Root: `workspaces/9a28ca1c-ff7e-46f5-8f69-86987d867a2a` under DevSquadAI.
- Confirmation HTTP **201**. Own `.git/HEAD` exists; local instructions contain the complete trusted security policy. Project defaults to read-only. No task/session or worker run was created.
- Local instruction hash: `3f68e8ba89cde2217ade20d0fbc8ee42b1b5d9dc05a4049d2a22e53df40e94bd`.
- Initial file/security checkpoint fingerprint: `6cf19313407d0e113b8a0cde311addca8d270c0d1ea1c01fe6bda00cab7cb771`.
- Refresh and a supported idle-backend restart preserved the actual project selection, instruction hash and fingerprint; zero browser JavaScript errors. No Resume/Send/Run was pressed.

URL: `http://127.0.0.1:3000/team#project/9a28ca1c-ff7e-46f5-8f69-86987d867a2a`.

One authorized **non-generating** native Personal check used the installed Codex app-server and existing MXC settings. Only `initialize`, `initialized` and `thread/start` were sent. The successful reply reported this exact cwd, **only this root** in `runtimeWorkspaceRoots`, only its local `AGENTS.md` in `instructionSources`, profile `devsquad_demo`, and **zero turns**.

**Cleanup qualification:** the initialization reply succeeded, but the diagnostic process did not exit on stdin EOF. The 30-second bound triggered termination; overall elapsed time was 30,901 ms, process exit 1, `timedOut:true`, `terminationVerified:true`, empty stderr. This is not reported as a clean process-exit pass. No second initialization was attempted. The diagnostic app-server client is separate from the production `codex exec` worker transport; real worker inference/exit remains to be tested under fresh approval.

Real Chrome recovery verification on a disposable application/database passed **six checks**: injected initialization failure leaves no active project; restart exposes the same pending ID; protected owner recovery succeeds; Git metadata/ID/read-only access persist; Run is rejected while read-only; no stale lock or page error. These are real local application/browser checks, with no model-capable workers in that fixture.

The class demo passed its **12 Chrome checks** against current code in a separate fixture, including simulated handoffs, actual local Node fixture tests, refresh/restart, failure and Stop. The owner's preserved port-3002 page still responds HTTP 200; its stored jobs were not run or accepted by this repair.

## 4. Tests and security verification

Final full command:

```powershell
node scripts/test-serial.js
```

The supported runner executes one test file at a time with a 128 MiB heap. An earlier full run passed **571/571**. The latest full run finished **570 passed, 1 failed, 0 skipped**: Git initialization stalled while creating a fresh workspace-inspection test fixture (the test lasted about 186 seconds). Its safety assertion was not reached. One focused recheck of that exact case passed **1/1** in a fresh fixture. Final production-root tests passed **11/11** after adding safe Git failure diagnostics. No further full-suite loop was run, and no all-green full run is claimed for the final revision. Eleven production tests cover fresh/existing/nested roots, mandatory precedence, idempotency, interruption recovery, unknown/live reservations, tampered instructions, database scope, traversal/junctions, concurrent creators and capability boundaries.

The first broad run had 551 passes / 20 failures: the legacy sealed demo's second Git initializer was a real integration conflict; other assertions assumed no initial Git/security file or treated a read-only status poll as a native picker call. The conflict and fixture assumptions were corrected. Recovery review also found and corrected a writable-default edge case before delivery. The final recovery tests and real recovery browser flow include that correction. The later full run encountered the separate Git setup stall described above.

One bounded real MXC probe passed **six checks**: local instruction read allowed; parent read denied; parent write denied; hub instruction read denied; spawned-child parent read denied; network denied. Git reported this exact root. No credentials were probed—only a fake decoy and the already-known hub instruction file. Temporary probe files were removed. Windows ACL hashes for the new root, hub and both Counter roots were unchanged.

Probe-harness corrections are distinguished from application failures: an initial inline check produced no results; a file-based Node probe then hit its loader's `lstat C:\\` restriction. Using the same `--preserve-symlinks` / `--preserve-symlinks-main` flags as the existing sandboxed runner allowed the trusted probe to execute without changing permissions. The final six checks passed. The non-generating session was not repeated.

Personal and School both independently report native ChatGPT login, with distinct homes. No auth-token file was read/copied/displayed by this agent; native CLI authentication remained with its broker. Remaining quota and real model inference are **UNKNOWN**. Windows reported 2.16 GiB available out of 15.75 GiB after the slow test; this snapshot does not establish the cause of the Git failure. The failed fixture remains journaled as `git_unknown`, with no Git root/instructions published and no automatic retry. No API-key billing, paid provider activation, grant minting, price/balance request or webhook delivery occurred.

## 5. Existing project preservation

Main project count changed **14 → 15** only for the labeled disposable project; session count stays **15**. No active Studio run, new-project worker lock or initialization reservation remains. A read-only comparison against the pre-edit backup also found **all 411 existing rows across 63 application tables unchanged**, excluding only the authorized backend PID lease; new disposable-project records are additional rows. Original Counter and Counter Test 2 retained identical record/event/execution/lock hashes and file fingerprints. Original Counter's historical lock remains; Counter Test 2 stays paused with its one historical failed execution. Neither received Git metadata or instruction migration.

Regular backend restarts were limited to the verified idle database-owning Dev Squad process; the class server and native apps were not stopped. `.env`, routing, paid controls and existing approvals were not edited. No existing source, draft, review or checkpoint was reset.

## 6. Handoff and integration readiness

| Stage | Implemented | Still unverified / missing |
| --- | --- | --- |
| Owner prompt and durable job state | SQLite sessions, messages, reports, revisions and locks | New root has no generated task checkpoint yet; only initialization provenance/fingerprint was checked |
| Codex Builder | Native profile transport, scoped guards, JSON/file validation; non-generating startup now works | Real generation and remaining included quota |
| Checkpoint / handoff | Files, hashes, revisions and internal phase handoffs | Automatic Git commits are not demonstrated or authorized; no owner-repository commit was made |
| Claude Tester | Native transport and role selection; separate isolated test runner | Real Claude execution on newly generated work in this repaired workflow |
| DeepSeek Reviewer | Official adapter, independent-review binding and existing paid controls | Fresh paid review authorization and end-to-end test; no paid request here |
| Final owner gate | Current artifact/test/reviewer eligibility checks | No task was accepted here |
| GitHub | Configured owner-confirmed read-only fixed-branch reader, hash validation | No live retrieval or remote commit/push in this task; current Studio handoffs are internal |
| Zapier | Persisted private webhook reports configured/enabled; bounded cleaned delivery code exists | No webhook sent; active Studio → Zapier → GitHub linkage is not established by this repair |

Configured is not equivalent to live verification. Normal Send may run the assigned multi-agent chain, including DeepSeek; it must not be used as an assumed one-call Codex probe.

## 7–8. Verdict and exact next owner action

**READY FOR SEPARATELY APPROVED LIVE TEST** of a bounded Codex-only draft generation. New managed-root startup and isolation meet this phase's success criterion. **Not** a verified real application build, clean diagnostic app-server shutdown, live handoff chain or production deployment.

Next approval proposal: one Codex Personal Builder draft-only request in project `9a28ca1c-ff7e-46f5-8f69-86987d867a2a`, through the existing native transport, using the existing ChatGPT login; maximum one invocation, five minutes and 32 KiB captured output; no retries, account fallback, other agent, DeepSeek, Zapier, Git commit or push. Purpose: return a small finite-number JavaScript add utility and tests as structured draft output. Exact input/task identity and the project/database/root hashes must be bound before dispatch, and the owner must confirm included allowance. No active scope or approval clock was prepared here. Keep this project read-only unless a later approval explicitly includes applying a validated draft through the guarded artifact workflow.

Do not press Send or Resume Counter Test 2. Its separate migration and full live workflow remain later approvals. The app-server diagnostic's graceful-shutdown limitation must stay visible; any later execution must retain the proven timeout/identity/termination guards. This report itself authorizes no live call. Preserve the Git stall and graceful-shutdown qualifications when deciding whether to authorize the next bounded test; neither is concealed as an all-green result.
