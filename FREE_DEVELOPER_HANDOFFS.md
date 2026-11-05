# Free developer activation and handoff verification

Verified 2026-10-21. No generation request authorized or submitted.

## Account and models

Authenticated GET /api/v1/key and GET /api/v1/models/user returned HTTP 200. Key reports is_free_tier=true; observed free daily quota: 2 used, 50 limit, 48 remaining. This is a timestamped observation shared with other clients, not a guaranteed reservation. Credit limit fields are spending caps, not a prepaid balance. No purchase or billing configuration change.

| Developer | Exact model | Current evidence | Free deadline |
| --- | --- | --- | --- |
| Groq | openai/gpt-oss-120b | Key/model/free confirmation configured; historical generation success. Today's authenticated catalog GET returned HTTP 403. Generation is unverified today. | None recorded |
| Laguna | poolside/laguna-s-2.1:free | Public and account-filtered catalogs list zero prompt/completion prices; 262,144 context, 32,768 maximum output. | 2026-10-31 00:00 UTC, conservative application cutoff |
| MiniMax | minimax/minimax-m3.1-flash:free | Public and account-filtered catalogs list zero prompt/completion prices; 1,000,000 context, 524,288 maximum output. | 2026-10-22 12:00 UTC |

Both OpenRouter models accept max_tokens and the existing chat-completions message protocol. Laguna does not advertise response_format; current JSON-mode setting is off and JSON output is requested in the prompt, then validated locally. Listing success establishes current account visibility/pricing, not successful generation or provider capacity.

Official sources: [Laguna](https://openrouter.ai/poolside/laguna-s-2.1:free), [MiniMax](https://openrouter.ai/minimax/minimax-m3.1-flash:free), [limits](https://openrouter.ai/docs/api_reference/limits), [public catalog](https://openrouter.ai/api/v1/models). MiniMax's official page publishes its exact retirement time even though its catalog expiration_date is null; the application now enforces the published deadline. It never switches to the paid base model.

## Activation and transport

Added only OPENROUTER_FREE_CONFIRMED=true to the local ignored .env after successful key/catalog checks. Groq remains default; live session remains off; DeepSeek remains disabled. All three developers are eligible for the existing free fallback pool subject to cooldown, expiry, budgets and owner authorization. Automatic handoff requires per-operation allowFallback=true; it does not run in the background.

Node's bundled certificate roots initially rejected the connection (UNABLE_TO_VERIFY_LEAF_SIGNATURE). Windows HTTPS worked. Node --use-system-ca succeeds with the Windows certificate store and full TLS validation retained. npm start and npm run verify:free use this supported flag. No certificate files, TLS verification policy, global Node settings or authentication were changed. Verification script performs fixed read-only GETs; it never calls generation endpoints or activates models itself.

Saved provider-connections.json beside the database contains sanitized evidence bound to a hash of the current key; dashboard responses omit that hash and all credentials. Evidence expires after 24 hours or a key change. Dashboard reads do not contact providers. Refresh explicitly with npm run verify:free when needed.

## Safety and handoffs

Existing pre-dispatch account-filtered catalog check requires exact :free IDs and all returned prices zero. Provider request uses max_price prompt/completion/request=0 and allow_fallbacks=false. Application fallback selects distinct eligible free models only, within the three-attempt ceiling. Paid providers are excluded; DeepSeek cannot be charged by this path.

OpenRouter documents 20 requests/minute and 50/day for the lower tier; larger lifetime purchases can increase the daily tier, but no purchase is needed or recommended here. Application conservatively enforces 20/minute and 50/UTC day shared by provider, counts failed/unknown attempts, respects Retry-After and persists cooldown/backoff. Other clients consume the same account allowance; observed quota is not a live guarantee.

A handoff validates a durable hashed checkpoint, supplies requirements, approved plan, previous complete draft, diffs, test/correction evidence and known errors. A truncated response is never treated as verified progress or executed. Only complete validated drafts are retained. Durable operation IDs/task locks prevent duplicate dispatch. No automatic restart after crash/pause; owner authorizes resume. Senior review and owner acceptance remain mandatory; DeepSeek being disabled intentionally pauses final completion.

## Prepared live calculator demonstration (awaiting authorization)

Proposed task: Write a JavaScript calculate(a,b,operation) function supporting +, -, *, /; reject invalid operations and division by zero. Return the existing files JSON schema with src/calculator.js. Do not execute code or import dependencies.

Use a manual owner-authored plan (zero planning API calls) and one approved child task. Start Groq; allow Laguna and MiniMax as eligible fallbacks only if a preceding model fails, before their deadlines. A successful first response ends the operation; a single run does not force all three models to answer. A genuine failure demonstration was tested with mocks.

Expected API usage: 1 generation on success, maximum 3 distinct generation attempts with explicit fallback consent, fewer if capacity/budgets block. Each OpenRouter attempt includes one read-only account catalog GET. Existing configured hard completion cap is 4096 per attempt (up to 12,288 across three); this small task is expected to need far less, but reasoning/output usage is provider-dependent. Input context is bounded by the configured 12,000-byte provider policy. Actual token counts will be recorded only if a later authorized request occurs. No invented token estimate is reported as measured usage.

Expected model charges: USD 0 for verified free routes. No paid model, purchase, DeepSeek call or senior approval is included. Changed pricing/access blocks the request; provider-side zero-price constraints remain attached.

Exact future owner authorization: approve the saved calculator plan, enable the free-session control, assign Groq, and confirm one development operation with authorizeRequest=true and allowFallback=true (at most three distinct eligible free models), a new operationId and category=coding. This authorizes generation only; it does not authorize DeepSeek, code execution, applying files or final acceptance. Groq's HTTP 403 should be investigated before claiming it can start successfully. If testing after MiniMax retires, exclude it; never substitute its paid slug.

Current evidence: data/free-developers-inspection.json and data/provider-connections.json. Checkpoint/source backup: data/checkpoints/free-developers-20261021/. Final automated results and preservation checks are recorded in PROMPT_LOG.md.


## 2026-10-21 provider repair and verified connection

See [PROVIDER_REPAIR.md](PROVIDER_REPAIR.md) for Groq network-denial diagnostics, the repaired OpenRouter catalog size bound, the single owner-authorized successful MiniMax free smoke test, exact retirement cutoff, DeepSeek read-only account/balance verification, secure local key setup and missing owner spending budgets. DeepSeek paid generation and live session defaults remain disabled; no new MiniMax generation is authorized. Older untested statements above are historical.
