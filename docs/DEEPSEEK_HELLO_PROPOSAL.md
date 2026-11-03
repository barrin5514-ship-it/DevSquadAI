# DeepSeek hello — awaiting owner cost approval

Prepared 2026-11-02. **No paid request sent, no active grant created, no approval clock started.**

## Exact proposed test
- Sanitized, inactive request body: `deepseek-hello-request.json`. It contains no credentials and is not an authorization grant.
- Provider/model: official DeepSeek API, `deepseek-flash` (the configured model).
- Endpoint: `https://api.deepseek.com/chat/completions`.
- One user message: `Reply with exactly the word hello.`
- Explicit `thinking: {"type":"disabled"}`, `max_tokens: 32`, no tools, no project data, no native JSON requirement for this plain-text test.
- One generation POST, no retry or fallback; 90-second timeout. Stop on payment, access, model, balance or price problems.
- Preserve global paid-routing settings and existing owner-acceptance controls. A hello must not create or approve a development artifact.

## Estimate, not an invoice or guaranteed provider-side ceiling
Official peak rates checked 2026-11-02: $0.30 per million uncached input tokens and $1.20 per million output tokens. Peak uncached rates are used even if an off-peak/cache discount might apply.

Expected assumption: 32 input tokens including framing, 2 output tokens:
`(32 × 0.30 + 2 × 1.20) / 1,000,000 = $0.000012`.

Conservative estimate: reserve 128 input tokens including framing and the full 32-token output cap:
`(128 × 0.30 + 32 × 1.20) / 1,000,000 = $0.0000768`.

Proposed **local cap: $0.001 (one tenth of one cent)** for this one test. This is below one cent. Input token counts are estimates until provider usage is supplied; a token estimate is not itself a hard dollar guarantee. Thinking is explicitly disabled; any billed reasoning/output usage supplied by the provider must still be recorded.

## Required dispatch checks after approval
The existing review grant cannot be reused or relabeled as connection-test authorization. A hello needs its own immutable, one-shot request scope through the existing spending safeguards, including concurrent reservations, lifetime/daily budget accounting and retaining unknown outcomes. Do not use a general role assignment as spending consent.

Recheck public pricing before preparing dispatch. Use at most one model GET and one fresh balance GET, only if separately included in the owner's approval. Do not assume the historical balance or old approval is current. Bind the approved prompt/model/body/cap and a 30-minute expiry to the fresh approval; never start the clock from this document.

The current Test all 3 button calls only the two native subscription CLI hello connectors after owner confirmation of included allowance. DeepSeek displays `approval_required`; it cannot dispatch a paid POST. The remaining one-shot hello scope/dispatch integration must be completed under the specific cost approval before claiming all three hello tests passed.

## Approval proposal
Approve one `deepseek-flash` hello POST with thinking disabled, maximum 32 output tokens, a $0.001 local cap, 90-second timeout, no retry/fallback, plus at most one model GET and one fresh balance GET. Authorization expires 30 minutes after the fresh recorded approval or earlier verified-price expiry. Unknown outcomes retain their reservation. This does not authorize ongoing paid usage or change global paid routing.

Sources:
- https://api-docs.deepseek.com/quick_start/pricing/
- https://api-docs.deepseek.com/guides/thinking_mode/
