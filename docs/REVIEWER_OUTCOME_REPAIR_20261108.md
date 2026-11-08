# Current demo 2: Reviewer outcome investigation and repair

## Plain-language finding

The Reset implementation and four passing tests were saved. Claude's review
connection then exceeded Dev Squad's small local output capture limit. Dev
Squad had requested verbose, partially streamed messages, so capture counted
stream framing and partial messages toward the same limit as the final answer. It stopped
capture before it could validate a completed review. The process exited, but
the requested process-tree kill was not confirmed. Pausing rather than guessing
that a review succeeded was correct; the unnecessarily verbose capture mode
was the application defect.

Claude Reviewer calls now request the existing supported final-JSON mode.
The 65,536-byte capture limit remains unchanged. Builder and Tester transport
behavior is unchanged. A Reviewer-stage retry is now bounded to one invocation
of the assigned Reviewer: no correction Builder, Tester, fallback or role swap.
Findings or usage errors pause cleanly. Normal team Sends retain their existing
automatic corrections and eligible fallback policy.

## Original execution evidence (all timestamps below UTC)

- Project: `889fc13d-d8ef-479e-9618-217ab730789d`, active `demo 2`.
- Chat: `79a91bf8-d940-415e-a92b-98e38638dff7`.
- Request/logical run: `88e95cd7-16db-4ca7-975b-5a4d40a3dabd`.
- There is no separate run-ID column. The durable `run_requested` event is
  **5257**, recorded `2026-11-08T19:16:02.394Z` (14:16:02 Eastern).
- The starting Git tree was clean at `30f8858`; running backend PID was 19624,
  started at 13:36:49 Eastern before this rehearsal. Recorded launch arguments
  match the original DemoCliTransport code path. No runtime ESM-module
  fingerprint endpoint exists, so an independently captured in-memory source
  hash is unavailable.

| Stage | Agent | Execution ID | Recorded startedAt | End/completion | Status |
|---|---|---|---|---|---|
| Builder | DeepSeek | 9d4d8f3a-1171-4409-9786-29da72b2281a | 19:16:06.806 | 19:16:16.406 | completed |
| Tester | Codex Personal | b7cba563-810d-4854-8e3a-02c1f5b0ba6b | 19:16:41.435 | 19:17:20.314 | completed |
| Isolated tests | application-tests | 3c41a0cd-0022-42ae-bc51-3e958eda948e | 19:17:32.220 | 19:17:33.543 | completed, exit 0 |
| Reviewer | Claude Code | bb29a0a6-29f6-43aa-a72d-7413305c4cc3 | 19:17:59.266 | 19:18:20.252 | unknown |

Reviewer execution was created at `19:17:54.871Z`. Its diagnostic duration is
22,960 ms; lifecycle duration is 22,946 ms (different observation points).
Neither the 300-second execution timeout nor 180-second inactivity watchdog
caused the failure.

## Exact failure path and classification

1. Launch used `--output-format stream-json --verbose --include-partial-messages`.
2. `DemoCliTransport.consume()` counted stdout and stderr bytes together against
   `maxOutputBytes=65536`, including JSON framing and partial-message envelopes.
3. Recorded stdout: **65,720 bytes**; stderr: **0 bytes**. Capture was truncated;
   `terminate('output_limit')` ran. This is a local capture limit, not a provider
   token limit or an HTTP error.
4. `finish()` observed native exit **0** and close, but `treeKillConfirmed=false`.
   Its termination branch rejected with `code=output_limit`, `stopped=false`.
5. `project-studio.js` classifies `stopped===false` as unknown. The execution and
   failure retain that exact category. The unknown branch intentionally does
   not accept a response or apply an artifact.
6. Fallback decision **5598** denied automatic replacement for
   `termination_unverified`, despite the saved policy being enabled. Write
   access was separately released after the writer was verified gone; no
   retry was initiated automatically. No folder lock is added by this repair.

**Classification: (a) confirmed Dev Squad request/capture configuration defect.**
There is no evidence of a Claude outage, authentication error or timeout.
Why the tree kill returned no confirmation is not retained; a race with exit
is plausible but unproven. Original raw output was deliberately omitted from
sanitized diagnostics. We cannot establish how its 65,720 bytes divide between
framing and final answer, whether a final result arrived beyond the truncated
capture, its model identity, finish reason, or token usage. Exit 0 alone proves
none of those. The fix removes unnecessary Reviewer streaming rather than
raising the approved cap or treating unverified termination as success.

API stream completion and CLI process termination remain distinct. A truly
unknown native/API result must not trigger an automatic duplicate request.
An explicit Reviewer retry can proceed only from unchanged files and valid
independent tests; it does not assert the previous Reviewer completed.

## Packet and checkpoint evidence

The exact serialized original stdin packet was not retained. The implementation
constructs project/chat IDs, actual roles, phase, goal, current file snapshot,
runner capabilities, prior review context, attachment text context, problems,
test results/provenance and an immutable review binding. The launch evidence
states JSON packet on stdin, native login, tools disabled and no API-key billing.

Current unchanged worker-visible snapshot:

| File | Bytes | SHA-256 |
|---|---:|---|
| index.html | 2318 | 0de42a8c2c775d7ee30a913726e28cdb36cd2a6f2426548dfd9f01d10e3514a6 |
| demo.test.cjs | 4150 | 8a1fa9953b5a6393b3a9a0e872c8db1f63dd57e05f0bf8c97707cda7e054bd15 |

Reset is present in the saved index.html. This is a disk-content observation,
separate from whether the review workflow has completed.

- Pre-Builder fingerprint: `b85214bc7bf24c0371bf4d5a6e0c0becac62f237fff01badaa4382be63580a9d`.
- Saved Builder fingerprint/event 5340: `7f1c9e20e277cec68e5965b053cc05c19af33711e842be577dc553ca28ca2ae3`.
- Tester/current workspace fingerprint: `3502e27663e57c2c6f5e5dc98a0dd1c1325d72523e78f64d614e590251a4f4e6`.
- Test evidence hash: `9c4558750d476e9455cbbf90591d0974eb27f6b6513e994b02b5e7f753a49da8`.
- Four actual node:test results, zero failures, exit 0, executed in MXC against
  that exact current fingerprint. Native Tester prose alone was not counted as
  test execution. Its note about absent image/video inputs was expected and
  not a failure. No vision capability is claimed.
- There was no validated Reviewer result or accepted review checkpoint. The
  unknown flag concerns that attempt; it does not erase the saved Builder and
  Tester checkpoints or their revisions.

## Fixes and local proof

- `demo-cli-transport.js`: only Claude Reviewer phase uses final JSON; other
  phases can still request partial progress. Same native authentication,
  timeout, byte cap, no tools and no hidden SDK retry behavior.
- `project-studio.js`: Reviewer-stage resume receives a one-call review-only
  scope. A review finding cannot authorize a correction Builder implicitly.
- `studio-run-scope.js`: hashes review-only intent and rejects other agents or
  phases and correction authorization.
- `studio-failover.js`: review-only scopes deny replacement using the existing
  bounded-run reason, without changing saved fallback settings.
- `reviewer-capture.test.js`: before-patch CLI fixture reproduces output_limit
  plus exit 0/stopped false; after-patch final JSON succeeds. Two additional red
  tests exposed unbounded correction/fallback on Reviewer retry; both now pass.
  An initial replay assertion incorrectly expected 202; the existing safe 409
  rejection was retained and asserted instead, not changed in production.
- Tests cover true final-answer overflow, unknown outcome, same-chat Reviewer
  continuation, unchanged test evidence, duplicate replay rejection, no repeated
  Builder/Tester, specific findings, usage-limit pause, and changed-file denial.
- Focused final suite: **64/64 passed**. Full serial suite: **760/760 passed**, zero failed, skipped or cancelled (633,157.8765 ms). The verified source hashes matched after the retry.
- One preliminary serial run was stopped before adding the review-only guard;
  it is not claimed as a completed test result. Some owned sandbox-fixture
  descendants initially resisted taskkill and subsequently exited; read-only
  process inspection confirmed those recorded PIDs were gone. No sandbox or
  system permissions were changed.

DeepSeek visible/raw limits remain **512000 / 2000000**. No money gate, folder
lock, Zapier configuration, role assignment, unrelated project or accepted
record was changed.

## Restart and one authorized live retry

The supported SQLite backup verified before restart. PID 19624 was idle, with
zero running chats or active executions. The regular backend restarted as
**PID 18960**, health **HTTP 200 / ok**, with 22 migrations.

Playwright-controlled local Chrome clicked **Retry Reviewer stage** once in the
same project and chat. The route returned HTTP 202 and saved continuation
request `f09c1544-f1a3-4814-a96c-e3a0286c268a` with retryOf pointing at the
original request. Exactly one new execution was recorded, Claude Reviewer
`0f02da58-2d2b-4717-ab4f-86fa5daf434c`. It used final JSON, started at
19:49:56.716 UTC, closed at 19:50:18.907 UTC with exit 0, and reported a
24,556 ms lifecycle duration. The local review validated and persisted.

- **Final status: Awaiting Owner.** Claude approved the Reset implementation.
- Optional findings: improve dark text contrast on the blue background, and
  broaden the test fixture's element matching if the markup changes later.
- The reviewer inspected saved evidence. The recorded four passing tests were
  unchanged and still match the workspace hash. The reviewer did not execute
  them. No new Builder, Tester or isolated-test execution was created.
- Native usage as reported: 2 uncached input tokens, 7,685 cache-read input
  tokens, 0 cache-creation tokens and 1,051 output tokens. Native provider HTTP
  status, exact model identity and billed cost were not exposed by this record.
- There is no API reservation for the native Reviewer retry. The previous
  Builder reservation and original unknown Reviewer execution remain recorded.
- The stored review binds to the same index.html and workspace hashes above.
  The retry scope recorded reviewOnly=true and maxCalls=1. Final owner
  acceptance remains pending.

Sanitized evidence and test logs remain local in `data/reviewer-repair/` and
are not staged. No credentials, raw response or hidden reasoning is recorded
in this report.
