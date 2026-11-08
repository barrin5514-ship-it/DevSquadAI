# Dev Squad AI — Independent Technical Review and Quality Audit

**Reviewer:** DeepSeek, independent reviewer role (not the builder, tester, or owner)
**Review date:** 2026-11-06, approximately 13:35 America/New_York (initial snapshot 13:25; updated after concurrent changes at 13:31–13:34)
**Project:** Dev Squad AI, `C:\Users\barri\OneDrive\Desktop\Next Chapter Projects\DevSquadAI`
**Branch:** `feature/workspace-ui-redesign`
**HEAD:** `9983d20` (`chore: record Counter Test 2 blocked live verification`), with a modified working tree
**Review type:** Read-only inspection, static analysis, live HTTP inspection, read-only SQLite inspection, and disposable mock-worker probes. No application code was modified.

## Snapshot warning (important)

The working tree changed while this review was in progress.

- The 13:12 ET report [FIRST_LIVE_CODEX_BUILD_20261106.md](FIRST_LIVE_CODEX_BUILD_20261106.md) says the production workflow is **BLOCKED** and that no Builder-only mode exists.
- At approximately 13:20–13:21 ET, [console.js](../src/routes/console.js), [project-studio.js](../src/services/project-studio.js), [studio-run-scope.js](../src/services/studio-run-scope.js), [studio-workers.js](../src/services/studio-workers.js), and [conversations.js](../src/dashboard/conversations.js) changed. A Builder-only execution mode appeared in the uncommitted working tree.
- At approximately 13:26 ET, [studio-run-scope.test.js](../tests/studio-run-scope.test.js) gained Builder-only tests. The owner's saved focused logs now report 7/7 at 13:25 and 17/17 at 13:30 (`docs/verification/builder-only-first-focused-20261106.txt`, `docs/verification/builder-only-focused-20261106.txt`). Those are **owner evidence, not independently rerun here**.
- At approximately 13:31 ET, [project-studio.js](../src/services/project-studio.js), [studio-run-scope.js](../src/services/studio-run-scope.js), and [conversations.js](../src/dashboard/conversations.js) changed again. The Builder-only packet now reports only the Builder role; the saved tests still do not cover the UI preflight-resume/empty-goal cases described below.
- At 13:35 ET the Builder-only browser attempt wrote `docs/verification/builder-only-browser-20261106.txt`: `locator.selectOption: Timeout 30000ms exceeded … waiting for getByLabel('Execution mode', { exact: true })`. This is a **failed browser check**, not a pass. The likely cause is that the running backend on port 3000 predates the 13:31 source changes and has not been restarted; that must be confirmed by the owner before any UI claim.
- No narrative report currently describes or verifies that newer Builder-only implementation. The 13:12 report predates it.
- This review treats those files as the current source, but the mode is **owner-test-evidenced, not independently reproduced**, and two UI/recovery defects remain. If the tree changes again, these findings must be re-checked.

Snapshot hashes (first 16 hex characters, SHA-256; latest at 13:34 ET):

| File | Hash prefix |
|---|---|
| [project-studio.js](../src/services/project-studio.js) | `A90A18CD9B21485D` |
| [studio-run-scope.js](../src/services/studio-run-scope.js) | `5F568E47C2EB182B` |
| [studio-workers.js](../src/services/studio-workers.js) | `6D110D561AD2DBC5` |
| [studio-run-scope.test.js](../tests/studio-run-scope.test.js) | `09D8154BCC791FF7` |
| [conversations.js](../src/dashboard/conversations.js) | `28B5A7363BA9ABE7` |
| [project-files.js](../src/services/project-files.js) | `C10D7C4FE83A8F8D` |
| [projects.js](../src/services/projects.js) | `78A93890E76987F4` |
| [big-three.js](../src/services/big-three.js) | `A063DC374EED453F` |
| [console.js](../src/routes/console.js) | `EF8D3FBC9A394843` |
| [README.md](../README.md) | `246CC4482EBF9334` |

## Executive summary

Dev Squad AI is a local Express/Node 24 + SQLite application with a substantial amount of safety-oriented engineering: managed project roots, path and link restrictions, a same-origin dashboard capability, folder locks, durable revisions, owner acceptance gates, native-diagnostic redaction, a bounded read-only GitHub handoff, a fixed-host Zapier sender, and an MXC-based isolated test runner.

The implementation is not, however, a verified live multi-agent development platform. The strongest safety claims are supported by code and by deterministic/mock tests. The strongest functional claim — that Codex, Claude, and DeepSeek actually build, test, and review real software — is not supported by any real model-generation evidence in this snapshot. The existing 14 projects also remain outside the managed-root repair, and Counter Test 2 still has no local Git root or local `AGENTS.md`.

The most important workflow defect is that **independent testing is not enforced**. A Tester can return zero test files, the runner will use the Builder's own test files, and the owner can still accept the result. The Builder and Tester are also allowed to be the same worker/family, including through automatic fallback. This directly affects the central promise of the handoff chain.

A new Builder-only mode, added while this review was underway, passed a disposable mock-worker one-call probe: one Builder call, no Tester, no Reviewer, no test runner, paused after the draft, acceptance rejected, and resume not silently re-dispatched. The owner then added focused tests at 13:26 and saved a 17/17 log at 13:30; those tests were **not independently rerun** here. The mode's core shape is encouraging, but its UI recovery path is still broken after a preflight failure (Resume sends a new request identity that the saved approval rejects), and approval can be armed before a task is saved.

No verified P0 (critical security/data-loss) defect was found. There are three high-confidence P1 workflow blockers and several verified P2 defects/gaps.

**Test evidence collected independently in this review:** 74 UI/pure unit checks passed; 41 additional pure/unit checks passed; the full suite could not be reproduced in this sandbox because the DSH sandbox blocks the child-process pipes used by `git` and the Node test runner. The owner's saved evidence reports 571/571, then 570/571, and later 34/34 on a focused serial run; those figures were **not** independently reproduced here.

### Top findings

1. **P1:** A no-op Tester can reach owner acceptance; independent tests are not proven. (P1-01)
2. **P1:** Builder and Tester can be the same worker/family, including via fallback. (P1-02)
3. **P1:** Existing projects, including Counter Test 2, were not migrated to the managed-root repair and still cannot start Codex under the repaired flow. (P1-03)
4. **P2:** Test-runner launch failure is reported as "tests executed, failed" instead of "runner unavailable". (P2-02)
5. **P2:** A multi-file worker patch can be partially applied, with the first file saved and the rest failing. (P2-03)
6. **P2:** External (non-managed) project `AGENTS.md` can be overwritten by a worker. (P2-04)
7. **P2:** The new Builder-only mode has focused owner tests (17/17, not independently rerun) but still has a broken Resume path after preflight failure and an empty-goal approval trap. (P2-06)
8. **P2:** The ordinary project Send path does not honor the global paid/live flags shown in the dashboard; owner intent must be clarified before any live paid run. (P2-01)

## 1. Review basis and method

### 1.1 Inspected

Architecture and documentation: [README.md](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md), [AGENTS.md](../AGENTS.md), [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md), [ORCHESTRATOR_ARCHITECTURE.md](../ORCHESTRATOR_ARCHITECTURE.md), [WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md](WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md), [WORKSPACE_ROOT_REPAIR_20261106.md](WORKSPACE_ROOT_REPAIR_20261106.md), [CODEX_STARTUP_ACCESS_REPAIR_20261106.md](CODEX_STARTUP_ACCESS_REPAIR_20261106.md), [CODEX_EXECUTION_FAILURE_REPAIR_20261106.md](CODEX_EXECUTION_FAILURE_REPAIR_20261106.md), [CLASS_HANDOFF_DEMO_20261106.md](CLASS_HANDOFF_DEMO_20261106.md), [FIRST_LIVE_CODEX_BUILD_20261106.md](FIRST_LIVE_CODEX_BUILD_20261106.md), and the saved verification artifacts under `docs/verification/`.

Application code: server/app/routes, configuration, SQLite migrations, Store/workspace/ProjectService, Studio (ProjectStudio, StudioWorkers, StudioFailover, StudioRunScope, StudioExecutions, StudioLive, StudioConversations, StudioRoles, StudioRecovery, StudioUsage), ProjectConnections, ProjectFiles, WorkspaceFileActions, WorkspacePreview, native Windows helpers, native diagnostics, DeepSeek paid paths, legacy generation/team/review paths, dashboard modules, and the test runner.

### 1.2 Live state observed

A read-only HTTP check found:

- `GET http://127.0.0.1:3000/api/health` → HTTP 200, `{"data":{"status":"ok"}}`.
- `GET http://127.0.0.1:3000/team` → HTTP 200; CSP header present; dashboard scripts referenced.
- `GET http://127.0.0.1:3002/class-demo` → HTTP 200.
- Dashboard `GET /api/console` → 15 projects, 15 chats, `liveEnabled=false`, `paid.enabled=false`, `deepseekConfigured=true`, `deepseek-flash`.
- Read-only SQLite: 15 projects, 15 chats (4 paused, 11 ready), 1 historical `studio_locks` row, 4 executions (1 completed, 3 failed), runtime lease PID 26848. No session was running.
- The `DISPOSABLE · Production workspace startup verification · 2026-11-06` project (`9a28ca1c-ff7e-46f5-8f69-86987d867a2a`) returned a real file tree with `AGENTS.md` and an independent Git root on `main`.
- Counter Test 2 (`7d913bbc-9f16-4a5a-abf8-e0202b04a3dd`) returned no Git repository and zero file-tree entries. Its preserved paused session and one failed Codex execution remain intact.

### 1.3 Dynamic checks performed

- Targeted test runs with `--test-isolation=none`:
  - 74 UI/pure checks passed (projects, conversations, explorer, development, owner acceptance, roles, workspace shell, history, Big Three UI, native diagnostics, Codex profiles, artifact summaries, syntax startup).
  - 41 additional pure/unit checks passed (provider diagnosis, workspace preview, webhook-out, scoped grants, provider status, and others).
  - 104 attempted checks failed at the DSH sandbox boundary because `git init` or child-process pipes are blocked (`spawn EPERM`); these are **environmental test-harness failures**, not evidence that the affected application assertions fail.
