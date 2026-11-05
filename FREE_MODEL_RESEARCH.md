# Free model research

Verified 2026-10-20 against OpenRouter's live API. Prices and availability can change. No routing assignments were made.

## Evidence and access

- Authenticated GET /api/v1/key: HTTP 200, is_free_tier=true; free quota before testing 0 used / 50 daily, 50 remaining. The key's 100 credit cap is not a balance or permission to spend.
- Official limits documentation specifies 20 requests/minute and 50/day for the lower free-model tier. Upstream capacity can impose additional limits; exact per-model quotas were not supplied (per_request_limits=null). Deprecated key.rate_limit is not treated as an unlimited quota.
- Authenticated GET /api/v1/models and /api/v1/models/user: HTTP 200. All three selected IDs were in the account-filtered list with zero prompt/completion prices. Catalog membership does not guarantee generation permission: Inkling subsequently rejected this harness.
- The listing contains 17 explicit :free variants with every supplied pricing field equal to zero. This filter is conservative and is not a claim that all other catalog models cost money.
- Each generation additionally enforced provider.max_price={prompt:0,completion:0,request:0}, allow_fallbacks=false, no tools, no model fallback, one request, 512 output tokens, 60-second timeout. No billing or privacy settings changed.

## Discovered zero-priced variants

| Exact model ID | Context tokens | Input/output price |
|---|---:|---|
| minimax/minimax-m3.1-flash:free | 1000000 | $0 / $0 |
| xingchen-agi/xing4.0-29b-a4b:free | 262144 | $0 / $0 |
| nvidia/nemotron-3.5-super-vl:free | 1000000 | $0 / $0 |
| dots-studio/dots-3-note-preview:free | 512000 | $0 / $0 |
| liquid/lfm-2.5-2.6b:free | 65536 | $0 / $0 |
| nvidia/nemotron-3.5-lightning:free | 1000000 | $0 / $0 |
| thinkingmachines/inkling-small:free | 1048576 | $0 / $0 |
| poolside/laguna-s-2.1:free | 262144 | $0 / $0 |
| thinkingmachines/inkling:free | 1048576 | $0 / $0 |
| poolside/laguna-xs-2.1:free | 262144 | $0 / $0 |
| cohere/north-mini-code:free | 256000 | $0 / $0 |
| nvidia/nemotron-3.5-content-safety:free | 128000 | $0 / $0 |
| nvidia/nemotron-3-ultra-550b-a55b:free | 1000000 | $0 / $0 |
| nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free | 256000 | $0 / $0 |
| google/gemma-4-26b-a4b-it:free | 262144 | $0 / $0 |
| google/gemma-4-31b-it:free | 262144 | $0 / $0 |
| nvidia/nemotron-3-super-120b-a12b:free | 262144 | $0 / $0 |

## Initial shortlist and rationale

| Model | Selection rationale | Caveat |
|---|---|---|
| poolside/laguna-s-2.1:free | Coding-focused model; catalog reports 118B total/8B active parameters and a Terminal-Bench result. | Catalog lists expiration 2026-10-31; recheck before continued use. |
| minimax/minimax-m3.1-flash:free | Catalog emphasizes coding and complex agent tasks; broad context useful for debugging. | Newly listed; mandatory reasoning; requested low effort, excluded reasoning text. |
| thinkingmachines/inkling:free | General reasoning, coding and tool use; candidate for planning. | HTTP 403: free access restricted to agentic harnesses. Not usable through this tested request path. |

These are plausible strong candidates based on provider descriptions, not proven top-ranked models. Cohere North Mini Code and Laguna XS 2.1 are coding-oriented alternatives in the same zero-priced catalog, but were not tested because the three-candidate budget was exhausted. One addition task cannot evaluate architecture, debugging, test generation, security, long-context quality, or reliability. Vendor benchmark statements were not independently reproduced.

## Sources

- [Live catalog](https://openrouter.ai/api/v1/models)
- [Account-filtered model API](https://openrouter.ai/docs/api/api-reference/models/list-models-filtered-by-user-provider-preferences-privacy-settings-and-guardrails)
- [Rate and credit limits](https://openrouter.ai/docs/api_reference/limits)
- [Zero-price routing constraints](https://openrouter.ai/docs/guides/routing/provider-selection#max-price)
- Local snapshots: data/openrouter-benchmark/catalog.json, free-models.json, account-models.json, quota.json. No API keys stored in these artifacts.


## 2026-10-21 provider expansion (activation pending)

See [PROVIDER_EXPANSION.md](PROVIDER_EXPANSION.md) for Gemini diagnostic findings, Mistral/NVIDIA/Cloudflare adapter setup, official conditional free-access research, key/account evidence, separate routing/live approval gates, usage/context/backoff controls, mocked handoff validation and the unsubmitted calculator plan. Seven developer provider cards reuse the existing executor/data architecture; DeepSeek remains sole senior and paid access stays disabled. All four expanded routes remain off pending credentials/evidence and explicit owner routing activation. Existing sections above are historical where superseded.
