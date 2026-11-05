# Workspace redesign — final feature audit

November 4, 2026. Branch: `feature/workspace-ui-redesign`.

The five-stage workspace integration is delivered within the existing backend's capabilities. The complete original wish list is **not** fully implemented. This table retains unavailable features rather than treating an empty panel or a disabled button as implementation.

“VERIFIED” identifies automated or browser evidence, not a claim that a live AI job ran in Stage 5. “IMPLEMENTED BUT NOT VERIFIED” means code exists but the stated runtime check was not performed. “BLOCKED” identifies an unmet prerequisite. “NOT IMPLEMENTED” identifies missing capability requiring separate scope.

| Feature | Classification | Evidence and practical limits |
| --- | --- | --- |
| Charcoal/navy workspace, purple accents, compact typography | VERIFIED | Main-dashboard browser inspection at laptop sizes; screenshots. Close to the reference's structure, not a pixel-perfect copy. |
| Four primary regions and pane controls | VERIFIED | Conversation, development, local preview, optional output; keyboard/pointer resize coverage, collapse, expand/restore and Layout menu. |
| Focus presets and saved preferences | VERIFIED | Conversation, Development, Preview and Balanced; manual widths retained, Reset layout, unit tests and browser refresh. Narrow balanced mode prioritizes conversation/development over displaying every pane simultaneously. |
| Sidebar destinations | VERIFIED | Sessions, Workspaces, Projects, Agents, Tasks, Plugins & tools, Prompt history; original views retained under More workspace views. |
| Sidebar section collapse and scrolling | VERIFIED | Sessions/projects/files expand and collapse, fixed primary navigation, one scroll area for those sections; asynchronous explorer grouping regression. |
| New sessions, switching, project association | VERIFIED | Regular dashboard created a UI-only session; existing sessions retained; project switching and actual ID/API checks. |
| Conversation persistence and chronological messages | VERIFIED | Regular Save message + refresh, attachment/reference inspection; no model request. |
| Agent responses and execution activity | VERIFIED | Stored real events rendered; complete workflow inspected in a separate MOCK ONLY database. No simulated streaming. |
| Bottom composer and duplicate prevention | VERIFIED | Existing Send/Save handlers retained; serial regressions. Send still runs the assigned team and can use paid DeepSeek; Save message does not. |
| Text/code attachments | VERIFIED | Real browser uploaded a first-party text file, saved and reopened it. Existing two-file/4 KB limits retained. |
| Project-file references | VERIFIED | Browser selected README.md and saved its immutable message copy. Existing three-reference/4 KB limits retained. |
| Individual agent/model selection | NOT IMPLEMENTED | Selector disabled and explained. Actual assigned roles/model shown. No new routing or role-selection backend was added. |
| Streaming responses | NOT IMPLEMENTED | Existing recorded-event polling only; separate transport/storage design needed. |
| Slash commands / inline @ autocomplete | NOT IMPLEMENTED | Existing @ Reference picker works; no invented command execution or autocomplete. |
| Binary/image attachments | NOT IMPLEMENTED | No binary storage/inspection pipeline. Unsupported files remain rejected. |
| Unsent draft persistence after full reload | NOT IMPLEMENTED | In-page navigation preserves drafts. Save message persists them; full-reload draft storage is not added. |
| Current task, phase, blockers and completed development activity | VERIFIED | Actual Studio state/events; no percentages inferred from message counts. |
| Structured implementation checklist/step percentages in Studio | BLOCKED | Studio does not persist a structured step plan. The UI states that fact. Existing older plans remain in Earlier work; a new plan model is outside this UI integration. |
| Real project explorer, nested folders and code view | VERIFIED | Actual main-project files, selected-file preservation, safe reads, local plain-English outlines. |
| Repository/branch and changes | VERIFIED | Real Git fixture branch and changes in browser + automated tests. Friday project has no Git repository; its branch remains unavailable. |
| Added/modified/deleted diffs | VERIFIED | Existing Git/revision tests cover all three; browser inspected actual modified Git content and saved revision links. |
| Side-by-side comparison and syntax highlighting | VERIFIED | Existing comparison/code-view tests and browser before/after text. Bounded file/line limits retained. |
| Plain-English summaries above code | VERIFIED | Existing local code outlines retained in file/diff views. They explain structure, not correctness or review approval. |
| Task / Changes / Compare / Review / Agents / Context tabs | VERIFIED | Real main-data reads and separate Git/review fixture; keyboard navigation retained. |
| Agent health/status and model evidence | VERIFIED | Saved connection evidence, configured/executable presence and recorded activity stay distinct from current account access. No availability inferred from a registry row. |
| Additional specialist agents from the reference | BLOCKED | Only actual registry/worker assignments shown. No invented planner, orchestrator or documentation worker. |
| Review findings and test evidence | VERIFIED | Browser displays explicit MOCK labels in the fixture; stored bindings/status remain separate from acceptance. |
| Review feedback as next Builder task | VERIFIED | Existing API/UI regressions preserve source review/history and deduplicate follow-up creation. No real follow-up generation requested. |
| Owner acceptance | VERIFIED | Existing eligibility/security tests pass; fixture acceptance control inspected without clicking it. Review has no Approve/Reject/Request Changes controls, per owner's later amendment. |
| New live AI build/test/review job through redesign | IMPLEMENTED BUT NOT VERIFIED | Existing runner reused and mock integration verified. No paid/live provider job authorized or run in this stage. |
| Session/project memory and context | VERIFIED | Saved goals, events, references, tests/reviews and existing project-context fields displayed where recorded. |
| Local application preview | VERIFIED | Controlled real HTTP application in main dashboard: authorize, counter/form, navigation, refresh, focus/resize, project isolation; Stage 4 also verified external tab and framing rejection. |
| Preview of unfinished Friday application | BLOCKED | Friday task remains READY with zero worker runs. Controlled verification app is not represented as its implementation. |
| Preview security | VERIFIED | Exact origin/project/generation lease, loopback/DNS restrictions, sensitive paths, redirects, credential stripping, separate origin/sandbox, target CSP/XFO preserved. Tests retained. |
| Automatic server launcher | NOT IMPLEMENTED | Explicitly excluded; owner starts a trusted project server separately. New command capability requires separate approval. |
| Cookie/auth-forwarding, CDN dependencies, HMR/sockets in preview | NOT IMPLEMENTED | Restricted preview deliberately does not provide these capabilities. External viewing follows ordinary browser top-level navigation rules. |
| Development output tabs | VERIFIED | Real saved records; marked fixture output inspected. Missing old transcripts/names/durations stay missing. |
| New sandbox test transcript recording | VERIFIED | Recorder and tested-copy/changed-source regressions. No new untrusted production test execution was triggered for this UI stage. |
| Interactive terminal | NOT IMPLEMENTED | Read-only execution evidence only; no generic shell API. |
| Searchable prompt history and all requested filters | VERIFIED | Actual Studio prompts and labeled legacy descriptions; search/project/session/date/agent/status tests, browser combined filters. Unknown historical model/role information not reconstructed from current configuration. |
| Result/files/changes/review/acceptance linkage | VERIFIED | Stored execution reports, revision/hash links and recorded acceptance events included where available. Legacy missing source prompts remain null. |
| Markdown / JSON exports | VERIFIED | Downloaded both through the browser; API export/redaction/page/markup tests. Up to 100 records per filtered page. Source scan bounded to newest 2,000 Studio prompts + 2,000 legacy descriptions, with an explicit truncation notice. |
| Search older than the source window | NOT IMPLEMENTED | Records remain intact; unbounded archival search/export is not claimed. Current database fits within the window. |
| Plugin marketplace/installer | NOT IMPLEMENTED | Plugins & tools lists existing integrations/status only; no dead install controls or fabricated plugins. |
| Share/deploy actions pictured in reference | NOT IMPLEMENTED | No dummy publishing controls and no new deployment/sharing capability; no push, merge or deployment. |

