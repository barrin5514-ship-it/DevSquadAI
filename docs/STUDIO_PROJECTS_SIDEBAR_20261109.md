# Workspace Projects sidebar

## What moved

- **Projects** expands or collapses the project list. The selected project’s name stays on the collapsed header, and the dashboard remembers the preference.
- **+** opens the existing flows for creating a project, opening an existing folder, or cloning a GitHub repository.
- Select a project name or one of its sessions to open it. Its **⋯** menu contains **Edit project**, project tools, file access, and deletion. **Edit project** changes the name, description, or saved layout. **Enable agent changes** still uses the existing access control.
- **Select projects** shows checkboxes on the sidebar rows. **Delete selected** asks for confirmation. Removed projects and unfinished workspace setup remain accessible from the sidebar.
- Both `/team#projects` and `/team/projects` open Workspace and expand the sidebar. The old page and its navigation entry were removed. The compatibility links preserve the selected project and conversation.

## Verification

- Focused serial tests passed 74/74 with exit code 0. The new tests cover the missing dropdown and settings endpoint, retired route compatibility, access preservation, and bulk selection and confirmation.
- Playwright drove real Chrome from a cold dashboard load against a disposable database. It checked collapse and reload, project creation through the sidebar, switching, renaming, the **Enable agent changes** option, and cancellation of clone and bulk deletion. Both projects remained, and both legacy links returned to Workspace with Projects expanded. Chrome reported no page errors.
- The browser test submitted four local writes for disposable setup, renaming, and file access. It made no provider requests and did not clone or delete a project. Screenshots and the raw verification log are kept locally under `data/vision-build/`.
- The full Windows serial suite passed 800/800 with exit code 0. After a verified SQLite backup, the regular backend restarted from PID 37676 to 8568. Health and `/team` returned HTTP 200, SQLite integrity was `ok`, and the before/after check found no differences in 67 application tables. All 22 migrations were present.
