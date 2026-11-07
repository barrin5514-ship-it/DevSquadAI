# One-Send workflow repair

This repair starts from `94215260a5cfda29500c815f4365e0b9451148d0` on `feature/workspace-ui-redesign`. The live Expense Tracker project and its saved session were excluded from dispatch. All worker turns in the repair verification use deterministic simulations.

## Reproduction

In installed Chrome, the original dashboard used a writable disposable workspace with DeepSeek Builder, Codex Personal Tester, and NVIDIA Nemotron Reviewer. A missing DeepSeek price receipt left the owner checkbox disabled. Pointer interaction with its label and keyboard Space did not select it. After the simulated read-only funding check, the same label and input worked with both pointer and keyboard. The disabled prerequisite logic caused the reproduced symptom. No independent label, keyboard, or re-render defect was observed.

The baseline worker tests also reproduced the separate Nemotron approval gate and enforced the prior two-cent task scope. The existing fallback tests covered quota exhaustion, known safe termination, provider errors, independence, disabled policy, unknown outcomes, and checkpoint preservation. All 41 baseline tests passed.

## Repaired flow

- The regular team composer reads the saved project, session, assignments and fallback policy without contacting providers. Send posts one authorized Run request with the displayed proposal and any draft message. The server binds the request, project, session, exact workspace and task inputs, worker terms and saved fallback policy. The message and authorization are saved in the same transaction. Stale proposals, write denial, and duplicate dispatch are rejected or safely deduplicated.
- The ordinary team flow applies no fixed dollar cap. DeepSeek still needs current pricing and usable prepaid availability. The authorized run can make the existing read-only metadata check and uses the existing reservation ledger and configured provider policy limits. Known charges and confirmed rejections settle separately from unknown outcomes. Existing explicitly capped historical approvals retain their terms.
- Send authorizes the exact free Nemotron route when assigned or permitted by the saved fallback policy. Exact returned model, zero-price eligibility, request limits, credential isolation and native subscription paths stay enforced.
- The existing fallback router can switch within the approved policy after a recoverable failure and confirmed termination. It rechecks role independence and the saved checkpoint, records the attempt and substitution, and leaves unknown outcomes locked. No additional owner consent is required for a valid handoff. Stop prevents further dispatch. Final acceptance remains a separate owner action.

## Verification

The focused serial run passed 125 of 125 tests.

```powershell
node --test --test-concurrency=1 tests/big-three-ui.test.js tests/conversation-ui.test.js tests/studio-console.test.js tests/studio-conversations.test.js tests/studio-run-scope.test.js tests/studio-failover.test.js tests/studio-team-budget.test.js tests/nemotron-worker.test.js tests/model-health.test.js
```

The full run passed 674 of 674 tests across 66 files with zero failures or skips. It includes the existing offline pilot and three pre-existing local experiment files. It took 13 minutes 17 seconds.

```powershell
node scripts/test-serial.js
```

The disposable Chrome workflow exercised project selection, write denial, existing owner permission, role selection, saved fallback, refresh, one Send and final owner review. It used the actual DeepSeek and Nemotron request adapters with simulated HTTP responses. Codex Personal simulated quota exhaustion, Claude Code simulated the authorized Tester fallback, and the existing isolated runner executed two independent Node tests against the resulting fixture. The Reviewer received the implementation and test evidence. The browser checked the Run response, execution records, workspace artifact, usage, fallback evidence, reopen behavior and owner acceptance gate. No model request was sent to a live provider.

The final Chrome run passed all 14 checks with zero browser JavaScript errors. Its local script and results are `data/verify-one-send-browser.mjs` and `data/one-send-final-browser.json`. The unmodified dashboard reproduction also passed its 14 checks, recorded in `data/one-send-baseline-browser.json`.

The simulated fallback demonstrates recovery. It does not count as verifying the originally selected Codex Personal Tester in a real team run.

## Live session preservation

A read-only SQLite check found the original Expense Tracker session ready and unconsumed, with zero executions and zero Run or approval events. Its saved roles were still DeepSeek Builder, Codex Personal Tester and Nemotron Reviewer. Project writes had already been enabled by the owner and fallback was still off. The integrity check returned `ok`, with zero active chats and one existing historical lock. The repair was tested on a separate instance. The regular backend still needs to load the updated code before an owner-initiated live run.

