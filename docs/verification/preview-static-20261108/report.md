# Live Preview / file Open / pipeline discipline — verification

Date: 2026-11-08

## Part 1 — static Live Preview and file Open

### Root causes

1. **Live Preview**: the panel only accepted the URL of an already-running app server. A completed static build has no server; clicking **Authorize & open preview** with a blank URL sent an empty value to `previewURL`, which failed before anything rendered. The panel had no static-build path.
2. **File Open**: `workspaceDevelopment.openFile()` cleared `state.studioChat` when the selected project chat did not match, then called `go('demo')` and immediately fetched/selected the file. The redraw selected the project chat asynchronously; `select()` captured the old empty chat and its `still()` guard discarded the file request.

### Changes

- `src/services/workspace-preview.js`
  - Added `authorizeStatic(projectId, hub)` and `serveStatic()`.
  - Serves only regular files inside the project root; blocks dotfiles, AGENTS files, path traversal and >2 MiB files.
  - Serves on `http://127.0.0.1:<spare-port>` (the `*.localhost` origin did not resolve in Chrome).
  - Adds CSP/frame-ancestors and no-store headers.
- `src/routes/console.js`
  - `POST /studio/projects/:id/preview` accepts `{static:true}`.
- `src/dashboard/preview.js`
  - Blank URL now requests the static build; clear hint added.
- `src/dashboard/development.js`
  - `openFile()` selects the project chat before redraw and yields one tick before selecting.
- `src/dashboard/conversations.js` and `src/dashboard/development.js`
  - Visible reviewer-evidence label: **Reviewer did not run tests — inspected recorded test evidence.**

### Live browser verification

- Project: `demo 2` (`56ac47b1-4472-45c8-a2b2-2de155332817`), Awaiting Owner, 5/5 independent tests.
- Static preview origin: `http://127.0.0.1:50734`.
- Preview iframe loaded; clicked **Test Handoff**: background became `rgb(0, 128, 0)`, button text became **It works**.
- Three-dot **Open** on `index.html` displayed the exact saved file content in the Development viewer.

Screenshots: `preview-panel.png`, `preview-open.png`, `preview-green.png`, `file-open.png` in this folder.

## Part 2 — pipeline discipline

- `hasIndependentTests()` already required executed, passing, current-checkpoint evidence; the Awaiting Owner path already called it. Added a regression proving stale/failed evidence is rejected.
- Reviewer `changes_requested` now requires at least one non-empty specific finding; otherwise the run pauses with `review_needs_specific_finding`.
- Failing tests now require at least one recorded failure string; otherwise the run pauses with `test_failure_unrecorded` instead of starting a vague correction.
- The correction event already carries the stored failure findings; the Builder receives them through `state.problems`.
- Reviewer honesty is now a visible label in chat and the Review panel.

## Tests

- Focused preview/file/pipeline/UI: **37/37 passed** (`focused-parts12.txt`).
- Full serial suite: **741/741 passed**, 0 failed (`full-serial.txt`).

## Part 3 — app server

Not implemented in this pass. There is no manifest/start-command supervisor in the current preview service; it only proxies an already-running loopback server. The test runner is a one-shot process, not a reusable long-lived app-server lifecycle. Safely adding this requires a separate owned process-tree, port allocation, start/stop and shutdown design; forcing it into the current proxy would leave an unowned generated-code process. This is the precise blocker.

## Backend

- PID **15280**
- Health **ok**
- Migrations **22**
- Folder-lock rows **0**
- Running/stopping chats **0**

No commit, push or deployment. No `.env`, Zapier, fallback or budget changes.
