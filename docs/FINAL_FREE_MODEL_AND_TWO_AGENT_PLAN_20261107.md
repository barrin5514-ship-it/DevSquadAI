# Final free-model test and conditional two-agent plan

November 7, 2026. Branch `feature/workspace-ui-redesign`. **LATEST: FREE MODEL VERIFIED.** Owner separately approved one request: HTTP 200, 2359 ms, 96 input/175 output/271 total tokens, zero reasoning, reported $0; exact code syntax and 24/24 isolated checks passed. See FINAL_NVIDIA_FREE_MODEL_RESULT_20261107.md. The following original preparation is retained as historical evidence; its no-generation statements describe preparation only. No further Gemini, Antigravity or Cohere request was made. No production code, routing, assignment, grant, approval clock or project was changed.

## 1. Final alternative selected — original preparation

**`nvidia/nemotron-3.5-super-vl:free`**, through `https://openrouter.ai/api/v1/chat/completions`. This is a different model and configuration from the failed 500-token Cohere probe.

Fresh public catalog, account-filtered catalog and key-status GETs each returned HTTP 200. Observed `2026-11-07T07:17:52.138Z` (November 7, 2:17 AM America/New_York). Exact model appears in both catalogs; all reported prices are zero: **$0 input, $0 output**. Account reports free tier, **1/50 used, 49 remaining** daily requests. Expected model cost for the proposed free route is **$0**. These are point-in-time account/catalog observations; inference capacity and output quality are unverified. No purchase/card/billing change is proposed.

Both catalogs report 1,000,000-token context and maximum 131,072 output tokens, comfortably above the proposed **2,048**. Supported parameters include max_tokens, reasoning, response_format and structured_outputs, plus tools. No expiration date is reported.

