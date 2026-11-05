## Executed scoped review — 2026-10-23 (current result)

The owner approved repairing/testing the controls and dispatching this exact proposal. The session's recorded approval turn began **2026-10-23T19:06:51Z** (Codex turn 01a16a28-a4d0-7081-b844-fe7d7c7035f0, read_thread startedAt=1792782411, owner message 01a16a28-a5f1-70f3-99d0-479a3335dcc5). The original deadline was **19:36:51Z**; it was never restarted during preparation. Pricing evidence was refreshed publicly at 19:09:48Z with the same $0.30/$1.20 highest uncached/output rates and a task-only lease ending at that deadline. No global price/budget/routing/.env settings changed.

Exact task **85e28bf9-4f77-448e-ad67-166cc3b7f9b5**, revision **c016092c-9f4d-46bc-bed9-9c31a7118503**, review **f88781d3-5819-4217-b7d9-e92170a5cc9f**, model **deepseek-flash**. Approved payload hash remained **2db4e20bd9ac9931cfc74f23b86d57bfb74fc8953c6dbbbed02fd7df2837385d**. The exact request body, original draft, frozen snapshot and revision were not rewritten.

### Controls implemented and verified

Added an immutable SQLite scope/payload ledger and persistent per-kind request slots. Startup-only owner capability binds actual project/task/revision/review, database canonical path/device/inode, key fingerprint, complete request hash, model, price snapshot, original approval/expiry, 1,024 output tokens, one POST and $0.01 task lifetime allowance. No browser endpoint can mint grants. BEGIN IMMEDIATE serializes idempotent quotes and reservations across connections; a replacement grant ID, new quote, restart or legacy paid route cannot reset the task cap. Reserve the full $0.01 allowance before dispatch and net other outstanding/unknown scope and legacy reservations against the fresh balance. Completed local lifetime allowance stays consumed; completed charges are not subtracted again from a later fresh account balance. A timeout/unknown outcome never releases the reservation or request slot.

The existing adapter now supports exact hash-bound DeepSeek requests with documented thinking disabled and JSON object mode, reusing its bounded fetch, complete-output checks, credential guards and usage normalization. The existing senior review pipeline validates the frozen artifact binding and strict eight-field schema. Scoped readiness is separate from global paid routing in the dashboard. Omitting the startup scope does not permit legacy dispatch for this already-scoped task.

**Full local suite: 223/223 passed, including 20 new scoped-control tests.** Syntax checks and diff/credential scans passed. Two existing migration-count checks were updated for additive migration 006. One new test fixture initially omitted required legacy quote fields; it was corrected before the passing run. An initial restricted baseline runner stalled and was stopped; it is not represented as a completed baseline. No production provider requests occurred during tests.

### Actual authorized provider HTTP usage: 3/3, no retry/fallback

| Request | HTTP | Time | Evidence |
|---|---:|---:|---|
| GET api.deepseek.com/models | 200 | 3,331 ms | Exact model listed |
| GET api.deepseek.com/user/balance | 200 | 373 ms | Usable USD balance $5 immediately before this POST; not a claim about current post-charge funds |
| POST api.deepseek.com/chat/completions | 200 | 4,188 ms | Complete stop response; exact approved body |

All requests used the main Windows application pipeline on port 3000, within the original approval window. Each provider timeout was **30,000 ms**, covering headers and body; no SDK/retry/fallback was used. Thinking disabled, JSON object output, max_tokens=1024. Provider reported **1,769 input + 537 output = 2,306 total tokens**. Reasoning-token breakdown was **not supplied**, not assumed zero.

Conservative preflight quote **$0.004511**. Using supplied usage and the verified highest uncached/output tariffs gives **$0.0011751 calculated conservative cost**. The provider did not report a dollar charge; actual invoice/cache/off-peak charge remains unknown. The $0.01 ceiling is an application authorization/reservation control, not a provider-enforced invoice ceiling. Quote status completed; scope outcome completed; full **$0.01 lifetime allowance remains consumed/held**, one POST exhausted, no unknown outcome and no further dispatch available. No second balance check was made.

