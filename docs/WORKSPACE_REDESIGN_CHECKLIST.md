# Workspace redesign implementation checklist

Updated: November 4, 2026. Target: functional core by November 6.
Branch: `feature/workspace-ui-redesign`; starting revision: `79749aa`.
Primary visual reference: owner's Dev Squad AI Client Portal Workspace screenshot.

Status meanings: VERIFIED = tested; COMPLETED = implemented, further checks pending;
PENDING = approved work not implemented; BLOCKED = external prerequisite absent.
This checklist includes the full approved scope, including unfinished features.

## Stage 1 — workspace shell and layout

- VERIFIED: charcoal/navy editor shell, purple accents, compact typography and bordered panes.
- VERIFIED: central conversation and composer reuse the original project/chat/Run handlers.
- VERIFIED: actual saved projects in the sidebar; original navigation remains reachable.
- VERIFIED: development, preview and bottom output pane scaffolds. Unconnected content is explicitly labeled.
- VERIFIED: show/hide sidebar, development, preview and output controls; Reset layout.
- VERIFIED: bounded pointer resizing (unit tests), keyboard resizing (unit tests and real browser).
- VERIFIED: preview expansion/restoration and layout persistence after refresh in real browser.
- VERIFIED: 1280-pixel laptop view has no page-width overflow with preview open; Run remains visible.
- VERIFIED: Approval Center navigation still works. No acceptance action performed.
- VERIFIED: pointer sidebar drag and conversation scrolling in the real browser.
- PENDING: broader responsive/device checks.

## Stage 2 — sessions and conversations

- VERIFIED: chronological persistent owner messages, agent reports and plain-English development activity.
- VERIFIED: dedicated bottom composer. Send saves and dispatches the existing team workflow once;
  Send without new text resumes saved unfinished work. Save message is explicitly local-only.
- VERIFIED: empty session creation, previous-session opening and project switching without replacing history.
- VERIFIED: project/session-bound in-memory unsent drafts and conversation scroll positions across navigation.
- VERIFIED: small text/code attachments (two files, 4 KB each), removal and saved copy inspection.
- VERIFIED: @ Reference picker for safe project files (three references, 4 KB each); immutable message copies.
- VERIFIED: duplicate message submission protection and safe worker-context attachment transfer.
- VERIFIED: existing active/reviewed/accepted-state restrictions, Run lock and owner acceptance remain enforced.
- VERIFIED: New Session, Sessions, Workspaces, project picker and existing AI Team navigation.
- VERIFIED: Stage 1 layout controls retained; narrow-screen project/session controls and non-overlay preview.
- VERIFIED: main dashboard local-only message submission, file upload/reference, session/project switching,
  draft retention, attachment inspection and refresh persistence in the real browser.
- VERIFIED: full Send-to-three-worker-response browser flow in a separate MOCK-ONLY temporary app/database.
  No real agent ran, no paid request, and no acceptance was performed. Mock evidence is not production evidence.
- NOT CURRENTLY SUPPORTED: individual agent/model selection in the project runner. Actual assigned roles
  and configured DeepSeek model are shown; the unsupported selector is disabled and explained.
- NOT CURRENTLY SUPPORTED: streaming, slash commands, inline @ autocomplete and image/binary attachments.
  Project references work through the @ Reference picker. Updates use existing polling; no simulated streaming.
- LIMITATION: unsent drafts survive navigation in the current page, not a full reload. Save message persists them.
- PENDING: future streaming, individual routing selection and broader attachment support require explicit
  integration with worker capabilities; they are tracked rather than silently omitted.

## Stage 3 — files, agents, tasks, diffs and reviews