- Read-only SQLite and HTTP probes; no writes to the production database.
- A disposable mock-worker fixture using the actual `ProjectStudio`, `ProjectStudio.start`, `StudioRunScope`, and `accept` code. This is **not** live AI evidence.
- A disposable Builder-only fixture using the actual new mode and a mock Codex transport.
- A direct `ProjectFiles` conflicting-path probe.
- A direct `StudioWorkers.command` launch-failure probe.
- `codex.exe exec --help` and `claude.exe --help` were inspected only to verify CLI flag support; no model turn was made. `--ignore-rules` was confirmed to refer to execpolicy rules, not `AGENTS.md`.
- Headless Chrome attempts failed at the host sandbox boundary (`crashpad OpenProcess: Access is denied`); no visual browser verification is claimed. This does not invalidate the saved owner Chrome evidence in the reports, but it was not independently reproduced.

### 1.4 Restrictions honored

No application source was modified. No database rows were written. No provider/API call, native model turn, GitHub push, Zapier delivery, permission change, commit, merge, or deployment was made. Credentials were not read, copied, printed, or stored. The `.env`, webhook URL, and provider keys are deliberately absent from this report.

## 2. Architecture assessment

### 2.1 Overall shape

The application is a single-process, local-first dashboard and orchestration backend:

- Express 5 with a 32 KB JSON limit and unusually strict route-level field validation.
- Node 24 built-in SQLite, 17 additive migrations, `BEGIN IMMEDIATE` transactions, foreign keys, WAL, immutable event/revision tables.
- Vanilla-JS dashboard modules served by the same Express app, with a per-process same-origin capability for mutations and a strict CSP.
- Separate execution paths: the legacy team/DeepSeek workflow, the newer Project Studio workflow, the retired sealed demo, and an isolated class simulation.
- Native workers are invoked through a fixed CLI transport with JSON packets; generated tests run through a Codex MXC sandbox in a copied `.devsquad-tests` directory.
- Windows-specific folder/file helpers are first-party C# compiled locally and identity-checked.

### 2.2 Strengths

1. **Defense in depth around project roots.** `Workspace.resolve`, `ProjectFiles.resolve`, `ProjectConnections.selectedFolder`, and the managed-root verifier independently reject traversal, junctions/symlinks, hard links, reserved names, credential-like names, and foreign Git metadata.
2. **Separation of orchestration and transport.** `ProjectStudio` owns state and gates; `StudioWorkers` owns transport; `StudioRunScope` owns one-shot authorization; `StudioExecutions` owns durable process evidence. This is a sensible decomposition for a local orchestrator.
3. **Durable, explicit evidence.** `studio_events` and `studio_revisions` have immutability triggers; `studio_executions` records PID/birth/close/termination evidence; checkpoints hash their content. The design deliberately refuses to invent completion after restarts.
4. **No-self-review is enforced at multiple layers:** role validation, per-phase checks in `ProjectStudio`, `DemoReviewImport`, and acceptance checks.
5. **Capability boundary for the dashboard.** `/api/console` requires loopback `Host`, same-origin `Origin`, and a timing-safe per-process token for mutations. A random web page cannot read the session or mutate the app through normal browser behavior.
6. **Credential hygiene is taken seriously.** Provider keys are not returned by the dashboard; native diagnostics redact secrets, paths, URLs, addresses, and account identifiers; webhook and GitHub settings are constrained to fixed hosts; prompt history redacts stored values.
7. **Interrupted work fails closed.** Unknown worker outcomes retain the folder lock; reconciliation requires recorded process identity, descendant capture, close observation, and confirmed tree termination.
8. **Managed-root repair is real in the live app.** The disposable project was created through the normal UI and has its own Git root and local `AGENTS.md`; this is a material improvement over the nested-repository startup failure.

### 2.3 Weaknesses

1. **Very high line density.** Many services are one-line, deeply nested expressions with multiple side effects. This makes review, testing, and targeted repair hard. `project-studio.js`, `studio-workers.js`, `project-studio` drive/catch blocks, and `managed-workspace-root.js` are the clearest examples.
2. **Four overlapping workflow implementations.** Legacy `TeamOrchestrator`, Big Three, Project Studio, the sealed demo, and the class simulation each have their own gates. The same concept (reviewer independence, paid authorization, handoff context, completion) is implemented differently in each.
3. **SQLite JSON state as a schema substitute.** `studio_chats.state` and `studio_executions.evidence` are validated as JSON but not against a schema. Several fields are added opportunistically; compatibility depends on reader tolerance.
4. **Synchronous Git and C# work on the request path.** Managed project creation runs `git init` synchronously; the Windows helpers compile and run synchronously for some operations; folder dialogs can block. The saved evidence already includes a ~186-second Git fixture stall.
5. **Hard-coded Windows dependencies.** `C:/Program Files/Git/cmd/git.exe`, `%USERPROFILE%` CLI paths, .NET Framework `csc.exe`, and MXC are assumed. There is no health check for missing Git before project creation, and README does not list Git as a requirement.
6. **Test suite is coupled to real Git and the host.** Most integration tests cannot run in a confined environment that blocks `spawn` pipes; the full suite has known latency and one recorded failure.
7. **Documentation has drifted.** README still describes an earlier checkpoint and makes safety claims that the current Studio contradicts.

### 2.4 Database assessment

- Tables are additive and migrations are applied serially with a transaction; 17 migrations exist.
- `studio_events` and `studio_revisions` are append-only; `studio_file_operations` protects completed evidence; `studio_locks` prevents overlapping root work by primary key.
- `studio_executions` has a useful durable evidence JSON column but no schema validation of that evidence beyond `json_valid`.
- `studio_chats.request_id` is unique, which helps idempotency; `studio_roots.root` is unique, but `studio_project_connections.root` is not, so the app relies on `ProjectConnections.duplicate()` rather than a database constraint.
- The app is not designed for multiple backend processes; `claimRuntime` and the runtime lease enforce one owner, but PID reuse/stale lease handling is a local operational edge case.
- No evidence of SQL injection was found; queries are parameterized and filters are allow-listed.

### 2.5 API and state management

- The console API is a compact, capability-protected command surface with a consistent `{data}` / `{error:{message}}` envelope.
- Legacy `/api` project/task routes have no authentication and no loopback Host restriction. The README warns that this is a local-only application; a user who sets `HOST=0.0.0.0` would expose legacy read/write routes to the LAN. The console remains Host-restricted, but legacy routes do not.
- State is split between SQLite state columns, filesystem revisions, Git metadata, and in-memory receipts (`ProjectConnections.receipts`, `WorkspaceFileActions.receipts`, `WebhookOut.attempted`). In-memory confirmations are intentionally short-lived and fail closed after restart, but they are not durable.
- The dashboard uses no framework and no `innerHTML`; this materially reduces XSS risk. It does use many one-line render functions, which is a maintainability concern rather than a vulnerability.

### 2.6 Performance, resource use, Windows compatibility

- The app is appropriate for a single owner on one Windows PC. It is not horizontally scalable, and it does not need to be.
- SQLite WAL, `busy_timeout`, 32 KB request bodies, and bounded provider bodies are sensible.
- Managed project creation now runs `git init` for every new project; this can add several seconds and can stall on OneDrive. It also makes Git a hard dependency for project creation and for a large part of the test suite.
- Node 24 `node:sqlite` is a native dependency; the README correctly requires Node 24.
- The Windows-specific helpers are thoughtfully identity-checked (volume/file ID, birth time, final path, directory pins), but the implementation is complex and only testable on Windows.

## 3. Current functionality assessment

| Capability | State | Evidence / limit |
|---|---|---|
| Start backend, health, dashboard | **Implemented; live** | HTTP 200 on 3000; CSP present; 15 projects returned. |
| Create managed project via normal UI | **Implemented; live HTTP** | New project `9a28…` with independent Git `main`, local `AGENTS.md`, read-only default. Start/Send was not pressed. |
| Open existing folder | **Implemented; tested** | `project-connections` tests pass in owner evidence; registration is read-only and identity-bound. No live worker. |
| Clone public GitHub repo | **Implemented; mock-tested** | Bounded fixed Git command, tree validation, no checkout until validation. No live clone in this review. |
| Sessions, messages, attachments, references | **Implemented; live GET + UI tests** | Stored in SQLite; attachments bounded; no credentials. |
| Workspace explorer / Git view | **Implemented; live GET** | Managed project tree and Git change read; Counter Test 2 no Git. |
| Team Builder → Tester → Reviewer | **Implemented with mock tests; real AI unverified** | Defaults DeepSeek/Codex/Claude; no real generated application or real reviewer response. Tester independence gap below. |
| Builder-only one-call mode | **New; mock-verified in this review; owner focused tests 17/17** | One Codex call, no Tester/Reviewer/tests; paused; acceptance rejected; resume unavailable after use. Owner tests do not cover UI preflight-resume/empty-goal; no independent rerun. |
| Native Codex transport/startup | **Implemented; non-generating startup evidence only** | Managed root startup and isolation probes; no actual model turn in current evidence. |
| Native Claude transport | **Implemented; no live evidence** | CLI flags valid; native login check only; no completed real execution found. |
| DeepSeek Studio builder/review | **Implemented; no live Studio generation** | Legacy paid safeguards strict; Studio path differs (P2-01). |
| Isolated test runner (MXC) | **Implemented; no real generated-code test evidence** | Copies project, runs Node TAP under `codex.exe sandbox` with a parent-read decoy. No browser/other language adapter. |
| Review/owner acceptance | **Implemented; mock-tested** | No self-review; accept requires current tests/review. Tester provenance missing. |
| Git checkpoint/rollback | **Partial** | Git init/status/view only; no automatic commits or restore. SQLite revisions are the real checkpoint. |
| GitHub handoff | **Implemented; not live-tested** | Fixed read-only endpoint, base64/size/hash validation. No push. |
| Zapier delivery | **Implemented; not live-tested** | Fixed `hooks.zapier.com` host, cleaned payload, no automatic retry. Class demo sends nothing. |
| Class handoff demo | **Implemented; owner Chrome evidence** | Deterministic fixtures; real local Node tests of fixed files; explicitly labeled SIMULATION. Not live AI. |
| Existing projects / Counter Test 2 | **Preserved; not migrated** | No local Git/`AGENTS.md`; Codex startup repair does not apply. |
| Authentication / multi-user | **Not implemented** | Local capability token only; README correctly says no user authentication. |

