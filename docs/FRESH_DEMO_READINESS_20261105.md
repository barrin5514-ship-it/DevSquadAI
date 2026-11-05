# Fresh redesign demo — November 5, 2026

## Owner direction

The owner explicitly removed the active project workflow's DeepSeek dollar cap, per-request spending/output cap, task authorization expiry and separate money-approval setup. Send starts the selected prepaid workflow. No Send/Run was pressed during preparation.

Removed the active StudioBudget service, its browser endpoint and its UI. Existing historical policy/reservation rows and migrations are retained as audit history, not permissions. The older retired scoped-review pipelines are not invoked by the regular project runner.

Kept Stop, three-consecutive-problem stuck detection, folder locks, project boundaries, duplicate-execution protection and independent review. Transport memory/time bounds and provider defaults remain technical limits. No global paid fallback, other provider routing, billing settings or credentials were changed.

## Usage tracking

Every new DeepSeek attempt records its execution/model before dispatch. Provider tokens and calculated costs persist even if returned application JSON is invalid. Missing usage remains unknown, including an interrupted run; it is not invented as a zero charge. Historical DeepSeek worker-report costs remain visible. Execution IDs prevent duplicate accounting. Live Workspace displays recorded calls, known tokens, known estimated USD and unknown counts. This is estimated accounting, not a provider invoice.

## Official price check

Source checked November 5, 2026: https://api-docs.deepseek.com/quick_start/pricing/ . Exact model: deepseek-flash. Peak uncached input rate: $0.30 per million tokens; peak output: $1.20 per million. These match the configured estimation rates. Higher applicable peak rates are used conservatively even when off-peak discounts may apply. No provider authentication or generation request was used for this public check. The active project runner has no pricing-lease authorization gate. Provider balance is not claimed freshly verified.

## Fresh owner-run workspace

Project: FRIDAY DEMO · Fresh to-do app · redesign · 2026-11-06
Project ID: 27453fc9-75d8-468a-a42b-b25e44a62a69
Session: FRESH LIVE DEMO · To-do app · 2026-11-06
Session ID: 1b28625d-db6a-4117-9879-52f7da5dace1
URL: http://127.0.0.1:3000/team#project/27453fc9-75d8-468a-a42b-b25e44a62a69/chat/1b28625d-db6a-4117-9879-52f7da5dace1

DeepSeek Builder; Codex Tester; Claude Code Reviewer. Separate empty managed folder. READY, no request ID, zero executions at preparation. Original Counter remains paused/locked in history; the earlier Friday task remains unstarted.

1. Open the URL above.
2. Type: Build a simple dark-themed to-do app with add, complete and delete, plus independent tests.
3. Press Send.

Send can consume the existing DeepSeek prepaid balance without an app spending cap. No agent execution was performed to prepare this workspace.

## Verification

Focused new behavior/safeguards: 34/34 passed. Full serial suite before the historical-usage regression: 483/483 passed. Final suite including historical-cost preservation: **484 passed, 0 failed, 0 skipped**, 141.02 seconds. Log: TEMP/devsquad-send-usage-final-20261105.log.

Actual local Chrome/Playwright checked the fresh main-app URL, selected roles, enabled Send, visible usage records and absence of budget controls. GET/HEAD requests only, zero browser writes, zero JavaScript page errors, no Send. Screenshot: fresh-friday-demo-ready-20261105.png in the local visualization folder.

## Master backup boundary

Master remains 79749aa. An isolated git-archive snapshot using a separate temporary database returned HTTP 200 for /team and /api/console/studio, with all provider requests disabled. This verifies startup/API fallback only. It is not proof of live three-agent operation or compatibility with the production database. Switching to master alone must not be described as a fully verified live-demo recovery plan.

The redesign snapshot was committed as cc5f2e3; follow-up commit and final push are recorded in the final handoff. No master changes, merge, deployment, credit purchase or live AI requests.