- VERIFIED: real nested project file explorer, including empty folders; expand/collapse and text-file reads.
- VERIFIED: existing ProjectFiles path/private-file/link guards reused; credential screening and bounded reads.
- VERIFIED: actual repository root/branch, added/modified/deleted Git changes; no borrowed parent repository.
- VERIFIED: Task / Changes / Compare / Review / Agents / Context tabs with real data or explicit empty states.
- VERIFIED: immutable revision contents, hashes and actual before/after comparisons; text-safe syntax highlighting.
- VERIFIED: selected file retained across tabs, project-specific selections/context, plain-English outlines above code.
- VERIFIED: actual task phase, saved work, blockers, roles and evidence; no invented completion percentages.
- VERIFIED: assigned worker activity and historical connection evidence; legacy registry records separately labeled.
- VERIFIED: review findings, recorded test evidence, revision links and artifact bindings without false acceptance.
- OWNER AMENDMENT: removed Approve/Reject/Request Changes controls from Review. Feedback is typed in chat.
- VERIFIED: reviewed-task feedback creates a linked Builder task, carries prior review context and original roles,
  preserves source review/status/history, prevents duplicate forks, and does not auto-accept anything.
- VERIFIED: active-run restrictions, folder locks, independent reviewer and existing final-acceptance safeguards retained.
- VERIFIED: regular-dashboard files/tabs/project switching and conversation persistence checked in the browser.
- VERIFIED: real Git/revision comparisons and review-feedback handoff checked in a temporary browser fixture;
  all worker responses/test evidence in that fixture were explicitly MOCK ONLY. Zero live provider calls.
- LIMITS: 128 KB code/comparison reads; 2,000 displayed lines/tree entries; 500 listed Git changes.
  Very large diffs show exact removed/added blocks rather than an expensive minimal-line comparison.
- LIMITS: linked Git worktrees, parent repositories, custom filter/include configuration, external object stores and binary files are not inspected by this bounded viewer.
  Git metadata is read locally only; no remote URLs/authentication or network operation.
- LIMITS: older legacy tasks/artifacts/reviews remain available in Earlier work; no migration or fabricated history.
- VERIFIED: final full serial suite 383/383 passed, no failures/skips/cancellations; see WORKSPACE_STAGE3_VERIFICATION_20261103.md.

## Stage 4 — live preview and development output

- VERIFIED: exact-project local-server authorization, restricted broker/iframe, refresh, external tab and revocation.
- VERIFIED: loading, stopped server, unavailable, blocked embedding and expired/restart authorization states.
- VERIFIED: Terminal / Tests / Logs / Problems / Tool Calls use actual saved events; fixture evidence explicitly labeled.
- VERIFIED: future runner transcripts record bounded stdout/stderr, command, timestamps, duration, exit and tested-copy hash. No retrospective transcript fabrication.
- VERIFIED: real browser interactions, form POST, navigation, resize, expand/restore, project separation, network denial, target XFO restriction, layout persistence and 1280px no-overflow.
- VERIFIED: final full serial suite 396/396 passed, zero failures/skips/cancellations. See WORKSPACE_STAGE4_VERIFICATION_20261104.md.
- BLOCKED per project: its trusted local app must already be running; the Friday implementation remains unstarted. Validation app was real, controlled and stopped afterward.
- NOT SUPPORTED: interactive terminal, generic server launcher, cookies/auth forwarding, external/CDN dependencies, service workers, HMR/WebSockets. These limitations are explicit, not simulated.
- No migration, live provider request, main task Run, owner acceptance, push, merge or deployment. Authorization expires on restart or after one hour.

## Stage 5 — history, integration and verification

