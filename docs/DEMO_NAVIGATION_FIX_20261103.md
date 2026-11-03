# Big Three demo navigation fix — 2026-11-03

Open: http://127.0.0.1:3000/team#demo/b5e4176a-ad93-4614-8980-e07ab63bf320

## Confirmed cause

The actual to-do task (34076590-93a0-496d-9238-acd8ccb0502b) already belongs to shared job b5e4176a-ad93-4614-8980-e07ab63bf320, and its messenger loop is ready at round zero. The Project Workspace used the legacy free-provider assignment view rather than the bound job's role controls. Scope/Start consent existed under AI Team, but had no task-page link or reloadable direct URL. No database repair, new job, duplicate task or provider activation was needed.

## Targeted UI changes

- A reloadable job-ID-specific demo URL opens the existing scope-consent and messenger controls.
- This task now shows Open Big Three demo controls and the existing Builder/Tester/Reviewer pickers (DeepSeek, Codex native profiles, Claude Code), Save job roles and Rotate roles.
- Reused the existing role-control renderer and exact saved-job/version endpoint. Assignments are not execution or spending permission; backend no-self-review, scope binding and role eligibility remain authoritative.
- Only an actual task-to-job relationship plus prepared-demo binding selects this UI. Matching names or arbitrary URL IDs do not qualify. Other tasks retain their existing UI.
- Legacy free assignment and free-capacity resume controls are suppressed for this demo. Backups remain parked; no backend provider registry changes.
- Opening either view performs no scope preparation, Start, provider call or acceptance. Scope preparation and loop Start each retain their distinct consent. Stop stays available; refreshing active demo history uses only the existing local read path.

## Evidence

The regular server serves the updated dashboard script, and /team returns HTTP 200. API verification confirms the same task/job, job ready, messenger round zero, and zero execution scopes. No workers, paid/native calls, Zap or loop were started. UI interaction evidence comes from DOM regression tests, not a claimed visual browser inspection.

Tests cover task-to-job linking, reload/direct URL, actual role controls, unrelated tasks, version-bound role saves, blocked-demo fallback exclusion, scope consent and owner acceptance. See DEMO_NAVIGATION_TESTS_20261103.txt and DEMO_NAVIGATION_TARGETED_20261103.txt for counts/results.

## Owner action

Open the URL above, or refresh the saved development task and select Open Big Three demo controls. Configure/enable the webhook in AI Team separately after any backend restart. Check the exact scope consent and select Prepare approved demo scopes only when ready for the fresh approval window; then separately consent to Start messenger loop. Nothing was prepared or started by this change.

Local results: full supported serial suite 327/327 passed (126.176 seconds; zero failed/skipped/cancelled). Final targeted navigation checks 6/6 passed, including the additional blocked-demo regression; this added check was run separately from the full suite. Syntax and diff whitespace checks passed.
