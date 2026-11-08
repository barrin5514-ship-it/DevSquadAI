# DeepSeek streaming `body_limit` — reproduction and narrow repair

**Date:** 2026-11-07
**Scope:** only the DeepSeek streaming `body_limit` failure. No checkpoint-aware Retry work, no Zapier live verification, no live provider calls.

## 1. Confirmed cause

The failure is in the shared adapter's **raw SSE byte budget**, not in ordinary valid output length.

- `ProviderAdapter.request` limited every DeepSeek streamed response to **512,000 raw bytes**.
- `deepseekStream` also counted raw bytes and had the same 512,000 cap.
- It counted every byte received from the HTTP body: SSE `data:` framing, JSON field names, metadata, model/usage fields, and ignored `reasoning_content` deltas. It did **not** count only the visible answer.
- The local replay used the same `ProviderAdapter.generateStudio` path as the failed Send.

### Reproduced numbers before the fix

| Fixture | Visible answer | Raw SSE body | Result |
|---|---:|---:|---|
| Normal SSE, same 5,619-character answer | 5,619 chars | **5,858 bytes** | passed |
| Same 5,619-character answer + 600,000 bytes of ignored reasoning | 5,619 chars | **605,939 bytes** | failed `body_limit`, HTTP 200, no `DONE`/usage |

Raw chunk sizes in the failing fixture: `[5,690, 600,081, 154, 14]`. The 600,081-byte reasoning chunk is the one that crossed the 512,000 cap. The visible answer was not too large; ordinary framing for the same valid answer was only 5,858 bytes.

The live execution evidence recorded **5,619 visible-answer characters** and `failedCheck:body_limit` with HTTP 200. The provider body itself was not retained, so its exact live byte count is unknown; the fixture reproduces the same failure mechanism at 605,939 raw bytes.

## 2. Narrow fix

Kept a bounded failure; did not remove limits:

- `src/providers/deepseek-stream.js`
  - Added `ANSWER_LIMIT=512000` counted only from `choices[0].delta.content` UTF-8 bytes.
  - Added `RAW_LIMIT=2000000` for the complete SSE transport.
  - Raw overage fails `body_limit`; visible-answer overage fails `answer_limit`.
  - Diagnostics now include `visibleAnswerBytes`, `rawStreamBytes`, and both limits. Reasoning and other non-answer fields are ignored for the answer budget but still bounded by the raw budget.
- `src/providers/adapter.js`
  - DeepSeek stream requests now use the 2,000,000-byte raw safety cap; non-stream requests retain 512,000.
  - The stream parser receives the chunks rather than being cut off at the visible-answer-sized raw cap.
  - `body_limit`/`answer_limit` are surfaced as specific provider errors.
- `src/providers/config.js`
  - Added clear provider messages for both bounded failures.
- `src/services/studio-recovery.js`
  - Added clear failure text for `body_limit` and `answer_limit`.
- `tests/deepseek-body-limit.test.js`
  - Regression coverage for normal, reasoning-heavy, visible-oversized and raw-oversized streams.

## 3. Proof

### Local fixture, after the fix

| Fixture | Raw body | Visible answer | Result |
|---|---:|---:|---|
| Normal | 5,858 | 5,619 | **passed**; finish `stop`; usage 100/10 |
| Reasoning-heavy | 605,939 | 5,619 | **passed**; finish `stop`; usage 100/10 |
| Genuinely oversized visible | 520,239 | 520,000 | **failed bounded** `answer_limit` |
| Genuinely oversized raw | 2,105,939 | 5,619 | **failed bounded** `body_limit` |

The previously failing 605,939-byte reasoning-heavy stream now completes and returns the 5,619-character answer with `finish_reason: stop`.

Evidence: `docs/verification/deepseek-body-limit-20261107/before.json` and `after.json`.

### Regression tests

- Focused stream/execution tests: **15/15 passed**; final focused stream tests: **3/3 passed**.
- Full serial suite after this change: **688/688 passed**, zero fail/cancel/skip (`docs/verification/deepseek-body-limit-20261107/full-serial-final.txt`).
- No live provider request, paid tier, spending or project artifact was touched.

## 4. Two live same-chat attempts

**Not run by this repair.**

Brandon will run the two small live attempts from the Windows app. For each, success means:

1. it completes;
2. it has its own separate run ID;
3. it ends in **Awaiting Owner**.

If a live attempt fails, capture the exact error text and stop; do not loop retries. The body fix is loaded only after the backend restart; no live attempt was made before that.

## 5. Stop point

Do not begin the checkpoint-aware Retry or Zapier live verification yet. This repair is limited to the confirmed DeepSeek stream budget cause; wait for the two live same-chat results and Brandon's approval.
