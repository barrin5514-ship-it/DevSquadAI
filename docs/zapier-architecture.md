# Messenger loop — approved Week 8 implementation

## Brief and requirements
Build the Dev Squad side using mocks only. Send a cleaned report after each successful role; use the private `handoffs` branch as a single mailbox; accept exactly the expected job/completed round/next role once; preserve role rotation, failover, independent review, spending controls and final owner acceptance. Stop, round cap (default 3), wait deadline (default 300 seconds), and visible round evidence are required.

## Architecture
- The existing coordinator gains an internal one-step mode. It keeps its locks, snapshots, contributor identity, failover order and paid guard. Generic live adapters are still absent. A successful worker report is not a verified artifact or an accepted business task.
- Additive migration 010 stores one loop per shared job, immutable cleaned reports/accepted prompts, delivery state and append-only events. A unique active-loop index prevents two jobs competing for the one mailbox.
- A report is durably saved and its delivery attempt reserved before POST. Unknown outcomes pause and cannot be resent automatically. Only the exact HTTPS Zapier host is allowed, redirects are rejected and timeout/cancellation are bounded.
- The GitHub reader uses only GET, one fixed repository/file and `ref=handoffs`, a separate local fine-grained token, bounded response size and a verified Git blob hash. It does not use GitHub CLI credentials. Owner-attested read-only settings are distinguished from independent permission verification.
- Incoming JSON must have exactly jobId/round/nextRole/prompt. One atomic transaction binds it to the waiting round before dispatch. Its text is untrusted task data and cannot change role independence, budgets, owner gates or allowed tools. Stale/duplicate/unrelated messages do not dispatch work.
- Background polling occurs only for a started waiting loop, every ten seconds, until its deadline. Stop aborts pending I/O, fences old workers and prevents a next dispatch. It cannot undo a report already accepted by a third party. On backend restart, waiting/unknown work pauses; explicit unexpired waiting resume does not reset the deadline or resend a report.
- Credentials, common credential encodings/labels, file paths, common source filenames, URLs and IP address forms are redacted before storage in the messenger report and before transmission. Only summary/goal/progress/issue text and a test-item count are included; no source-file payload or raw execution log is collected. This does not guarantee detection of arbitrary unlabelled secrets. Review the sanitized pilot payload before approving live sharing.

## Small stories and test gates
1. Inspect/backup/baseline. Supported backup before migration; initial serial baseline 275 passed.
2. Clean outbound report and fixed read-only GitHub reader. Test credentials/paths/addresses, wrong hashes, bounds and no-token/no-request behavior.
3. Durable bounded loop and one-step coordinator. Prove three mock roles, saved continuation, independent review/failover, stale/duplicate/racing prompts, Stop during workers and reads, deadlines, unknown delivery and restart.
4. Dashboard controls/history plus setup instructions and proposal. Test Stop while busy, exact endpoints and defaults; visually inspect the regular dashboard without starting a live loop or sending a setup ping.
5. Serial full suite, preservation/secret review, scoped commits and private pushes. Initialize an inactive handoff branch without switching/resetting the current working tree; never overwrite an existing mailbox branch.

## Live boundary
No actual Zapier receiver, GitHub pickup, AI generation or model job is exercised by these tests. Mock worker reports explicitly say simulated; test-run evidence comes from Node’s real local runner. A first live run needs account setup, live worker/isolation integration and the existing exact-task paid authorization where applicable. The one-shot hello authorization is exhausted and unrelated to this loop.
