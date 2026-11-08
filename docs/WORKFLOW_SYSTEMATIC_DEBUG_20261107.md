# Dev Squad workflow systematic debugging — 2026-11-07

## Scope and result

Three confirmed defects repaired locally; no Dev Squad live provider/native model call, real Zapier delivery, production project creation, account change, migration, commit or push. Existing uncommitted work preserved. Final broad result: 734/734 passed, zero failures/skips/cancellations. Testing used disposable databases and simulated providers; hand-written fixture tests really executed in a credential-free Node child process.

Environment: Windows win32 x64, Node v24.19.0, feature/workspace-ui-redesign. The regular backend was not restarted. Chrome used a disposable server/database running the regular dashboard source. This does not claim real AI accounts or the live Zapier callback are verified.

## Fix 1 — completed truncation lost its final accounting evidence

Path: ProviderAdapter stream parser and finish-reason validation -> StudioWorkers.call catch -> StudioFailover.settle. A normal fresh Studio Send currently explicitly requests 8192 output tokens; saved task limits can override this. The raw/visible stream safety limits remain 2000000/512000 bytes. No cap was raised by this task.

A completed response with finish_reason:length and DONE correctly throws response_truncated and already follows the configured fallback policy. But the catch logged e.usage while finally settled only r?.usage; r does not exist on an error. A known billable response therefore left an unknown reservation. This was an accounting bug, not proof that reservations caused the historical stall: current reservations are display-only.

Small fix in src/services/studio-workers.js: retain final e.usage for settlement. Never substitute observedUsage from an interrupted stream. Execution/artifact failure and accounting completion stay separate.

Reproduction: tests/workflow-debug-deepseek.test.js had 1 failed / 1 passed before patch (expected completed reservation, actual unknown). After patch, 23/23 stream/accounting checks passed. In the controlled 30 input / 8192 output fixture, reservation is completed at the hand-calculated configured-rate estimate $0.0098394 while no partial file is accepted. These are fake usage values, not an invoice or a real charge.

The interrupted fixture deliberately reports partial usage then omits DONE. Outcome stays unknown, the conservative reservation remains held, and a replayed HTTP Send cannot issue another paid request.

## Fix 2 — no Builder artifact still advanced to testing

The real HTTP pipeline accepted files:[] on a brand-new empty app and went to Tester/correction, producing six simulated worker turns before pausing.

Small fix in src/services/project-studio.js: reject an empty Builder patch when the worker-visible project snapshot has no files, before recording the build or handing off. The first guard incorrectly counted managed AGENTS.md as an app file; the still-failing reproduction exposed that and the guard was corrected to the existing filtered snapshot. No security file was removed or changed.

Proof: the new target test failed with six calls versus one before the fix, then passed with one Builder call, no Tester, and zero revisions. The positive test proves files:[] remains valid for an existing unchanged app: its actual tests and independent review reach Awaiting Owner. Focused project/continuation checks: 24/24 passed.

## Fix 3 — startup notice hid the actual error

The chat preferred sanitized stderr over sanitized stdout. The ordinary Reading additional input from stdin... notice therefore hid explicit structured errors such as workspace credit exhaustion.

Small fix in src/services/project-studio.js: prefer the explicit sanitized stdout error, with stderr as fallback. Original diagnostic fields remain intact. No raw output, reasoning, credentials or extra transport logging added.

The HTTP regression failed before the change because the alert omitted out of credits and displayed the startup notice. Afterward, pipeline/diagnostic/continuation checks passed 19/19 and the original stderr field remained preserved.

## Windows scope checks

Command: node --test --test-concurrency=1 tests/demo-workers.test.js — 27/27 passed on Windows (70.427 seconds). No tampered scope was accepted, so no scope code was changed. The file's cases independently exercised:

| Mutation/check | Observed result |
| --- | --- |
| Approval expired before model-check slot | Rejected; zero mock provider requests |
| Wrong job / changed max_tokens request body | Rejected before dispatch |
| Grant file changed after binding | Authorization false; generation rejected |
| Wrong model / task / database inode | Scope construction rejected |
| Changed prices / expired scope | Scope construction rejected |
| Wrong isolation receipt job/root/base/fingerprint/denial result | Not ready; no weaker launcher |
| Native role move / consumed scope replay / concurrent unknown attempts | Cannot replenish slots or duplicate mock POST |

