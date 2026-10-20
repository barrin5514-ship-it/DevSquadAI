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
