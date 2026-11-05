> Active policy updated: DeepSeek is the sole Senior Developer and lead reviewer. Claude Code/Codex manual workflows are retired. Older sections below are historical context, not current agent assignments. See the current policy section at the end.

# Provider setup — Checkpoint 2

## Verification status

All five provider request formats were checked against official documentation on 2026-10-19. All five adapters have mocked request/response tests. **No provider was tested live:** CEREBRAS_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY and HF_TOKEN were absent. No real model ID or free allowance is baked into the application. Optional unavailable providers do not stop the backend.

## Configure one provider

1. Keep existing `.env` values. Add the relevant new variables from `.env.example`; do not replace an existing environment file.
2. Obtain a key in the provider's own account console. Put it only in the local `.env` or operating-system environment. Do not paste it into code, a request body, project memory or chat.
3. Choose a current text/code model from the official provider catalog and enter its exact ID in `<PROVIDER>_MODEL`.
4. Confirm that your particular model and account can make the call without paid billing. Disable paid overage/automatic recharge at the provider where applicable. Only then set `<PROVIDER>_FREE_CONFIRMED=true`.
5. Restart the backend. Read `GET /api/providers/availability` for missing configuration and cooldown reasons. This endpoint reports configuration availability, not proof of live connectivity.
6. `POST /api/providers/groq/check` with `{}` (substitute your provider) checks the configured model's catalog entry. Catalog connectivity does not prove generation permission, free access, or successful generation.
7. If you authorize one small free generation, run `node scripts/smoke.js groq --authorize-free`. It uses a separate temporary database, limits output to 512 tokens, makes at most one generation attempt, runs syntax checks only, and preserves the temporary results for inspection. It never touches production project data or executes generated code.

All generation routes are real HTTP implementations, not canned responses. Models, free availability and account permissions remain the operator's responsibility. Setting a free-confirmation flag does not change a provider's billing. Unknown/unconfirmed and explicitly paid configurations are excluded; there is no automatic paid fallback or paid authorization route in this checkpoint. A paid spending-allowance implementation remains deferred rather than silently treating a key as permission to spend.

## Provider configuration and official references

| Provider ID | Key variable | Model variable | Verified protocol |
|---|---|---|---|
| cerebras | CEREBRAS_API_KEY | CEREBRAS_MODEL | Bearer-authenticated `/v1/chat/completions` |
| groq | GROQ_API_KEY | GROQ_MODEL | Bearer-authenticated `/openai/v1/chat/completions` |
| gemini | GEMINI_API_KEY | GEMINI_MODEL | `x-goog-api-key`, `v1beta/models/{model}:generateContent` |
| openrouter | OPENROUTER_API_KEY | OPENROUTER_MODEL | Bearer-authenticated `/api/v1/chat/completions`; explicit `:free` model required; fallback disabled |
| huggingface | HF_TOKEN | HUGGINGFACE_MODEL | Bearer-authenticated `router.huggingface.co/v1/chat/completions` |

Official references used:

- [Cerebras chat API](https://inference-docs.cerebras.ai/api-reference/chat-completions), [quickstart](https://inference-docs.cerebras.ai/quickstart), [model listing](https://inference-docs.cerebras.ai/api-reference/models/list-models).
- [Groq API](https://console.groq.com/docs/api-reference), [model catalog and listing endpoint](https://console.groq.com/docs/models).
- [Gemini generation](https://ai.google.dev/api/generate-content), [authentication](https://ai.google.dev/api), [models](https://ai.google.dev/api/models).
- [OpenRouter chat API](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion), [model listing](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties), [free variant](https://openrouter.ai/docs/guides/routing/model-variants/free).
- [Hugging Face chat API](https://huggingface.co/docs/inference-providers/tasks/chat-completion), [model catalog API](https://huggingface.co/docs/inference-providers/main/hub-api), [billing](https://huggingface.co/docs/inference-providers/pricing).

Hugging Face credits are not an unlimited free tier. Its catalog can report a base model without a provider suffix; a suffixed model may fail the conservative exact-match connectivity check even if generation is supported. Confirm the exact route in the provider console; do not reinterpret a failed check as success.

Gemini uses JSON response mode. For the other providers set `<PROVIDER>_JSON_MODE=true` only when the selected model supports JSON-object output; otherwise the prompt requests JSON and the backend still validates it. Tool calls, streaming, incomplete completions and refusals are not accepted as drafts.

Optional per-provider settings: `<PROVIDER>_CAPABILITIES=coding`, `<PROVIDER>_QUALITY=1` (operator rating 1–5), and `<PROVIDER>_MAX_INPUT_BYTES=12000`. These are local policy values, not provider rate/context limits. Input/output prices can be supplied as `<PROVIDER>_INPUT_USD_PER_MILLION` and `<PROVIDER>_OUTPUT_USD_PER_MILLION`; they produce an estimate only when both token counts are reported. Leave them unset when unknown. Prices never grant permission to spend.

## Routing and local budgets

Standard mode tries eligible providers sequentially, stopping at the first valid draft. Quality mode collects multiple valid drafts, preferring the number of files that pass syntax/JSON checks, with routing order breaking ties. This is a limited static heuristic, not proof of correctness or a substitute for behavioral testing. Routing considers configured coding capability, model assignment, availability/cooldown, input size, task category performance, task complexity and configured quality rating.

`AI_MAX_ATTEMPTS` defaults to 3 and is capped at 5. Each provider gets at most one attempt per submission. A 429 starts a bounded local cooldown; subsequent providers can be tried. No background retries or infinite loops exist.

`AI_REQUEST_BUDGET` (100) and `AI_TOKEN_RESERVATION_BUDGET` (1,000,000) are persistent lifetime limits for this database. Each outbound generation reserves input UTF-8 bytes plus the maximum output token allowance before network activity, inside a SQLite transaction. This intentionally conservative reservation is not a tokenizer result or billed usage. Failed/interrupted attempts retain reservations. Raising the configured limits requires an operator decision; history is never cleared automatically. Connectivity GET requests do not consume generation reservations. These controls are not a substitute for provider-side billing restrictions.

`REQUEST_TIMEOUT_MS` also bounds provider requests and their response bodies. `TOKEN_LIMIT` sets maximum generated tokens. Only official fixed HTTPS hosts are used; redirects are rejected. Remote error bodies and keys are never logged or returned.


## Current verification and new provider policy — 2026-10-21

Official sources: [Groq limits](https://console.groq.com/docs/rate-limits), [OpenRouter current public catalog](https://openrouter.ai/api/v1/models), [OpenRouter limits](https://openrouter.ai/docs/api_reference/limits), [Cerebras limits/trial terms](https://inference-docs.cerebras.ai/support/rate-limits), [Cerebras catalog](https://inference-docs.cerebras.ai/models/overview), [DeepSeek models](https://api-docs.deepseek.com/quick_start/pricing), [DeepSeek balance API](https://api-docs.deepseek.com/api/get-user-balance/).

Groq's documented free GPT-OSS 120B limits are 30 RPM, 1,000 RPD, 8,000 TPM and 200,000 TPD; account limits can differ. The app additionally uses conservative shared request ceilings and persistent local token budgets. OpenRouter free requests are generally limited to 20/minute and 50/day below the documented purchase threshold; do not purchase credits to raise limits for this task. Account catalog checks, actual provider headers and app cooldowns determine dispatch eligibility, not historical benchmark claims.

Public OpenRouter data currently shows zero input/output pricing for minimax/minimax-m3.1-flash:free (1M context) and poolside/laguna-s-2.1:free (262,144 context, expires 2026-10-31). Actual account access could not be reverified: bounded authenticated catalog GETs failed to complete from the tool environment. No live generation was attempted. Local Groq key/model/free confirmation are present; OpenRouter key is present but OPENROUTER_FREE_CONFIRMED is false. The app must not change that assertion for the owner.

Cerebras already had an OpenAI-compatible adapter; it is reused and mock-tested, with a runtime policy block. Its current offering has no renewing free API tier. The documented trial requires a payment method and expires after 30 days or its credits are consumed. Catalog IDs gpt-oss-120b and qwen-3.8-27b are real, but neither is enabled as a verified free model. Trial RPM is 5 per model; this is not an app entitlement or authorization to activate billing. CEREBRAS_API_KEY is missing locally. Adding it will not override the policy block.

DeepSeek's documented direct model IDs include deepseek-flash and deepseek-v4-pro. The paid adapter/quote/balance/budget path is prepared and mock-tested, never live-verified. Local key is missing and paid policy remains disabled. The pricing route served first-call/model documentation during inspection, so no exact numeric tariff was assumed or populated. The .env.example lists secure key/model, disabled activation, verified rate expiry and blank USD ceilings/rates. Missing/expired/unknown pricing, non-USD-only balance or insufficient budget fails closed. Separate future owner approval is required before setting activation or submitting any paid request; configuration does not replace per-request consent. Estimates are not invoices, and unknown charges retain reservations until owner reconciliation. No credentials belong in documentation or Git.


## DeepSeek senior setup and billing limits

DeepSeek is now the sole active senior developer/reviewer; its generic free adapter remains blocked. No existing API key or paid policy was enabled in this change. Required secure settings are listed in .env.example: DEEPSEEK_API_KEY, DEEPSEEK_MODEL, DEEPSEEK_PAID_ENABLED (default false), DEEPSEEK_INPUT_USD_PER_MILLION, DEEPSEEK_OUTPUT_USD_PER_MILLION, DEEPSEEK_PRICES_VERIFIED_UNTIL, DEEPSEEK_REQUEST_LIMIT_USD, DEEPSEEK_DAILY_LIMIT_USD, DEEPSEEK_TOTAL_LIMIT_USD. Configure valid current rates rather than copying an old tariff. Supported model IDs remain deepseek-flash and deepseek-v4-pro pending actual account verification.

Configuration does not authorize a request. Each review requires its own owner-confirmed quote and bound maximum USD. Current USD balance is checked only on explicit balance action or as part of that authorized operation. Local caps are not provider-side limits: estimates, unknown outcomes, external account use and changing provider charges can differ from local reservations. This implementation does not claim that a local cap prevents every provider charge.

ALLOW_CODEX_MANUAL_REVIEW is obsolete and ignored. No Claude/OpenAI API configuration or local subscription handoff is part of the active workflow. Historical investigation/setup notes below/above are audit references only.


## 2026-10-21 free-developer activation

See [FREE_DEVELOPER_HANDOFFS.md](FREE_DEVELOPER_HANDOFFS.md) for verified account/catalog evidence, quota, exact retirement deadlines, Windows certificate-store startup, dashboard status semantics, mocked handoffs and the unsubmitted calculator demonstration. OpenRouter free confirmation is enabled; live generation and DeepSeek paid access remain off. MiniMax retires October 22 at 12:00 UTC; Laguna is excluded starting October 31 UTC. No paid replacements are selected.


## 2026-10-21 provider repair and verified connection

See [PROVIDER_REPAIR.md](PROVIDER_REPAIR.md) for Groq network-denial diagnostics, the repaired OpenRouter catalog size bound, the single owner-authorized successful MiniMax free smoke test, exact retirement cutoff, DeepSeek read-only account/balance verification, secure local key setup and missing owner spending budgets. DeepSeek paid generation and live session defaults remain disabled; no new MiniMax generation is authorized. Older untested statements above are historical.


## 2026-10-21 provider expansion (activation pending)

See [PROVIDER_EXPANSION.md](PROVIDER_EXPANSION.md) for Gemini diagnostic findings, Mistral/NVIDIA/Cloudflare adapter setup, official conditional free-access research, key/account evidence, separate routing/live approval gates, usage/context/backoff controls, mocked handoff validation and the unsubmitted calculator plan. Seven developer provider cards reuse the existing executor/data architecture; DeepSeek remains sole senior and paid access stays disabled. All four expanded routes remain off pending credentials/evidence and explicit owner routing activation. Existing sections above are historical where superseded.

## 2026-10-22 bounded diagnostics

See PROVIDER_DIAGNOSIS_20261022.md for exact models,7live requests, actual usage, per-provider blockers and the disposable dashboard walkthrough. No persistent .env/free/paid/routing values changed. NVIDIA's current documented candidate uses reasoning_effort none for small explicit evaluations; a90-second deadline is evaluation-only. No claim that it resolves all latency or permits production. Mistral's previously confirmed included allowance was reused. Future connection checks do not authorize generation; current evaluation authorization is closed.

## 2026-10-22 Gemini reasoning correction and coding verification

See [GEMINI_CODING_VERIFICATION_20261022.md](GEMINI_CODING_VERIFICATION_20261022.md) for the closed three-request budget, official model-specific reasoning/JSON documentation, corrected Gemini probe and independently tested code, and Groq's renewed HTTP 403. Gemini 3.8 uses documented low thinking by default for bounded drafts; native JSON mode remains. Incomplete responses retain safe diagnostic partial final text and are never accepted as drafts. Routing, free confirmations, paid policy and owner gates are unchanged. These evaluation results do not authorize routine provider use.