## DeepSeek follow-up after the owner-started live run

The earlier preservation paragraph describes the state before the owner sent the task. Regular server PID 30580 started before the stream diagnostic edits and loaded the one-Send backend. Execution `8dd5a62b-3d80-4842-8fca-99a296c4b650` followed the direct prepaid DeepSeek adapter's bound chat-completions request. The adapter assembled visible stream deltas, required a terminal marker and finish reason, checked the returned model and final answer, and then handed parsed JSON to the workspace driver for artifact validation and writing. The run did not use DeepSeek Harness.

The live record shows 5,326 visible characters, 7,618 ms elapsed, `invalid_response`, no token counts and an unknown remote outcome. Neither the old execution nor the server logs preserved the check that rejected it. Malformed stream JSON and a returned-model mismatch both reproduce the saved signature in local fixtures. The exact historical cause remains unknown.

Agent Orchestrator uses DeepSeek Harness through ACP for chat and a one-shot headless process for terminal tasks. ACP separates progress and usage updates from the terminal prompt response. Multi-Agent Orchestration Workflows treats durable files and checkpoints as evidence and independently verifies delegated work. Dev Squad keeps its direct API adapter and existing checkpoint handoffs. The concrete changes keep matching-model token evidence from interrupted streams separate from completion and settlement, mark the Builder complete only after its files are saved, and explain why an unresolved remote outcome cannot be cleared through local process reconciliation. The diagnostic stores fixed labels and metadata only.

- [Agent Orchestrator DeepSeek Harness](https://github.com/OrchestratorInc/agent-orchestrator/blob/main/docs/harnesses/deepseek-harness.md)
- [Agent Client Protocol prompt turn](https://agentclientprotocol.com/protocol/v1/prompt-turn)
- [Multi-Agent Orchestration Workflows](https://github.com/formiat/multi-agent-orchestration)

The focused suite passed 48 of 48. The three Chrome simulations each passed 13 of 13 checks on disposable databases and workspaces with outbound provider responses simulated. The completed DeepSeek response handed the saved file to independent testing and review. A confirmed DeepSeek HTTP 429 moved the Builder role to Claude Code at the original checkpoint. Both successful scenarios ran two actual isolated Node tests and stopped for owner acceptance. In the interrupted scenario, a usage frame arrived without a terminal marker. The run kept the token evidence, retained its lock and reservation, wrote no artifact, and dispatched no replacement or duplicate after refresh and reopening. No live provider calls occurred.

The full serial suite passed 675 of 675 tests with zero failures or skips in 9 minutes 42 seconds.

```powershell
node --test --test-concurrency=1 tests/studio-executions.test.js tests/studio-team-budget.test.js tests/studio-failover.test.js tests/provider-diagnosis.test.js
node data/verify-deepseek-handoff-browser.mjs success
node data/verify-deepseek-handoff-browser.mjs limit
node data/verify-deepseek-handoff-browser.mjs interrupted
node scripts/test-serial.js
```

The live Expense Tracker remains paused. Its checkpoint matches, its lock remains, and its unknown reservation remains $0.007748. That value is a local reservation. Actual billing remains unknown. The consumed Send has no supported in-app continuation and local Reconcile cannot establish a remote API outcome. Obtain provider-side evidence for the original request before considering a separately authorized recovery change. The regular backend was left running its prior code.

## Safe restart and account evidence

The regular backend was subsequently restarted after an idle check and a verified online SQLite backup. All 18 migrations were already applied. SQLite integrity and foreign keys checked clean. The 14 protected data tables compared identically before and after the restart. The Expense Tracker retained its exact session, roles, file checkpoint, lock, one provider request and unknown local reservation. The restarted dashboard returned HTTP 200 and passed 10 read-only Chrome checks. The live backend reports remote reconciliation unavailable for this execution, a behavior introduced by the tested repair.

The documented DeepSeek balance GET succeeded and confirmed available USD funds. It does not provide request history or a per-request charge. The saved UUID identifies Dev Squad's local Send, and no DeepSeek response ID was retained. The original outcome and actual charge remain unknown. A separate new project with a distinct folder, session and request ID can be considered for separate approval after fresh provider checks. The existing reservation must remain counted against applicable prepaid limits.