- VERIFIED: searchable real Studio prompt records and separately labeled legacy descriptions; timestamp, project/session/task, assignments, recorded models/status, results/files/revision hashes/reviews and recorded acceptance where available.
- VERIFIED: combined text/project/session/date/agent/status filters, page controls, secret-redacted JSON/Markdown exports, correct empty/unknown states and stale-response protection.
- VERIFIED: history-to-session links and direct History/Tasks/Tools hashes; real Tasks and read-only Plugins & tools pages; original views retained under More workspace views.
- VERIFIED: fixed navigation plus one sidebar section scroller; collapsible sessions/projects/files; compact horizontal development tabs and clearer conversation/execution explanations.
- VERIFIED: Conversation / Development / Preview / Balanced presets, manual width preservation, Reset layout, synchronized expansion label, compact composer and persisted pane/section choices.
- VERIFIED: final full serial suite 411/411, no failures/skips/cancellations; 22/22 focused frontend checks after final copy/spacing changes. Syntax and whitespace checks passed.
- VERIFIED: real main dashboard at 1366 × 768; separate marked integration fixture at 1280 × 720 and 1024 × 768. No page-width overflow. Save-only attachment/reference session persists after restart; original Friday task remains unstarted.
- VERIFIED: actual browser downloads and real controlled preview interaction; mock Git/diff/compare/review/output checks explicitly separate from live integration.
- BLOCKED / NOT IMPLEMENTED: remaining individual model selection, structured Studio step plans, streaming, slash commands, binary attachments, interactive terminal, automatic dev-server launch, plugin installation and unbounded archival search. See full classification table in WORKSPACE_FINAL_FEATURE_AUDIT_20261104.md.
- IMPLEMENTED BUT NOT VERIFIED: new live paid/native agent job through the redesigned UI; no provider run authorized or triggered in this stage. Phone/touch/screen-reader coverage is not claimed complete.
- Final evidence, changed-file inventory, limitations and visual-reference comparison: WORKSPACE_STAGE5_VERIFICATION_20261104.md.

## Safeguards and verification record

- Existing services, database schemas, workers, provider/routing/spending settings and approval gates unchanged.
- No migration or intentional production record modification in Stage 1; no backup needed for this display-only stage.
- Existing dirty documentation preserved. No commit, push, merge or deployment in Stage 1.
- One static script route added; original Run, Stop and owner-acceptance handlers reused.
- Regular server restarted after confirming zero running/stopping Studio chats; only identified DevSquadAI
  process restarted. No model request or demo run performed.
- Focused serial regression suite: 24/24 passed, no skips/cancellations. Syntax check passed.
- Full serial suite: 352/352 passed, zero failures/skips/cancellations; 153.15 seconds.
- Visual check: regular `http://127.0.0.1:3000/team`, existing Friday project/chat.
  Inspected shell, task history, pane toggles, keyboard resizing, refresh persistence,
  preview expansion/restoration, pointer sidebar drag, scrolling and Approval Center navigation. Attachments, real preview and review
  mutations are not claimed verified at this stage.
- Browser-discovered defects corrected: old content width overflow and project-list placement.
- Preparation mistake corrected: initial local edit helper redeclared a constant and exited before
  making edits; reran the corrected helper. No stored data affected.

## Remaining estimate

Stage 5 core integration is verified. Larger unavailable capabilities require separate scoping; no estimate or completion claim is made for them.
The November 6 target is for the functional core; unfinished approved items stay on this checklist.

## Stage 2 final verification

Full serial suite: 364/364 passed (126.03 seconds), no failures/skips/cancellations.
Twelve new API/composer tests passed. Actual browser evidence and full changed-file list:
`WORKSPACE_STAGE2_VERIFICATION_20261103.md`. Original Friday task remains unstarted.
Zero provider requests or real agent runs, no acceptance action, no push/merge/deployment.

Stage 3 owner feedback supersedes the Stage 2 reviewed-session restriction: a valid reviewed source is not reopened; chat feedback creates a linked next Builder task instead. Original review and acceptance records stay unchanged.

## Follow-up — unified interface and project integration (November 4)

