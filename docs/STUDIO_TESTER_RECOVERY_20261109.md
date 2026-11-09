# Tester recovery and live output

## Read-only diagnosis

The affected chat is `a725f4e8-899d-4a29-925c-5876f40df749` in demo 3 project `7c4d3f9e-2fde-432f-b596-d2dab868f251`. All times below are Eastern on November 9, 2026.

- The last actual School Tester execution, `ea3ba8d9-0cb5-4c47-a5f4-c11173e0312c`, ended at 10:26:34 a.m. with `inactivity_timeout`. The retained CLI line was “Reading additional input from stdin...” The later 12:38:44 p.m. School warning was `provider_unavailable` with no new execution.
- The owner saved Personal as Tester at 12:39:56 p.m. The subsequent requests `f7aa27a4-b352-4d6a-9be2-a5d2c6b3dc12`, `47ac2d11-4552-43a9-8113-77818b8d770b`, and `52969adc-5e77-4799-9ec9-8739d4c5bbfd` named Personal, then all ended as `provider_unavailable` before creating an execution. The three warnings therefore cannot establish a fresh login, quota, CLI, or connection failure for Personal.
- The earlier role-save code only refreshed a paused Reviewer by returning to Tester. The corresponding Tester case kept both the old failure and the cached unavailability entries, even when the role changed.
- The Rebuild request `6ef562fb-d546-4b87-bee1-646253369ad6`, execution `956b1def-97fc-47c7-afca-35e13fc8a986`, received HTTP 200 and crossed the raw stream limit after about 42 seconds. Its retained metadata shows `body_limit`, no confirmed stream completion, no finish reason, and no final usage. There was no completed visible reply to retain or apply. Write access was released. The unresolved local reservation of $0.014407 is not an actual charge. Rebuild had no council permission in its request and no council convened.
- The following request, `1be68837-7bd6-4f81-8971-eb04e862b608`, did save a Builder result at 12:43:45 p.m. `index.html` kept the same page title and grew from 109 to 159 lines, or 2,762 to 5,516 characters (`4ad92d2e9bfe` to `d687cb694f44`). `scene.test.cjs` went from eight to six test declarations and from 4,225 to 3,529 characters (`35fa149c33c0` to `9f724313b3c4`). The failed Rebuild and role save did not write either file.
- The Tester was skipped because the earlier unavailability list survived Retry. The error handler then reused the previous Builder execution `c1c8c7f2-5017-4bf9-90be-914382c17a10` and its pre-build fingerprint `8bb5052673dd`. The actual folder matches the later saved Builder fingerprint `23f182719b8e`. The current resume plan was verified read-only and points to Tester on the saved files.

## Repair

Saving a new role clears that role's stale availability warning and cached availability flags. The failed checkpoint and historical execution remain available. A fresh Retry checks availability again. The failure handler now resets the execution identity at each stage boundary, so a failure before dispatch cannot alter the prior stage's execution or borrow its earlier checkpoint. Older records are recognized only when the same request has one Builder execution, a recorded file save, and a matching later Builder checkpoint.

The file guard compares a saved manifest of paths and hashes for new failures. It lists additions, removals, and edits and offers a text comparison when the saved revision and current file can be read safely. It labels incomplete older records and keeps Retry blocked when the checkpoint genuinely differs.

A normal dashboard Send or Retry with automatic handoffs enabled tries the assigned worker first. For confirmed availability failures, it tries Nemotron next and then the existing registered-worker order, without requiring those workers to have been in the saved team list. Existing model checks, exact run scopes, independence, Stop, and unknown-outcome protections still apply. An explicit handoff opt-out and older fixed approval scopes retain their limits. Completed-but-invalid replies remain on the separate council and owner-offer path.

The conversation and Live Agent Workspace show plain descriptions of starts, handoffs, test outcomes, council work, and pauses. The original event data remains available under Technical details and in development output. All verification used local fixtures and a read-only check of the owner session.

## Verification

The new backend tests reproduced the stale role warning, rejected fallback authorization, and generic checkpoint message before implementation. The live-language test also failed before implementation. The focused regression suite passed 104 of 104. Chrome then exposed a stage-label mismatch between the unit fixture and real events. The UI now reads the actual `activePhase` field as well.

Playwright Chrome showed a disposable file guard naming `app.mjs`, blocked Retry, and opened a comparison with the original and modified text. After restoring the fixture file, saving Personal as Tester and clicking Retry created execution `10b58579-c4d0-4776-b934-af6df1d3e603`, distinct from the failed School fixture execution `9a13c253-7a40-4500-991f-182bf5e996db`. The Builder was not rerun. In a second disposable project, the visible conversation and Live Agent Workspace showed the automatic switch from School to Nemotron. Two local independent tests passed and the session reached Awaiting Owner after simulated review. Chrome also opened the original technical handoff event beneath the plain output and reported no page errors. No live provider calls were made.

The first complete suite passed 793 of 795. It caught that the live pane hid events without plain labels and that the saved fallback reason wording had changed. The live pane now groups those events under Other technical events and the original fallback wording stays in the technical record. A fresh final focused run passed 65 of 65, including both regressions.

The final serial Windows suite passed 795 of 795 with exit code 0. After a verified SQLite backup, the regular backend restarted from PID 3392 to 37676. Health and dashboard returned HTTP 200. All 67 application tables matched, SQLite integrity was OK, 22 migrations were recorded, and there were no active executions. A GET-only Chrome visit to the original demo 3 chat confirmed it is still paused on request `1be68837-7bd6-4f81-8971-eb04e862b608` and its Retry Tester stage button is visible and enabled for Personal. The owner session was left untouched.
