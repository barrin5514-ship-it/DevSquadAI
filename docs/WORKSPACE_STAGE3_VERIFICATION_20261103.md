# Stage 3 — files, diffs, reviews and agents

November 3, 2026. Branch: `feature/workspace-ui-redesign`.
Primary reference: owner's Client Portal Workspace image.

## Implemented and reused

- Real folder/file explorer uses the existing pinned ProjectFiles boundary. Hidden/private files,
  path traversal, symbolic/hard links and unsupported/binary content cannot expose outside files.
- Read-only Git inspection uses a fixed executable, credential-free environment, no index refresh,
  no prompts or filesystem monitor. Only the selected folder's own ordinary Git repository is inspected.
  Repositories with custom filters, included configuration or external object stores are explicitly
  not inspected; hooks/monitors are disabled. No remote lookup, fetch, provider request, checkout or main-project commit.
- Six compact development tabs show actual task phases, saved work, concerns, revision contents,
  local Git changes, comparisons, independent findings, recorded tests, agents and project context.
- Saved revisions are read by actual session/revision IDs and checked against their content hashes.
  Git views compare the current file with actual HEAD contents. Deleted and new files have a missing side.
- Code highlighting uses text nodes rather than HTML. Local plain-English outlines appear above code;
  these outlines do not claim correctness or test execution.
- Assigned worker status comes from session records, with model/provider where recorded. Setup,
  historical successful hellos and current access verification are explicitly distinguished.
- The actual stored agent registry is available separately, labeled as including historical/parked entries.
- Existing chat/session persistence, revision history, folder locks, no-self-review and acceptance checks reused.

## Owner amendment — chat feedback instead of review decision buttons

The Review panel contains findings, evidence and **Review Changes**. It no longer creates Approve,
Reject, Request Changes or Accept completed work buttons. No decision POST is made by this panel. It lists files with saved revisions; unchanged snapshots are
correctly distinguished from modified files.

For a source with a real completed review, a chat message creates a new linked Builder task in the
same project. The source review, task status, revisions and events remain unchanged. The next task
inherits the assigned roles and receives the owner feedback, current project files and bounded prior
review/requirements/test context. Context omission is flagged if its size limit is reached.

Send saves that feedback and dispatches the existing runner once. Save message prepares it locally
without dispatch. A duplicate submission returns the same next task; changed content with the same
submission ID is rejected. Empty Send cannot rerun a reviewed task. Active/stopping sessions remain
protected. The prior task is never silently accepted or reopened.

Existing final acceptance outside this panel remains a separate owner action with its server-side
checks. No owner acceptance was performed during browser verification.

Supported backup taken before this amendment:
`backups/backup-1793766266486-f27a0a9e-83ea-4c1d-9be8-2675343d7208.sqlite`.
No migration or new table; relationships/provenance use existing append-only events.

## Automated evidence

- Initial inspection/diff tests: 9/11 passed, then 11/11 after correcting Git's Windows null-device path.
- Follow-up/composer and inspection subset: 18/18 passed.
- Development-panel UI regression checks: 3/3 passed; verifies no decision controls, file retention and isolation.
- First full serial suite: 381/382. An existing expiry fixture sampled Date.now twice and occasionally
  made its approval window longer than the permitted 30 minutes. Production correctly rejected it.
- Fixed only the fixture clock, using the existing Node test clock facility. Paid-review production
  limits/expiry enforcement were not changed. All 20 scoped paid-review tests then passed.
- Final full serial suite: **383/383 passed**, zero failures/skips/cancellations; 100.14 seconds.
- Syntax and whitespace checks passed. No dependency installation or build-system change.

## Actual browser evidence

Regular app, `http://127.0.0.1:3000/team`:

- Opened a real src folder and src/todo.js from the existing Friday project.
- Inspected the exact stored placeholder and local explanation; no utility executed.
- Switched Task/Context and retained file selection. Inspected Review/Agents and truthful empty states.
- The Friday folder has no Git repository; the panel correctly reports this instead of inventing main.
- Switched to Calculator: its Studio file/session empty states appeared without Friday context leaking.
- Existing messages and sessions remained present after supported server reloads; no main task was run.
- Development-panel keyboard resizing rechecked with the real file view and preserved conversation.
- Main-data check: original Friday task ready, zero run requests/revisions; UI-only session ready,
  three messages and zero run requests/revisions. No main-session follow-up was submitted.

Temporary app on port 3002 with its own disposable SQLite and Git repository:

- Actual local branch ui-fixture, modified src/add.mjs, deleted deleted.txt and added added.txt displayed.
- Saved revision and side-by-side views showed the exact a-b baseline and a+b changed content.
  Syntax tokens were rendered as text-safe spans.
- The review panel's only button was Review Changes; findings and clearly MOCK test evidence displayed.
- Sent mock feedback from reviewed chat 45bdcc85-87bf-4ddd-87f0-4d1aced42c9d. It opened the linked
  next task 596d80d5-1402-4c38-ab47-06084fa6241f and its Builder received the original review context.
- Fixture recorded six mock calls: builder/tester/reviewer for the source and next task. Source stayed
  awaiting_owner; two chats existed. No acceptance, live AI call or real generated-code test execution.
- Bounded fixture server shut down and removed its disposable database/repository.

These fixture results verify UI integration, not live provider availability or coding quality.

## Limits and remaining scope

128 KB file/comparison reads; 2,000 displayed lines/tree entries; 500 listed Git changes. Large diffs
fall back to exact removed/added blocks. Basic highlighting is not a full language parser.
Linked Git worktrees, parent Git repositories, custom filter/include configuration and external object
stores are explicitly not inspected. Historical legacy
artifacts/reviews remain in Earlier work rather than being rewritten into Studio sessions.
No structured plan means no invented checklist or percentage. Native CLI model/current login state
is not inferred where no record exists. UI metadata refreshes on workspace refresh or Refresh project files.

Stage 4 remains real preview/development output; Stage 5 remains searchable history, exports and final
integration. Earlier streaming, individual agent selection and binary-attachment limitations stay tracked.
Estimated remaining work: 14–22 focused hours; November 6 remains the functional-core target.

## Stage 3 files

- New: src/services/workspace-inspection.js, src/dashboard/development.js, src/dashboard/code-view.js.
- Wiring/layout: src/app.js, src/routes/console.js, src/dashboard/index.html,
  src/dashboard/workspace-shell.js, src/dashboard/dashboard.css.
- Chat feedback: src/dashboard/conversations.js, src/services/studio-conversations.js,
  src/services/project-studio.js.
- New tests: tests/workspace-inspection.test.js, tests/code-view.test.js, tests/development-ui.test.js.
- Updated tests: tests/conversation-ui.test.js, tests/studio-conversations.test.js,
  tests/scoped-paid-review.test.js (deterministic expiry fixture only).
- Documentation: this report, WORKSPACE_REDESIGN_CHECKLIST.md and PROMPT_LOG.md.

Unrelated dirty documentation preserved. No keys/configuration, routing, billing or other project source
changed. No provider request, main-project commit, push, merge or deployment.
