# Unified interface and project integration

Date: November 4, 2026. Branch: `feature/workspace-ui-redesign`, starting/remaining HEAD `79749aa`.

## Result

The regular dashboard now uses the same charcoal/navy shell and purple navigation on working and historical pages. Projects has three separate Inspect → Confirm workflows: Create New Project, Open Existing Folder, and Clone GitHub Repository. New registrations are read-only until the owner separately enables agent changes. Opening, switching, inspecting or saving a message starts no agent.

Open: http://127.0.0.1:3000/team#projects

## Pages and navigation

Visually checked in the real regular application at 1366 × 900:

| Page | Result |
| --- | --- |
| Workspace / existing project / saved session | Shared editor shell, conversation, composer, explorer and Development panel |
| Mission Control | Preserved alias into the conversation workspace |
| Projects | Same sidebar/header, actual registered roots and three setup options |
| Agents / AI Team | Existing connection information in shared chrome; no connection calls |
| Tasks | Saved sessions and historical-board entry retained |
| Plugins & tools | Existing integration descriptions/status retained; no operations triggered |
| Prompt history | Existing filters, stored evidence and exports retained |
| Earlier work / historical project workspace | Actual old projects, tasks, progress and controls retained and restyled |
| Approval Center | Existing inspection/acceptance navigation retained; no decision clicked |
| Activity History | Stored audit events in shared chrome |
| Settings | Existing connection/settings surface retained; no configuration changed |
| `/team/style-preview` | Redirects into `#styles`; fictional old style studies remain clearly labeled inside the shared shell |
| `/team/zapier-setup` | Redirects into `#zapier`; fixed, sanitized historical setup instructions inside shared shell |

There is one sidebar/navigation system. Sessions and Workspaces shortcuts now remain present on secondary pages. The three historical style examples intentionally retain their comparison colors; they are archived samples, not a second live application interface. Their content endpoint permits only the same-origin archive frame; the application's own framing protection and live-preview security were not weakened.

The shared theme is present in the initial HTML as well as after loading data, avoiding a flash of the old theme. At 1024 × 768, Projects retained navigation and had no page-width overflow. Full phone, touch and screen-reader coverage is not claimed. Existing keyboard resizing was rechecked in the regular workspace; automated layout/preset/collapse regressions remain passing.

## Folder selection and registration

This is a local web server, not a desktop app with a trusted native folder-selection bridge. The supported alternative is explicit and visible:

1. In Windows File Explorer, right-click the intended project folder and choose **Copy as path**.
2. Open **Projects → Add Project → Open Existing Folder**.
3. Enter a project name and paste the absolute path.
4. Click **Inspect selection**. The backend validates the actual folder and returns a short-lived confirmation, detected package information, real files and Git branch where available.
5. Check the displayed root and click **Register Existing Folder**.

Quoted Copy-as-path values are accepted for existing folders. File uploads never authorize a backend root. Registration occurs in place: no copy, move, restructuring, dependency installation or source rewrite. Sidecar records and the existing managed storage directory are created only inside Dev Squad's own storage.

Create New Project supports name, description, managed or custom new location, optional local Git initialization/origin URL and a default workspace preset. Git initialization does not commit, fetch or push. A destination must not already exist, including one left by an earlier failed attempt.

## Actual integration evidence

The following explicitly disposable records were added through the normal browser UI, using the actual main SQLite database:

| Check | Actual ID / result |
| --- | --- |
| Existing folder project | `7af08f69-1654-4010-b63d-e216533f7cb1` — registered in place, read-only |
| Saved local-only conversation | `e36fb154-1640-4329-bbbc-8ea3f4dce36b` — one owner message, no Run |
| Create project | `1efedec8-eec9-43a2-abb7-ac4d886c543a` — new empty folder, actual Git branch `main`, read-only |
| Public clone project | `5fc31413-20b4-4202-8642-d819849ca576` — real `octocat/Hello-World` download, branch `master`, read-only |

