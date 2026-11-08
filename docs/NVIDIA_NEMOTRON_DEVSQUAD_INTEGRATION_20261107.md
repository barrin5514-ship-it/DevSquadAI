# NVIDIA Nemotron integration and team-run readiness — November 7, 2026

**Verdict: INTEGRATION PARTIALLY VERIFIED.** The production transport, guarded artifact pipeline and all three role contracts are locally verified. One earlier real coding probe passed. Live Builder/Tester/Reviewer performance and the complete real team run are **not verified**. Expense Tracker has not run, and no generation was sent during this task.

## What changed

- `src/services/nemotron-worker.js`: one bounded API worker using the existing OpenRouter adapter, exact `nvidia/nemotron-3.5-super-vl:free`, strict shared worker JSON, reasoning disabled, no retry/substitution/fallback, zero-price provider filters and response-model validation. No new orchestration engine.
- Existing `studio-workers`, `studio-run-scope`, `studio-roles`, `big-three`, `project-studio`, `studio-usage`, `studio-independence`, `model-health` services: register this worker, bind its task approval, record actual identity/usage, and preserve independent roles/checkpoints/owner acceptance. No permanent role assignments or global routing activation.
- `src/routes/console.js`: protected, explicit non-generating Nemotron access check. Reading the dashboard or Model Health sends no provider requests.
- Existing dashboard `dashboard.js`, `roles.js`, `conversations.js`, `workspace-shell.js`: readable name, existing role-picker option, explicit access-check button, honest role-qualification text. No redesign.
- `tests/nemotron-worker.test.js`, `tests/worker-deadline.test.js`, `tests/model-health.test.js`: safeguards and deadline regressions. Seven health rows replace six; assertions were not weakened.
- Six preparation/verification scripts named `*nemotron*20261107.js`, this report, evidence folder, and the manual prompt log. These scripts separate live read-only checks from simulated model answers.

The checkout was already heavily modified before this task. The list above describes this task's changes, not all changes relative to HEAD. Branch remains `feature/workspace-ui-redesign`; HEAD remains `9983d20f1ee6394cbfbff484ae9f7345c91195d7`. Nothing committed, pushed, merged or deployed.

## Architecture and safeguards — VERIFIED locally

The existing Studio role manager → run scope → execution record → API worker → guarded files/revisions → independent test runner → bound review → owner acceptance path is reused. Nemotron may be selected temporarily for any of the three roles. All are labelled **PARTIALLY VERIFIED**: production contracts and simulated handoffs passed; actual role quality remains unverified.

Dispatch requires the exact project, session, database-path identity hash, workspace-root hash, goal, role assignments, request identity, current checkpoint and unused execution slot. Approval lasts 30 minutes and binds this exact free model, 2,048 output tokens and 60 seconds. Changed goals/files/review bindings, expiration, duplicate/concurrent dispatch and unrelated tasks fail closed. No scope was created in the main database.

Before dispatch, public catalog, account-filtered catalog and key metadata must establish the exact zero-priced route, available free allowance, optional reasoning, and required JSON/output controls. A five-minute access lease is refreshed when necessary and approval is rechecked afterward. All returned pricing fields must be zero. An unexpected response model or reported nonzero cost is recorded and rejected; it never becomes a complete artifact. The request disables provider fallback and caps accepted prompt/completion/request prices at zero. This is not a promise of future provider availability.

The API receives the existing guarded task packet, not a shell or unrestricted repository access. Returned paths still pass existing private-file, traversal, link, checkpoint and provenance guards. Native CLI brokers retain their existing trusted credential boundary; worktrees alone are not described as security isolation. Generated independent tests use the actual restricted Windows MXC runner with no credential environment or network access.

Codex Personal and School count as the same model family for independence. Builder, Tester and Reviewer must be independent. No live fallback was enabled and Nemotron was not added to the automatic fallback order. Quality is not invented from configuration; existing manual dynamic selection is preserved.

## Evidence and actual results

