# Studio lock, same-chat retry, default writability and project deletion — 2026-11-07

**Status: IMPLEMENTED and VERIFIED through the real dashboard with simulated workers. Full serial suite: 685/685 passed.**

## 1. The immediate warning — what actually happened

The most recent actual Send was chat `efaca8ae-87ff-4c70-ae0a-0ac40dd54937` at `20:49:40Z`:

- It created a **new run** (`run_requested`) and a new DeepSeek execution `657c16fd-4af2-45ff-a7fc-8c3246814c64`.
- A provider request actually went out: `api_request_started` at `20:49:50.456Z`, HTTP 200 streaming, 5,619 visible characters.
- The stream then hit `body_limit`/unverified completion. The execution became `unknown` and the old code retained the folder lock. The warning came from **this new attempt**, not from an older attempt.
- The later `21:39:35Z` “try again” was only a saved **message**. There is no `run_requested` and no provider request for it. The composer reused the old approval/request ID, so the message was appended as `Owner follow-up: try again` and no fresh attempt started.

The final repair releases the write lease when the local writer is verifiably unable to write, so the current recovered chat has no lock; the old unknown execution and reservation remain. Retry/Edit & Retry now create a new request and attempt in the same chat instead of reusing the old bounded request.

## 2. What changed

### 2.1 Lock release and late writes

- `studio_locks` is an **active write lease** only. It is removed when the writer is verifiably finished, including a DeepSeek/Nemotron API outcome whose remote result/billing is still unknown.
- `workspace_write_released` retains the execution ID, request ID, unknown outcome, release reason, and the reservation amount/status. The execution and `studio_api_reservations` row are not deleted or settled.
- `apply()` requires the exact current `activeExecutionId`, current role, held lease, and active controller. A late write from the previous attempt is rejected even after a new attempt begins.
- Startup recovery releases API-backed unknown writers; native locks without process identity/evidence remain locked and identify the holder.
- The dashboard shows “Worker outcome is unknown. No verified checkpoint was saved. Write access was released; no retry was started.” rather than “folder stays locked” once the lease is released.

### 2.2 Same-chat Retry / Edit & Retry / Copy

- Sent owner prompts now have **Retry**, **Edit & Retry**, and **Copy** controls.
- Retry sends the original prompt to `POST /studio/chats/:id/retry` with a new request ID. It keeps the same chat, project and workspace, increments `state.attempt`, adds a `retry_started` event, resets the attempt state, obtains a fresh bounded proposal/scope, and starts a separate execution.
- Edit & Retry loads the original multiline prompt into the existing composer; Send starts the edited fresh attempt rather than saving an `Owner follow-up`.
- Copy writes the original text with the Clipboard API; if clipboard access is denied, it opens a selectable copy dialog with the preserved line breaks. Windows clipboard output uses normal CRLF normalization.
- A fresh attempt is rejected while the folder lease is held, while the previous worker is active, or while the current attempt is running. A double-click is blocked by the UI guard/server state; the second request finds the run already active.
- Old executions remain in history. An old worker's `apply()` fails the execution-ID check and cannot overwrite the new attempt's files.

### 2.3 New projects writable by default

- Newly **created** Dev Squad projects now insert `agent_changes=1` by default. A first prompt can be sent without visiting Project options.
- Existing registered folders/clones retain their previous read-only default.
- Explicit project read-only toggles are preserved.
- `ProjectConnections.assertWrite` checks both the explicit access flag and actual local folder `W_OK`; the dashboard shows the reason (`Project access is set to read-only` or `The project folder is not writable by the local backend`).
- The project badge/read-only message and composer use the reason; no worker starts on a write-denied folder.

### 2.4 Delete Project

- New migration `020_project_deletions.sql` creates `studio_project_deletions`.
- `POST /studio/projects/:id/delete` requires owner confirmation and adds a **soft-delete** record. The project disappears from Project Studio's project list; its workspace files are untouched.
- Chats, executions, events and `studio_api_reservations` remain for reconciliation. The `projects` row remains as the durable foreign-key/audit anchor.
- Deletion is blocked while an active writer or lock exists; the error names the blocking run title and request ID.
- The Projects → Project options menu has **Delete Project** with the explicit confirmation text: it deletes the project from Dev Squad, leaves workspace files on disk, and retains records needed for outstanding runs/charges.
- Archive/Restore behavior is separate and unchanged.

