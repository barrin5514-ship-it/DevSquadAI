# Monday readiness plan — Dev Squad AI

Prepared Friday, October 23, 2026, America/New_York. Target: Monday, October 26. **Planning only: no provider API checks, inference, project creation, activation, spending changes or new grants were performed.** Public documentation was read; it does not verify this account. Inventory captured at October 23, 10:10 PM EDT (2026-10-24T02:10:00Z).

## Recommendation for the owner

Aim for **one developer, one small task, one independent review, then your decision**. Gemini has the strongest evidence through the actual regular dashboard. Use it explicitly for the first pilot, subject to fresh included-access confirmation and a new task-bound authorization. Keep Groq as the configured default while investigating its access failures; do not automatically substitute or enable anything.

DeepSeek has successfully reviewed the existing disposable task, but remains paid, disabled for general use, and requires a separate approval for the next exact review payload. If you do not authorize that review, drafting and local testing can still be demonstrated, but mandatory review must remain pending. We cannot honestly promise an accepted project without it.

**All providers cannot currently be promised ready by Monday.** MiniMax is locally retired; NVIDIA and Cloudflare lack model/account configuration; Cerebras and Hugging Face lack credentials/models; several account checks have expired or were never recorded for normal routing. Account access and service reliability are outside a local implementation schedule. Do not delay the pilot trying to activate every provider.

## 1. What is actually registered

Sources: `src/providers/config.js`, `src/providers/expansion.js`, `src/orchestrator/team-models.js`, securely parsed `.env`, main SQLite metadata, read-only `/api/console`, and `data/bold-modern-20261023/provider-inventory.json`. No credential values or fingerprints are included here.

There are **9 provider definitions, 6 locally saved keys, 4 provider-level configured models, and 8 team model entries** (7 developers plus DeepSeek). OpenRouter supplies two explicit team routes without a generic default model. A displayed candidate is not a configured or accessible model.

| Provider / role | Exact saved model or actual team candidate | Configuration now |
|---|---|---|
| Groq / primary developer | `openai/gpt-oss-120b` | Key and model saved; free confirmation true |
| Google Gemini / developer | `gemini-3.8-flash` | Key and model saved; free confirmation true; low-thinking adapter fix loaded |
| OpenRouter / Laguna developer | `poolside/laguna-s-2.1:free` | Shared OpenRouter key saved; explicit team route; generic OPENROUTER_MODEL unset |
| OpenRouter / MiniMax developer | `minimax/minimax-m3.1-flash:free` | Shared key; explicit route remains in history/roster but is retired |
| Mistral / developer | `codestral-2508` | Key/model saved; native JSON mode true; free confirmation false |
| NVIDIA / developer candidate | `nvidia/nemotron-3.5-super-vl-120b-a12b` | Key saved, **NVIDIA_MODEL unset**; this ID is the registry/evaluation candidate, not persistent model selection; free confirmation false |
| Cloudflare / developer candidate | `@cf/qwen/qwen2.5-coder-32b-instruct` | Registry candidate only; token, account ID and persistent model unset; free confirmation false |
| DeepSeek / independent senior reviewer | `deepseek-flash` | Key/model saved; paid enable false; general request/day/total dollar budgets unset |
| Cerebras / registered inactive adapter | **None configured** | No key/model; explicitly blocked by current local trial/paid policy; no active team card |
| Hugging Face / registered inactive adapter | **None configured** | No token/model; no active team card; entitlement not established |

The compatibility database has four provider metadata rows (Groq, Gemini, OpenRouter, DeepSeek) and three legacy agent-model assignments (Groq/Gemini junior, DeepSeek senior). Its `enabled` fields are **not** proof of routing permission. Labels or historical benchmark candidates outside the actual team registry are not additional ready providers. Claude, Codex and WSL remain outside the active team.

## 2. Separate evidence for each kind of readiness

Authentication means a key was accepted at the time of the recorded response, not that current access or billing entitlement is proven. Inference means the service returned a complete model response. Coding means returned code underwent independent checks. Dashboard means the **main** application workflow, not merely a provider card or an evaluation server.

Dates below are local EDT unless only a report date is available. All routing is currently off: `TEAM_LIVE_ENABLED=false`; no valid new-provider activation receipts are present. One model (Laguna) is currently a local selection candidate, still requiring dispatch-time free-price/access checks. All other team routes are presently ineligible or specifically paid-gated.

