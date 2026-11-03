# Weekend Time Budget Helper — offline preparation

Status: PREPARATION ONLY. Owner approved this narrow pilot, not execution. No real project/task, active grant, approval clock, provider call or paid review has been created. Gemini `gemini-3.8-flash` is the proposed developer; DeepSeek `deepseek-flash` remains a separately authorized reviewer after the actual draft exists. Other providers are outside scope.

## What the owner will get

A small JavaScript helper that adds planned task times, optionally adds a 20% safety buffer, and says how much time remains. It does not create calendar entries or send personal information. Use invented task durations only.

Proposed real project name: **Weekend Time Budget Helper**. Proposed single child task: **Build and test the weekend time budget utility**. These names are plans, not database identities. Verify the actual new project/parent/child IDs and relationships on Monday before binding any capability.

## Precise proposed requirements

- `src/time-budget.js` exports `planTime(durationsMinutes, availableHours, includeBuffer = false)` as a named ES-module function. Native import/export matches the application's module format.
- Durations must be a dense array of finite, nonnegative numbers; available hours must be a finite nonnegative number. Buffer must be a boolean. Reject invalid types, missing values, holes, NaN and infinities with an Error; do not coerce strings/null. Do not mutate the input.
- Return exactly `{ totalMinutes, bufferMinutes, requiredMinutes, remainingMinutes, fits }`. Total is the sum, buffer is total × 0.2 or zero, required is total plus buffer, remaining is hours × 60 minus required, fits is remaining >= 0. Permit negative remaining time to show a shortfall. Empty list and zero are valid.
- Keep full numeric precision: do not round intermediate values or displayed output inside this utility. Decimal tests use a tolerance. Reject arithmetic overflow (non-finite totals, conversion or result). Boundary tests use exactly representable values; no arbitrary extra time allowance.
- `test/time-budget.test.js` exports `runTests()` and only runs assertions when explicitly invoked. Importing either file performs no assertions, logging, I/O, network calls or global modification. No dependencies or browser interface required.
- Return a complete native JSON artifact containing only those two files through the existing app schema. No Markdown fences, credentials, tools, project source files or unrelated content. If 1,024 output tokens are insufficient, stop as incomplete; no automatic follow-up or fallback.

These clarify Section 7's optional-buffer and rounding choices; the owner approves this precise plan Monday before generation. No implementation of the real utility is prepared or applied to application source now.

## Expected example outputs

| Inputs | total | buffer | required | remaining | fits |
|---|---:|---:|---:|---:|---|
| `[30,45]`, 2 hours, buffer omitted | 75 | 0 | 75 | 45 | true |
| `[30,45]`, 2 hours, buffer true | 75 | 15 | 90 | 30 | true |
| `[60,60]`, 2 hours | 120 | 0 | 120 | 0 | true |
| `[90,45]`, 2 hours | 135 | 0 | 135 | -15 | false |
| `[]`, 0 hours | 0 | 0 | 0 | 0 | true |
| `[0.1,0.2]`, 0.01 hours | approximately 0.3 | 0 | approximately 0.3 | approximately 0.3 | true |

## Independent verification prepared

`independent-cases.mjs` is a reusable local test harness, not generated production code. Its fixed expected values check examples, defaults, explicit buffer off, negative shortfall, decimals, invalid inputs, sparse arrays, overflow, input preservation and deterministic repeats. `dry-run.test.mjs` exercises it against a clearly labeled local mock implementation and a deliberately broken mock; passing mocks do not establish Gemini coding quality.

Monday: inspect the real response first for unexpected imports, process access, I/O or side effects. If safe, copy the two draft files and independent harness to a disposable directory; check syntax and named imports; instrument import-time assertions/console and filesystem snapshots; explicitly run embedded assertions and the independent cases. Use the previously supported credential-free Node permission-limited temporary process, 5-second timeout and memory bound. Do not import generated code in the main server or execute it with inherited credentials. The independent harness alone is not a sandbox. Record exact counts/results against the actual draft hash; never reuse mock evidence as real evidence.

## Proposed Monday workflow — not authorized now

1. Owner completes the Google checklist in `MONDAY_OWNER_CHECKLIST.md` and approves the precise requirements above plus creating the real project/manual plan. Keep routing and global paid flags unchanged.
2. Create through normal dashboard owner flow, approve the plan/decomposition, and read back actual project/parent/child IDs from their database relationships. Take a fresh backup first. No inference while just creating/planning.
3. Present the actual task IDs, database identity and bounded Gemini authorization for owner approval near dispatch. Fill a fresh active capability only after that approval; do not load these templates or reuse the earlier disposable grant.
4. Through existing scoped main-app checks: one model GET, then only on valid access evidence one generation POST. Max 1,024 output, low thinking/native JSON, 90-second generation timeout, no retry/fallback; each attempt consumes its slot even if failed/unknown. Catalog GET uses the existing bounded 15-second verification timeout. Stop on payment/access failure, exhausted/expired scope or incomplete output.
5. Inspect/test isolated code, write a separate local plain-English summary, record actual usage/test evidence and persist checkpoints in main SQLite. Refresh/restart using supported procedure and verify preservation. Keep AWAITING_REVIEW; never treat mock results or the previous task's receipt/review as this task's proof.
6. Prepare a new exact immutable DeepSeek review payload from the actual draft/evidence. Obtain separate cost/payload/request/expiry approval. No paid review is approved now. Do not accept work on the owner's behalf.

## Local preparation evidence

Supported `npm run backup` completed before preparation: `backups/backup-1792810762809-a4b630fd-6c54-43d3-ae47-a985b65f6850.sqlite`. Script uses SQLite online backup and validates integrity/foreign keys. Existing database was not reset or migrated.

Mock/full-suite results and preservation checks are recorded in `PREPARATION_RESULTS.md` after execution. Templates remain outside the main database's capability directory, deliberately missing loadable scope/requests structures and credentials.