- VERIFIED: one shared charcoal/navy shell, navigation/header/forms/buttons across Projects, Agents, Tasks, Tools, History, Settings, Activity, Approval Center, earlier project/task boards and conversation views.
- VERIFIED: initial HTML uses the shared theme before API loading, avoiding the old-theme loading flash.
- VERIFIED: session/workspace shortcuts remain available outside the conversation; existing routes and historical work remain accessible.
- VERIFIED: Create New Project supports description, new location, optional local Git/origin and saved layout preset. Real browser created an empty disposable project with Git branch `main`.
- VERIFIED: Open Existing Folder uses Windows Copy as path → backend Inspect → explicit Confirm. Real folder registered in place; complete source/Git hash unchanged.
- VERIFIED: exact root identity, protected/invalid/duplicate/overlapping path rejection, traversal/link/private-file guards and separate owner permission for agent modifications.
- VERIFIED: root, real nested files, source text/local explanation, package context and Git branch in the existing explorer/Context panel; switching preserves project/session isolation.
- VERIFIED: real bounded public GitHub clone, progress, successful registration and correct file tree/branch. No code/scripts executed; failure-path mocks preserve partial folders unregistered.
- VERIFIED: read-only new registrations disable Send and reject Run/patch on the backend. Save message works locally. Version-bound permission changes start no worker.
- VERIFIED: new registrations and local-only session persisted across supported backend restart. Original Friday task remains READY with zero Run requests/revisions.
- VERIFIED: all route families visually inspected at 1366px; Projects also checked at 1024px without horizontal page overflow. Existing keyboard resizing rechecked.
- VERIFIED: supported SQLite backup before migration 014; original business records unchanged against the backup. Configured-secret scan and JavaScript syntax checks passed.
- VERIFIED: focused Git metadata isolation regression rejects junction/shared storage; external Git attributes/exclusion configuration cannot widen inspection.
- VERIFIED: final full serial suite 429/429 passed (313.09 seconds), zero failures/skips/cancellations. Syntax and diff checks passed. Detailed evidence in `UNIFIED_INTERFACE_PROJECT_INTEGRATION_20261104.md`.
- NOT IMPLEMENTED: native directory picker; authenticated/private clone; resume/progress restoration for interrupted clone operations; arbitrary dev-server launch. Use Copy as path or a trusted separate Git client as documented.
- No live AI requests, owner acceptance, push, merge or deployment. Earlier Stage 1–5 unfinished scope remains documented above and in the feature audit.

## Project Explorer final verification — November 4

- VERIFIED: persistent project navigation, disclosure/context/plus menus, manual folder registration, actual tree/search/source summaries, read-only restrictions, create file/folder, file rename, path/details, sessions, switching, remove/restore, navigation and restart persistence in the regular browser.
- CORRECTED: selecting source reveals the previously hidden Development panel; regression added.
- VERIFIED: final serial suite 450/450, no failures or skips; existing 265 keyed records preserved against supported backup.
- BLOCKED: actual native Windows folder dialog did not appear; no selection was verified.
- BLOCKED: actual synced-folder rename returned Windows access denied; source and history preserved.
- INCOMPLETE: do not close the upgrade until these real workflows pass. Evidence, exact IDs, screenshots and limitations: PROJECT_EXPLORER_WORKFLOW_UPGRADE_20261104.md.

## Final recovery continuation — November 4

- VERIFIED: native Windows Common Item Dialog opened, actual disposable directory selected, exact returned root inspected/registered in the regular browser, real files visible. Earlier native-picker BLOCKED status is superseded for selection/registration.
- VERIFIED: compatible worker selectors, Rotate, Save roles and self-review rejection in actual dashboard; project/session scope, author-family protection, active-run queuing, concurrency and persistence tested.
- VERIFIED API: native-selected project, rotated assignments and separate card order survive main backend restart.
- IMPLEMENTED BUT NOT FINALLY VISUALLY VERIFIED: corrected adjacent drag moves and final Agents inventory; actual browser access became disabled and remained disabled after owner confirmation.
- BLOCKED: repeat Create/Clone/final-restart browser checks and actual synced-folder rename limitation. No redesign-complete claim.
- VERIFIED: first recovery full serial suite 458/458; final post-correction serial suite 458/458, zero failures/skips/cancellations.
- Friday/master comparison: both local branch tips are 79749aa; neither an isolated master run nor a live autonomous Friday job was performed. No branch switch or commit.