All fixture folders are below `C:\Users\barri\OneDrive\Desktop\Next Chapter Projects\DISPOSABLE Dev Squad folder check 20261104`. No CoachLab, Research Agent, Personafy or other business folder was inspected or registered.

The existing fixture displayed real `package.json`, `README.md` and expandable `src/add.mjs`. Opening source displayed its actual text with the existing local plain-English outline. The root and actual Git branch appeared in the explorer and Context tab. Switching to created/cloned projects replaced the file tree; returning restored the correct session. Send remained disabled for all three new read-only projects; Save message worked without generation. The folder registrations and saved conversation survived refresh and the supported backend restart.

The complete source hash, including `.git` and a deliberately fake `.env` fixture, was identical before/after registration, inspection and Git status:

`5f433c956ffad14564cf9d2408a319cf479089460036f71df2e3de3802069010`

## GitHub cloning

Real browser clone passed for `https://github.com/octocat/Hello-World`. Progress reached COMPLETE and the verified result opened in its correct workspace. No repository code or setup script was run.

The cloner accepts only credential-free official GitHub HTTPS URLs, in a new destination with an existing parent. It uses a clean child environment, no credential helpers or prompts, no hooks/templates, no redirects and no submodules. It downloads without checkout, validates tree modes/names/sizes, then checks out into that newly created folder. Limits: 120 seconds download, 30 seconds checkout, 128 MiB observed pack storage, 5,000 files, 2 MiB per file and 25 MiB total checked-out content. These are local bounds, not an exact network bandwidth quota.

Private/authenticated clones are deliberately unavailable. Clone privately in a trusted Git client, then register the folder. Partial failures stay unregistered and are not deleted or automatically retried. Operation progress is server-session memory; refreshing/navigating away can lose the progress view, but successful registrations persist. No clone-resume/recovery facility is claimed.

Official implementation references, consulted November 4, 2026:

- https://git-scm.com/docs/git-clone
- https://docs.github.com/en/rest/repos/repos#get-a-repository
- https://github.com/octocat/Hello-World

## Security and authorization

- Backend rejects relative/traversal/UNC/device/alternate-stream paths, broad profile/drive registrations, protected application/system storage, missing/file paths, linked ancestors and junctions.
- Root identity is pinned at confirmation and checked on subsequent access. Replacing/moving a registered directory fails closed.
- Overlapping/duplicate roots are rejected, with Windows case normalization.
- Confirmation receipts are exact-selection, single-use, short-lived and held server-side. Changing form fields clears confirmation. The old HTTP folder field cannot bypass the new mechanism.
- New connections persist `agent_changes=0`. Backend Run and patch application independently reject read-only projects. Owner enablement is bound to exact project ID and access version, requires the existing same-origin dashboard capability and refuses active work. It is not a worker dispatch.
- Existing private-file, hard-link, symlink, content redaction and project-reference guards remain. Project-file selections/drafts stay scoped by project/session.
- Git inspection additionally rejects linked/shared metadata and bounds metadata traversal; external attributes/exclusion configuration is overridden. Custom filters/includes and external object stores remain rejected.
- These application guards are not a claim that registration creates an operating-system security sandbox. Existing native-worker isolation and approval requirements remain separate and unchanged. No live worker was authorized or tested here.

## Backup and data preservation

Supported backup completed and verified before migration 014:

`backups/backup-1793811487957-9cfac3dc-122a-44af-bcd7-06e9a916fba7.sqlite`

Backup and `.env` are Git-ignored. New migration adds only `studio_project_connections`; existing projects retain their prior policy. Row/hash comparisons against the backup found zero changed or missing original projects (6), Studio chats (5), Studio events (9), plus 123 existing rows across 15 task/draft/review/approval/checkpoint/usage/provider/messenger tables.

Original Friday project `d6cf55a4-198c-40a7-98b4-8bb6d8c5af95` and task `b38be3dd-b586-440c-922b-755c188a900a` remain READY, with zero Run requests and zero revisions. No generation, review, acceptance, billing/routing change, push, merge or deployment occurred.