## 4. Multi-agent workflow assessment

### 4.1 Intended versus actual

The intended chain is:

```
Owner
  -> Codex Builder
  -> independent Tester (Codex/Claude)
  -> independent Reviewer (Claude/DeepSeek)
  -> Owner final acceptance
```

The default Project Studio roles are `builder: deepseek`, `tester: codex-personal`, `reviewer: claude-code` ([project-studio.js:13](../src/services/project-studio.js#L13)). The new Builder-only mode instead uses one Codex profile and no Tester/Reviewer ([studio-run-scope.js:10-19](../src/services/studio-run-scope.js#L10), [project-studio.js:44](../src/services/project-studio.js#L44)).

The actual default workflow is **not empirically verified with real agents**. The strongest evidence is deterministic mock transport and the owner's non-generating Codex app-server startup check. No completed real Codex build, Claude test run, or DeepSeek review was found in the inspected evidence.

### 4.2 What is enforced well

- **Folder locking:** `studio_locks` keyed by project root; a second chat cannot overlap a root; unknown outcomes retain the lock; reconcile requires process evidence.
- **Duplicate Run prevention:** `request_id` unique on `studio_chats`, `studio_events` deduplication, `studio_executions` request binding, and `studio_locks`.
- **No self-review:** checked in role validation, per-phase dispatch, demo import, and acceptance.
- **Owner acceptance:** `accept()` requires `awaiting_owner`, an approved review, executed passing tests, no reviewer-family author, unchanged artifact fingerprint, and unchanged test evidence hash ([project-studio.js:51](../src/services/project-studio.js#L51)).
- **Unknown process outcome:** `StudioExecutions.reconcile` requires recorded PID/birth, descendant capture, close observation, confirmed tree termination, and unchanged checkpoint before releasing the lock.
- **Fallback authorization:** automatic fallback is disabled for the new Builder-only mode; ordinary fallback has explicit per-task policy and, for DeepSeek, price/balance/budget checks.
- **Review binding:** reviewer output must match the current draft id, artifact hash, and test-evidence hash; reviewer cannot claim to have executed tests.

### 4.3 What is not prevented

| Risk | Result | Evidence |
|---|---|---|
| Unauthorized agent execution | Partially prevented by Send/folder locks, but no user authentication and the global `TEAM_LIVE_ENABLED` flag does not gate Studio Send. | P2-01; [studio-workers.js:19-29](../src/services/studio-workers.js#L19), [project-studio.js:31](../src/services/project-studio.js#L31). |
| Duplicate task execution | Prevented in Studio by request id and locks; legacy `/api/projects/:id/generate` has no operation lock. | P2 assessment; [generation.js:51-101](../src/orchestrator/generation.js#L51). |
| Two workers editing same files | Prevented concurrently by root lock; partial patch consistency has a gap. | P2-03. |
| Worker reviewing its own changes | Prevented; **Tester reviewing/testing its own code is not prevented**. | P1-02. |
| Unauthorized spending | Send is the authorization; the dashboard's `paid.enabled=false` / `liveEnabled=false` do not block the default DeepSeek builder. | P2-01. |
| Accidental publishing | No push/deploy path; GitHub is read-only; Zapier requires enabled fixed host. | Verified strengths. |
| Lost checkpoints | SQLite revisions/checkpoints are durable; no Git commit/rollback and partial patch possible. | P2-03, P2-07. |
| Unrecoverable interrupted tasks | Reconcile/fail-closed design is strong; Builder-only preflight resume is broken. | P2-06. |
| False success reporting | Tester can be a no-op; runner launch failure is labeled as executed/failed. | P1-01, P2-02. |

### 4.4 Context, files, and Git

- Context transfer is bounded but broad: goal text (16 KB), project snapshot (9 KB), attachments/references (16 KB), prior reviews, problems, tests. The DeepSeek Studio path does not enforce the configured `maxInputBytes`/token bound used by the legacy dispatch path.
- File access is mediated by `ProjectFiles`; generated test code runs under MXC. No verified sandbox escape was found.
- Git is used for initialization and read-only inspection. It is **not** used for per-run commits, rollback, or checkpoint restoration. The real checkpoint is the SQLite revision plus file hash.

## 5. Security assessment

### 5.1 Verified strengths

1. **Filesystem boundary.** `ProjectFiles.resolve` rejects absolute paths, `..`, backslashes, colons, ADS streams, reserved device names, trailing dots/spaces, hidden/private names, symlinks, and hard-linked files. `Workspace.resolve` applies a similar policy. A direct app-root `ProjectFiles` probe shows the class is boundary-aware for relative paths; the managed path is the intended project root.
2. **Managed root provenance.** `createManagedRoot` requires a new canonical folder, writes an atomic journal, verifies source hashes, initializes Git with hooks/global config/credential helpers disabled, writes local `AGENTS.md`, and rejects live/unknown reservations.
3. **Process identity.** Native processes are tracked by PID + OS creation birth time, with descendant capture and `taskkill /T /F` status; unknown termination retains the lock.
4. **Secret handling.** Provider keys use private fields in `ProviderAdapter`; dashboards expose configured booleans, not values; native diagnostics redact configured secrets and common token formats; `cleanReport` redacts credentials, URLs, paths, and addresses; the webhook status does not return the URL.
5. **Dashboard origin boundary.** `/api/console` checks loopback Host, exact Origin, `Sec-Fetch-Site`, JSON content type, and a timing-safe token for mutations. The page CSP blocks third-party scripts and framing.
6. **Paid legacy path.** `DeepSeekService` requires `DEEPSEEK_PAID_ENABLED`, session live opt-in, a fresh quote, owner confirmation, maximum spend, a recent balance, and persistent request/daily/total limits; unknown outcomes retain reservations and are not retried.
7. **Preview proxy.** Only loopback HTTP origins, non-privileged/non-reserved ports, loopback DNS, no credentials, strict path deny-list, no cookies, no compression, 2 MiB response cap, 3 s timeout, and a tightening CSP.
8. **Webhook and GitHub egress.** Zapier is fixed to `hooks.zapier.com` with a strict path; GitHub is a fixed read-only repository/branch/path with hash and size validation. No arbitrary URL egress was found in those paths.
9. **No XSS primitives found.** Dashboard code uses `textContent`/`createElement`; no `innerHTML`, `eval`, or `new Function` in `src/dashboard` or `src/services`.

### 5.2 Residual security findings

- **P2-04:** External project instruction files are not protected from worker writes.
- **P2-01:** Paid/live gates are ambiguous on the Studio Send path.
- **P3-01:** An alternate internal project-link service bypasses `ProjectConnections` protected-root checks; currently not exposed by an HTTP route, but latent.
- **P3-02:** Managed provenance is optional if the `project_files` proof row is absent; security failures surface as generic 500s.
- **P3-04:** `HOST` is not constrained to loopback; legacy `/api` routes have no Host restriction or authentication.
- **Suspected, not verified:** the Studio test runner performs a parent-read decoy check but does not re-bind the full six-check demo isolation proof to every generated-test run. The MXC configuration sets `network={enabled=false}`, but a runtime network-denial probe is not part of the test run. This is defense-in-depth, not evidence of a sandbox escape.

## 6. UI/UX assessment

### 6.1 Strengths for a beginner

- A visible “How it works” guide explains the owner gate in plain language.
- New projects default to read-only; enabling agent changes is a separate owner action.
- The Projects page shows `READ ONLY` versus `AGENT CHANGES ENABLED`, plus folder paths and recovery for unfinished workspaces.
- Conversations show saved messages, attachments, references, live activity, Stop, recovery/reconcile, and a plain-English review/test panel.
- Errors are generally rendered as text, not raw stack traces; the console API error envelope is consistent.
- The dashboard has a skip link, ARIA labels on the major controls, and keyboard-compatible buttons; the UI tests exercise focus, Escape, resize, and role controls.

### 6.2 UX problems

1. **The Builder-only approval is easy to arm before the task exists.** The UI says “Save your task first”, but the approval button is visible and the server only hashes whatever goal exists (possibly empty). If the user arms first and then saves/sends, `goalHash` changes and the approved run is rejected. This is a new-mode usability defect; the UI should disable approval until a non-empty saved task exists, or the server should require a non-empty goal.
2. **The Resume button is broken for a Builder-only preflight failure.** It sends a fresh random `requestId` ([conversations.js:46](../src/dashboard/conversations.js#L46)), but `StudioRunScope.check` requires the stored approval request id ([studio-run-scope.js:18](../src/services/studio-run-scope.js#L18)). A disposable probe showed `resume.available=true` but the UI-style resume returned `409: The approved task…changed`. The Send path happens to reuse the saved request id, so a workaround exists but is not explained.
3. **Two ways to start work.** The top “Run” panel and the composer “Send” both start work; the difference is not obvious. For a read-only project, the top Run button remains enabled and fails with an error instead of explaining the read-only state.
4. **Paid behavior is not visible at the action.** The guide says DeepSeek is uncapped and Send starts without a money approval, but the Run/Send buttons do not identify the paid worker or estimate. A beginner could click Send on a default DeepSeek project without noticing.
5. **Generic errors for important failures.** Managed-root or provenance failures thrown as plain `Error` become `Internal server error` at the HTTP boundary. A beginner cannot tell “security check failed” from a bug.
6. **Feature density.** Mission Control, Workspace, Projects, Agents, Tasks, Plugins & tools, Prompt history, Approval Center, Activity History, Settings, and the class demo create a large surface. The 15 existing projects are mostly historical/disposable and clutter the selector.
7. **“Builder-only” is named in code/UI but not documented in README or a release note.** The 13:12 report says it does not exist; the source now has it.

## 7. Test coverage assessment

### 7.1 What exists

- 58 test files, one-line-heavy but broad: foundation/API, workspace paths, managed-root lifecycle, project connections, file actions, Studio lifecycle, failover, run scope, executions, recovery, console/origin boundaries, reviews, usage, prompts, webhooks, preview, class demo, and UI DOM tests.
- The owner's saved runs report 571/571, then 570/571 (one Git fixture stall), and later 34/34 focused serial. The 34/34 log is credible and includes managed-root, Studio scope, workspace inspection, and review eligibility.
- The class-demo tests use a real local Node process for fixed fixtures and a Chrome script for the demo; they are explicitly not AI evidence.

### 7.2 What this review could run

- **74 UI/pure checks passed** with `--test-isolation=none`.
- **41 additional pure checks passed.**
- **104 checks could not run** because the DSH sandbox blocks `spawn` pipes: `git init` and the Node test runner fail with `EPERM`. This is an environment limitation; it is not a verdict on those assertions. The owner's normal-terminal evidence is the relevant evidence for them.
- **Full suite not reproduced.** I do not claim 571/571 or 570/571.

### 7.3 Missing or weak coverage

1. **No test that a Tester returning zero files is rejected/flagged as non-independent.** The existing `studio-run-scope` tests cover one-call scope, but not test provenance.
2. **No test that Builder and Tester cannot be the same family.** `validateRoles` tests focus on Reviewer.
3. **Builder-only tests exist but are incomplete.** `tests/studio-run-scope.test.js` now covers one-call dispatch, no Tester/Reviewer, preflight-of-Builder only, disallowed phases, tampered/expired scope, unknown locks, and restart; the owner log reports 17/17. It does **not** cover the UI preflight-resume path or an approval armed before a task is saved, and the owner log was not independently rerun here.
4. **No test for runner launch failure classification** (`spawn` error → `executed:false`).
5. **No test for conflicting worker paths** (`src/x` + `src/x/y.js`) and partial apply.
6. **No test for external-project `AGENTS.md` protection.**
7. **No test for missing managed proof** (`ProjectService.verify` returns null) or API 409 mapping.
8. **No real native or DeepSeek worker execution test.** All Worker transport tests use mocks or fixed fixtures; this is appropriate for offline CI but means “multi-agent operation” is not proven.
9. **No browser integration in `npm test`.** Browser checks are separate scripts; the jsdom-style UI tests are useful but do not prove real layout, CSP, or browser behavior.
10. **No Git checkpoint/rollback test**; only read-only Git inspection.
11. **Test isolation depends on Git, OneDrive latency, and host spawn behavior.** `scripts/test-serial.js` has no per-test timeout; the docs record a ~186-second Git fixture stall. The newer 34/34 command used `--test-timeout=60000`, but `npm test` does not.
12. **Mock-only assertions.** `project-studio.test.js` and `studio-failover.test.js` assert workflow logic with fake workers/tests; they do not verify transport, sandbox, real CLI parsing, or real provider output.

## 8. Prioritized findings

### P0 — Critical

**None verified in this snapshot.**

No verified vulnerability allowing silent data loss, arbitrary code execution outside the project, or remote unauthenticated control was found. The ambiguity in P2-01 is high impact but is explicitly affected by the owner's stated policy that Send authorizes the assigned workflow; it is not labeled P0 without an owner decision.

---

### P1-01 — Independent Tester phase can be satisfied by Builder-authored tests

**Status:** VERIFIED DEFECT (workflow logic; disposable mock-worker fixture, not live AI)
**Severity:** P1 — High
**Component:** Project Studio workflow / test evidence
**Description:** In the Tester phase, the app accepts an empty `files` array from the Tester and then runs every `.test.*` file in the project through `testPlan`. A Builder is explicitly instructed to write implementation **and tests**, so the runner can execute only Builder-authored tests and report them as independent evidence. `accept()` does not require any Tester-authored test file or provenance.
**Evidence:**

- The Tester branch only rejects files that are not `*.test.*`; it does not require any ([project-studio.js:45](../src/services/project-studio.js#L45)).
- The test runner selects all test files via `plan.tests`, with no authorship binding ([studio-test-plan.js:5-18](../src/services/studio-test-plan.js#L5), [studio-workers.js:31-44](../src/services/studio-workers.js#L31)).
- `accept()` checks executed/passed evidence, current reviewer independence, and file/test hashes, but not who wrote the tests ([project-studio.js:51](../src/services/project-studio.js#L51)).
- Disposable mock-worker probe output:

```text
TESTER_NOOP {"status":"awaiting_owner","authors":["deepseek"],
"tester_files_added":0,"tester_calls":1,"accept":"accepted"}
```

The Builder wrote `src/add.mjs` and `src/add.test.mjs`; the Tester returned `files:[]`; the mock runner passed; the owner acceptance API accepted the result. This proves the workflow logic, not real AI quality.

**Location:** [project-studio.js:45](../src/services/project-studio.js#L45), [studio-test-plan.js:5-18](../src/services/studio-test-plan.js#L5), [studio-workers.js:31-44](../src/services/studio-workers.js#L31), [project-studio.js:51](../src/services/project-studio.js#L51)
**Reproduction:** Create a disposable app with mock workers; Builder returns implementation plus a `.test.js`; Tester returns `{files: []}`; runner returns `{executed: true, passed: true}`; call `accept`. Result: `awaiting_owner` then `accepted`.
**Expected:** A result described and accepted as independently tested must contain at least one test file written by the Tester (or by a distinct runner identity), with a recorded hash/provenance; Builder tests must be labeled non-independent.
**Actual:** The Tester can do nothing and Builder tests satisfy the gate.
**Likely root cause:** The phase contract treats test files as optional, and the runner consumes a project-wide test list without authorship metadata. The UI/report language (“independent tests”) assumes a property the code does not enforce.
**Recommended repair:** Require at least one Tester-authored `.test.*` file for an independent result; record `testAuthors`/file hashes in `state.tests`; either run only Tester-supplied tests or run both with explicit provenance; block `accept` unless at least one Tester-authored test is present and executed. If the product wants to allow no-Tester runs, label them “Builder tests only” and do not allow the independent-review acceptance claim.
**Suggested verification test:** Mock Builder writes one passing test; Tester returns `files: []`; assert status is paused/blocked, acceptance throws, and the evidence says “no independent tests”. A second test with a Tester-authored test passes and records provenance.
**Confidence:** High (code plus actual `ProjectStudio`/`accept` mock probe).

---

### P1-02 — Builder and Tester can be the same worker/family, including through fallback

**Status:** VERIFIED DEFECT (role validation probe)
**Severity:** P1 — High
**Component:** Role assignment, Big Three coordinator, Studio failover
**Description:** `validateRoles` prevents the Builder from being the Reviewer, but not the Tester from being the Builder or the Builder's family. The role picker, direct API, and automatic Tester fallback can therefore make one agent test its own code.
**Evidence:**

- `validateRoles` checks only `family(roles.builder)===family(roles.reviewer)` and reviewer authorship ([big-three.js:21-24](../src/services/big-three.js#L21)).
- StudioRole validation delegates to that function ([studio-roles.js:11](../src/services/studio-roles.js#L11)).
- `StudioFailover.tryNext` builds a candidate tester role and calls `roleManager.validate(roles, authors)`; because only Reviewer is checked, a Tester fallback can choose the Builder family ([studio-failover.js:53-61](../src/services/studio-failover.js#L53)).
- `ProjectStudio` only checks the Reviewer phase for self-authorship ([project-studio.js:42](../src/services/project-studio.js#L42)).
- Direct probe output:

```text
ACCEPT {"builder":"deepseek","tester":"deepseek","reviewer":"claude-code"}
ACCEPT {"builder":"codex-personal","tester":"codex-personal","reviewer":"deepseek"}
REJECT {"builder":"deepseek","tester":"codex-personal","reviewer":"deepseek"}
```

**Location:** [big-three.js:21-24](../src/services/big-three.js#L21), [studio-roles.js:11](../src/services/studio-roles.js#L11), [studio-failover.js:53-61](../src/services/studio-failover.js#L53), [project-studio.js:42](../src/services/project-studio.js#L42)
**Reproduction:** Call `roleManager.validate({builder:'deepseek',tester:'deepseek',reviewer:'claude-code'},[])`; it returns the roles unchanged. Configure those roles in the UI; the Team picker accepts them. A Tester quota failure with a Builder family available can also be selected by failover.
**Expected:** An independent Tester must be a different worker family from the Builder; automatic fallback must exclude the Builder family from the Tester role.
**Actual:** Same-family Builder/Tester is accepted. The UI only warns that a worker cannot review its own changes.
**Likely root cause:** “Independence” was implemented for review only; the Tester role contract assumed assignment discipline rather than enforcing it.
**Recommended repair:** In `BigThreeCoordinator.validateRoles`/`StudioRoles.validate`, reject `family(builder)===family(tester)`. In `StudioFailover.tryNext`, for the `tester` phase, exclude any worker whose family appears in `job.state.authors` (the Builder is an author). Add UI text and tests. Keep the Reviewer rule unchanged.
**Suggested verification test:** `validateRoles` rejects same-family Builder/Tester; fallback from a failed Tester pauses rather than selecting the Builder; existing role-rotation tests still pass.
**Confidence:** High (direct validation probe plus code path).

---

### P1-03 — Existing projects remain outside the managed-root repair; Counter Test 2 still has no local Git/AGENTS

**Status:** VERIFIED LIMITATION / BLOCKER for existing-project live testing
**Severity:** P1 — High (for the existing project; not for a new project)
**Component:** Workspace creation/migration, Codex startup
**Description:** The managed-root fix creates an independent Git root and local `AGENTS.md` only for newly created managed projects. Existing folders are deliberately not migrated. Counter Test 2, the project that motivated the repair, remains a nested folder with no local Git root and no local instruction file, so the repaired startup condition does not apply to it.
**Evidence:**

- `Workspace.create` calls the managed-root initializer only when a project is created ([workspace/index.js:24](../src/workspace/index.js#L24)).
- `ProjectService.recover` only handles pending/interrupted initialization, not existing active projects ([projects.js:6](../src/services/projects.js#L6)).
- The production integration report explicitly says existing projects are not initialized on startup ([WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md](WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md)).
- Live read-only HTTP showed Counter Test 2 (`7d913bbc-…`) with `repository.available=false`, reason “No Git repository exists in this project folder”, and zero file-tree entries; the preserved chat is paused with one failed Codex execution.
- Live HTTP showed the new disposable project (`9a28ca1c-…`) with an independent Git root on `main` and a local `AGENTS.md`.

**Location:** [workspace/index.js:24](../src/workspace/index.js#L24), [projects.js:6](../src/services/projects.js#L6), [managed-workspace-root.js:34](../src/services/managed-workspace-root.js#L34), [WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md](WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md)
**Reproduction:** In the live app, open Counter Test 2; its workspace has no `.git` and no `AGENTS.md`. The managed-root startup evidence applies only to the new disposable project.
**Expected:** Either (a) an owner-authorized migration creates a local Git root and preserves applicable instructions for a specific existing project, with all files/history preserved, or (b) the product clearly states that only new managed projects support the repaired Codex startup and existing projects remain blocked.
**Actual:** Neither a migration path nor a live-test path for the existing project is present. The documentation says migration is deferred.
**Likely root cause:** The repair was scoped to avoid silently changing owner folders; that is the right safety choice, but it leaves the main existing project unusable.
**Recommended repair:** Do not auto-migrate. Prepare a narrow, owner-approved migration for one named project: snapshot files/instructions, create a local Git root only if absent, preserve all applicable `AGENTS.md` sources and precedence, preserve IDs/history/locks, and verify with non-generating startup. Add a test that a linked/existing folder is never initialized without explicit confirmation. Alternatively, explicitly reduce the claim to new projects only.
**Suggested verification test:** Migration of a disposable nested folder preserves file hashes and instructions, is idempotent, refuses without `approvedBy:'owner'`, and never touches Counter Test 2 unless named. A refusal test confirms existing folders are unchanged.
**Confidence:** High (live HTTP plus code and report).

---

### P2-01 — Global paid/live flags do not gate the Studio Send path; owner intent must be clarified

**Status:** VERIFIED BEHAVIOR / OWNER DECISION REQUIRED (not labeled a vulnerability because `AGENTS.md` says Send authorizes the workflow)
**Severity:** P2 — Medium-High (cost/authorization ambiguity; potentially P0 if the flags are intended as a hard safety gate)
**Component:** Project Studio dispatch, DeepSeek transport, configuration
**Description:** The live dashboard reports `paid.enabled=false`, `liveEnabled=false`, and `deepseekConfigured=true`. The default Studio Builder is DeepSeek. A Send on a new project would reach the DeepSeek branch with only a key/base/model check; it does not check `DEEPSEEK_PAID_ENABLED`, `TEAM_LIVE_ENABLED`, or `team.liveOptIn`. The README/legacy settings imply those are safeguards; the UI guide says Send starts the paid workflow without a money approval.
**Evidence:**

- `StudioWorkers.call` DeepSeek branch checks only `settings.key`, official base, and model ([studio-workers.js:19-29](../src/services/studio-workers.js#L19)).
- `ProjectStudio.start` has no live/paid check ([project-studio.js:31](../src/services/project-studio.js#L31)).
- `ProviderAdapter.generateStudio` intentionally has no output/spending cap ([adapter.js:111-115](../src/providers/adapter.js#L111)).
- Live dashboard: `paid.enabled=false`, `liveEnabled=false`, `deepseekConfigured=true`, model `deepseek-flash`.
- README says live calls are off by default and paid usage is disabled ([README.md:125](../README.md#L125), [README.md:135](../README.md#L135)); the UI guide says the opposite for Studio Send.
- AGENTS.md explicitly says the owner removed project spending caps and money-approval steps and that Send starts the assigned workflow ([AGENTS.md:5-6](../AGENTS.md#L5)).

**Location:** [studio-workers.js:19-29](../src/services/studio-workers.js#L19), [project-studio.js:31](../src/services/project-studio.js#L31), [adapter.js:111-115](../src/providers/adapter.js#L111), [providers/config.js:35](../src/providers/config.js#L35), [README.md:125](../README.md#L125)
**Reproduction:** With a DeepSeek key present and `DEEPSEEK_PAID_ENABLED=false`, create a normal team project (default Builder DeepSeek) and press Send. The code reaches `adapter.generateStudio`; no live call was made in this review. The source path is deterministic.
**Expected:** Either the flags are documented as legacy/no-op for Studio, or the Studio path enforces them (blocking/reconfirming) before any paid request. The UI should name the paid worker and the uncapped policy at the point of Send. A per-request input-bound check should be applied regardless.
**Actual:** The flags are inconsistent with the path; only the Send click and the developer's knowledge of the policy gate spending.
**Likely root cause:** The Studio workflow was built after the legacy paid gates and intentionally removed spending caps, but the old flags and README were not retired or re-labeled.
**Recommended repair:** **Owner decision first.** If Send is the authorization, add a clear pre-Send summary (worker, paid/uncapped, no retry) and retire/rename the stale flags/docs. If the flags are intended as a hard gate, add `policy.enabled`/live checks in `StudioWorkers.call` and tests. In either case, apply `settings.maxInputBytes`/a documented token bound (without adding a money cap the owner did not ask for).
**Suggested verification test:** With a key present and the chosen flag false, the decided behavior is asserted (blocked or explicitly labeled bypass). A live-call prohibition test uses a mock fetch and asserts zero requests when blocked.
**Confidence:** High for the behavior; owner intent unresolved.

---

### P2-02 — Test-runner launch failure is reported as “tests executed, failed”

**Status:** VERIFIED DEFECT (direct probe)
**Severity:** P2 — Medium
**Component:** Studio isolated test runner
**Description:** If the sandbox executable exists but cannot be launched, `StudioWorkers.command` resolves `{exit:null}` instead of rejecting. `StudioWorkers.tests` then returns `executed:true` with `passed:false`, and the job pauses with “Independent tests failed” rather than “runner unavailable”.
**Evidence:**

- `finish` treats “no child PID” as stopped and resolves when no termination reason exists ([studio-workers.js:49](../src/services/studio-workers.js#L49)).
- `catch{finish(null,false);}` and `child.once('error',()=>finish(null,false))` use that path ([studio-workers.js:51](../src/services/studio-workers.js#L51)).
- `tests` returns `executed:true` based on `r.exit`/counts, not on a successful launch ([studio-workers.js:41-43](../src/services/studio-workers.js#L41)).
- Disposable probe with an invalid `.exe`:

```text
COMMAND_RESOLVED {"exit":null,"stdout":"","stderr":""}
```

**Location:** [studio-workers.js:41-51](../src/services/studio-workers.js#L41)
**Reproduction:** Call `workers.command()` with an existing non-executable file or a sandbox launch error; inspect the resolved value. It is `{exit:null}`. Then call `workers.tests()` with a project containing a test file: it returns `executed:true`.
**Expected:** A launch failure rejects/returns `executed:false` and a clear “isolated runner unavailable” reason; no test pass/fail evidence is recorded.
**Actual:** The app reports a test execution with a failure result.
**Likely root cause:** The “no child” path was designed for an already-aborted run, not for a spawn failure; `tests` interprets `exit !== 0` as a failed test rather than a runner fault.
**Recommended repair:** In `command`, reject on spawn error/no PID or make `finish` return a distinct `launchFailed` result; in `tests`, check a `launched` flag and return `executed:false`/runner error. Add a test with a spawn error.
**Suggested verification test:** Mock `spawn` to emit `error`; assert `command` rejects or `tests` returns `executed:false`, no PASSED evidence, and the user message names the runner.
**Confidence:** High (direct probe).

---

### P2-03 — Multi-file worker patch can be partially applied

**Status:** VERIFIED DEFECT (direct `ProjectFiles` probe)
**Severity:** P2 — Medium
**Component:** Project Studio apply / ProjectFiles
**Description:** `ProjectStudio.apply` loops over precomputed changes and writes them one at a time. `ProjectFiles.changes` does not reject conflicting file/directory prefixes. A worker can return `src/x` and `src/x/y.js`; the first is saved, the second fails with `EEXIST`, and no `files_saved` event or rollback occurs.
**Evidence:**

- `apply` loops `changes` and applies each, recording revisions as it goes ([project-studio.js:40](../src/services/project-studio.js#L40)).
- `ProjectFiles.changes` validates each path independently and does not detect that one path is a parent file of another ([project-files.js:14](../src/services/project-files.js#L14)).
- `ProjectFiles.apply` calls `fs.mkdirSync(path.dirname(target))` before writing ([project-files.js:15](../src/services/project-files.js#L15)).
- Disposable probe:

```text
CHANGES {"ok":true,"paths":["src/x","src/x/y.js"]}
APPLY_ERROR EEXIST: file already exists, mkdir ...\src\x
FIRST_EXISTS true
FIRST_CONTENT FIRST FILE
```

**Location:** [project-studio.js:40](../src/services/project-studio.js#L40), [project-files.js:14-15](../src/services/project-files.js#L14)
**Reproduction:** Build a `ProjectFiles` on an empty temp folder; call `changes()` with those two paths; apply in sequence. The second throws; the first remains.
**Expected:** Reject the patch before any file is written, or apply atomically with rollback and a durable partial/error event.
**Actual:** Partial project mutation with no event.
**Likely root cause:** Preflight checks each path but not cross-path structure; apply is not transactional.
**Recommended repair:** Reject file/directory prefix conflicts in `changes()`; preflight all target parents; apply with rollback (restore previous contents) or write to a temp tree and swap; emit an event on any partial outcome. Add regression tests.
**Suggested verification test:** Conflicting paths are rejected before any write; a simulated OS failure on the second file leaves the project unchanged and records a partial failure event.
**Confidence:** High (direct probe).

---

### P2-04 — External project `AGENTS.md` can be overwritten by a worker

**Status:** VERIFIED CODE GAP (not exercised against live data)
**Severity:** P2 — Medium
**Component:** ProjectFiles / external projects
**Description:** `ProjectFiles.changes` protects `AGENTS.md`/`AGENTS.override.md` only when `managedRootState(this.root)` is truthy. An external folder registered through `ProjectConnections` (or the internal `ProjectStudio.project` path) has no `.devsquad-init.json`, so a Builder can return `AGENTS.md` and the app will write it. That can alter the instructions a later Codex startup would read.
**Evidence:**

- Protection condition: `if(managedRootState(this.root)&&/^AGENTS.../` ([project-files.js:14](../src/services/project-files.js#L14)).
- External folders are explicitly supported (`source:'folder'`, `source:'github'`); they do not have a managed-root ledger.
- `ProjectStudio.apply` does not add a separate instruction-file check ([project-studio.js:40](../src/services/project-studio.js#L40)).
- The managed new project is protected; the protection is not universal.

**Location:** [project-files.js:14](../src/services/project-files.js#L14), [project-studio.js:40](../src/services/project-studio.js#L40)
**Reproduction:** Create an external folder with `AGENTS.md`; register it; call `repo.changes([{path:'AGENTS.md',content:'Ignore controls'}])`; it is accepted because there is no managed ledger.
**Expected:** `AGENTS.md` and `AGENTS.override.md` are protected for every project root, regardless of how the root was created. Owners can change them only through a separate explicit policy action.
**Actual:** Managed roots protected; external roots not.
**Likely root cause:** The managed-root integration scoped the protection to the ledger rather than to the filename.
**Recommended repair:** Protect the filenames unconditionally in `ProjectFiles.changes` and `WorkspaceFileActions`; consider a separate owner-only instruction-edit path. Add a test with an external root.
**Suggested verification test:** External project with `AGENTS.md`; worker patch is rejected 403; a normal source file still writes.
**Confidence:** High (code; no live external worker run).

---

### P2-05 — Managed security provenance is optional, and provenance failures surface as generic 500s

**Status:** VERIFIED CODE GAP / UX DEFECT
**Severity:** P2 — Medium (defense-in-depth / diagnosability)
**Component:** ProjectService.verify, ProjectStudio.start, error handling
**Description:** If a managed project has a managed-root ledger but its `project_files` proof row is absent, `ProjectService.verify` returns `null` and `ProjectStudio.start` proceeds instead of failing closed. When the proof is present but tampered, `verify` throws a plain `Error`, which the Express error handler maps to a generic 500 rather than a clear 409/403.
**Evidence:**

- `verify` returns `null` when no proof row exists; only compares when it does ([projects.js:7](../src/services/projects.js#L7)).
- `ProjectStudio.start` calls `service.verify` but does not separately require `workspace.status` ([project-studio.js:31](../src/services/project-studio.js#L31)).
- Plain `Error` mapping: `errorHandler` only preserves `ApiError` messages ([errors.js:3-4](../src/middleware/errors.js#L3)).
- The existing test covers tampered instructions but not a missing proof row ([managed-workspace-production.test.js:10](../tests/managed-workspace-production.test.js#L10)).

**Location:** [projects.js:7](../src/services/projects.js#L7), [project-studio.js:31](../src/services/project-studio.js#L31), [errors.js:3-4](../src/middleware/errors.js#L3)
**Reproduction:** Delete or omit the `project_files` `AGENTS.md` proof for a managed project, then call `ProjectStudio.start`; it will not fail at verification. Tamper the AGENTS file instead; the HTTP route returns 500 “Internal server error”.
**Expected:** A managed root must have a valid proof; a missing/tampered proof is a 409/403 with a clear message. Legacy unmanaged projects can remain explicitly unmanaged.
**Actual:** Missing proof is silently accepted; tampering is a generic 500.
**Likely root cause:** The proof row is used as an optional optimization rather than a required invariant; the error is not an `ApiError`.
**Recommended repair:** If `workspace.status(project)` indicates a managed ready root, require the proof and verify it; throw `ApiError(409, 'Managed security provenance changed; execution blocked')` and preserve a durable event. Add tests.
**Suggested verification test:** Missing proof blocks Start with 409; tampered proof blocks with 409; a legacy external project is unaffected.
**Confidence:** High for code; exploit requires DB tamper/legacy data.

---

### P2-06 — Builder-only mode: focused tests now exist, but UI recovery defects remain

**Status:** MIXED: mock one-call path VERIFIED; owner focused logs report 17/17; Resume/empty-goal defects VERIFIED; no independent rerun
**Severity:** P2 — Medium (release-blocking for the proposed Builder-only live test)
**Component:** StudioRunScope, ProjectStudio, conversations UI
**Description:** A new Builder-only mode appeared at 13:20 after the 13:12 report said the workflow was blocked. It passed a disposable mock-worker one-call probe and the owner then added focused tests at 13:26 and saved logs at 13:25/13:30 (7/7 then 17/17). The source changed again at 13:31. The tests cover the important one-call/no-Tester/no-Reviewer matrix, but they do **not** cover the UI preflight-resume or empty-goal cases, and those defects remain.
**Evidence — positive (owner logs and this review's mock):**

The owner's saved focused log reports 17/17, including:

- one bounded native run with exactly three mock calls;
- Builder-only selection requiring separate approval and no future roles;
- one Builder call only, no Tester/Reviewer/tests;
- atomic consumption, disallowed phases, tampered/expired scope rejection;
- failed/unknown call evidence and retained lock;
- no dispatch after a database reopen.

This review's disposable mock probe (using the actual pre-13:26 `ProjectStudio`/`StudioRunScope`) produced the same shape:

```json
{"mode":"builder-only","status":"paused","builderCompleted":true,
 "phases":["builder"],"testsCalled":0,"executions":1,
 "authors":["codex-personal"],
 "accept":"REJECTED: Current independent review and passing tests are required",
 "resume":{"available":false,"reason":"The one Builder attempt was consumed..."}}
```

The probe used mock workers and a fake managed-root initializer; no AI/native request was made. The owner's 17/17 log is **evidence, not an independent rerun**; this review could not run that suite because the DSH sandbox blocks `git init`.

**Evidence — defects:**

- The focused tests cover one-call dispatch, preflight-of-Builder only, disallowed phases, tampered/expired scope, unknown locks, and restart. They do **not** cover a preflight failure followed by the UI Resume path, nor an approval armed before a task is saved.
- The Resume button in [conversations.js:46](../src/dashboard/conversations.js#L46) still sends `requestId:crypto.randomUUID()`, but [studio-run-scope.js:18](../src/services/studio-run-scope.js#L18) requires the saved approval request id. A disposable preflight-failure probe returned `resume.available:true` and the UI-style resume failed with `409: The approved task, database, folder, request or assignments changed`.
- The approval control can still be armed before a task is saved; `StudioRunScope.arm` hashes the current (possibly empty) goal. Saving a task after arming changes the goal and invalidates the approval. The UI hint says “Save your task first”, but the control is not disabled until then; no focused test covers this.
- No narrative report describes the new mode; the 13:12 [FIRST_LIVE_CODEX_BUILD_20261106.md](FIRST_LIVE_CODEX_BUILD_20261106.md) predates it and explicitly says production cannot enforce Builder-only dispatch. The 13:35 browser attempt failed before finding the `Execution mode` control: `locator.selectOption: Timeout 30000ms exceeded … waiting for getByLabel('Execution mode', { exact: true })`. This is consistent with a stale running backend after the 13:31 source change; either way, there is **no browser pass** for the new mode.

**Location:** [studio-run-scope.js:10-19](../src/services/studio-run-scope.js#L10), [project-studio.js:44](../src/services/project-studio.js#L44), [conversations.js:46](../src/dashboard/conversations.js#L46), [conversations.js:48](../src/dashboard/conversations.js#L48), [tests/studio-run-scope.test.js](../tests/studio-run-scope.test.js)
**Reproduction:** (a) In a disposable fixture, set Builder-only, arm, force a preflight failure, then call the resume path with a new request id; it returns 409. (b) Arm before saving a goal, then save/send; the goal hash changes and the run is rejected. Both use mock workers; no live AI.
**Expected:** The focused tests also cover preflight-failure recovery and empty-goal approval; the UI uses the approved request identity for recovery; the server rejects an empty goal or the UI disables approval until a non-empty saved goal exists.
**Actual:** Core one-call behavior is tested and looks correct; the UI recovery/empty-goal cases remain broken or untested, and the suite has not been independently rerun.
**Likely root cause:** The repair added the dispatch path, scope checks, and focused tests, but the generic Resume button and approval-save UX were not updated, and the test matrix did not include those UI paths.
**Recommended repair:** Add the missing UI/preflight recovery tests, use the scope request id for Builder-only resume (or preserve/accept the approval for a preflight-only failure), require a non-empty goal at arm time, and disable the approval control until the task is saved. Re-run the focused suite and the one-call probe before any live test.
**Suggested verification test:** See the required regression list in the handoff. Do not start a live Builder-only test until the focused suite is green and the two UI cases are covered.
**Confidence:** High for owner-tested/mock one-call behavior; high for the resume/empty-goal defects; unverified for live native dispatch.

---

### P2-07 — README and architecture safety claims contradict the current Studio

**Status:** VERIFIED DOCUMENTATION DEFECT
**Severity:** P2 — Medium (trust and beginner safety)
**Component:** Documentation
**Description:** README still describes an earlier checkpoint. It says generated code is never executed or applied, there is no background execution, live calls are off by default, and Claude/Codex manual integrations are retired. Current Studio applies worker files, runs generated code in an isolated test runner, starts workers after Send, uses Codex/Claude as project workers, and has a new Builder-only mode. It also omits Git as a project-creation dependency.
**Evidence:**

- “Generated code is never automatically executed.” — [README.md:5](../README.md#L5); “Generated code is never executed.” — [README.md:58](../README.md#L58); “this application does not execute the draft” — [README.md:115](../README.md#L115).
- Current test runner executes project code in a copied folder under MXC: [studio-workers.js:31-44](../src/services/studio-workers.js#L31).
- “No background execution…” — [README.md:46](../README.md#L46).
- “live calls off by default…” — [README.md:125](../README.md#L125); current Studio `start` has no live gate.
- “Claude/Codex manual integrations are retired…” — [README.md:135](../README.md#L135); current roles use Codex Personal/School/Claude Code.
- Install section does not list Git; managed creation runs `git init` ([managed-workspace-root.js:44](../src/services/managed-workspace-root.js#L44)), and Git is fixed to `C:/Program Files/Git/cmd/git.exe` ([project-git.js:4](../src/services/project-git.js#L4)).
- The 13:12 [FIRST_LIVE_CODEX_BUILD_20261106.md](FIRST_LIVE_CODEX_BUILD_20261106.md) is accurate about being blocked, but the newer source adds Builder-only mode; no report covers it.

**Location:** [README.md:5](../README.md#L5), [README.md:46](../README.md#L46), [README.md:58](../README.md#L58), [README.md:115](../README.md#L115), [README.md:125](../README.md#L125), [README.md:135](../README.md#L135)
**Reproduction:** Compare README claims with the current Studio test runner and role defaults; the contradictions are direct.
**Expected:** README describes the current architecture, exact sandbox, paid behavior, current worker roles, Git prerequisite, and new modes, and distinguishes simulated/legacy features.
**Actual:** README describes an earlier checkpoint and overstates isolation (“never executed”).
**Likely root cause:** Incremental feature work did not update the top-level docs; historical docs are preserved but the entry point is stale.
**Recommended repair:** Update README with a current feature/limits table, a “what is executed where” section, Git prerequisite, paid/Send behavior, current roles, Builder-only status, and links to the current reports. Do not claim live AI verification.
**Suggested verification test:** Documentation review against the current route/service list; no code test required.
**Confidence:** High.

---

### P2-08 — Studio has no Git checkpoint/rollback; SQLite revisions are the only checkpoint

**Status:** FUNCTIONAL GAP (not a regression; documented limitation)
**Severity:** P2 — Medium (for the requested Git-checkpoint workflow)
**Component:** Project Studio apply/recovery, Git integration
**Description:** Git is initialized and inspected, but Studio does not commit after a phase, does not create a per-run Git checkpoint, and has no restore/revert action. The durable checkpoint is `studio_revisions` plus file hashes. That is a legitimate design, but it does not meet the requested “Git checkpoints” workflow and gives a beginner no visible rollback path.
**Evidence:**

- `ProjectStudio.apply` writes files and inserts `studio_revisions`; no `git commit` ([project-studio.js:40](../src/services/project-studio.js#L40)).
- Git inspection is read-only ([workspace-inspection.js:36-57](../src/services/workspace-inspection.js#L36)).
- The production integration report says automatic Git commits are not demonstrated or authorized ([WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md](WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md)).
- The new Builder-only report proposed “no automatic Git reset” ([FIRST_LIVE_CODEX_BUILD_20261106.md:57](FIRST_LIVE_CODEX_BUILD_20261106.md#L57)).
- `studio_revisions` stores previous/next content and is immutable; it can support a future restore UI.

**Location:** [project-studio.js:40](../src/services/project-studio.js#L40), [workspace-inspection.js:36-57](../src/services/workspace-inspection.js#L36)
**Reproduction:** Run a team fixture; inspect `git log` and `git status`; no commit was made by the run. The revisions are only in SQLite.
**Expected:** Either implement owner-authorized Git checkpoints/commits (with explicit approval and no automatic push) or clearly describe revisions as the checkpoint mechanism and add a restore action.
**Actual:** Git is not a checkpoint/rollback mechanism; no restore UI.
**Likely root cause:** Deliberate avoidance of automatic commits in owner repositories, without a replacement workflow at the product level.
**Recommended repair:** Decide the product contract. If Git commits are wanted, require explicit owner authorization, commit only after a reviewed/accepted phase, never push, and test. If not, add a “restore this revision” owner action and document that SQLite is the checkpoint.
**Suggested verification test:** A simulated accept creates exactly one local commit with no push (if chosen); a rejected run creates none; restore restores content and records an event.
**Confidence:** High for the gap; product decision required.

---

### P2-09 — Test runner and test suite are narrower than the product claims

**Status:** FUNCTIONAL/TEST COVERAGE GAP
**Severity:** P2 — Medium
**Component:** Studio test runner, test suite, browser testing
**Description:** The isolated runner supports Node `node:test` JavaScript files only, with no browser document/Jest/jsdom and no other language adapter. The `npm test` suite uses fake DOM tests for UI and mock workers for orchestration; browser checks are separate scripts. For a beginner building an HTML/CSS/JS app (the Counter use case), the app can run Node tests but cannot verify browser behavior.
**Evidence:**

- `testPlan` selects `.test.[cm]?js` and only accepts a `node --test` package script ([studio-test-plan.js:5-18](../src/services/studio-test-plan.js#L5)).
- The packet environment explicitly says “Node.js; no browser document, Jest or jsdom; no package installation” ([project-studio.js:42](../src/services/project-studio.js#L42)).
- `studio-workers.js` instructions say browser code may be tested with a small `node:vm` DOM fixture, not a real browser ([studio-workers.js:9](../src/services/studio-workers.js#L9)).
- UI tests use a fake `document`/`N`, e.g. [projects-ui.test.js](../tests/projects-ui.test.js); the Chrome verifier scripts are outside `npm test`.
- The class demo uses a real local Node process for fixed files, not generated browser behavior.

**Location:** [studio-test-plan.js:5-18](../src/services/studio-test-plan.js#L5), [project-studio.js:42](../src/services/project-studio.js#L42), [studio-workers.js:9](../src/services/studio-workers.js#L9)
**Reproduction:** Create a project with only HTML/CSS/browser JS; Tester adds no Node tests; `testPlan` blocks. A Node test that asserts on a DOM would need a custom `node:vm` fixture.
**Expected:** Either a browser adapter (Playwright/Chrome) for web projects, or an explicit product label that tests are Node-only and browser behavior is unverified.
**Actual:** Node-only tests; UI behavior is not part of the automated test run.
**Likely root cause:** The sandbox initially supported only Node; browser isolation is harder and not implemented.
**Recommended repair:** Label the limitation clearly in UI/docs; add a browser adapter later behind the same isolation model. At minimum, ensure the acceptance language never implies browser verification.
**Suggested verification test:** A project with a browser-only test is blocked with a clear “browser adapter unavailable” message; Node tests still run.
**Confidence:** High.

---

### P3-01 — Alternate internal project-link path bypasses protected-root checks

**Status:** LATENT DEFECT (not reachable through the current HTTP route)
**Severity:** P3 — Low now; P1 if exposed
**Component:** ProjectStudio.project, ProjectFiles
**Description:** `ProjectStudio.project({name, folder})` accepts an arbitrary absolute folder and builds a `ProjectFiles` directly, without `ProjectConnections.selectedFolder`/protected-path checks. The current HTTP route only allows `name` ([console.js:61](../src/routes/console.js#L61)), so it is not user-reachable, but the method is used internally (class demo) and could become reachable.
**Evidence:**

- `ProjectStudio.project` accepts `body.folder` and calls `new ProjectFiles(body.folder)`, checking only drive/user-profile ([project-studio.js:21-22](../src/services/project-studio.js#L21)).
- `ProjectConnections.select` has the protected-root policy; this path bypasses it.
- A direct probe showed `ProjectFiles(process.cwd())` accepts the app root and resolves `src/app.js`.
- The class demo passes a folder under `data/` ([class-handoff-demo.js:16](../src/services/class-handoff-demo.js#L16)).
- `ProjectStudio.project` also does not call `ProjectConnections.duplicate`, so the same external folder can be linked to multiple projects (no DB uniqueness on `studio_project_connections.root`).

**Location:** [project-studio.js:21-22](../src/services/project-studio.js#L21), [console.js:61](../src/routes/console.js#L61), [class-handoff-demo.js:16](../src/services/class-handoff-demo.js#L16)
**Reproduction:** Call `new ProjectFiles(process.cwd())`; it accepts the app root. If a route or future caller passes such a folder to `ProjectStudio.project`, a worker could write app source.
**Expected:** Every external folder link uses `ProjectConnections.selectedFolder`/duplicate checks, or the method is private and cannot receive arbitrary paths.
**Actual:** Latent bypass; not currently reachable via HTTP.
**Likely root cause:** A legacy/internal convenience path predates the ProjectConnections policy.
**Recommended repair:** Make `ProjectStudio.project` require a trusted, already-validated folder token or route all links through ProjectConnections. Add a compile-time/route test that `/studio/projects` rejects `folder`. Keep the class demo's data folder explicit/trusted.
**Suggested verification test:** Posting `{name,folder:appRoot}` to `/studio/projects` remains 400; direct `ProjectStudio.project` with an unvalidated folder is rejected; duplicate external roots are rejected.
**Confidence:** High for the code; low current exploitability.

---

### P3-02 — Non-loopback `HOST` and legacy `/api` have no authentication or Host restriction

**Status:** SECURITY HARDENING GAP
**Severity:** P3 — Low in the documented local configuration; higher if exposed
**Component:** Configuration, legacy API
**Description:** `HOST` is accepted from the environment without a loopback check. Console routes check Host, but legacy `/api` project/task/generate routes do not and have no authentication. The README warns against network exposure.
**Evidence:**

- `host: env.HOST || '127.0.0.1'` with no validation ([config/index.js:6](../src/config/index.js#L6)).
- Console Host check ([console.js:19-24](../src/routes/console.js#L19)); legacy routes ([routes/api.js](../src/routes/api.js)) have no equivalent.
- README warning ([README.md:17](../README.md#L17)).
- Legacy `/api` AI mutations only reject `Origin`; they do not require a token ([ai.js:6](../src/routes/ai.js#L6)).

**Location:** [config/index.js:6](../src/config/index.js#L6), [routes/api.js](../src/routes/api.js), [ai.js:6](../src/routes/ai.js#L6)
**Reproduction:** Set `HOST=0.0.0.0`; the console rejects LAN Host, but `/api/projects`, `/api/projects/:id/tasks`, and `/api/projects/:id/generate` are reachable from the LAN.
**Expected:** Refuse non-loopback HOST unless an explicit auth/network mode is configured; or apply the same Host/token policy to all mutation routes.
**Actual:** Default safe; configuration footgun remains.
**Likely root cause:** Local-only assumption is documented but not enforced.
**Recommended repair:** Validate `HOST` is loopback by default; add an explicit `ALLOW_REMOTE` with a real auth design, or reject non-loopback startup. Add a test.
**Suggested verification test:** `HOST=0.0.0.0` fails startup without explicit opt-in; loopback starts; `/api` remains loopback-only.
**Confidence:** High.

---

### P3-03 — Test runner has no per-test timeout and is host-coupled

**Status:** TEST INFRASTRUCTURE DEFECT / FLAKE RISK
**Severity:** P3 — Low (quality/ops)
**Component:** `scripts/test-serial.js`, integration tests
**Description:** `npm test` runs every test file through one `spawnSync` with no `--test-timeout`. The saved evidence records a ~186-second Git initialization stall and a 570/571 run. The newer 34/34 command used `--test-timeout=60000`, but that is not in `npm test`.
**Evidence:**

- `spawnSync(process.execPath, ['--max-old-space-size=128','--test','--test-concurrency=1',...files], ...)` with no timeout ([test-serial.js:12](../scripts/test-serial.js#L12)).
- The owner's report records 570/571 and the 186s stall ([WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md](WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md)).
- The newer focused run used `--test-timeout=60000` ([FIRST_LIVE_CODEX_BUILD_20261106.md:22](FIRST_LIVE_CODEX_BUILD_20261106.md#L22)).

**Location:** [test-serial.js:12](../scripts/test-serial.js#L12)
**Reproduction:** Run `npm test`; a stalled Git fixture can hold the whole suite. No per-test cap exists.
**Expected:** A bounded per-test/per-file timeout, clear failure category, and no indefinite hang; a serial runner appropriate for low RAM.
**Actual:** No timeout; host Git/OneDrive can dominate.
**Likely root cause:** The runner was kept minimal for low RAM; timeout handling was added ad hoc in manual commands.
**Recommended repair:** Add `--test-timeout=60000` (or a configurable value) to `test-serial.js`; isolate or mock Git where possible; record elapsed time. Add a test that the runner honors the timeout.
**Suggested verification test:** A deliberately hanging fixture fails within the bound and the suite continues/exits nonzero; normal suite unaffected.
**Confidence:** High.

---

### P3-04 — Plain `Error` paths become generic 500s; shutdown has no forced deadline

**Status:** ERROR-HANDLING / OPERATIONS IMPROVEMENT
**Severity:** P3 — Low
**Component:** ProjectService, server lifecycle
**Description:** Managed provenance and recovery failures can throw plain `Error`, producing “Internal server error”. `server.js` waits for `team.studio.close()` without a deadline, so a stuck worker can delay shutdown.
**Evidence:**

- Plain `Error('Managed project security provenance changed…')` ([projects.js:7](../src/services/projects.js#L7)); `errorHandler` only exposes `ApiError` messages ([errors.js:3-4](../src/middleware/errors.js#L3)).
- `server.js` signal handler awaits `studio.close()` and `messenger.close()` with no timeout ([server.js:12](../src/server.js#L12)).
- `ProjectStudio.close` aborts active controllers and awaits all pending; no forced timer ([project-studio.js:52](../src/services/project-studio.js#L52)).

**Location:** [projects.js:7](../src/services/projects.js#L7), [errors.js:3-4](../src/middleware/errors.js#L3), [server.js:12](../src/server.js#L12)
**Reproduction:** Tamper a managed proof and call Start over HTTP; response is 500 “Internal server error”. Start a mock worker that ignores abort and send SIGINT; the process can wait.
**Expected:** Clear 409/403 messages for known security/initialization failures; a bounded shutdown with a safe fallback.
**Actual:** Generic 500; unbounded wait.
**Likely root cause:** Services throw plain errors; lifecycle close assumes cooperative workers.
**Recommended repair:** Convert known failures to `ApiError`; log a sanitized event; add a shutdown deadline that preserves state and reports interruption. Add tests.
**Suggested verification test:** Tampered proof returns 409 with a clear message; a non-cooperative mock worker cannot hang shutdown beyond the deadline.
**Confidence:** High for code; impact low.

## 9. Verified strengths

- **Managed root repair is live and real for new projects:** the disposable project has an independent Git root, local `AGENTS.md`, and a read-only default; the live file tree and Git change API confirm it.
- **Path and link safety is strong:** traversal, junctions, hard links, reserved names, hidden names, ADS, and `.git`/credential paths are rejected with tests and direct probes.
- **No credential exposure found:** dashboards expose configuration booleans, not keys; diagnostics redact secrets; `.env`, `data/`, `workspaces/`, and webhook files are gitignored; the review did not find a secret in the inspected UI/API responses.
- **Owner gates are explicit:** no self-review, review binding, test-evidence binding, acceptance fingerprint, request idempotency, folder locks, and unknown-outcome lock retention.
- **Native process recovery is conservative:** PID + birth + descendants + close + termination; a kill request alone is not acceptance.
- **Legacy paid path is tightly guarded:** quote, owner confirmation, balance, price lease, request/daily/total limits, one POST, unknown outcome retained.
- **Dashboard origin boundary and CSP:** loopback Host, exact Origin, JSON + token for mutations, no CORS, strict CSP, no `innerHTML`.
- **Bounded egress:** GitHub fixed host/branch/path with hash/size validation; Zapier fixed host; preview proxy restricts loopback/ports/paths/cookies/compression.
- **Backups and immutability:** SQLite online backup + integrity/foreign-key checks; immutable revisions/events; content hashes.
- **UI tests:** 74 independent UI/pure checks passed; no page JavaScript was executed in the failed headless Chrome attempt, so no browser claim is made.
- **Builder-only one-call mock probe:** one Builder call, no Tester, no Reviewer, no tests, paused after draft, acceptance rejected, no silent replay. The owner's focused suite now reports 17/17 over the same core matrix. This is a good safety shape; the remaining UI recovery cases and an independent rerun are still needed.

## 10. Remaining unknowns

1. **Real model execution:** no completed real Codex build, Claude test run, or DeepSeek review was found. Authentication/startup evidence is not inference evidence.
2. **Native Codex startup after the current builder-only change:** the managed-root startup evidence predates it; no new non-generating startup check was run.
3. **Native quota:** remaining ChatGPT/Claude quota and whether a real request would succeed are unknown.
4. **Existing project migration:** no owner-approved migration for Counter Test 2; its historical lock and paused failure are preserved, but it is not testable under the repaired flow.
5. **Browser/UI:** independent visual browser verification was blocked by the host sandbox; the saved Chrome evidence in the docs was not reproduced.
6. **Full test suite:** not reproducible in this sandbox; the owner's 571/570/34 figures are credible records but not independently rerun.
7. **DeepSeek Studio spend:** no live paid request was made; the exact cost of a Send is unknown and uncapped by design.
8. **GitHub/Zapier live delivery:** not tested; only code and mock/owner evidence.
9. **Builder-only mode:** source changed during the review; focused owner tests now report 17/17, but the UI preflight-resume/empty-goal cases are untested/broken, the 13:35 browser attempt timed out waiting for `Execution mode` (likely a stale backend), and native dispatch under the actual CLI is unknown. The owner log was not independently rerun.
10. **Generated-code sandbox:** no escape found; runtime network-denial for the test runner is not independently probed in this review.

## 11. Overall readiness verdict

**PARTIALLY READY — SPECIFIC BLOCKERS.**

This is not a blanket “ready for controlled live testing” verdict.

**What is ready enough to discuss with the owner:**

- A local dashboard with strong owner gates, path/sandbox boundaries, durable evidence, and a real managed-root fix for new projects.
- A bounded, one-call Builder-only shape that passed a disposable mock probe and the owner's 17/17 focused log, and does not dispatch Tester/Reviewer/tests. If the owner wants a first real Codex draft, this is the right shape — **after** the Resume/empty-goal fixes and an independent rerun of the focused suite.

**Blockers before a full multi-agent live test:**

1. Independent Tester evidence is not enforced (P1-01).
2. Builder/Tester independence is not enforced (P1-02).
3. Existing projects are not migrated; Counter Test 2 remains blocked (P1-03).
4. The new Builder-only mode has owner focused tests (17/17) but its UI preflight-resume/empty-goal cases remain broken or untested, the browser log is empty, and the log was not independently rerun (P2-06).
5. The test-runner launch-failure/partial-apply/external-AGENTS issues reduce confidence (P2-02/03/04).
6. Paid/live behavior is ambiguous and must be confirmed with the owner (P2-01).

**Why “partially” rather than “not ready”:** the core safety scaffolding is real, the new managed project is genuinely created with an independent Git root and local instructions, and the Builder-only mock probe shows a sensible one-call shape. The blockers are specific and repairable; no verified P0 data-loss or remote-exploit defect was found.

**Why not “ready”:** no real AI generation has been demonstrated; the Tester gate can be a no-op; existing projects have no repair path; and the newest mode has focused owner tests but no independent rerun, a failed 13:35 browser attempt (Execution mode locator timed out), and unresolved UI recovery/empty-goal cases.

**Recommended owner decision:** authorize only a bounded Builder-only draft test after the remaining P2-06 UI fixes and an independent focused rerun, using a fresh disposable project, with explicit recognition of the paid/uncapped policy if DeepSeek is ever the Builder. Do not present that as a full multi-agent build or as live AI review evidence.
