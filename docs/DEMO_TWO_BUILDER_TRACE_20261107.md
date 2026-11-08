# Demo Two Builder trace

## What actually happened

The records identify project `56ac47b1-4472-45c8-a2b2-2de155332817`, named `demo 2`, and chat `700fed1b-60ce-4bde-812a-cee27b6f624e`. This is the existing folder and chat.

At November 7, 19:21:44.003 ET (November 8, 00:21:44.003 UTC), event 409 saved the request for a tiny button that changes the page background. No new run-request or execution was recorded for that message. The browser handler saved the text, then reused the selected paused session's previous run-approval request ID. The existing Run deduplication returns the old failed attempt for that ID. There is no saved HTTP access log proving a separate failed browser call, but the handler and records establish why saving a new message could leave the owner looking at the previous result.

The previous attempt was an Expense Tracker request from November 7, 16:41 ET. Its local run/request ID was `15f01a07-3698-4b28-8fdd-e3037ccd70b4`; execution `cbbe63d1-9060-4fcf-841b-ea24d9ba9803` recorded HTTP 200, failedCheck `body_limit`, completionObserved false, no finish reason and no reported usage. Its raw and visible byte counters were not retained, so those values remain unknown. This older unknown result must not be attributed to a newly dispatched button task.

Two later owner retries are recorded, with fresh execution IDs in the same chat.

| ET on November 7 | Local request/run ID | Execution ID | Recorded outcome |
| --- | --- | --- | --- |
| 19:24:11.952 accepted, API started 19:24:16.791 | 3f297bfd-1693-402e-ac8e-2d6344deed98 | 0467d642-f269-4f18-8c3c-5c1332a44172 | HTTP 200, finish_reason length, DONE true, failedCheck finish_reason, 17,502 ms adapter duration |
| 19:25:39.099 accepted, API started 19:25:44.952 | 5478f64b-304a-4b32-9c27-fd7c25f97f00 | 7261bfc1-aecc-41c3-91a9-adacf166c5b3 | HTTP 200, finish_reason length, DONE true, failedCheck finish_reason, 17,320 ms adapter duration |

The first retry used source event 341, the old Expense Tracker message. The second used source event 411, the first retry of that same Expense Tracker message. Neither retried event 409's button task. The records contain two evening retries even though the owner recalled one.

The first retry reported 1,186 input and 4,096 output tokens (5,282 total) and reached 14,460 visible characters. The second reported 1,194 input and 4,096 output tokens (5,290 total) and reached 13,509 visible characters. Character counts are not byte counts. Raw and visible byte counters are unknown in both saved executions. Both are recorded failed, terminated and remoteOutcomeUnknown false. Neither was a timeout, backend restart or missing-DONE event. Stream completion and successful artifact completion are different checks.

The folder lock belonged to this chat, linked through its writer lease to the corresponding execution. The first evening lease was released at 19:24:34.473 ET and the second at 19:26:02.492 ET. There is no current folder lock for this chat. No complete file revision was applied.

## Classification

**(a) Dev Squad bug.** A fresh Send in a paused conversation reused the old request identity after saving new text, so it did not dispatch that new task. Completed provider responses truncated by the requested 4,096-token bound were subsequently described as generic invalid responses. The provider explicitly supplied `length`, DONE and usage, and the evening execution records already distinguish those failed attempts from the older unknown outcome. There is no evidence of a local machine/network failure in these two attempts.

## Small repair

The composer now routes a new Send in a paused team chat through the existing same-chat continuation endpoint, using the newly entered prompt, a fresh request identity, and the version returned after saving it. It does not create a project or session. DeepSeek `length` is classified as `response_truncated` and receives a plain-English message explaining the requested output-token limit. It remains an incomplete artifact and does not trigger a transport retry.

ANSWER_LIMIT remains 512000 and RAW_LIMIT remains 2000000. The 4,096 requested output-token bound, existing continuation/correction/fallback logic, accounting, and locks are preserved. No production history or old execution was rewritten.

Focused regressions cover the paused-chat Send dispatch and the exact terminal-length pattern with 4,096 reported output tokens. The focused suite passed 42 of 42 tests.

## Final verification and owner action

The full serial suite passed 696 of 696 tests, with zero failures, cancellations or skips. The commands were:

```powershell
node --test --test-concurrency=1 tests/conversation-ui.test.js tests/studio-team-budget.test.js tests/studio-continuation.test.js tests/studio-correction.test.js
node scripts/test-serial.js
```

After confirming zero active workers, a supported verified online SQLite backup was taken. Only verified Dev Squad PID 24084 was stopped. The documented startup entry point started PID 34812, and the dashboard returned HTTP 200. All 21 migrations were applied, integrity was ok, foreign-key errors were zero, and running chats remained zero.

All production table hashes other than the runtime lease matched before and after restart. All registered workspace fingerprints matched. Demo Two retained its exact chat, three historical executions, paused status and released lock. Expense Tracker records and all reservations were preserved.

Read-only Chrome verification found the same Demo Two chat, no lock, an available continuation plan, a visible enabled Send button, the updated composer asset, zero browser errors and zero attempted writes. No provider or callback request occurred.

The owner should refresh the same Demo Two chat, enter the exact tiny button-page task into the composer and press Send once. This avoids replaying either old Expense Tracker prompt's Retry stage control. A new attempt should appear in this same chat and folder. Historical failed entries will remain. A truncated future response should clearly say it reached the requested output-token limit. Only an owner-run live attempt can establish successful generation and subsequent handoffs.