**Reasoning checked rather than assumed:** both model entries explicitly report `reasoning.mandatory: false`. The [official model page](https://openrouter.ai/nvidia/nemotron-3.5-super-vl:free) says reasoning is on by default and can be turned off or budgeted. [OpenRouter reasoning documentation](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens) documents unified controls. The proposed body uses **`reasoning: {enabled: false}`**, not an invented NVIDIA-native parameter. No effort level is guessed because supported_efforts was not reported. Its actual effect must be checked from the eventual response; the preparation does not prove zero reasoning tokens.

The model is documented for reasoning/tool use and coding validation. Selection favors explicit optional reasoning plus native structured output and sufficient output space, rather than assuming a model's size or popularity proves quality. NVIDIA's free-route notice prohibits confidential/personal input; this test sends only the supplied disposable function.

Published free-variant rate limits remain 20 requests/minute and the account's unfunded 50/day tier; failed generation attempts count. No live rate-limit headers or guaranteed capacity were supplied. Do not substitute a paid endpoint or a router.

## 2. Inactive exact test proposal

File: `docs/verification/final-free-model-20261107/inactive-request.json`. It is explicitly inactive, authorization pending; no live attempt journal or grant has been created.

- **One generation POST**, pinned model above, max_tokens **2,048**, timeout **60 seconds**.
- No retry, fallback, model substitution, continuation, tools, project writes or paid usage.
- `reasoning.enabled: false`; native strict JSON schema requires edgeCase, code and exactly two test suggestions.
- `provider.allow_fallbacks: false`, `require_parameters: true`, and max_price prompt/completion/request all zero. A provider that cannot honor the requested parameters must fail rather than silently dropping them or routing elsewhere.
- Existing OpenRouter request/response adapter path; no SDK or retry loop. The generic generate helper does not currently add OpenRouter reasoning/schema controls, so the diagnostic can use the existing request method with the immutable prepared body and the existing generation parser, without modifying production code.

User task:

```text
Review function calculateTotal(prices) {
  return prices.reduce((sum, price) => sum + price, 0);
}
Identify an invalid-input edge case, provide a corrected JavaScript function
accepting an array of finite numbers and rejecting invalid inputs, and suggest
two meaningful tests. Keep it concise and return the required JSON only.
```

An offline fake response verified the exact request, model, reasoning-off field, supported parameters, JSON/schema envelope, zero-price filters, no fallback, output cap and existing parser. **One mocked request, zero live generations.** It does not establish actual provider behavior.

After separate approval, PASS requires a complete valid response, inspected/syntactically valid function, meaningful edge handling, two useful test suggestions and passing independent behavior checks in a restricted temporary process without credentials or production filesystem access. Preserve supplied tokens/cost/model/finish reason. Empty/truncated content, bad syntax, no usable function or failed tests are FAIL. Do not repair it with extra requests or present a partial answer as success. Do not retain hidden reasoning text.

If it passes: report FREE MODEL VERIFIED, then evaluate guarded worker integration separately; no Expense Tracker launch or automatic assignment. If it fails: report FREE MODEL FAILED, stop model hunting/retries, and enter **Phase 3 preparation only**. No more Gemini/Antigravity troubleshooting or replacement tests.

## 3. Integration status

**Production worker integration: NOT VERIFIED.** OpenRouter's API adapter exists; the Project Studio registry still supports DeepSeek, Codex Personal, Codex School and Claude Code. NVIDIA is not registered or assignable there. A standalone API pass cannot establish Builder artifact application, trusted Tester execution or hash-bound Reviewer findings. Any later integration must preserve task-specific roles, model-family identity, independent author/test provenance, checkpoint binding, cancellation, unknown-outcome handling and owner acceptance. No permanent role is proposed.

## 4. Existing Expense Tracker — read-only inspection

Project **aceea0a7-7c8b-4b32-9371-cf94a029a6ee**, session **b1e11259-d5f7-427e-b004-c66d9a818fe3**.

Current record: ready; phase builder; existing roles DeepSeek / Codex Personal / Claude Code; **zero executions**, **no run approval**, no session lock. The one original historical Counter lock remains. Configured DeepSeek model is `deepseek-flash`. No duplicate project/session, role update, write authorization or approval clock was created.

## 5. Conditional two-agent workflow — TWO-AGENT BLOCKED

**Phase 3's trigger has not occurred:** the final alternative has not been tested or failed. This section is a read-only feasibility finding, not an implementation or live-run authorization.

Existing primitives already save Builder files/revisions, independent Tester provenance/results, checkpoints and failed-phase recovery; restart retains unresolved locks. Resume verifies saved file hashes and refuses changed work or unresolved outcomes. Acceptance requires passing independent tests and current independent review. These safeguards must remain.

**Confirmed gaps before a deliberate Saturday build / Sunday review can be called ready:**

1. Team preflight considers remaining role logins, and normal team progression does not provide a deliberate owner-scoped stop-after-Tester boundary. It must not invoke Claude early merely because the stored role exists.
2. The current optional bounded run scope is for an unused ready session, requires a full bound lineup, expires after 30 minutes and cannot be rearmed after executions exist. A Sunday fresh review-only approval for a partially completed session is not supported by simply reusing or extending that old scope.
3. A narrow continuation authorization must bind the same project/session/database/root, latest Builder artifacts and independent executed Tester evidence, permit only the unfinished Reviewer phase, and prevent duplicate Builder/Tester dispatch. Unknown outcomes must retain required locks/reservations; do not force-release them.

If the final free test fails, implement the smallest extension in existing `studio-run-scope.js`, `project-studio.js`, `studio-workers.js` and recovery/UI status only where needed. Proposed path: approved DeepSeek Builder → durable checkpoint → approved Codex Personal Tester → actual isolated tests → saved results → **PAUSED: REVIEW PENDING** → fresh owner-approved Claude Reviewer → owner final acceptance. Do not create a second engine, permanently change roles, or mark tested work complete before review.

Required mocked regressions would cover authorized phase subsets, pause before Reviewer, reload/restart, fresh review-only approval, artifact/evidence tampering, stale/expired scope, unknown outcomes/locks, concurrency, zero duplicate Builder/Tester calls and owner acceptance. Any production workflow edit requires supported SQLite backup first, full serial regressions and actual browser verification. None was implemented prematurely in this preparation task.

## 6. Future account/authorization requirements

- **DeepSeek:** configured model `deepseek-flash`; no authenticated DeepSeek call here because conditional Phase 3 is not reached. Prior price/balance evidence must not be treated as current. If needed after failure, refresh public pricing and authorized non-generating model/balance checks before quoting. Previously proposed one POST, 4,096 output tokens, 90 seconds and $0.02 local cap are **not approved or activated**. A local reservation is not a provider-enforced spending ceiling. No credit purchase.
- **Codex Personal:** existing dedicated native profile, no API billing substitution. Current included quota not queried or assumed. A later run needs owner confirmation/authorization for its single native invocation, five-minute timeout, 32 KiB capture and actual independent test artifacts/runner evidence. Builder-authored tests alone are insufficient.
- **Claude Sunday:** owner expects reset around **Sunday November 8, 4:00 AM America/New_York**; this is owner-reported, unverified, and not an automation request. Do not schedule or start it. At that time, verify native auth, confirm included allowance and extra usage OFF, reload exact saved artifacts/test evidence, verify family independence, request fresh review-only authorization and resume only the Reviewer. No regeneration of completed work or automatic acceptance.

## 7. Local verification and limitations

- Offline exact free-request check: PASS, one fake request; no actual inference.
- Focused serial regression run: **41/42 passed; 1 failed; 0 skipped/cancelled**. Existing real Windows isolated timeout/owner-Stop fixture reported `Missing expected rejection` on the initial execution context. All other scope/independence/checkpoint/recovery/continuation cases passed.
- One bounded recheck of that precise native fixture on the local host: **1/1 PASS**, 4.65 seconds total. Both timeout and Stop paths passed. The initial failure is retained, not erased by the recheck. Cause is not established; context/timing dependence remains a blocker to claiming unconditional reliability. No assertion weakened or production code changed to force green.
- No full suite rerun: no production workflow edit. No fresh browser checks: no UI change, new pause boundary or staged-review approval exists to verify. Earlier browser results remain historical, not evidence for this new conditional workflow.
- Expense Tracker has no built application yet. Existing Live Preview requires a separately running app and explicit authorization of its exact loopback URL; no preview/server launch or broad preview rewrite was attempted.

Evidence folder: `docs/verification/final-free-model-20261107/` with catalog-account.json, inactive-request.json, offline-request-check.json, existing-session-readonly.json, focused-tests.txt and windows-timeout-recheck.txt. All production projects/data/security/history preserved by read-only inspection and temporary fixtures. No generation, paid call, routing change, fallback, Zapier, Git push or deployment.

## Exact next step after the successful test

The final free-test approval has been consumed by exactly one successful call. No extra generation is authorized. Separately approve a targeted guarded NVIDIA/OpenRouter project-worker integration and its mocks/regressions/dashboard verification. Do not activate routing or launch Expense Tracker automatically. The conditional two-agent fallback implementation is not triggered because the final free test passed.