| Check | Result |
|---|---|
| Focused pre-edit baseline | 51/51 passed |
| Final focused checks | 43/43 passed |
| Full serial suite | **657/657 passed**, 0 failed/cancelled/skipped; 448,889.5193 ms; 66 files, 128 MiB heap |
| Chrome simulated production-path workflows | **20/20 checks passed**, 0 page errors; Nemotron exercised once in each role arrangement |
| Real independent runner in simulations | **2/2 Node tests executed per arrangement**, Windows MXC; Builder tests deliberately could not satisfy the independent gate |
| Separate-process simulation recovery | **4/4 passed**; all three histories, artifacts, usage, test/review hashes and owner-pending states preserved; no new provider calls or unresolved fixture locks |
| Actual regular dashboard in installed Chrome | **11/11 passed**, 0 page errors/blocked writes/sideways overflow; all three pickers contain Nemotron without saving a selection |
| Actual Expense-folder isolation | **6/6 permission/network probes + Git-root check passed**; temporary probe files removed; no model invocation |
| Business data preservation | All 64 table sets compared to supported backup; **63 content-identical**, only runtime PID lease changed during backend restart; integrity check OK |
| Protected project files | Original Counter, Counter 2, successful To-Do and Expense fingerprints unchanged; original historical lock preserved |

Commands: `node scripts/test-serial.js`; focused `node --test --test-concurrency=1` runs listed in evidence; `node scripts/verify-nemotron-integration-20261107.js`; `node scripts/verify-nemotron-reopen-20261107.js`; `node scripts/verify-nemotron-main-20261107.js` (then `--cached` for local-only screenshot refresh); existing-isolation probe copied to `verify-nemotron-isolation-20261107.js`; `node scripts/verify-nemotron-preservation-20261107.js`; `node --use-system-ca scripts/prepare-nemotron-accounts-20261107.js`.

Evidence: `docs/verification/nemotron-integration-20261107/`. `full-serial.txt`, `final-focused.txt`, `mock-browser/result.json`, `mock-browser/restart.json`, `main-browser/result.json`, screenshots, `isolation.json`, `accounts.json`, `preservation.json`. The supported pre-edit backup path is in `backup.txt`.

Final local checks: **23 JavaScript files passed syntax checks**, targeted diff whitespace check passed, and **49 task/source/evidence files had no exact matches to locally configured credential values**. This targeted check is not a full-history security audit. `.env` is Git-ignored and untracked. No schema migration was needed.

Initial browser scripts encountered fixture-navigation mistakes: a newly created fixture session needed reload, an empty HTML `open` attribute was mistaken for closed, and the request filter initially compared a method function rather than its value. Failures are preserved; scripts corrected, no product controls bypassed. One cached refresh attempt addressed a control before opening Model Health. The final actual dashboard check passed. These were verification-script errors, not evidence of a production role-picker defect.

## Windows timeout/Stop investigation

**Confirmed race fixed:** synchronous Windows process inspection could delay the JavaScript timeout callback, allowing a process that exited after its deadline to be reported as successful. The command now also checks elapsed time when handling natural close. Late completion is a timeout, not success. Process cleanup checks every recorded descendant; a successful tree-kill return alone is insufficient proof. Existing PID/birth identity checks and sandbox restrictions remain.

Deterministic delayed-close and surviving-child tests passed, along with the unchanged real Windows timeout/Stop regression in focused and full runs. This fixes an identified race; it does not establish the cause of every historical intermittent failure or guarantee all future Windows termination. Unknown termination or API completion still retains the execution lock and consumed request slot. API Stop before headers and after HTTP 200 headers is covered; receiving headers is not proof that remote generation stopped. No worker relaunch or automatic retry is introduced.

## Fresh non-generating access evidence

At **2026-11-07 16:39 UTC**:

- **Nemotron/OpenRouter:** public/account model listings and key GETs succeeded through the actual backend check. Exact route zero-priced, account free, **2/50 used, 48 remaining**. Catalog visibility and account allowance are separate from live role qualification. Short-lived evidence must be refreshed before a future run.
- **DeepSeek:** official `/models` and `/user/balance` returned HTTP 200; configured `deepseek-flash` listed; usable USD balance **$16.42** at that instant, not a guaranteed future balance.
- **Codex Personal:** existing dedicated native ChatGPT login status passed. No token copied/displayed and no generation. **Remaining included allowance UNKNOWN**; owner confirmation still needed.
- **Public DeepSeek pricing:** HTTP 200, exact `deepseek-flash`; highest uncached peak input **$0.30/M**, output **$1.20/M**. Official source: https://api-docs.deepseek.com/quick_start/pricing/ . The local parser verified the table and saved its content hash/time, without activating a price lease or grant.

This task used **0 live generation requests**, **3 authenticated OpenRouter read-only GETs**, **2 authenticated DeepSeek read-only GETs**, one public pricing fetch and one local native login-status check. Browser reruns after the successful check used only cached readings. No Zapier requests, paid generation, grant activation, role saves or acceptance actions.

