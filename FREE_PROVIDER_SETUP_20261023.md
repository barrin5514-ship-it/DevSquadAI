# Free-only provider setup and current blockers

Prepared October 23, 2026 (America/New_York). Keys belong only in the existing local `.env`, edited in a trusted editor. Preserve other lines; never send keys in chat, commands, screenshots or documentation. Do not copy `.env.example` over the saved file. Creating accounts, accepting vendor terms and entering credentials are owner actions. No account upgrade, billing enablement or purchase is required/authorized by this guide. If the offered account path demands any of them, stop that provider.

## Current local fixes and safeguards

- Fixed the regular NVIDIA dashboard dispatcher for the exact `nvidia/nemotron-3.5-super-vl-120b-a12b` model: documented and previously successful `reasoning_effort:none` now applies outside evaluation mode too. Other models do not inherit this control. Free-plan evidence, configuration, owner plan and live-request gates remain unchanged. New tests cover normal-path request and missing-account denial.
- Gemini already has its model-specific low thinking and native JSON fix. No further response-handling change is justified now.
- Groq's newly authorized catalog GET returned **403**, sanitized exact message: **Access denied. Please check your network settings.** No retry or coding test. This proves present catalog denial, not invalid credentials or necessarily failed generation. Under this task's stop rule generation was not attempted. Exact upstream network/account policy remains unknown.
- Mistral's one catalog GET returned200, `codestral-2508` listed. Model visibility does not establish Free-mode allowance, quota or no paid overage.
- OpenRouter's one authenticated account model-list GET returned200; `poolside/laguna-s-2.1:free` listed, all returned price fields zero, context262144. Zero price now is distinct from general reliability and account daily quota. Local registry disables this route October31; do not plan continued availability after that date or silently choose a replacement.
- The main scoped mechanism currently authorizes Gemini tasks only. Normal NVIDIA/Mistral/Cloudflare paths work in mocks **after** account evidence and separate activation, but this task forbids global routing activation. Extending bounded task scope to other providers, and counting OpenRouter's mandatory in-dispatch price GET against its single catalog budget, requires targeted design/tests; never use the disposable evaluation server or global opt-in as a workaround. This remains a local blocker rather than a working-provider claim. No authorization rules were weakened to satisfy the all-provider goal.
- Hugging Face has a generic registered adapter but no regular team route or verified zero-cost model/account admission policy. Do not treat generic legacy dispatch as a safe substitute for the owner-approved dashboard flow. Model selection, finite allowance accounting and a scoped regular route must be established before generation.

## Gemini — key/model already saved

