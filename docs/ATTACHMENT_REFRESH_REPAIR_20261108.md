# Attachment refresh repair and Demo Two inspection — November 8, 2026

## Confirmed cause and repair

`file-explorer.js:refreshProject()` reloads the tree, invalidates Development,
calls `draw()`, and displays “Project files refreshed.” The SSE handler in
`live-workspace.js` also invokes it after an actual `filesystem_changed` event.
`conversations.js` retains the draft in its project/chat-keyed Map but creates
an empty attachments container on every mount. It previously called
`redrawExtras()` only when an attachment changed, never when mounting.
The image was still in memory and counted toward the one-image limit, but its
thumbnail, name, size and Remove button disappeared.

The fix paints that existing draft when the composer mounts. It does not alter
Send, authorization, provider dispatch, folder policy, budgets or Zapier.
The regression remounts the real composer twice and checks thumbnail, filename,
size and Remove, then removes the attachment and checks another remount.

Attach uses a browser File and object URL. It does **not** upload immediately.
Upload occurs only on Save message or Send. No server-side orphan existed in
the reproduced refresh failure. Unsaved Files are intentionally not copied into
browser persistent storage: reloading the entire page clears them. A pending
attachment now explicitly says to Save message before reloading. Saved message
attachments still reload from `references/` and render in history.

## Browser evidence

Method: Playwright-controlled, locally installed Google Chrome, headless; **not
Computer Use**, and not a manual owner test. A disposable database/project ran
the normal dashboard and real attachment/message endpoints. Provider transport
was forbidden; no Send/Run was pressed.

- Synthetic PNG: 143,116 bytes (larger than 4 KiB).
- Before: first run reproduced two redraw failures. An additional controlled
  regression served the old composer without the new mount repaint and used
  two actual filesystem changes, SSE notifications and automatic project-file
  refreshes over at least 16 seconds: both lost all attachment controls.
- After: two actual filesystem changes and automatic refreshes over at least
  16 seconds preserved thumbnail, filename, size and Remove.
- Remove, reattach, Save message and full page reload passed; saved image loaded
  with a nonzero natural width. One upload, one local message save, zero worker
  executions, zero browser errors, no provider requests.
- Local evidence/screenshots: `data/attachment-refresh/` (Git-ignored).
- Browser helper: `node scripts/verify-attachment-refresh.js`.
- Old-behavior reproduction: same command with `--before`; it removes only the
  mount repaint from the browser-served script, without changing source files.

## Demo Two: no deletion target exists under the authorized ID

Inspected project `56ac47b1-4472-45c8-a2b2-2de155332817` through its actual
database relationship, read-only filesystem inventory and dashboard file-list
endpoint in Chrome. It was already soft-deleted at `2026-11-08T06:56:08.503Z`,
before this task. It is absent from the current dashboard project list; it was
not restored or replaced with another same-named project.

Visible files before and after refresh:

| File | Bytes |
|---|---:|
| AGENTS.md | 1,774 |
| app.js | 1,582 |
| app.test.js | 3,891 |
| index.html | 1,125 |

The folder also contains its two internal `.devsquad-*` metadata files.
There are **no .txt files**, no `references/` directory, and no .txt revisions
recorded for this project's chats. Deleted files: **none**. No delete endpoint
was invoked. The original index.html and all history were preserved.

The reported stray filenames and their origin cannot be established from this
project's current files or recorded revisions. It would be unsafe to invent
names, claim a one-off cause, change Builder behavior, or delete files in the
newer same-named project. Visual removal from this soft-deleted project's UI
cannot be exercised; Chrome file-list refresh confirms no .txt entries and
index.html remains present. This limitation is separate from the verified
attachment fix.

## Verification and maintenance

- Focused composer suite: **34/34 passed**, including the new red/green case.
- Full serial suite: **754/754 passed**, zero failed/skipped/cancelled, 541,260.1184 ms.
- Supported SQLite backup completed and verified before restart.
- Regular backend restarted from verified PID 15160 to PID **34652** after
  confirming zero running/stopping chats and zero active executions.
- Health: HTTP **200**, `status: ok`; 22 migrations, zero active chats; normal dashboard loads in Chrome.
- No production conversation messages, project files, credentials, routing,
  Zapier configuration, billing settings or approvals were changed.
- Screenshots, logs, databases/backups and .env are excluded from staging.
- Image understanding/build-from-image is not implemented or verified here.

Verification helper note: its initial teardown called an unsupported close method.
That helper-only error was corrected; the final before/after Chrome runs exit 0.