## Tests, corrections and limitations

Final full serial result: **429/429 passed**, zero failures/skips/cancellations, 313.09 seconds. Command: `node --max-old-space-size=128 scripts/test-serial.js`. Initial full run was 425/428: three outdated migration/navigation expectations were corrected. The subsequent full run was 428/428 in 214.91 seconds, no skips/cancellations. After initial-theme HTML correction, final focused frontend checks: 25/25 passed. Additional linked-Git-metadata security checks passed 26/26 with project registration checks before the final full run.

Coverage includes in-place/no-source-change registration, exact scope, one-use/expired receipts, duplicates, invalid/protected/replaced roots, separate sessions/files, read-only Save versus Run, owner version conflicts, bounded clone validation, no checkout before validation, failed clone preservation, real Git initialization, clean child environments, private files, current reviews, existing approvals and layout controls.

Real mistakes corrected: a traversal test originally normalized away its own `..` input; Git for Windows rejected Node's special null-device filename (fixed to `NUL`); a new root-display assertion needed actual project metadata in its UI fixture; three full-suite expectations needed the new migration count and Workspace label. One initial cold Git read exceeded its existing bound; later actual branch reads succeeded. No unsupported cause was assigned to that transient failure. The failed creation's new empty `Created App` folder was preserved unregistered; the successful check used `Created Verified App` instead.

Still unavailable: native folder picker; private GitHub clone authentication; unbounded clone/metadata/file inspection; automatic dev-server launch; live AI verification of these new projects; comprehensive mobile/accessibility coverage. Supported text/code extensions retain the existing viewer limits; the cloned extensionless `README` is truthfully listed as unsupported. Existing Stage 1–5 capability limitations remain in the feature audit. No provider access or production readiness is inferred from these local tests.

## Files changed for this task

- Shared UI/navigation: `src/dashboard/dashboard.css`, `dashboard.js`, `index.html`, `workspace-shell.js`, `conversations.js`, `development.js`, `style-preview.html`.
- New Projects UI: `src/dashboard/projects.js`.
- Reused service wiring/routes: `src/app.js`, `src/routes/console.js`, `src/services/project-studio.js`, `src/services/workspace-inspection.js`.
- New focused services/schema: `src/services/project-connections.js`, `src/services/project-git.js`, `src/database/migrations/014_project_connections.sql`.
- Tests: `tests/project-connections.test.js`, `workspace-inspection.test.js`, `conversation-ui.test.js`, `development-ui.test.js`, `workspace-shell.test.js`, `style-preview.test.js`, `demo-navigation-ui.test.js`, `foundation.test.js`.
- Documentation: this report, `WORKSPACE_REDESIGN_CHECKLIST.md`, `WORKSPACE_FINAL_FEATURE_AUDIT_20261104.md`, `PROMPT_LOG.md`.

Existing ProjectService/Store, Studio sessions/messages, ProjectFiles, fileTree/Git/diff inspection, local summaries, preview/output/history modules, review/acceptance and provider controls were reused. Unrelated dirty files and prior Stage 1–5 work were preserved. No commit, push, merge or deployment.

## Screenshot evidence

Actual regular-dashboard images (not generated mockups), stored outside the repository:

`C:\Users\barri\.codex\visualizations\2026\10\20\01a15721-9f6d-7e52-9209-7d64d043b76c`

- `unified-project-options-20261104.png`
- `unified-connected-workspace-20261104.png`
- `unified-agents-20261104.png`
- `unified-settings-20261104.png`

Final syntax and diff-whitespace checks passed. Configured-secret scan: zero matches across 70 changed/untracked files; no tracked `.env`, databases or `node_modules`. Git remains dirty on the approved feature branch with prior work preserved. Final backend health returned HTTP 200 and the identified Dev Squad server process was running. Windows listener inventory returned inconsistent/empty results, so no single-listener count is claimed from that check. The Projects tab is available to the owner on port 3000.