1. In [AI Studio](https://aistudio.google.com/projects), identify the project attached to the existing saved key privately. Its Billing tier must show Free. Do not reveal the key or click Set up billing.
2. In Usage & Billing → Rate Limit, select that same project and Gemini3.8Flash. Verify available quota/current usage; a historical peak chart is not a live remaining balance.
3. This inspection saw Default Gemini Project as Free tier with published account limits5RPM/250KinputTPM/20RPD. The displayed28-day peaks were1/5,1.03K/250K,5/20. These are **peak observations**, not a claim of15remaining requests today. The saved key-to-project mapping still needs owner confirmation; reading secret key values was deliberately avoided.
4. Keep `GEMINI_MODEL=gemini-3.8-flash`; existing `GEMINI_FREE_CONFIRMED=true` is an owner assertion, not current account proof. Do not change other models/routing. A new main-task grant must use actual IDs and fresh expiration, not the previous exhausted disposable grant.

[Official billing](https://ai.google.dev/gemini-api/docs/billing), [project/key association](https://ai.google.dev/gemini-api/docs/api-key), [limits](https://ai.google.dev/gemini-api/docs/rate-limits).

## Groq — key/model saved; blocked by current403

1. Sign into the existing Groq console privately. Confirm the key is active, the project has Free access, and `openai/gpt-oss-120b` is allowed. Do not create a paid subscription.
2. Review account restrictions/support information for network-access denial. Do not rotate keys or repeatedly send requests as a guess.
3. Keep saved model/key unchanged. A future test needs a new bounded authorization because this task's single catalog attempt is consumed. Successful catalog access alone will not prove coding generation.

[Official model](https://console.groq.com/docs/model/openai/gpt-oss-120b), [Free rate limits](https://console.groq.com/docs/rate-limits). No IP address needs to be posted here.

## Mistral — key and Codestral saved; Free entitlement unresolved

1. Sign into [Mistral Studio](https://console.mistral.ai/). The read-only browser attempt reached its login screen, so no private allowance was available to this inspection.
2. Open the organization's plan/usage/limits screens. Confirm **Free mode** and exact `codestral-2508` entitlement with nonzero remaining allowance and rate quota. Check key expiry privately. A user-reported previous$10allowance is not assumed current.
3. Confirm no pay-as-you-go, purchased-credit or overage path applies. If Codestral requires paid access or quota is zero, exclude it from this free run; preserve its history and do not substitute a paid model.
4. Existing values: `MISTRAL_API_KEY` present, `MISTRAL_MODEL=codestral-2508`, `MISTRAL_JSON_MODE=true`. Leave `MISTRAL_FREE_CONFIRMED=false` until those account facts are established. No new key is required solely because a catalog is listed.

[Official Free-mode/key setup](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key). Published Free mode has no card requirement, but account/model usage limits still apply.

## NVIDIA — key saved, model missing; evaluation-only access

1. Sign into [NVIDIA API Catalog](https://build.nvidia.com/) privately; open the exact Nemotron3.5SuperVL model. Verify active free developer/trial API allowance, expiry and no payment requirement. Do not provision paid/self-hosted infrastructure.
2. Confirm this is **non-production evaluation** and permitted by the trial terms. API credits may be consumed; no permanent/unlimited free access is claimed. If purchase/payment is required, stop.
3. In the existing local file, add/update only `NVIDIA_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b`. The saved key variable is `NVIDIA_API_KEY`; it is already present. Leave `NVIDIA_FREE_CONFIRMED=false` until verified. Do not use the retired3Super endpoint.
4. Provide only whether allowance remains and its displayed limits/expiry. Restart only DevSquad after configuration is saved; model presence does not enable routing. The new reasoning fix does not grant account access.

[Official model](https://build.nvidia.com/nvidia/nemotron-3.5-super-vl-120b-a12b/modelcard), [trial/FAQ](https://docs.api.nvidia.com/nim/docs/faq).

## Cloudflare — account/token/model absent locally

1. Open your [Cloudflare dashboard](https://dash.cloudflare.com/), create/use a free account yourself, then open Workers & Pages → Workers AI. Remain on **Workers Free**, not Paid; do not enable unified paid billing or buy anything.
2. Check today's remaining free Neurons and model availability. Public Free allowance is10000Neurons/day, but shared usage matters. Model: `@cf/qwen/qwen2.5-coder-32b-instruct`. If this model or the account requires Paid, stop; do not switch automatically.
3. Copy the Account ID privately. Create an account-scoped API token using the Workers AI template/least read/run permissions shown in the official REST setup, limited to that account. Do not use an unrelated global key. Owner performs token creation and any terms acceptance.
4. In local `.env` only, set `CLOUDFLARE_API_TOKEN=<enter privately>`, `CLOUDFLARE_ACCOUNT_ID=<enter privately>`, `CLOUDFLARE_MODEL=@cf/qwen/qwen2.5-coder-32b-instruct`. Leave `CLOUDFLARE_FREE_CONFIRMED=false` until Free/no-overage/current-UTC-day allowance is verified.
5. No Worker deployment is needed for REST evaluation. Current-day quota evidence and conservative reservations remain mandatory; an exhausted free account stops rather than upgrades.

[Official REST setup](https://developers.cloudflare.com/workers-ai/get-started/rest-api/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [model](https://developers.cloudflare.com/workers-ai/models/qwen2.5-coder-32b-instruct/).

## Hugging Face — not yet a verified free dashboard provider

1. Create/use a free [Hugging Face account](https://huggingface.co/join) yourself. Inspect Settings → Billing / Inference Providers for **remaining complimentary monthly credits** and whether any payment/overage mechanism applies. Do not subscribe to Pro, add funds, enable automatic top-up or use a custom paid-provider key.
2. Public inference is **metered/credit-funded**, not a zero-price route. Free monthly credits may allow an evaluation, but neither their current availability nor this account's no-overage hard stop is verified. If only paid access is offered, exclude HF from the free run.
3. Only after eligibility: owner creates a narrowly scoped token permitted to call Inference Providers and stores it privately as `HF_TOKEN`. No token/model is currently present. Do not invent `HF_MODEL` from a downloadable model's name; hosted chat support and pricing must be verified first.
4. Leave `HUGGINGFACE_FREE_CONFIRMED=false` and model unset. **Exact configuration naming:** adapter expects `HF_TOKEN` for key, but model/free prefixes are `HUGGINGFACE_MODEL` and `HUGGINGFACE_FREE_CONFIRMED`, not `HF_MODEL`. Once an actual supported coding model is verified, it needs a regular-dashboard team/free-policy/scoped integration with tests before a live task. No selection or activation has been made.

[Official pricing and monthly-credit rules](https://huggingface.co/docs/inference-providers/en/pricing), [token permissions](https://huggingface.co/docs/hub/security-tokens). Do not confuse free downloadable weights with free hosted inference.

## OpenRouter / Laguna — key present, zero-price catalog evidence

1. In [OpenRouter](https://openrouter.ai/settings/keys), inspect the existing key's free-model quota/restrictions privately. Do not buy credits or add paid routing. A paid balance does not authorize paid requests.
2. Exact route is `poolside/laguna-s-2.1:free`; generic `OPENROUTER_MODEL` may remain blank because the team explicitly selects Laguna. Do not overwrite other routes or select the random free router.
3. Preserve `OPENROUTER_FREE_CONFIRMED=true` only for genuine zero-price account access. Regular dispatcher must check actual account model prices and forbid provider fallback/max prices above0; no ':free' name assumption.
4. Local retirement gate is October31,2026. No replacement selected. The one authorized catalog GET was used; do not silently add another mandatory preflight GET beyond the agreed budget.

[Official limits/account evidence](https://openrouter.ai/docs/api_reference/limits).

## Exclusions and next steps

- MiniMax: retired; no test, history retained.
- Cerebras: excluded by owner; no setup/test/change, history retained.
- DeepSeek: **keep** as the owner's already funded/verified Senior Developer. No paid calls during this free-only task. Previously completed reviews remain valid for their exact artifacts; new review still needs separate payload/cost authorization.

Finish account setup privately and confirm only non-secret facts. Unknown is not the same as paid; unverified routes stay disabled rather than being falsely marked working or deleting records. No acceptance/review/spending limits are relaxed, no ongoing routing is authorized by a smoke test, and historical success is not presented as today's successful regular-dashboard test.
