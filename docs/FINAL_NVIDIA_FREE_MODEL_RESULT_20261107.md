# Final NVIDIA free model — verified result, November 7, 2026

**PASS — FREE MODEL VERIFIED for this bounded coding test. Production Dev Squad worker integration remains NOT VERIFIED.**

## Live request and actual evidence

- Exactly one generation POST, requested and reported model `nvidia/nemotron-3.5-super-vl:free`; official OpenRouter endpoint. No retry, fallback, substitution or additional generation.
- Fresh public/account catalogs and key GETs: HTTP 200; zero input/output prices, optional reasoning, free account with 49/50 requests remaining before dispatch. No fresh post-call quota query or inferred remaining count.
- Request: max_tokens 2048, reasoning.enabled false, strict JSON schema, 60-second timeout, require_parameters true, allow_fallbacks false, zero prompt/completion/request max-price filters. Exact payload and its hash retained.
- HTTP **200**, **2359 ms** elapsed, finish **stop**, complete strict-structure response.
- Provider-reported tokens: **96 input / 175 output / 271 total**, **0 reasoning**.
- Provider-reported cost **$0** (local zero-rate estimate also $0). No billing/card/purchase changes. This proves the reported cost of this response, not ongoing capacity or free-plan guarantees.

## Complete returned final answer

Edge case: Non-array or non-numeric inputs such as strings, null, undefined, NaN, or Infinity cause incorrect totals or runtime errors.

```javascript
function calculateTotal(prices) {
  if (!Array.isArray(prices)) throw new TypeError("Input must be an array");
  if (prices.some(price => typeof price !== "number" || !Number.isFinite(price))) {
    throw new TypeError("All elements must be finite numbers");
  }
  return prices.reduce((sum, price) => sum + price, 0);
}
```

Two suggested tests:
- calculateTotal([10, 20, 30]) === 60
- calculateTotal(["10", 20]) throws TypeError

Full original final JSON string and parsed fields are retained in result.json. No hidden reasoning text retained.

## Independent validation

Static inspection: standalone function using Array.isArray, typeof, Number.isFinite, some and reduce. No I/O, external imports, tools or top-level work. Exact returned code passed native syntax checking, without correction or normalization.

Final isolated execution: **24/24 PASS**, zero failed/skipped/cancelled: **23 behavior checks plus one no-inherited-API-credentials check**. Covers empty/single/integer/negative/zero/decimal arrays; non-array undefined/null/string/number/object/set; string/null/undefined/NaN/positive-negative infinity/boolean/object/array elements; immutable input. Both model-suggested behaviors were independently asserted. Suggested test prose was not treated as execution evidence.

Execution used a separate disposable evaluation folder, existing Codex MXC root-deny/no-network policy, additional Node permissions, credential-free child environment and VM evaluation. Codex sandbox launch was a non-model local command, not a Codex AI invocation. Node harness duration 19 ms; launcher timeout 15 seconds. No application code, database, credentials or unrelated files were available to the function.

**Genuine local harness mistakes corrected and preserved:** the first absolute-path fixture launch in Windows Temp could not find the test file. Relocating it alone did not solve the error. Trusted stat probes established that the non-Temp fixture was readable. A relative path then exposed Node attempting to canonicalize denied C:\, with EPERM. My diagnostic omitted the --preserve-symlinks/--preserve-symlinks-main flags already used by the existing isolated demo. Applying those existing loader flags and a relative test path made the unchanged code and assertions pass. No filesystem grant, root-deny, sandbox or assertion was weakened. The initial Temp-only explanation was incomplete; no stronger cause is claimed for that first lookup. All failed local launcher evidence remains in independent-tests-temp-launch.json, independent-tests-absolute-path.json and independent-tests-missing-node-flags.json. These were local execution attempts, not additional model requests.

## Quality and limits

The response identified real invalid input, returned concise syntactically valid code, rejected all prepared invalid inputs, preserved valid behavior and suggested two useful tests. Reasoning-off worked for this response according to reported zero reasoning tokens. This is strong evidence for the small calculateTotal task; it does not certify broad coding quality, test execution tools, reliability, security review competence or all production roles.

## Dev Squad integration — next separately authorized step

No provider was registered, assigned or activated. OpenRouter API request/response handling works, but Project Studio does not yet expose this API as a guarded project-worker transport. Remaining work:
1. Add the smallest task-scoped API worker contract using existing guarded artifacts, roles, checkpoints, usage/accounting and cancellation/unknown-outcome safeguards. Keep exact free model/pricing enforcement and no paid fallback.
2. Preserve NVIDIA model-family identity and prior Builder/Tester provenance; temporary roles only. Test Builder artifact, Tester and hash-bound Reviewer contracts separately with mocks. Tester role requires trustworthy actual isolated execution, not written claims.
3. Reuse the verified isolated runner command flags, retain Stop/locks/approval gates, test malformed/truncated/error/cancellation/restart/duplicate cases, and verify the actual dashboard after an authorized integration change. Do not autoaccept.
4. Obtain a separate exact Expense Tracker lineup/run approval and fresh account readiness before any multi-agent execution. This successful probe is not that authorization.

Because the final free-model test PASSED, the conditional fallback to implementing the two-agent staged workflow is **not triggered**. Its previously documented pause/review-only-scope gaps and intermittent Windows fixture are not claimed fixed. Do not start DeepSeek/Codex/Claude or schedule a Sunday review.

## Preservation and stop

All 64 database tables were unchanged during the live request. Post-test comparison with the earlier supported backup finds only the previously recorded backend runtime PID difference; original Counter/Counter Test 2/To-Do/Expense file fingerprints match prior evidence, original historical lock remains and Expense executions remain zero. Test files exist only in disposable diagnostic locations; no registered production project was modified.

No production source changed, no full regression rerun or new browser verification was necessary for this standalone test. Local mock transport validation, exact-code syntax and real isolated functional tests are the evidence; this is not a visually verified new dashboard integration. No Git push, deployment, Zapier, assignments or automatic fallback changes. Stop after report.

Evidence: approved-preflight.json, inactive-request.json, attempt.json, result.json, syntax-check.json, independent-tests.json, test-path-diagnosis.json and post-test-preservation.json in docs/verification/final-free-model-20261107. Diagnostic runner: scripts/verify-final-nvidia-free-20261107.js. The single-use attempt journal prevents another dispatch under this approval.
