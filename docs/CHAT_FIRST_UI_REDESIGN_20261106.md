# Chat-first workspace redesign

Date: November 6, 2026. Branch: `feature/workspace-ui-redesign`. Starting HEAD: `9983d20f1ee6394cbfbff484ae9f7345c91195d7`. Final serial regression and disposable Chrome verification passed; no live AI, paid request, webhook, commit, push, merge or deployment.

## Actual structural changes

The conversation is now the center of a three-column workspace: a 230px project sidebar, flexible conversation and optional 300px tools sidebar. The old task form/status-card renderer is no longer constructed for the active chat-first workspace. Its fallback remains available if the conversation module is unavailable; there is one active layout, not two simultaneously rendered dashboards.

The conversation scrolls above a compact, bottom-pinned composer. Saved user/agent messages retain chronological identities; technical events fold into details, and empty sessions show an invitation rather than pretending a system event is an AI response. Message code is rendered as inert code text. Existing file summaries and code inspection remain unchanged. Attachments, references, Save message, Send, Ctrl/Cmd+Enter, Stop and whole-composer minimization remain available. Message help moved into advanced tools. Expanded input/help cannot push the conversation out of the viewport.

The optional tools sidebar contains actual assignments, execution mode/roles, sessions, recovery, files, task/diff/review/context tabs, authorized live preview and recorded output. Tools start compact. Their expansion preferences survive normal data refreshes; sidebars and composer state persist across reload. A mobile project drawer overlays temporarily instead of squeezing chat into an unusable strip, and selecting a project closes it. Native dialogs remain in the browser's top layer.

Everyday navigation is Workspace, Projects, Agent team, Activity/History and Settings. Earlier work, Tasks, Plugins, Approval Center and other existing destinations remain under More tools. New Project retains the existing Create/Open Folder/Clone workflows. No new imitation project pages or simulated production conversations were added.

Warnings are session-scoped. One compact saved-issue banner links to existing recovery details. Noncritical visual dismissal preserves diagnostics and survives refresh; new error identities can show again. Superseded assignment/mode errors remain in history. Unresolved process/folder safety states cannot be dismissed. Stopping is shown as status, not falsely labeled a paused error. Builder-only sessions show approval required/expired or review pending without changing the backend state or granting permission.

## Visual direction

Primary reference: the owner's `Dev Squad AI Dashboard Mockup.png`. Charcoal/navy surfaces (`#0d111b`, `#121824`), restrained borders (`#30384b`), purple controls (`#7543e7`) and readable secondary text (`#aeb8cf`). Segoe UI/Segoe UI Variable with Consolas for code. Conversation first, left-aligned readable messages, no invented plan percentages or fake provider-ready badges. Assignments are labeled Assigned/Default, not authenticated or quota-verified.

## Files changed for this assignment

- `src/dashboard/workspace-shell.js`: actual three-column structure, tool drawers, responsive/sidebar preferences, compact headers and existing panel placement.
- `src/dashboard/conversations.js`: continuous thread, technical-event folding, safe code formatting, compact auto-growing composer, contextual warning/status presentation and unchanged submission/approval handlers.
- `src/dashboard/dashboard.js`: avoid building the obsolete task form behind the active conversation workspace; preserve fallback and other-run Stop controls.
- `src/dashboard/dashboard.css`: one owned `.chat-first` layout and responsive styles. Prior `.coding-workspace` styling is fallback-only.
- `src/dashboard/index.html`, `project-navigation.js`: simplify everyday navigation while preserving existing routes, project actions and history.
- `src/dashboard/development.js`: reveal the actual file inspector once, preserve summaries, avoid duplicate alert panels.
- `src/dashboard/live-workspace.js`: preserve recorded activity while following the shared current-warning presentation.
- `src/dashboard/roles.js`: feed compact assignment/default labels from the existing roles response; no new auth/model request.
- `src/dashboard/preview.js`: reveal and clip the existing authorized frame correctly within a scrolling/collapsible tools sidebar. Preview authorization, proxy isolation and security headers unchanged.
- `tests/conversation-ui.test.js`: meaningful regression coverage for event identity, inert code, critical warnings, expired approvals, stopping status and compact approval labels.
- `scripts/verify-chat-first-ui.js`: real Chrome, disposable SQLite projects, clearly labeled simulated records/workers, responsive interaction checks and a trusted real loopback preview server.
- This report, `CHAT_FIRST_UI_HANDOFF_20261106.md`, verification evidence and the manual `docs/PROMPT_LOG.md`.

All earlier uncommitted backend, diagnostics and documentation work remains preserved. No production worker service, database schema, credential, routing/spending setting or authorization rule was changed by this redesign.

## Evidence and tests

Before screenshot: `docs/verification/chat-first-ui-20261106/before-1366.png` (real Chrome, disposable backend state).

