# One free OpenRouter coding test — preparation only

November 7, 2026. **READY FOR LIVE TEST — explicit owner approval still required.** Zero live generation requests. No active grant, clock, routing change or Expense Tracker run.

## Selected candidate

**Cohere North Mini Code: `cohere/north-mini-code:free`.** Proposed official endpoint: `https://openrouter.ai/api/v1/chat/completions`.

Current public model GET, authenticated account-filtered model GET and key-status GET each returned HTTP 200. Observed at `2026-11-07T06:33:57.648Z` (November 7, 1:33 AM America/New_York). The existing key is authenticated; account reports free tier, **0/50 daily requests used, 50 remaining**. This is a point-in-time provider report, not guaranteed availability at dispatch. Generation has not been tested.

Selected model appears in **both** catalogs. Every reported price field is zero: input **$0**, output **$0**. No card, billing activation, purchase or credit use is needed for the proposed `:free` route. Expected model charge: **$0**, subject to retaining this exact zero-priced route and rejecting paid endpoints. No paid counterpart or general router is proposed.

| Candidate, all account-listed and zero input/output price | Context | Maximum output | Tools | Native structured-output fields advertised |
|---|---:|---:|---|---|
| **`cohere/north-mini-code:free`** | 256,000 | 64,000 | tools/tool choice | Neither response_format nor structured_outputs |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | 1,000,000 | 65,536 | tools/tool choice | Neither response_format nor structured_outputs |
| `nvidia/nemotron-3.5-super-vl:free` | 1,000,000 | 131,072 | tools/tool choice | Both response_format and structured_outputs |

All three support `max_tokens` and reasoning controls in their catalogs; no expiration date was reported. Catalog maximums are not the test budget or remaining account allowance. NVIDIA candidates remain alternatives only; none is a fallback.

Selection rationale: North Mini Code is specifically trained for coding/software-engineering tasks, with a small active model footprint suitable for this short, 500-token probe. It is a practical first test, **not a claim of objectively superior or already verified quality**. NVIDIA Ultra is a larger reasoning/planning option; Super VL offers better native schema compatibility. No local quality or latency comparison has been performed. Popularity is not quality evidence. Official descriptions: [North Mini Code](https://openrouter.ai/cohere/north-mini-code:free), [Nemotron Ultra](https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b:free).

[Published free-variant limits](https://openrouter.ai/collections/free-models/): 20 requests/minute and the unfunded 50/day tier; failed attempts count. No request-limit headers were supplied in today's GET responses, and no model-specific guaranteed capacity was reported. Do not interpret published limits as proof of generation success.

## Exact proposed single request

Saved separately as `docs/verification/openrouter-coding-preparation-20261107/inactive-proposed-request.json`, explicitly **inactive / authorization pending**. It contains no credentials. Existing adapter will use the saved local key privately.

- One POST, exact selected model, `max_tokens: 500`, `stream: false`, timeout **60,000 ms**.
- No client retries, additional generation, model substitution, tools or automatic continuation.
- `provider.allow_fallbacks: false`; `provider.max_price` prompt/completion/request all zero. Do not use `openrouter/free`, a model array or a paid route.
- Brief JSON requested through the prompt, then strictly validated locally. Do not add unsupported `response_format` or schema parameters just because another model supports them. Tool JSON-schema support is not the same as native final-answer schema enforcement.
- Reasoning may consume the small output allowance; no unsupported thinking-disable parameter is assumed. Empty, malformed or length-limited output is incomplete and must not be reported as success. No follow-up generation on failure.

System instructions:

```text
Return concise JSON only with explanation, edgeCase, code, and tests
(exactly two brief test suggestions). No Markdown fences, tools, or
claims of executed tests.
```

User content:

```text
Review function calculateTotal(prices) {
  return prices.reduce((sum, price) => sum + price, 0);
}
Explain it briefly, identify an invalid-input edge case, return a corrected
function accepting only an array of finite numbers and rejecting invalid
inputs, and suggest two meaningful tests.
```

After approval only: record actual returned model, HTTP status, duration, response, finish reason, usage and reported cost. Validate output structure, inspect the returned code before execution, then use a restricted temporary process without credentials and with a timeout. Independently check empty/valid arrays, decimals, negatives and invalid string/null/undefined/NaN/infinite inputs. Review suggested tests as suggestions; never count them as executed tests. No project writes or additional provider requests to repair output.

## Existing Dev Squad compatibility

The existing OpenRouter API adapter is compatible with the pinned chat request, token cap, abort timeout, token accounting and zero-price/no-fallback filters. An offline fake response verified its exact request body, completion handling and JSON parsing; **one mocked request, zero live generation requests**. Syntax check of the read-only discovery script passed. No production source changed; no unnecessary full-suite or browser rerun.

Production worker integration remains **NOT VERIFIED**. OpenRouter is a parked API adapter, not a supported Project Studio worker transport. Its model cannot currently be selected in the dynamic Builder/Tester/Reviewer registry. A later standalone generation success would still require guarded artifact output, schema binding, model-family provenance, cancellation/unknown-outcome handling, role-specific approval and checkpoint tests. Tester qualification requires trusted independent execution, not written test claims. Reviewer qualification requires hash-bound artifact/test findings. Cohere is a distinct family from DeepSeek/Codex, but that alone does not certify independence or a complete integration. No permanent role is proposed.

All projects, pending Expense Tracker, authentication profiles, checkpoints, owner gates, historical locks, security restrictions and routing are preserved. Only read-only external GETs and local diagnostic/document files were used. No Gemini/Antigravity test, paid call, Zapier, push or deployment.

## Exact approval requested

**Approve ONE zero-cost `cohere/north-mini-code:free` request using the saved OpenRouter key and the `calculateTotal` prompt above: maximum 500 output tokens, 60 seconds, no retries, provider/model fallback, paid routing, extra model calls or production project changes. Includes inspection and isolated local JavaScript validation of the response.**

Without that explicit approval, generation result, coding quality, actual tokens and cost remain **NOT VERIFIED / NOT RUN**. This report prepares the test; it does not activate a worker or approve the Monday three-agent run.

Evidence: `catalog-account-check.json`, `inactive-proposed-request.json`, `offline-adapter-check.json` under `docs/verification/openrouter-coding-preparation-20261107/`. Discovery script: `scripts/prepare-openrouter-coding-20261107.js`. Stop after reporting and await approval.

## Executed outcome

Owner separately approved and exactly one request was consumed. HTTP 200, real partial generation, finish length, invalid JSON/incomplete code plus a confirmed visible syntax defect. Provider usage 91 input / 498 output (401 reasoning included) / 589 total, reported cost $0. No retry or activation. See OPENROUTER_FREE_CODING_RESULT_20261107.md. The original proposal above and inactive payload remain historical evidence, not reusable authorization.