Model Health intentionally remains a cached-evidence view. The screenshot retains historical Codex UNAVAILABLE readings; those do not supersede this task's fresh successful native login check. Nemotron's overall generation reading remains UNKNOWN because this task did not fabricate or import a production worker response from the earlier standalone coding probe. Its catalog/allowance and live-role qualifications are shown separately. A future preflight must check current availability rather than treating either old failures or saved credentials as current quota evidence.

## Preview and existing Expense Tracker readiness

Actual URL: http://127.0.0.1:3000/team#project/aceea0a7-7c8b-4b32-9371-cf94a029a6ee/chat/b1e11259-d5f7-427e-b004-c66d9a818fe3

Expense remains `ready`, Builder phase, **0 executions**, no run approval; assignments still DeepSeek / Codex Personal / Claude Code, fallback disabled. Only `AGENTS.md` exists. It is currently **read-only** for agent edits, so Send is disabled. Its requirements remain the original dependency-free HTML/CSS/JS Expense Tracker: finite positive amounts, categories/history/totals/delete, localStorage and responsive layout. No duplicate project/session was created.

The actual Preview correctly says to start the project application separately and authorize its exact loopback URL. Preview authorization attaches to a running app; it does not build or launch one. Expense has no implementation/running app yet, so it cannot show an app now. The historical complaint cannot be reproduced as a rendering defect from this empty project. Existing live-preview regressions passed, but **displaying the future real Expense app remains unverified**. No preview authorization or server was started and no broad fix was made. Request separate approval if a running, authorized app still fails to appear.

## Next bounded live-run proposal — INACTIVE, NOT AUTHORIZED

Inactive exact-ID/hash template: `docs/verification/nemotron-integration-20261107/inactive-execution-proposal.json`. No active grant, approval clock or role reassignment was created.

Proposed temporary team: **DeepSeek Builder → Codex Personal independent Tester → Nemotron independent Reviewer → owner acceptance**. This is a trial, not permanent assignments or a claim of proven full-workflow quality.

1. Owner authorizes edits for the existing Expense project, this temporary team and one exact bounded run. Refresh its current session version and hashes before arming through the existing protected workflow; never force DB status.
2. DeepSeek `deepseek-flash`: **one POST, 4,096 output tokens, 90 seconds, thinking off**, 24,000 serialized-input-byte bound; **proposed $0.02 local reservation cap**. At the verified peak uncached rates, a planning example of 8,000 input/1,000 output tokens costs about **$0.0036**. Current reservation formula uses up to 24,000 bytes + 4,096 framing allowance and 4,096 output tokens: **$0.013344**. Actual input/output are unknown before generation. Byte/token/framing estimates and provider accounting may differ; this is an application reservation, **not a guaranteed provider-side dollar ceiling**.
3. Codex Personal: **one native included-usage invocation, 300 seconds, 32 KiB captured output**. Owner must confirm included allowance. No API-key billing or model substitution.
4. Nemotron exact free model above: **one POST, 2,048 output tokens, 60 seconds, reasoning disabled, strict JSON**, zero-price account recheck. Expected route price **$0**, subject to its verified zero-price route still being available.
5. **Three model invocations maximum, one per role, no retries/fallback/corrections**, approval expires 30 minutes after the new actual owner approval. Existing independent local test runner remains isolated and bounded. Failures pause; unknown outcomes retain reservations/locks. Final acceptance stays with the owner.

### Specific blockers before dispatch

- **Saved DeepSeek price lease expired October 22** although current public rates match. A fresh supported price lease and recorded balance are required by the existing paid task-scope path. Public/read-only evidence in this report is not an active authorization; do not bypass or globally enable paid routing. A narrowly approved refresh/preparation step is needed before live approval is armed.
- Owner has not approved the new temporary team/run or enabled this currently read-only project's agent edits. Existing assignments and approvals were intentionally preserved.
- Codex remaining included allowance cannot be determined from safe login status; owner confirmation required.
- All three live role contracts, real Expense UI, end-to-end handoffs and real generated-app preview still require the separately authorized trial. Mock success does not remove this uncertainty.

**Stop point:** no live team workflow launched. Separate owner authorization must cover the prerequisites and exact proposal above. If fresh pricing/account/model evidence fails, stop without substitution or retries.