After screenshots are in the same directory: `after-paused-1366.png`, `after-1920x1080.png`, `after-1440x900.png`, `after-1366x768.png`, `after-1280x720.png`, `after-390x844.png`, `after-live-preview.png`. Final authoritative checks are in `result.json`; historical failed-attempt diagnostics are not a success report.

The initial focused run passed 34/35: folding an event had removed its original row identity. The source was fixed and the original chronological-order assertion retained. Subsequent focused checks caught a duplicate inspector reveal; the source now reveals once, retaining the original assertion. Other confirmed integration repairs included drawers closing during refresh, desktop tool choices incorrectly opening mobile drawers, and empty sessions mistaking metadata for conversation. Browser harness corrections are separate: wait for the actual selected session before measuring, register the read-only fixture normally, and permit only the exact authorized loopback preview proxy/nested frame rather than blocking the feature being tested.

The final focused run passed **58/58**. The final frozen-source full serial suite passed **593/593**, zero failures, cancellations or skips (623.4 seconds). The final real Chrome disposable workflow passed **47/47**, zero browser errors or real model invocations. Logs: `docs/verification/chat-first-focused-final-20261106.txt`, `chat-first-full-final-20261106.txt`, and `chat-first-ui-20261106/result.json`. Real generated applications and current account/inference availability are outside this UI task; simulated worker output is not represented as model execution.

One short focused check briefly overlapped the first full run; it finished before further verification. This departed from the requested one-at-a-time sequence and is recorded here. Subsequent verification remains sequential; no memory cause is inferred from timing alone.

## Persistent acceptance checklist

| Requirement | Current evidence/state |
| --- | --- |
| Main conversation is the largest workspace | Final Chrome geometry checks passed at all five requested viewport sizes |
| Natural chronological scrolling | Long persisted fixture, 40 owner/agent pairs; event identities retained |
| Bottom-pinned composer | Final independent-scroll and responsive geometry checks passed |
| Compact empty composer | One row plus compact controls; bounded auto-grow |
| Remove oversized permanent panels | Execution/recovery/help/tools moved out of the chat flow |
| Historical warnings stay folded/in history | Historical Tester failure fixture and session status rules |
| Current actionable errors truthful | Compact saved-issue banner; no automatic auth check/retry |
| Compact expandable execution mode | Existing mode/role/approval controls in drawer |
| Contextual recovery | Existing guarded actions in recovery drawer |
| Right sidebar collapses and chat expands | Measured, persisted preferences |
| Left sidebar collapses to icon rail | Final desktop rail and mobile project-overlay checks passed |
| No duplicate visible warning/status cards | Legacy task form not built; task/log alerts contextual |
| Project switching | Real fixture registration and project IDs |
| Existing chat/history intact | API-backed Save/refresh passed; production audit documented below |
| All safety gates retained | Worker/auth/review services unchanged; 593/593 regression passed |
| No unauthorized execution | No production Send/Run/approval; fixture worker is explicitly simulated |
| No laptop horizontal overflow | 1920/1440/1366/1280/390 geometry passed |
| Long conversations usable | Independent thread scrolling, pinned composer and formatted code |
| Appropriate state survives refresh | Sessions, roles, layout, drawers, warning dismissal and composer-collapse checks |
| Visual match to approved direction | Before/after Chrome images visually inspected: dark navy, purple accents, dominant conversation, compact composer and optional tools |

## Preservation and remaining verification

Supported SQLite backup taken before editing: `backups/backup-1793995197680-2b47947f-ed1e-4e03-bc8a-65f624f3eb8f.sqlite`. SQLite quick_check is OK. Read-only comparison covered 63 tables. 15 projects, 15 sessions, zero active workers, and the original Counter lock remain. Both Counter filesystem fingerprints match the pre-edit baseline. Neither Counter project, historical lock, authentication profile, stored artifact/revision/review/checkpoint nor class simulation has been used for mutation tests.

The production audit found separate live-server activity during the assignment: one Codex Personal Tester execution (failed/stopped), 16 new events and an updated session row for `1b28625d-db6a-4117-9879-52f7da5dace1`, between 21:39:41 and 21:42:00 UTC. The disposable UI verifier does not access that database. This activity was preserved, not deleted or reset. Therefore this report does not claim byte-for-byte unchanged production data. Details: `docs/verification/chat-first-preservation-20261106.json`. No live build is authorized or initiated by this UI assignment.

## Final verdict

COMPLETE for this UI assignment. Actual regular-dashboard Chrome check: 5/5, no JavaScript errors or write/external attempts; screenshot `docs/verification/chat-first-main-20261106/regular-dashboard-1366.png`. Separate disposable class-demo Chrome regression: 12/12, no real models/webhooks/GitHub calls or owner acceptance. Full serial suite: 593/593. The reference is followed structurally (dark navy, purple, project navigation, dominant chat and compact optional tools), using genuine records rather than fabricated progress. Physical mobile, native folder-picker re-exercise and real AI execution are not claimed. Detailed restart/maintenance boundaries, audit exceptions and remaining limits are in the companion handoff.
