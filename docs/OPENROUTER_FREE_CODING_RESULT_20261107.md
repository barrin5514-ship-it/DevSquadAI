# OpenRouter North Mini Code — approved live result, November 7, 2026

**Connection / real response: VERIFIED. Coding test: FAIL — incomplete and syntactically invalid fragment. Production worker integration: NOT VERIFIED.**

## Actual execution

- Exactly one generation POST through the existing OpenRouter adapter, using the previously prepared calculateTotal request unchanged. No retries, fallback, model substitution, paid routing or additional AI request.
- Requested and provider-reported model: `cohere/north-mini-code:free`. Official endpoint `https://openrouter.ai/api/v1/chat/completions`.
- HTTP **200**, elapsed **2,819 ms**, timeout **60,000 ms**. Finish reason **length**. Output limit requested **500 tokens**.
- Provider-reported input **91**, output **498**, total **589**. Output includes **401 reasoning tokens**; do not add them again to the total. Thus only 97 output tokens were non-reasoning according to those counts. No hidden reasoning text retained.
- Provider-reported cost **$0**; local zero-rate estimate also $0. This report proves the recorded request cost, not future capacity or ongoing billing eligibility.
- No Retry-After header. No complete final JSON or runnable artifact. The adapter correctly rejected the length-limited response rather than accepting a draft. Raw safe final fragment is retained only as diagnostic `partialFinalText` in result.json; it is not a saved project artifact.

## Response and local validation

The partial final text explains that reduce adds array values starting from zero, identifies non-array and non-finite/non-number inputs, and starts a corrected function. It cuts off during `return prices.reduce((sum`. The promised two test suggestions never arrive.

A visible returned statement is:

```javascript
if (!Array.isArray prices) throw new TypeError('Input must be an array');
```

The missing function-call parentheses are a real syntax defect in the visible fragment, separate from the missing end of the function. A native Node `--permission --check --input-type=commonjs` subprocess, supplied only that exact returned statement on stdin and no credentials, exited 1 with `SyntaxError: Unexpected identifier 'prices'`. This was syntax-only: no generated JavaScript was executed. The full partial answer also fails JSON parsing. No missing code/quotes/braces were invented, no correction was applied, and no behavior tests could run against a complete function.

Quality assessment: explanation and invalid-input analysis were relevant; the requested deliverable failed because reasoning consumed most of the cap, the final answer was truncated, and the visible validation statement was malformed. This one sample does not certify coding reliability or prove the model can never code correctly. It is insufficient evidence for production Builder, Tester or Reviewer qualification.

## Dev Squad suitability and remaining requirements

The existing API adapter has demonstrated real authenticated generation and retained usage/cost; the zero-price filter and no-fallback body were used. North Mini Code is still a parked API route, absent from the project-worker registry. No assignment, role or automatic fallback was activated.

Before integration can be considered:
1. A separately authorized test must produce complete, valid structured output and JavaScript passing meaningful independent behavior tests. Any reasoning control or larger cap must first be verified/specified and separately approved; no follow-up is authorized now.
2. Implement/test a guarded project-worker contract for artifacts and reviews, with exact model/family provenance, checkpoint continuity and task-scoped authorization. Do not permanently assign a role.
3. Tester claims must bind to actual isolated execution evidence; Reviewer findings must bind to the precise code and test revision. Preserve family independence and owner acceptance.
4. Preserve token/cost accounting, cancellation, rate/error handling and unknown-outcome reservations/locks. A standalone API response is not full three-agent integration.

## Preservation and stop

All **64 database tables unchanged**. No production project files, successful To-Do application, Expense Tracker, checkpoints, historical locks, credentials, routing, security restrictions or agent assignments changed. No Expense Tracker, paid model, Zapier, push or deployment. New code is a bounded diagnostic script only. The live attempt journal prevents reuse.

Local fake-transport validation passed before dispatch. After dispatch, JSON validation failed and the exact-statement syntax check failed as expected. No full regression rerun was needed because production source was unchanged. No claim that suggested tests ran.

Evidence: attempt.json, result.json and local-validation.json under docs/verification/openrouter-coding-live-20261107. Runner: scripts/verify-openrouter-coding-20261107.js. Existing inactive proposal and its catalog evidence are preserved. **One approved request consumed; stop after report.**
