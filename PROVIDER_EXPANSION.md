# Developer provider expansion — 2026-10-21

Status: adapters/routing/dashboard implemented and mock-tested; no live generation or new routing activation authorized by this task. Existing .env and all existing SQLite records are preserved.

## Gemini findings

Configured gemini-3.8-flash, x-goog-api-key authentication, official v1beta/models/{model}:generateContent endpoint. Read-only authenticated model lookup200, generateContent supported, input1048576/output65536tokens. [Google pricing](https://ai.google.dev/gemini-api/docs/pricing) advertises zero input/output cost on Free Tier for Standard inference; Batch/paid tiers and optional tools are separate. Software engineering/debugging capabilities documented on the model page. Local GEMINI_FREE_CONFIRMED=true is the owner's earlier confirmation, not an independent current billing-tier/quota check. No new live generation test.

Saved reports: first generation503; later bounded requests timed out, including a60-second128-token READY probe. Historical AI Studio observation was Free tier with5RPM/250KTPM/20RPD, but key-to-project mapping was not independently verified. Those are dated observations, not asserted current limits. Main task database contains no historical Gemini usage rows; original isolated diagnostic databases/reports were preserved. No evidence establishes a precise outage/overload cause or a configuration/model error. Today's model lookup succeeding does not prove generation recovered.

Confirmed application issues addressed: Gemini output usage now includes provider-reported thinking tokens instead of undercounting output;503 Retry-After is retained, provider/model backoff persists and adds small positive jitter. Existing3-total-attempt distinct-provider handoff remains bounded and requires explicit fallback consent. No hidden same-provider retry loop or background health generation.401/403/404/invalid-request errors freeze a new provider until owner re-verification. Existing30-second request timeout is unchanged; optional GEMINI_TIMEOUT_MS=60000 is supported without changing .env. Earlier60-second failures mean a higher timeout alone is not claimed as a repair.

## Official candidate research

| Provider | Candidate exact model | Public access and limits | Account status |
| --- | --- | --- | --- |
| Gemini | gemini-3.8-flash | Standard Free Tier input/output free;1048576input/65536output tokens from authenticated model response. Current rate/quota is project-specific. No published free-tier end date established. | Authenticated model response200; current account plan/quota requires owner confirmation. Generation unverified today. |
| Mistral | codestral-2508 | Coding/FIM/chat/structured responses; published128Kcontext, app conservatively caps128000. Pay-as-you-go list priceUSD0.30input/USD0.90output per1M. Zero-cost access is conditional on the exact account's included Free-mode allowance, not the model's list price. | Key missing. No account-specific model/free eligibility established. |
| NVIDIA NIM | nvidia/nemotron-3-super-120b-a12b | Official hosted model, up-to1Mcontext; reasoning/agentic tasks. API Catalog trial credits are limited, consumed by remote requests, and not a permanent/unlimited free service. Exact account credits/rate/output limits/card requirement/expiry not established. | Key missing; disabled. Non-production evaluation confirmation and verified allowance required. |
| Cloudflare Workers AI | @cf/qwen/qwen2.5-coder-32b-instruct | Coding model32768context. Workers Free10000Neurons/day, resets00:00UTC and fails at free allowance; Workers Paid can charge overages. Model rates60000input/90909output Neurons per1Mtokens (USD0.66/1.00 equivalent). | AccountID/token missing; disabled. Must verify Workers Free, no paid overage, and today's remaining allowance. |

Sources: [Mistral free setup](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key), [usage limits](https://docs.mistral.ai/admin/billing-usage/usage-limits), [Codestral](https://docs.mistral.ai/models/codestral-25-08), [Devstral2](https://docs.mistral.ai/models/devstral-2-25-12), [Medium3.5](https://docs.mistral.ai/models/mistral-medium-3-5-26-04), [NVIDIA quickstart](https://docs.api.nvidia.com/nim/docs/api-quickstart), [Nemotron](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-super-120b-a12b), [NVIDIA FAQ](https://docs.api.nvidia.com/nim/docs/faq), [trial terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf), [NVIDIA LLM catalog](https://docs.api.nvidia.com/nim/reference/llm-apis), [Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Cloudflare model](https://developers.cloudflare.com/workers-ai/models/qwen2.5-coder-32b-instruct/), [Cloudflare paid-only exclusions](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/), [Cloudflare OpenAI protocol](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/).

Mistral's current docs call this Free mode; Experiment is an older plan name. No credit card is required for the documented Free mode; usage is shared across the account/organization services and monthly allowance. Exact model entitlement, limits and key expiration must be checked in the owner's Studio. Do not assume all models are free. Devstral2/devstral-2512 is officially deprecated since2026-05-22; it is excluded from new selection. Medium3.5/mistral-medium-3-5 is the coding successor but has a paid list priceUSD1.50/7.50 per1M; it is research-only here, not a free substitute.

NVIDIA also documents qwen/qwen2.5-coder-32b-instruct as a coding candidate, but it is not automatically substituted for the selected Nemotron model. API Catalog trial terms restrict the service and Generated Content to trial/non-production use; paid/self-hosted AI Enterprise licenses are separate. No specific free credit quantity, permanent expiration exemption, or40RPM allowance is assumed. Payment-method requirements were not established from the consulted current docs; confirm account terms without purchasing credits or enabling paid services.

Cloudflare's kimi-k2.6, kimi-k2.7-code and glm-5.2 require Workers Paid under the published change and are excluded. glm-4.7-flash/Nemotron3 are documented Free-plan alternatives, but not selected by this fixed coding route. No new model is inferred free from its name or catalog presence. Local output cap is1024tokens for all four new routes; for non-Gemini candidates the actual provider output maximum is not independently account-verified.

## Secure owner setup

Do not send credentials in chat or command arguments. In a trusted local editor, add the following to the existing Git-ignored .env. Preserve existing provider lines; do not copy .env.example over .env. No packages or account authentication settings are changed by the integration.

MISTRAL_API_KEY=<local Mistral API key from Studio Free mode>
MISTRAL_MODEL=codestral-2508
MISTRAL_FREE_CONFIRMED=false
MISTRAL_JSON_MODE=true
NVIDIA_API_KEY=<local NVIDIA developer API key>
NVIDIA_MODEL=nvidia/nemotron-3-super-120b-a12b
NVIDIA_FREE_CONFIRMED=false
CLOUDFLARE_API_TOKEN=<local account-scoped Workers AI token>
CLOUDFLARE_ACCOUNT_ID=<32-character hexadecimal account ID>
CLOUDFLARE_MODEL=@cf/qwen/qwen2.5-coder-32b-instruct
CLOUDFLARE_FREE_CONFIRMED=false

Mistral: create a Studio API key, confirm Free mode, exact Codestral entitlement, nonzero monthly/rate allowance, no pay-as-you-go overage and key expiry. Use an API key, not another application's authentication token. NVIDIA: register for Developer/API Catalog access, accept relevant model/trial terms, verify zero-cost trial allowance/expiry and non-production scope. Cloudflare: obtain AccountID and least-privilege Workers AI read/run permissions for this account. Confirm Workers Free, never upgrade to Paid for this task; check today's used/remaining Neurons. Do not invent an allowance if it cannot be determined.

Once you independently establish the appropriate free account, update only that provider's FREE_CONFIRMED flag to true, restart, and run npm run verify:developers or use its explicitly authorized read-only dashboard check. That command performs fixed model/catalog GETs, skips incomplete configuration, never generates, and never activates routing. Credentials and accountIDs are never echoed in output; persisted key hashes are not returned in browser status.

Next record owner-confirmed account evidence using Provider health and owner controls on its card: plan, exact-model zero cost/no paid overage, remaining requests, accountRPM/RPD, reverify-by timestamp, actual published/account expiry if any. Cloudflare also requires today's verified Neurons, NVIDIA requires non-production confirmation. This is owner evidence, not an automated claim that a public catalog proves billing eligibility. A24-hour maximum evidence lease is an application freshness rule, not an invented provider free-expiration date. Missing/expired evidence blocks routing.

Finally, a SEPARATE checkbox/button can enable this verified free provider for future individually authorized operations. Account evidence always saves with enabled=false. Disabling is immediate for future dispatch; changing key/model/account invalidates evidence. This task leaves every new provider disabled. Do not activate until the owner separately approves.

## Protocol, routing and data preservation

Mistral and NVIDIA use existing bounded OpenAI-compatible chat protocol with their official fixed base URLs. Cloudflare uses /client/v4/accounts/{account_id}/ai/v1/chat/completions, bearer token and rejectIfBusy; its read-only account model search verifies a matching model name/id. Gemini retains its native Google request/response mapping. No tools, deployments, paid endpoints or auto-paid substitutions. Structured JSON remains provider-dependent and all drafts undergo existing schema/path/static syntax validation. Actual token usage is recorded when supplied, unknown remains null.

Seven development provider cards now exist: Groq(primary), Laguna(testing), MiniMax(debugging), Gemini(development/debugging), Mistral(code/explanations), NVIDIA(reasoning), Cloudflare(coding). DeepSeek remains the only senior/independent reviewer/advanced debugging specialist; paid generation/paid fallback remain disabled. Existing database agent identities are reused by the model-routing architecture; /api/agents continues to return real registered agents. Provider/model/task usage records identify the actual author. No new SQLite roster rows, migrations or project-data conversions are introduced merely to render provider cards.

New providers are limited to the owner-approved TEAM workflow. The older generic workflow cannot select or assign them and bypass plan/checkpoint/operation gates. Within a separately authorized team operation, at most3distinct eligible free models may be tried if fallback was explicitly allowed. Saved hashed checkpoint, approved plan, complete drafts/diffs/tests/corrections and errors are carried forward; truncated/incomplete responses are not treated as verified progress. Locks, replay protection, restart recovery and final owner approval remain.

Local new-provider limits: at most1request/minute,10/UTCday, or a lower owner-reported allowance. Request reservations since the evidence timestamp bound the remaining allowance; failures/unknown outcomes still count. Cloudflare additionally reserves worst-case Neurons against the current UTC-day observation using the larger published token rate, UTF8 input bounds,4096framing allowance and output cap; missing allowance/UTC rollover disables dispatch. Other clients may consume shared allowance, so these are conservative local controls, not provider-side spending guarantees. The Cloudflare plan must hard-stop rather than charge overage.

Prompt bytes plus framing/output must fit the conservative context bound; overgrown checkpoints require owner reduction, never silent history deletion. Provider timeout configuration remains bounded. Backoff/cooldowns persist,503 Retry-After is honored and small jitter avoids synchronized re-entry. No periodic model pings/background generation. Successful/failed request metadata is key-bound in sanitized sidecar health records; dashboard GET is read-only.

## Prepared calculator demonstration — not submitted

Write a JavaScript calculate(a,b,operation) supporting +,-,*,/ and throwing for division by zero/unknown operation. Return the existing files JSON schema with src/calculator.js. Use a manual owner-approved plan and one child task.

Proposed developer: Gemini gemini-3.8-flash ONLY after owner free-project/quota confirmation, routing activation and separate live-operation consent. Proposed backup: Codestral codestral-2508 ONLY after its credentials, exact-model Free-mode eligibility and separate activation. If unavailable, pause or offer an already eligible existing free provider; do not imply a missing provider is a working backup.

Expected API use: zero planning generations with the manual plan; one generation on success, at most3distinct providers if fallback explicitly authorized, no same-provider automatic retry. Read-only setup GETs are separate. Hard output cap1024/attempt (at most3072 across three new-provider attempts); input bounded by current12000byte policy plus framing. Actual token use unknown until authorized measurement. Expected model costUSD0 only after eligible zero-cost account/allowance proof; no paid fallback or DeepSeek generation.

Future authorization must specify exact provider/model, zero-cost account and current allowance, one calculator operation, whether bounded fallback is permitted, output/request caps and the expected stored draft. Routing activation alone does not authorize this generation. Generated code is not automatically executed or applied. With DeepSeek disabled, the senior-review/final-completion stage intentionally pauses for later separately authorized review; a demo cannot truthfully claim full review completion.

## Validation and limitations

Baseline156/156; staged and final results are recorded in PROMPT_LOG.md. All generation/failure/handoff testing in this task uses mocks. No claim of live operational readiness for any new model. Existing Gemini read-only model authentication is verified; exact historic503/timeouts cause remains unknown. Three new provider accounts are unconfigured. Current account plans, rate/token/quota/expiry details require owner evidence; undocumented values are not fabricated.

Existing source/verified database backup and table hashes: data/checkpoints/team-expansion-20261021/. No .env changes or project-record edits authorized/performed. Existing integrations/history preserved, no CoachLab edits, paid generation, purchases, packages, CLI/WSL workflows, Git commit/push or deployment. No visual verification is claimed unless separately inspected.

Cloudflare model verification uses the official search filter for the exact selected model, avoiding a false absence caused by catalog pagination. Mistral explanations fit the existing draft workflow as comments or documentation alongside JavaScript; this change does not add a separate chat UI.

## 2026-10-22 diagnostic update

The preceding expansion notes are historical. Current results and corrected inventory are in PROVIDER_DIAGNOSIS_20261022.md. Mistral key now configured and live generation verified; persistent free confirmation/routing remain off. NVIDIA's old3Super free endpoint is deprecated; passive documented candidate is nvidia/nemotron-3.5-super-vl-120b-a12b,262Kcontext. That replacement passed an explicit no-reasoning READY probe and a deliberate actual-artifact improvement handoff. NVIDIA_MODEL is still unset locally; no persistent activation or production authorization. Scoped evaluation is closed. Groq has a current generation403 network-access denial, Gemini current503, Laguna READY200, MiniMax free retired. Full suite183/183 passed; both live code artifacts passed22independent tests and remain awaiting senior review.