These are scope-enforcement tests using fixture credentials and simulated provider responses, not live balance, subscription, account-access or real worker-isolation certification.

## One-Send and nearby paths

New tests use actual console HTTP routes and the real DeepSeek adapter with an injected SSE response. Other provider calls are explicit simulations. Tester receives app.mjs from the saved Builder result; its test/add.test.mjs executes against that file. Reviewer receives both files and actual local Node test evidence, bound to the revision. ReviewerExecutedTests remains false. Final state is Awaiting Owner, never accepted.

| Scenario | Verified result |
| --- | --- |
| Normal HTTP Send | Builder -> Tester -> Reviewer -> Awaiting Owner; two actual fixture tests passed |
| Confirmed length, fallback enabled | Same Builder role moves to eligible worker at saved checkpoint; one DeepSeek request; known usage settled |
| Confirmed length, fallback disabled | Paused at Builder, no artifact applied, known usage settled |
| Interrupted stream, unknown outcome | Paused, no fallback, unknown reservation retained, duplicate Send does not dispatch |
| HTTP 429, fallback enabled/disabled | Follows policy; rejected reservation records zero for that rejected fixture request |
| Duplicate and competing active Send | One worker start; replay deduplicated; conflicting request rejected |
| Tester pause then resume | Same chat/project, new attempt at Tester; completed Builder not sent again |
| Empty app / no Builder artifact | Stops before Tester and avoids correction churn |
| Existing unchanged app | Independent test and review still work |
| Structured error plus stdin notice | Real error displayed; diagnostics retained |

Chrome evidence: [browser.json](verification/workflow-systematic-20261107/browser.json), [screenshot](verification/workflow-systematic-20261107/one-send-simulated.png). Exactly one Send/run POST, zero run-approval POSTs, zero page errors, two actual local tests, and Awaiting Owner. No unexpected mid-run money/approval prompt appeared in this controlled workflow. Existing simulated Zapier handoff/replay tests are included in the broader suite; no real hook was contacted.

## Verification history and review

- Existing DeepSeek baseline: 21/21 before the first patch.
- New accounting reproduction: 1 failed, 1 passed; after fix focused 23/23.
- Windows demo-workers: 27/27.
- Missing-artifact target: failed before, passed after; first incorrect managed-file predicate remained red and was corrected. Relevant project/continuation regressions 24/24.
- Error-display reproduction: failed before, passed after; pipeline/diagnostic/continuation 19/19.
- Initial broad suite: 734 tests, 732 passed / 2 failed. Both failing role fixtures supplied empty Builder patches and no implementation, so the corrected guard prevented their intended role assertions. Updated only those two mock Builder responses to include a tiny app; all role assertions are unchanged.
- Final focused suite (roles plus both new files): 19/19.
- Fresh read-only review found no correctness/security issue in the three scoped fixes. Added its suggested positive existing-app regression.
- Counts overlap; they are not summed into a fabricated distinct-test total.

Final broad command: node scripts/test-serial.js — **734/734 passed**, zero failed/skipped/cancelled, 581.142 seconds. Application source hashes were unchanged during the run. Targeted git diff --check exited0 (ordinary CRLF warnings only). [Machine-readable results](verification/workflow-systematic-20261107/results.json), [complete final output](verification/workflow-systematic-20261107/full-final-734.txt). Completed 2026-11-08 ET; task began 2026-11-07.

## Changed files

Production: src/services/studio-workers.js (settlement), src/services/project-studio.js (empty artifact and display).
Tests: tests/workflow-debug-deepseek.test.js, tests/workflow-debug-pipeline.test.js, tests/helpers/workflow-debug-fixture.js; fixture-only compatibility update in tests/studio-roles.test.js.
Documentation: shared bug ledger, prompt logs, this report, evidence folder, and docs/superpowers/plans/2026-11-07-demo-workflow-debugging.md. Ignored local execution helpers/logs remain under data. No source refactor or new dependency.

## Limits of proof

No new live DeepSeek response, native Codex/Claude model execution, real external Zapier callback or production Expense Tracker/Demo Two run. The normal completed truncation did not reproduce an additional hang: it already obeyed fallback policy; its final-usage settlement was the confirmed defect. Native provider delays remain outside this simulated proof. The regular backend still needs a supported idle maintenance restart to load the local fixes; this pass did not restart it or interrupt any owner run.