| Provider / route | Authentication evidence | Inference evidence | Coding evidence | Regular dashboard evidence | Current routing |
|---|---|---|---|---|---|
| Groq | Historical accepted key; subsequent 403 does **not** prove invalid credentials | Earlier READY 200; **latest coding POST 403**, Oct 22, 11:49 PM | Historical syntax/schema pass; original baseline did not execute behavior tests; latest attempt returned no code | Card present; current successful main-task generation not established | Blocked by owner-action/access-error record; default designation does not override it |
| Gemini | Model GET 200, Oct 23, 12:55 AM; inference also accepted key | Corrected probe/coding 200 on Oct 22 late evening; main generation 200 Oct 23, 12:58 AM | Isolated 22/22 independent cases; main artifact revised to ESM (import/export format), then 24/24 independent cases, 15 embedded checks | **Main SQLite draft, summaries, usage, checkpoints, DeepSeek review and owner controls verified** | General free-account receipt missing; previous task-only grant expired/exhausted |
| OpenRouter / Laguna | Account/catalog 200 Oct 22, 1:09 PM; now older than the 24-hour receipt lease | READY 200 Oct 22; coding 200 in Oct 20 benchmark | Basic addition 6/6 cases in isolated benchmark; no broad coding-quality result | Card present; main-task coding/handoff not live-verified | Local candidate eligible, session off; current zero price/account access checked before POST |
| OpenRouter / MiniMax | Historical accepted key | Smoke 200 Oct 21; absent from saved account listing Oct 22 | Historical simple addition 6/6 benchmark cases | Retired card/history preserved; no current workflow eligibility | **Retired** by registry deadline Oct 22, 8 AM EDT (12:00 UTC) |
| Mistral | Historical inference 200 Oct 22, 1:04 PM; no current main catalog receipt | Complete code response 200, 4.387 seconds | 3 generated checks and 22/22 independent cases in isolated evaluation | Card present; earlier visual workflow used separate evaluation database/port, not main-app proof | Disabled: authentication/model receipt and current free-plan evidence required |
| NVIDIA | Historical hosted response accepted key; current access not rechecked | READY/code 200 Oct 22; code response 28.922 seconds; earlier timeouts also recorded | 5 generated checks and 22/22 independent cases; improved actual Mistral artifact in isolated handoff | Card present; key-only setup is incomplete; evaluated model override did not persist | Disabled; model missing, trial-only entitlement/receipts absent |
| Cloudflare | Not established | Not tested | Not tested | Candidate card only | Missing credentials/account/model and verified free allowance |
| DeepSeek | Actual main-app models GET and balance GET 200 Oct 23, 3:23 PM | **One main review POST 200**, 4.188 seconds; complete `stop` | Static review of existing utility; **no code-generation benchmark or reviewer-executed tests** | Approved review saved for current exact revision; task VERIFIED; final owner acceptance still unset | Global paid use off; previous one-shot scope exhausted/expired; no automatic paid fallback |
| Cerebras | Not tested/configured | Not tested | Not tested | No active card | Local policy blocked; outside Monday scope |
| Hugging Face | Not tested/configured | Not tested | Not tested | No active card | Missing token/model/free entitlement; outside Monday scope |

Evidence references:

- `FREE_MODEL_BENCHMARK.md` (Oct 20); `data/groq-live-OeStWr/verification-report.json` (historical baseline).
- `data/provider-diagnosis-20261022/requests.json`, `mistral-tests.json`, `nvidia-tests.json`: isolated evaluation evidence, not main database history.
- `GEMINI_CODING_VERIFICATION_20261022.md` and its request ledger: corrected Gemini behavior and the **later VPN-off Groq 403**.
- `DASHBOARD_WORKFLOW_VERIFICATION_20261023.md`: actual main task `85e28bf9-4f77-448e-ad67-166cc3b7f9b5`, revision `c016092c-9f4d-46bc-bed9-9c31a7118503`, approved review `f88781d3-5819-4217-b7d9-e92170a5cc9f`.
- `DEEPSEEK_REVIEW_PROPOSAL_20261023.md`, `data/deepseek-review-controls-20261023/live-result.json`: real paid-review evidence. The observed $5 balance was **before that POST**, not a current balance statement.

Older reports saying Gemini or DeepSeek had never generated are superseded by these later records. Main provider health also retains older diagnostic fields; compare timestamps and successful usage rather than interpreting every old error as a new failure. A card saying “generation verified” is historical evidence, not current authorization or reliability.

## 3. Price/access restrictions and their evidence dates

Public documentation checked Oct 23 EDT for planning; **no authenticated account status was refreshed**. Recheck exact terms before any authorized future dispatch.