## 3. Verification

### Automated

- **Full serial suite: 685/685 passed**, zero fail/cancel/skip. Evidence: `docs/verification/studio-retry-delete-20261107/full-serial-final.txt`.
- New focused retry/delete tests: **3/3 passed**. Evidence: `focused-retry-delete.txt`.
  - Retry starts attempt 2 in the same chat/project/workspace, preserves the old unknown execution, and rejects the old worker's late `apply()`.
  - Edited retry uses the edited prompt and remains the same chat/project/workspace.
  - Delete blocks an active lock, removes the project from Dev Squad's list, leaves workspace files, and preserves execution/reservation records.
- Project-connection tests confirm newly created projects are writable and existing folder registration remains read-only until explicitly enabled.

### Dashboard simulation (real UI, simulated workers)

Evidence: `docs/verification/studio-retry-delete-20261107/result.json`, `retry-delete-simulation.png`.

Checks passed:

- New project writable by default; first prompt Send returned 202 with no settings change.
- Immediate warning came from the new failed attempt; lock was released; no “folder stays locked” message.
- Copy preserved the multiline prompt; separate browser verification recorded `Prompt copied.` and Windows CRLF-normalized text. The dashboard’s strict LF comparison was false because Windows clipboard normalizes newlines to CRLF.
- Retry started attempt 2 in the same chat/project/workspace; no lock remained.
- Edit & Retry loaded the prompt into the same input; edited Send started attempt 3.
- All three builder attempts and two `retry_started` records were distinct; final file was from the fresh attempt.
- Delete Project confirmation and action removed the project from the dashboard after reload.
- Workspace file remained; project/chat/execution/reservation/deletion records remained.
- No page JavaScript errors; `liveModelCalls:0`; simulation only.

The production recovered chat was opened read-only after restart: it has Retry, Edit & Retry and Copy controls, status `paused`, released write access, and no lock warning (`production-retry-controls.png`).

### Production state

- `schema_migrations`: **20**.
- `PRAGMA integrity_check`: `ok`.
- Only the historical native Counter lock remains. Both Expense sessions are paused with released write access; their unknown executions and reservations (`$0.007748`, `$0.007676`) remain.
- Pre-restart backup: `backups/backup-1794089421973-c810c558-7ca5-4427-818f-48b695d3c77c.sqlite`.

## 4. Exact dashboard steps to verify

1. Open **Projects** → **Create New Project**, name it, and create it. Do not open Project options.
2. Open the project, type a multiline prompt, and press **Send**. A newly created project should be writable; Send should be available without enabling agent changes.
3. If the worker fails/returns an unknown outcome, the warning should say `Worker outcome is unknown. No verified checkpoint was saved. Write access was released...`, not “folder stays locked.” Send should remain available and the folder should have no lock.
4. On a sent prompt, click **Copy**; paste into the composer or another text field and confirm line breaks survive.
5. Click **Retry**; confirm the same chat/project/workspace, a new `retry_started` event, a separate execution, and no lock between attempts.
6. Click **Edit & Retry**, edit the loaded text, and press Send; confirm the edited prompt starts the next attempt in the same chat.
7. Open **Projects** → the project’s **Project options** → **Delete Project**. Confirm the dialog says the project is deleted from Dev Squad, workspace files remain, and run/charge records are retained. Click Delete; reload the dashboard. The project should be absent from the list while its workspace files remain.
8. For a read-only project, open Project options and confirm the displayed reason matches the explicit access toggle or the actual folder permission.

## 5. Limitations

- The old bounded team-send approval remains in the recovered chat’s history. It is not treated as successful and is not retried; a fresh attempt uses a new request/scope.
- The historical Counter lock has no execution/process identity and remains blocked by design.
- Windows clipboard normalizes LF to CRLF; the prompt text and line structure are preserved.
- No live model/provider, commit, push, merge or deployment was performed in these dashboard checks. The verification workers and Zapier path were simulated.
