# To-do demo recovery — November 5, 2026

Status: local functionality verified; real AI rerun blocked until the dedicated Codex profile is signed in. No maintenance Send, model generation, review, or balance/model HTTP request was made.

## Confirmed failure

Failed project: 27453fc9-75d8-468a-a42b-b25e44a62a69. Session: 1b28625d-db6a-4117-9879-52f7da5dace1. The original session is now STOPPED through its supported Stop API, with files, usage, execution errors and revisions preserved. No lock belonged to this failed run. The original Counter lock (session fc00a59b-c31e-4b93-b448-35ebbc0de048) was not released.

DeepSeek execution 2017bc79-bcf3-4d31-bb1c-9661b789417a completed. First Codex execution 55a0f2ff-aaa6-4a78-b42d-ef8b118a898c failed its native-login preflight. Resumed execution b8af19da-30b6-4711-bdbb-44c84b3d63e9 exited 1 after 60,465 ms, before any Codex report, independent test execution, or Claude review. Its old transport discarded error text; the precise exit-1 cause cannot be recovered. Account switching explains the first login failure, but is not proof of the second exit's exact cause. The chat did not reflect SSE terminal state, which let an already-ended attempt look active.

Inspected the saved todo.js/todo.test.js and ran the eight Builder-supplied tests in the existing MXC test copy: 8/8 passed. Source fingerprint cdf18e8f599ad5b65f5ac7d187e8d2db62d1d5608632762ed0052002733e53c6. This maintenance check was not recorded as independent Codex testing. No demonstrated application/test bug caused the recorded failure. Existing real failing-test handling returns to Builder; three recurring failures pause instead of looping forever.

Saved old usage: 1 DeepSeek call, 592 input / 960 output tokens, $0.0013296 locally estimated historical cost. No fresh billing/balance check; this is not a statement of current provider balance.

## Repair

- Native login checks are asynchronous and bounded. Each project run checks selected native logins before starting Builder, avoiding a paid draft followed by a known missing Tester login.
- Personal and School use separate CODEX_HOME directories outside project source, file credential storage, and forced ChatGPT native authentication. No credentials were copied. New directories have restricted Windows ACLs. Each dispatch reads its selected home afresh; login/profile switching needs no backend restart.
- Native error categories, exit code, byte counts and timing are retained; raw logs, hidden reasoning, emails and tokens are not. Unknown exits remain unknown rather than invented causes.
- Confirmed usage-limit failures can switch once to the other signed-in Codex profile on the same saved step. Both profile attempts and the time/from/to/reason are durable. No ping-pong, unknown-outcome failover, fallback to API-key billing, or Codex self-review across profiles.
- Three minutes without worker output (native CLI or DeepSeek response bytes) pauses work, with a clear chat alert. An unconfirmed process-tree stop retains the folder lock. Actual output renews the idle timer; SSE connection heartbeats do not.
- Chat shows active worker/profile, phase and actual last activity; updates preserve typing. Stop is also in the composer. Messages typed during active work can be queued locally; they do not mutate an in-flight goal or start a second worker. An explicit subsequent Run of that unfinished session applies them.
- The composer shrinks to a one-line editable field, keeps Stop accessible, and remembers the preference in local storage.
- Personal/School selectors and Check Codex logins appear in Team. Saving roles keeps existing version, scope and no-self-review checks.
- No spending cap, quote/reservation gate, persistent routing or acceptance change was introduced. Token/cost tracking, mediated project files and the MXC test boundary remain.

## One-time owner login

Neither dedicated login file was present in the last local check. Owner reported Personal already signed in, but that may refer to the app/default CLI home. The dedicated checks returned not logged in for both. Do not claim native readiness until Check Codex logins succeeds.

Run these in PowerShell, signing into the intended account in each browser flow. No API key is required. These commands never print a token:

~~~powershell
$env:CODEX_HOME = "$env:USERPROFILE\.devsquad\codex\personal"
& "$env:USERPROFILE\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe" -c 'cli_auth_credentials_store="file"' -c 'forced_login_method="chatgpt"' login
Remove-Item Env:CODEX_HOME

