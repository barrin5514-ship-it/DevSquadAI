# Overnight addendum — Zapier fallback and bulk project delete

Date: 2026-11-08

## Part A — Zapier failure/timeout fallback: IMPLEMENTED

### Behavior

- When `STUDIO_ZAPIER_HANDOFFS` is on and the delivery fails (`failed`/`unknown`) or the callback wait times out, the handoff is marked `local` with `detail.fallback:true`.
- The run continues through the existing local checkpoint transition, without a second role or a duplicate worker.
- A late callback for a locally-fallen-back handoff is rejected because the handoff is no longer `sending`/`sent`.
- Fully-local mode still uses local handoffs directly.

### Tests

`tests/studio-handoffs.test.js` — 10/10 passed:

- **“a dead Zapier target falls back to local handoffs for both builds and rejects replay”**
  - Two-build cycle ends at Awaiting Owner.
  - Both handoffs are local with fallback reason.
  - Replay callback returns 409 and adds zero worker calls.
- **“a Zapier callback timeout falls back to local for both builds”**
  - No callback is delivered; both waits time out; both builds continue locally.
- **“fully local mode completes the same two-build cycle without any Zapier delivery”**
  - Zero webhook calls.

The live `.env`, Zapier URL and callback token were not changed; simulations use temporary app instances and dead/no-callback fixtures.

## Part B — Bulk project delete: IMPLEMENTED

### UI

- Checkbox on every project card.
- **Select all visible** control (respects the project search filter; indeterminate when partial).
- **Delete selected (N)** action.
- One confirmation dialog names the number of projects and warns that running/stopping projects are skipped.
- Deletion loops through the existing `POST /studio/projects/:id/delete` path, one project at a time.
- Results dialog reports each project as `deleted` or `skipped` with the reason.
- Skipped projects remain selected; deleted projects are cleared.
- No new force-delete or mid-run deletion path was added.

### Tests

- `tests/projects-ui.test.js` — 3/3 passed, including:
  - **“bulk delete selects multiple projects, confirms once, deletes each through the single-project path and reports skips”**
  - Selects exactly two of three projects; asserts only those two delete calls occur.
  - Simulates one active-run failure and verifies one confirmation, one deleted, one skipped with reason.
- `tests/studio-retry-delete.test.js` — 4/4 passed:
  - **“deleteProject refuses a running or stopping project instead of force-deleting it”**
  - Existing soft-delete test remains green.

## Tests and backend

- Part A focused: 10/10.
- Part B focused: 3/3 + 4/4.
- Browser: on `#projects`, selected all visible with the bulk control; the action changed to **Delete selected (2)**; one confirmation appeared and was cancelled without deleting real projects. Screenshot: `bulk-delete-ui.png`.
- Full serial suite after the browser-only bulk fix: **753/753 passed, 0 failed** (`full-serial-addendum-final.txt`).
- Backend PID **15160**, health **ok**, migrations **22**, lock rows **0**, running/stopping chats **0**.

## Commits

- `dcf0633` — Zapier local fallback.
- `5ef20fb` — bulk project delete UI/backend coverage.
- `a12146e` — browser `HTMLCollection` select-all fix.

All pushed to `feature/workspace-ui-redesign`.

