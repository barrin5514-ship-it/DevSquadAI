# Manual Copy-Paste Handoff Log

## Totals

- Number of handoffs: 10
- Total minutes:

Times were not recorded for the entries below. Minutes spent is left blank for the owner to fill in. Historical results are owner-reported unless identified as verified by Codex.

At the end of every future task, append one row and update the handoff count. Preserve earlier entries and the owner's timing notes. This manual handoff log is separate from the existing root-level technical prompt log.

| Date | Time | From | To | What the prompt asked | Result | Minutes spent |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-03 | | Owner | Claude Code | Check the Codex sandbox and whether anything is locked. | Owner-reported: passed; nothing locked. | |
| 2026-11-03 | | Owner | Codex | Prepare the live demo and check tests and included usage. | Historical report supplied by owner: 311 tests; usage check pending; not ready. | |
| 2026-11-03 | | Owner | Codex | Retry the remaining live-demo blockers. | Historical report supplied by owner: sandbox error returned. | |
| 2026-11-03 | | Owner | Claude Code | Find the source of the sandbox lock. | Owner-reported: traced to the old 0.161 setup program. | |
| 2026-11-03 | | Owner | Claude Code | Update Codex CLI from 0.161 to 0.166 and recheck the sandbox. | Owner-reported: CLI updated; sandbox passed 3/3. | |
| 2026-11-03 | | Owner | Claude Code | Update the Codex daemon to 0.166 and recheck the sandbox. | Owner-reported: daemon updated; sandbox passed 3/3. | |
| 2026-11-03 | | Owner | Codex | Retry blockers after the update; finish review import and enable safe demo isolation without starting the job. | Codex-verified: sandbox isolation passed 8/8; full suite passed 321/321, final targeted checks 5/5; review import passed; demo launcher ready. GitHub reader token and webhook setup remain. No live job started. Committed and pushed as 128088b. | |
| 2026-11-03 | | Owner | Codex | Create this manual handoff log, add known history, and commit and push it. | Created this log with seven historical entries and this task entry; unknown times and all minutes left blank. | |
| 2026-11-03 | | Owner | Codex | Identify the exact local file and placeholder settings for the GitHub read-only handoff token; confirm Git exclusion. | Verified adapter settings: GITHUB_HANDOFF_TOKEN and GITHUB_HANDOFF_READONLY_CONFIRMED. Local .env is excluded by .gitignore line 2 and is untracked. No credentials displayed or requested. | |
| 2026-11-03 | | Owner | Codex | Check GitHub handoff reading and read-only permissions, webhook readiness, and prepare inactive demo scopes without starting the job; run serial tests, commit and push. | Saved token read succeeded (HTTP 200); running dashboard still reports token absent. Write restriction unverified without token-settings evidence. Webhook empty/off. Saved inactive scoped payload template; zero scopes or worker attempts. Full serial suite 322/322 passed; template passed 11 offline assertions. No job, Zap or paid request started. | |