### Review and persistence outcome

DeepSeek **recommended approval** with non-blocking suggestions for broader invalid-input and overflow-policy coverage. It reviewed recorded evidence statically; **it did not execute tests** and had no tools. Its returned report was preserved exactly after schema and artifact-binding validation. Operator caveats: its coverage comments emphasize the 15 embedded assertions and do not fully acknowledge the separately reported 24 independent cases; its statement that interpolation is low risk is not a security guarantee. Interpolating invalid objects can invoke caller-defined coercion methods. These are limitations to inspect before acceptance, not grounds to fabricate a different provider decision. No utility revision or application-source change was made.

Task is **VERIFIED / awaiting final owner approval**, review **approved**, owner_completion null and no new user approval row. It is **not accepted or completed**. Global live/paid routing and all persistent provider settings remain unchanged/disabled. The original draft and historical pending review are retained for audit.

After a supported backend restart, task/review, usage, scope/HTTP ledger, and all **24 database checkpoints** compared byte-for-byte unchanged. SQLite integrity and foreign-key checks passed. Both existing projects, both drafts, prior checkpoints, historical reviews, approvals and .env were preserved. API refresh and the actual built-in browser at **http://127.0.0.1:3000/team** showed the revised artifact, approved findings and unchecked owner-acceptance control. Backend left running, PID 8044 at verification. No extra provider call was made by refresh/restart.

Local sanitized evidence: data/deepseek-review-controls-20261023/live-result.json, before-restart.json, persistence-proof.json, full-tests-release.log and dashboard-review.png. Active startup capability is locally Git-ignored; its original expiry and exhausted slots prevent further dispatch.

