# Stage 2 — sessions and conversations

November 3, 2026. Branch: `feature/workspace-ui-redesign`.

## What changed

The central panel now presents saved owner and agent messages chronologically with identity,
timestamps, plain-English activity, test evidence and review reports. The task-submission form is
replaced by an anchored message composer. Existing events are read, not reconstructed or overwritten.

- **Send** saves the current message and starts the existing project team pipeline once. With an
  empty composer, it resumes an existing unfinished task. The interface explains paid DeepSeek usage.
- **Save message** only saves locally; no worker is scheduled. This is useful for preparation and UI checks.
- New Session creates an empty saved session without pretending its title was an owner prompt.
- Project/session navigation keeps drafts and scroll positions separate in browser memory.
- Two text/code attachments of at most 4 KB each and three project references of at most 4 KB each
  can be stored as immutable event copies. They are not applied to application source or executed.
- Explicit Send/Run passes a bounded attachment context to the existing worker adapter. Truncation is flagged.
- Reviewed/accepted sessions cannot be silently reopened by a message. Active sessions require Stop first.
- Existing folder locks, no-self-review checks and server-side acceptance eligibility remain intact.

## Backup and persistence

Supported backup completed before implementation:
`backups/backup-1793763503924-9441d167-98e7-4b8a-bdbf-4b9d4580e34b.sqlite`.
No migration or new table. Reuses `studio_chats` and append-only `studio_events`.

Regular dashboard: `http://127.0.0.1:3000/team`.
Existing Friday project: `d6cf55a4-198c-40a7-98b4-8bb6d8c5af95`.
Added UI-only session: `ac5b9931-43dc-4120-b858-0b3b2bd6182f`.
Title: **UI CHECK ONLY — Stage 2 conversation persistence. Do not start any worker.**
Three test messages, one harmless uploaded text file and one README reference were saved.
The first two messages tested the initial local-only composer implementation; after finalizing the
single-click Send behavior, the third explicitly tested the separate Save message action.
This session remains ready, with no run request. Original Friday task/chat
`b38be3dd-b586-440c-922b-755c188a900a` remains ready and untouched.

## Verification

- New API safety/persistence tests: 6/6 passed.
- New real-composer handler tests: 6/6 passed. Covers Send vs Save, first-session creation,
  resume, restricted states and chronological reports without fabricated live activity.
- Earlier targeted regression run: 27/27 passed.
- Full final serial suite: **364/364 passed**, zero failures/skips/cancellations; 126.03 seconds.
- Syntax checks and Git whitespace/diff checks passed.
- Real browser, regular port 3000: created a session; saved messages; uploaded a text fixture;
  chose a real project README reference; inspected its saved attachment; switched projects and sessions;
  confirmed isolated history/drafts and persistence after refresh.
- Real browser, temporary port 3002, separate disposable SQLite: exercised the existing team pipeline
  using mocked builder/tester/reviewer responses only. First fixture tested the prior Run control;
  final fixture tested one-click Send with a new message. Both stopped at awaiting owner acceptance.
  No acceptance click and no live provider request. Each fixture records three mock worker calls.
- Scrolling with a long mock conversation: scroll offset changed from approximately 1482 to 41 pixels.
- Laptop check: 1280-pixel viewport and 1280-pixel document width, no horizontal overflow.
- Narrow check: 390-pixel viewport/document width; project/session controls remain available and
  the preview is below the composer rather than covering it.
- Stage 1 Reset layout and keyboard sidebar/development resizing rechecked in the real browser;
  widths survived refresh. Preview/output visibility settings remain saved.
- Final main-database check: original Friday task ready, zero run requests/revisions; UI-test session
  ready with three messages, zero run requests/revisions; zero active Studio jobs.
- Both bounded mock browser servers shut down and deleted their disposable databases.

## Limitations

Individual agent/model selection is not implemented by the current Studio runner; the disabled
selector explains this and actual roles/model are shown. Streaming, slash commands, inline @
autocomplete and binary/image attachments remain unsupported. The @ Reference picker works.
Unsent drafts survive navigation only; use Save message for durable storage.
No live generation, provider authentication or coding quality is newly verified by these UI tests.
Real preview/output integrations remain Stage 4 work. Historical output is never fabricated.

## Corrections made during verification

Fixed scroll restoration happening before the new panel was attached; it now restores after layout,
follows new messages at the bottom, and preserves the owner's earlier reading position.
Historical worker-start events now use past tense rather than incorrectly implying the worker is
still running. Narrow preview layout no longer overlays message controls.
The browser connection required reinitialization after an API error; browser testing then succeeded.

## Files changed in Stage 2

- `src/dashboard/conversations.js` — conversation, composer, sessions, attachments and references.
- `src/dashboard/workspace-shell.js` — mount conversation and restore scroll after layout.
- `src/dashboard/dashboard.css` — message layout, sidebar sessions and narrow-screen styles.
- `src/dashboard/index.html`, `src/app.js` — load/serve the same-origin conversation script.
- `src/services/studio-conversations.js` — bounded local messages, attachments, references and worker context.
- `src/services/project-studio.js` — reuse existing sessions/events and attach saved context to the runner.
- `src/routes/console.js` — session creation, local message saving and safe reference listing.
- `tests/studio-conversations.test.js`, `tests/conversation-ui.test.js` — regression checks.
- `docs/WORKSPACE_REDESIGN_CHECKLIST.md`, this report and `docs/PROMPT_LOG.md` — scope and evidence.

No provider/routing/spending configuration changed. No other project source, existing draft,
review, checkpoint or accepted task changed. No commit, push, merge or deployment.

## Remaining

Stage 3: real files, tasks, agent detail, diffs and reviews. Stage 4: real live preview and outputs.
Stage 5: searchable prompt history, exports and final integration/accessibility checks.
Full approved scope remains in `WORKSPACE_REDESIGN_CHECKLIST.md`; approximately 20–30 focused hours remain.