No critical issue was knowingly hidden behind a green status. The unavailable capabilities above remain follow-up scope. Existing provider keys, routing, billing, database schemas and acceptance/review controls were not replaced.

Phone/touch and comprehensive screen-reader testing: **IMPLEMENTED BUT NOT VERIFIED** as broader accessibility/device coverage. Laptop checks are the verified target. No specialist agent, model or provider access is inferred from a reference image.

## November 4 follow-up: unified application and projects

| Capability | Status | Evidence / boundary |
| --- | --- | --- |
| Shared design across secondary/historical routes | VERIFIED | Real regular-browser navigation through Projects, Agents, Settings, Tasks, Tools, History, Activity, Approval Center and old project/task boards; one shell/sidebar, same theme on initial load. |
| Create project with location/description/Git/layout | VERIFIED | Real disposable custom folder and local Git initialization; managed-folder and conflict regressions. No commit/network/script during creation. |
| Register existing folder in place | VERIFIED | Backend Inspect/Confirm through actual UI; exact root identity, actual files/package/Git branch; entire fixture hash unchanged. |
| Secure folder-selection alternative | VERIFIED | Explorer Copy as path, pasted absolute root, backend validation and explicit confirmation; uploads are not folder authority. Native picker NOT IMPLEMENTED. |
| Read-only browsing separate from agent edits | VERIFIED | New metadata row defaults read-only; Send disabled; backend start/apply blocked; separate project/version owner permission. Existing project permissions retained. |
| Public GitHub clone | VERIFIED | Real official public Hello-World repository downloaded, tree checked before checkout, progress COMPLETE, correct registered root/branch. Bounded/no helpers/hooks/scripts/submodules. |
| Private cloning and clone recovery | NOT IMPLEMENTED | No GitHub credential reuse. Clone privately with trusted client then connect folder. Partial downloads stay unregistered; progress is server-session memory. |
| Existing-folder sessions and project switching | VERIFIED | Actual local-only saved conversation, distinct roots/file trees, reload and supported backend restart; prior records unchanged. |
| Git metadata confinement | VERIFIED | Linked/shared object/ref metadata rejected, bounded metadata traversal, external attributes/excludes overridden; normal Git/diff tests retained. Application checks are not an OS sandbox claim. |