Official sources refreshed: [pricing/model](https://api-docs.deepseek.com/quick_start/pricing/), [request controls/output semantics](https://api-docs.deepseek.com/api/create-chat-completion/). Earlier preparation below is historical and must not be read as current authorization/readiness.

---

# DeepSeek review spending proposal — 2026-10-23

**Preparation only. DeepSeek remains disabled. No authenticated provider endpoint, generation, balance lookup, active quote or spending grant was created or called.** Current balance is unknown; historical balance observations are not treated as current funds. No application source, routing, billing or .env setting was changed.

## Exact target and proposed request

- Project ae7ec650-1705-437e-8a27-5af633575e4e: DISPOSABLE · Gemini dashboard verification · 2026-10-23.
- Task 85e28bf9-4f77-448e-ad67-166cc3b7f9b5: DISPOSABLE TEST · Gemini finite-number add utility · 2026-10-23; remains AWAITING_REVIEW.
- Latest revision c016092c-9f4d-46bc-bed9-9c31a7118503, SHA-256 5e5b5b1454ddaebb388e10cd9908cf3eeed1d32e1574ebe6e7d9cd000a53e806.
- Current frozen review f88781d3-5819-4217-b7d9-e92170a5cc9f remains awaiting_authorization. Original Gemini draft and review history are preserved.
- Configured and proposed model: **deepseek-flash**, official host api.deepseek.com, POST /chat/completions. No model substitution.

Sanitized exact proposed HTTP body: **data/deepseek-review-proposal-20261023/proposed-request.json**. Canonical byte representation for hashing: proposed-request.canonical.json. Canonical request hash: **2db4e20bd9ac9931cfc74f23b86d57bfb74fc8953c6dbbbed02fd7df2837385d**. These files contain no key or authorization header and are not executable spending grants.

The body contains the current revision's two actual files, exact IDs/hashes, applicable finite-number requirements, ES-module execution target, provenance and existing recorded test evidence. Instructions request static independent review of correctness, invalid inputs, security/call-time effects, module compatibility, import-time effects and coverage. They explicitly forbid execution/tools/network access and distinguish operator-recorded results from tests actually run by the reviewer (none). Expected response has the existing eight fields: decision, findings, requiredCorrections, correctness, security, requirements, testCoverage and integration. The schema is embedded in instructions and included in token sizing; the API receives json_object mode, not an unsupported native JSON-schema parameter.

Proposed settings: **thinking disabled**, stream=false, max_tokens=1024, no tools. Approximately 700 output tokens are expected to cover the concise eight-field report; 1,024 is the proposed maximum for this small non-thinking review. An incomplete/length-limited reply must remain unapproved and must not trigger a retry.

## Official model/pricing verification

Public official documentation checked **October 23, 2026, America/New_York** lists deepseek-flash, currently served by DeepSeek-V4.1-Flash-1017. Published availability is verified; this key's current account/model access is not authenticated or rechecked. The configured numeric tariffs are $0.30 input/$1.20 output per million, but their local verification lease expired October 22 and was not renewed.

Rates per million tokens:

| deepseek-flash | Off-peak | Peak/highest applicable |
|---|---:|---:|
| Input, cache miss | $0.15 | **$0.30** |
| Input, cache hit | $0.003 | $0.006 |
| Output | $0.60 | **$1.20** |

Use peak cache-miss rates for the conservative calculation; assume no caching benefit. Do not assume approval/dispatch will occur off-peak. Prices may change and need revalidation before dispatch. [Official model/pricing table](https://api-docs.deepseek.com/quick_start/pricing/).

The public specifications list a 1M context and 384K maximum output; the API accepts max_tokens from 1 through 393,216. It defines max_tokens as the generated completion limit and reasoning_tokens as a completion-token breakdown. Reasoning therefore belongs in billed output and the generation allowance, rather than being free extra tokens; do not add it twice to completion usage. Our proposal disables thinking explicitly. Existing adapter currently omits that setting, while the documented default is enabled/high, so it cannot yet dispatch this exact proposal. [Chat API](https://api-docs.deepseek.com/api/create-chat-completion/), [thinking controls](https://api-docs.deepseek.com/guides/thinking_mode/).

## Complete-request estimates and uncertainty

The full compact request contains **6,844 UTF-8 bytes/characters**, including serialized instructions, inline response schema, artifact, requirements, evidence and request fields. Message contents alone are 6,385 bytes, below the configured 12,000-byte prompt limit. The English-character heuristic of about 0.3 token/character plus 128 framing tokens gives **2,182 input tokens**; a planning range is about **1,527–3,273**. This is not an exact model tokenizer count. Applying the heuristic to the complete JSON body also counts transport fields/escaping, which is deliberately conservative relative to message text. [Official token-estimation guidance](https://api-docs.deepseek.com/quick_start/token_usage/).

Expected cost using 2,182 input and 700 output tokens:

- Off-peak uncached: (2182 × $0.15 + 700 × $0.60) / 1,000,000 = **$0.0007473**.
- Peak uncached: (2182 × $0.30 + 700 × $1.20) / 1,000,000 = **$0.0014946**.

Conservative modeled reservation uses the entire serialized body byte count plus 4,096 framing margin: **10,940 input reservation tokens**, full **1,024 output tokens**, highest uncached/output rates:

(10940 × $0.30 + 1024 × $1.20) / 1,000,000 = $0.0045108, rounded upward to **$0.004511** using the app's micro-dollar rounding convention.

**Recommended one-review local cap: $0.01 (one US cent).** This provides margin above that modeled reservation. The byte/framing estimate has not been verified as a hard tokenizer upper bound; price, model framing and provider billing behavior remain uncertainties. Thus $0.004511 is a conservative maximum *estimate under these assumptions*, not a guaranteed maximum invoice. $0.01 is a proposed application reservation/authorization ceiling, not a verified provider-enforced spending limit. If an absolute provider-charge ceiling is required, do not dispatch until an applicable provider-enforced limit or a rigorously justified billed-token bound is established.

## Existing controls and required pre-dispatch work

Inspected DeepSeekService, ProviderAdapter, SeniorReviewService, transaction helper and existing spending tests. **21/21 existing mocked spending/review tests passed.** No new tests or implementation changes were made for this preparation.

Controls that already work:

- Paid enable flag, live opt-in, owner quote ID/maximumUSD, configured key, allowed model, fresh positive prices/budgets and fresh balance checks fail closed.
- Quotes bind task, review purpose, model and prompt hash, expire after five minutes, and record output bound and price snapshot. Frozen review/draft independence and final owner acceptance remain separate.
- BEGIN IMMEDIATE serializes reservation/aggregate daily/lifetime budget checks. Task locks and consumed-quote checks prevent duplicate generation for concurrent calls. Concurrent calls may each perform their pre-lock balance GET; they do not automatically deduplicate those reads.
- One generation POST per execute; no automatic retry/fallback. Any timeout/uncertain or invalid result retains an unknown reservation, including after restart, and does not approve the task.

Gaps/blockers before this specific proposal may dispatch:

1. **Payload and adapter mismatch:** the existing immutable full-snapshot prompt is 13,871 bytes, over the 12,000-byte policy. Its existing byte-based quote would reserve 17,967 input tokens but is refused at the size check. The proposed compact request must be derived deterministically from, and remain linked to, that frozen review. Preserve the existing snapshot; add/hash-bind a separate immutable compact request representation rather than rewriting history. Quote and dispatch must use the same canonical body including model, schema, thinking and output settings. Add tested support for DeepSeek thinking disabled and JSON mode; currently the adapter sends neither explicit DeepSeek thinking controls nor JSON mode under this configuration.
2. **No task-specific lifetime/count grant:** maximumUSD bounds the allowed quote reservation, while request/daily/total limits are global settings. The app has no persistent one-review/one-POST task cap binding database, task, draft hash, payload hash, model, expiry and $0.01 across all quotes/attempts. Manual re-quotes/retries can be authorized up to the current three-review-attempt limit. Add an atomic one-shot task grant; never replenish it on timeout/restart/new quote. Reserve conservatively and hold the allowance on unknown outcomes until owner reconciliation.
3. **Estimation is not hard billing enforcement:** quote() reserves heuristic prompt bytes plus framing, not exact provider-token usage, and no provider-side dollar limit is sent/verified. Do not market this local reservation as a guaranteed charge cap. Reject changed/oversized input and changed tariffs immediately before dispatch.
4. **Account/price readiness:** paid access is false; request/daily/total budgets are unset, pricing lease expired and current balance/access unknown. Fresh authenticated checks require future explicit approval. Historical balance is not evidence of current funds. The current balance preflight compares one quote to balance, without atomically netting concurrent outstanding/unknown reservations against available funds; reconcile that before claiming account-wide prepaid protection. Never double-count already-settled charges against a fresh balance.
5. **Bound preflight requests:** implement the proposed maximum one model GET and one fresh balance GET without an extra inspect()+execute() duplicate balance read. Keep all provider reads and generation inside the approved expiry/count policy; none is authorized by this preparation.

## One concrete proposal for owner approval — not currently active

> After the above controls are repaired and mock-tested, authorize this task/revision/payload hash only, using deepseek-flash with thinking disabled and at most 1,024 output tokens. Allow ONE paid review POST with a **$0.01 local task reservation cap**, plus at most ONE read-only GET /models and ONE fresh GET /user/balance (maximum THREE provider HTTP requests total). Authorization expires **30 minutes after the recorded owner approval**, or earlier if the price lease expires. Any request/payload/model mismatch, insufficient verified funds, account/payment error, uncertain outcome or incomplete output stops the operation. **No retries, fallback, purchases, global paid routing or follow-up requests.** Retain the reservation on unknown outcomes. Final owner acceptance remains mandatory. This application ceiling is not represented as a provider-enforced invoice cap.

No approval is implied by this document. Do not enable DeepSeek or create a grant/active quote until the owner explicitly approves that proposal. If approval comes after pricing or artifact changes, recalculate and obtain approval for the changed payload/cost; do not silently substitute another model.