$env:CODEX_HOME = "$env:USERPROFILE\.devsquad\codex\school"
& "$env:USERPROFILE\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe" -c 'cli_auth_credentials_store="file"' -c 'forced_login_method="chatgpt"' login
Remove-Item Env:CODEX_HOME
~~~

Only the logged-in profile is usable. School fallback needs its own successful login. Subscription usage remains subject to account limits; native authentication is not proof of unlimited usage. Official references (checked November 5, 2026): https://learn.chatgpt.com/docs/auth and https://learn.chatgpt.com/docs/config-file/environment-variables .

## Fresh demo

Project a277f977-2ccd-40df-adfa-f02757f0ec3b: FRESH RETRY · To-do app · 2026-11-05.
Session b6b2893d-987e-448b-ac67-16b66042e179: Fresh to-do demo — ready for your task.
http://127.0.0.1:3000/team#project/a277f977-2ccd-40df-adfa-f02757f0ec3b/chat/b6b2893d-987e-448b-ac67-16b66042e179

READY with empty goal, no files/executions, DeepSeek Builder / Codex Personal Tester / Claude Code Reviewer. Type the requested task and Send only after native login checks pass. Maintenance did not press Send or accept work.

## Verification evidence

Supported SQLite backup before work: backups/backup-1793906556289-08ec0195-fde0-47b8-97d9-acede1235984.sqlite. No migration or reset.
Targeted serial checks: 63/63. Final full serial suite: 500/500 passed, zero failed/cancelled/skipped, 265.65 seconds. Full output: docs/verification/todo-repair-tests-20261105.txt. Earlier full runs passed 496/496 and 497/497 before the last browser-driven fixes.
Tests explicitly simulate quota handoff, both exhausted profiles, unknown process outcomes, no-self-review across profiles, safe failed-run close, message deduplication/context, sanitized diagnostics, idle-timer output renewal and no Builder dispatch on missing login.

Browser verification uses the owner's previously requested installed Playwright/Chrome. Production page is inspected read-only; active typing/queue/Stop run only in a separate mock database. Mock events are not real AI evidence. The initial verifier had a label-selection/early-load race and checked the queue database before its HTTP response; these verifier errors were corrected. Browser testing found and fixed CSS overriding hidden field/button state, Stop being suppressed by the global busy flag during saves, and the role picker submitting a stale captured session version after live events. Stop now works independently of other saves; role saves use the latest received session version while retaining optimistic preference/version checks. All 12 final Chrome checks passed, including mock-only queue HTTP, no duplicate execution, Stop, and School selection saved/reloaded. No production Send or role save occurred. Screenshots: C:/Users/barri/.codex/visualizations/2026/10/20/01a15721-9f6d-7e52-9209-7d64d043b76c/todo-repair-20261105 .

A restart was initially blocked by automatic review because process identification was too broad. No unrelated process was stopped. Read-only evidence then established the DevSquadAI database lease, PID and exact process creation timestamp, after which the verified backend alone was restarted. Active job count was zero; Counter history/lock remains preserved.


## Additional functional verification

Existing scripts/verify-studio-local.js passed: three deterministic local Node workers, actual 8-test MXC execution, independent review binding, preserved owner gate, safe Windows process reconciliation, and persisted history/results after a supported restart. Zero provider requests. This is an end-to-end local simulation, not actual Codex/Claude model execution. Claude native subscription authentication checked successfully, category only; remaining quota was not measured. Both dedicated Codex logins remained absent in the last check, despite owner confirmation of Personal elsewhere.

Final restart/API checks: dashboard HTTP 200, new session READY with empty folder and zero executions; old failed session STOPPED with 52 preserved history events. Original Counter lock is still present. Native subscription authentication for Claude passed. No live inference was attempted; dedicated Codex profiles still require owner login. Master remains 79749aa. Rollback should revert code on the feature branch; do not reset or delete database records or login folders.