- **Groq:** public free-plan table lists this model; sample published limits are 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000/day. These are published defaults, **not this key’s remaining allowance**. The app has its own lower shared limits. Owner must verify current Free plan and model permissions. [Official limits](https://console.groq.com/docs/rate-limits).
- **Gemini:** the exact model’s Standard Free Tier lists free input/output; paid inference, optional tools and higher tiers have separate prices. The owner previously confirmed a free AI Studio project, but the current application has no general account/routing receipt. Renew the exact project/model allowance near the intended run; catalog visibility alone is insufficient. Free-tier content-use terms also apply—use synthetic project data. [Official exact-model pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.8-flash).
- **OpenRouter:** saved account evidence on Oct 22 showed free-tier status and 50 remaining of 50 requests **at that time**. This is not Monday’s quota. Laguna was zero-priced in that snapshot; its registry expiry is Oct 31 (vendor availability not refreshed now). MiniMax was absent and locally retired. Verify all pricing components and exact account route again; `:free` in a name is not sufficient. No paid substitution. [Official account/limit guidance](https://openrouter.ai/docs/api_reference/limits).
- **Mistral:** official setup describes Free mode with usage limits and no credit card requirement. The owner’s $10 monthly Studio allowance is **user-reported account evidence**, not an independently refreshed balance. Exact Codestral entitlement, remaining allowance and no-overage behavior must be confirmed. Successful Oct 22 code does not prove present allowance or the billing source. [Official Free-mode setup](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key).
- **NVIDIA:** official FAQ describes hosted trial credits for prototyping; remote API calls consume those credits. Treat this integration as **evaluation only**, not a production entitlement. Remaining credits and access to this exact model are unknown now. No inference if payment is required. [Hosted prototyping FAQ](https://docs.api.nvidia.com/nim/docs/faq).
- **Cloudflare:** public pricing provides 10,000 Neurons/day on Workers Free; some models require paid access. A Neuron is Cloudflare’s usage unit. The registered Qwen candidate’s current account availability and applicable free allowance are **unverified**. Do not turn on Workers Paid, prepaid Gateway billing, or a paid replacement. Daily evidence must match the current UTC date (the day changes at 8 PM EDT in October). [Official pricing, updated Oct 20](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- **DeepSeek:** public `deepseek-flash` highest uncached input rate is **$0.30/million**, output **$1.20/million**. Use these highest rates for conservative planning rather than assuming a cache/discount. General price lease expired Oct 22; the previous scoped lease/approval expired Oct 23 and cannot be reused. New exact payload, fresh model/balance checks, verified price lease and explicit spending authorization are required. [Official pricing](https://api-docs.deepseek.com/quick_start/pricing/).
- **Cerebras and Hugging Face:** current account/free eligibility was not researched or established; no model or key is configured. The Cerebras block is the existing local policy, not a newly verified universal claim about every current vendor offer. Leave both excluded for Monday.

## 4. Confirmed problems versus open questions

**Confirmed:** Groq’s latest recorded coding request returned network-access-denied 403 even with the owner-confirmed VPN off. MiniMax’s local expiry passed. NVIDIA has no persistent model. Account activation receipts are absent for new providers. All automatic routing is off. Old task grants cannot authorize new work. These are observable blockers.

**Not proven:** Groq’s exact upstream firewall/account policy; whether a fresh catalog check will succeed; Monday quotas or uptime; whether VPN caused every Gemini/NVIDIA failure. The earlier VPN-on 403 versus VPN-off READY 200 supports VPN involvement in that comparison, but the later VPN-off 403 leaves ongoing access unresolved. Gemini’s token exhaustion had a separately confirmed thinking/output-budget cause and a tested fix. NVIDIA success after a timeout does not establish reliable response time.

**Specific remaining local work, only after approval:**

1. Preserve current passing baseline and take the supported SQLite backup before future workflow/data work. Rehearse the owner acceptance path offline; the old disposable task remains yours to inspect/accept, not an agent decision.
2. For the chosen Gemini pilot, prepare a **new** task-bound grant using actual new IDs, database identity, exact model, 2 total HTTP slots (one catalog GET + one generation POST), max 1,024 output tokens, no retry/fallback and a short approval window. Existing mechanism supports Gemini; do not reuse/reset the previous task’s exhausted ledger. Prepare inactive material first; mint/time the capability only from fresh owner approval near execution.
3. If pursuing Groq, authorize a bounded single-provider catalog diagnosis. The existing `verify:free` script checks **both** Groq and OpenRouter and sends several GETs; do not run it as though it were a one-request check. Clear access-error gating only using actual successful evidence through the verification path, never by editing the health flag or copying evaluation receipts. A catalog success still needs a separately authorized generation test.
4. For optional NVIDIA work, owner would set `NVIDIA_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b` locally. **Do not set free confirmation or routing on just because a key exists.** A confirmed code gap also needs attention: `Team.dispatchAttempt` supplies `reasoning_effort:none` only in evaluation mode today. The documented, previously successful setting needs a targeted regular-path implementation/test before claiming normal NVIDIA dashboard readiness. No such logic was changed during this styling task.
5. Complete Mistral/Gemini account evidence and quotas; Cloudflare would additionally need a least-privilege local token, account ID and exact model. Credentials belong in the ignored local configuration, not chat or shell arguments. Record new-provider account receipts separately from activation; obtaining evidence must not silently turn on routing.
6. For any new DeepSeek review, freeze the actual draft and exact sanitized body, calculate a fresh quote, refresh prices and request explicit task-specific approval. The existing scoped path can review a new task with global paid flags off. Its one-POST lifetime limit means **a rejected review cannot simply be retried with a new grant on the same task**. Pause on rejection; a bounded re-review design/authorization would require separate work. Never delete/reset the consumed ledger or bypass independent review.
7. Write plain-English summaries locally for the new artifact; no automatic summarizer is enabled. Request native JavaScript import/export files and separately invoked tests to avoid repeating the original module-format correction.

## 5. Prioritized weekend schedule

All times are **America/New_York**. These are proposed work blocks, not scheduled jobs or authorizations. Allow roughly **5–7 focused operator/developer hours plus 60–90 minutes of owner decisions/account checks** for the narrow pilot. Vendor support and access delays can exceed the weekend.

| When | Work and realistic effort | Dependency / stop point |
|---|---|---|
| Sat Oct 24, 9–9:30 AM | Owner chooses narrow Gemini pilot versus a broader team; reviews old disposable findings and decides its acceptance separately | No new provider access inferred from this plan |
| Sat, 9:30–10:30 AM | Owner inspects AI Studio’s exact Free project/model quota and no-paid-access setting; operator records requirements without exposing keys | Stop if included access cannot be established; do not enable billing |
| Sat, 10:30 AM–noon | Prepare the small manual plan, expected outputs and independent test cases offline; rehearse main-dashboard checkpoints/approval controls with mocks (60–90 min) | No real project creation until owner approves that separate action |
| Sat, 1–2 PM | Prepare main-app grant/price/payload templates, scoped request counters and preservation checks; local regression checks (45–60 min) | Do not create an active clock/grant for Monday this early; expired evidence cannot dispatch |
| Sun Oct 25, 9–10:30 AM | Review pilot scope, final requirements, summary template, module format and failure/timeout stop rules; local dry run (60–90 min) | Saturday account decision and local mock checks complete |
| Sun, 10:30 AM–noon, optional | Groq single-provider diagnosis or Laguna account/zero-price planning **only if separately authorized** (budget 60–90 min) | Optional backup work must not delay primary pilot; unresolved failure stays blocked |
| Sun, 1–2 PM | Owner reviews the Monday request proposal and provisional review budget; operator prepares the runbook and database backup checklist (45–60 min) | Confirm whether paid review may later be proposed; do not preapprove an unknown review payload |
| Sun, 2–2:30 PM | Freeze the proposed scope, record blockers and stop. Leave all unapproved providers disabled | No attempt to make all nine providers ready overnight |
| Mon Oct 26, 9–11 AM target | After fresh approval: create approved project/task, verify current entitlement/allowance, bind actual IDs, one main generation, inspected isolated tests, local summary; then exact review proposal and separately authorized DeepSeek review | If any stage fails, pause. Your acceptance is last. A service outage or rejected review can move completion beyond Monday |

Receipt freshness matters: general account verification lasts at most 24 hours, the Gemini task capability at most an hour, and the paid scope 30 minutes or earlier price expiry. Refresh near dispatch; do not manufacture a receipt or start an approval clock during Sunday preparation. Monday’s start is a target, not a guarantee of model availability.

## 6. Proposed small API tests — NOT performed or authorized

No automatic retries, fallback, periodic probes or purchases. Public docs/catalog requests also count in the separately agreed future HTTP budget when directed at provider API endpoints. Unknown timeout outcomes retain reservations. A successful probe verifies that response, not coding quality or billing entitlement.

| Priority / exact model | Proposed bounded test and total HTTP allowance | Planning usage/cost |
|---|---|---|
| Required: Gemini `gemini-3.8-flash` | Prefer one actual tiny pilot draft rather than redundant READY probes. 1 authenticated model GET + 1 generation POST; low thinking/native JSON; max 1,024 output; 90-second bound; no fallback | Roughly 1,000–2,000 input tokens including application context; at most 1,024 output (thinking shares cap). **$0 only if exact current Free/included entitlement is confirmed**; otherwise stop, not paid substitution |
| Optional: Groq `openai/gpt-oss-120b` | First 1 model GET; if successfully authorized/access-verified, 1 separate small JSON/code POST, max 1,024 output, 60-second bound | Approximately 100–2,000 input, max 1,024 output; $0 only under verified Free account. A repeated 403 stops the test; no current success is assumed |
| Optional backup: Laguna `poolside/laguna-s-2.1:free` | At most 3 GETs (public catalog, account/quota, and account model preflight included in regular dispatch) + 1 code POST, max 1,024 output, 60-second bound | Around 1,000–2,000 input and max 1,024 output; estimated model charge $0 **only after every price component is zero and account access/quota is confirmed**. Main scope/session authorization is a separate prerequisite; current Gemini-only scope cannot authorize Laguna |
| Defer: Mistral `codestral-2508` | If owner later chooses it: 1 catalog GET + 1 complete JSON code POST, max 1,024 output, 60-second bound, fresh Free/included evidence | $0 additional out-of-pocket only within verified included/free allowance; may consume that allowance. Current quota/charge source unknown; no paid fallback |
| Defer: NVIDIA `nvidia/nemotron-3.5-super-vl-120b-a12b` | Only after missing configuration and regular reasoning-control gap are addressed: 1 model GET + 1 evaluation POST, supported reasoning off, max 1,024 output, 90-second bound | Trial credit consumption; $0 additional spending only if current evaluation access is confirmed. **Not production authorization** |
| Conditional senior step: DeepSeek `deepseek-flash` | After seeing the exact pilot draft/payload: 1 models GET + 1 fresh balance GET + 1 review POST; thinking disabled, JSON, max 1,024 output, 30-second bound, fresh 30-minute-or-shorter approval | For 2,000–6,000 input and 512–1,024 output: approximately **$0.0012144–$0.0030288** at highest uncached rates. Propose **$0.01 local task cap**, subject to exact quote. It is not a guaranteed provider invoice ceiling |

No MiniMax, Cloudflare, Cerebras or Hugging Face inference is proposed for the critical path. Their retirement/configuration/entitlement blockers must be resolved first. All figures are estimates; complete application instructions, schemas, history and reasoning contribute to tokens. The previous real DeepSeek review used 1,769 input/537 output, giving a highest-rate calculation of $0.0011751; actual invoiced amount was not supplied. Do not use a past balance or estimate as a hard spending guarantee.

The recommended minimal pilot therefore needs **one free/included generation** plus **one separately approved paid review**: five provider HTTP requests across two distinct authorization stages (Gemini 2, DeepSeek 3), not an ongoing grant. One rejection, timeout or incomplete output ends the authorized attempt. Any corrected generation or re-review requires a newly considered proposal and applicable control support.

## 7. First useful project idea — not created

**Weekend Time Budget Helper.** Give it a few task durations in minutes and the hours available. It returns total time, an optional 20% buffer, remaining minutes and whether the plan fits. Start with one JavaScript utility plus a small test file, not a deployed app. Use made-up tasks and native import/export; importing the test file must not run its assertions automatically.

Success criteria: reject missing/text/negative/non-finite durations and invalid available time; handle an empty list, zero, exact capacity and over-capacity; check rounding/buffer policy; inspect code before running independent tests in a credential-free temporary process with a timeout. Save artifact, separate local summary, actual usage/test evidence and checkpoints in the regular dashboard. Request independent DeepSeek review only through the approved bounded pipeline. Leave final acceptance to the owner. No automatic source application/deployment is part of the pilot.

## 8. Decisions needed next

1. Approve or revise the **narrow Gemini developer + explicitly paid DeepSeek reviewer** scope, or choose drafting/testing only with review deliberately pending. Laguna is an optional later backup, not a guaranteed ready fallback.
2. Authorize the proposed local preparation/project creation and exact bounded free request only after actual IDs and current account evidence are available. No broad routing activation is necessary for the recommended scoped Gemini path.
3. After seeing the generated artifact and frozen review payload, separately decide whether to authorize the one $0.01-local-cap review with fresh prices/account checks. This document is not that approval.
4. Decide the final acceptance yourself. Do not lower gates to meet a calendar target. Wider provider activation, Groq remediation, NVIDIA normal-path handling and any re-review extension need separate approval/work.

The smaller scope is achievable to prepare locally over the weekend, conditional on account access and owner decisions. Readiness for every registered provider is not established, and no API or account change was made by writing this plan.