Details, actual fixture IDs, security bounds, corrections, test totals and screenshots: `UNIFIED_INTERFACE_PROJECT_INTEGRATION_20261104.md`.

## Explorer verification update — November 4

Native folder selection is now implemented but **BLOCKED in actual desktop verification**, superseding the earlier NOT IMPLEMENTED label. Manual registration remains VERIFIED. Browser file/folder creation and file rename passed; actual folder rename is BLOCKED by Windows access denied. Session/navigation/remove-restore/restart checks passed. Source-panel visibility corrected with a regression. Final suite 450/450. Upgrade remains INCOMPLETE; detailed evidence and roadmap retained in PROJECT_EXPLORER_WORKFLOW_UPGRADE_20261104.md.

## Recovery evidence superseding the earlier explorer blocker

Actual native Windows folder selection/regular-dashboard registration PASSED in this recovery. The modern dialog returns a verified filesystem path; manual fallback remains. Real role selection, Rotate, separate position buttons and self-review rejection also passed. Project-specific assignments/order persist through SQLite and backend restart, with guarded pending changes for active tasks. Corrected adjacent drag handling passed local regressions; final visual reorder and expanded inventory remain unverified because local browser use became disabled. The earlier actual OneDrive directory rename denial remains a limitation, while real Windows Temp-directory operations pass. Redesign remains INCOMPLETE. Complete inventory, exact IDs, commands and Friday comparison: PROJECT_EXPLORER_WORKFLOW_UPGRADE_20261104.md.
