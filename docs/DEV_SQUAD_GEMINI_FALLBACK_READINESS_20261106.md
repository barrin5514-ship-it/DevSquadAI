# Gemini, fallback and Monday demo readiness

Prepared November 6–7, 2026, on local Windows. Branch: `feature/workspace-ui-redesign`; existing HEAD `9983d20f1ee6394cbfbff484ae9f7345c91195d7`. No commit, push, deployment or demo execution.

**Overall: NOT READY — BLOCKERS REMAIN.** Local monitoring and simulated continuation checks passed. Gemini generation and its production worker integration remain unverified. No permanent roles were assigned.

## 1. Gemini: INCONCLUSIVE — invalid local probe

- Configured and catalog-verified model: `gemini-3.8-flash`. Official host: `generativelanguage.googleapis.com`, `v1beta/models/gemini-3.8-flash:generateContent`.
- One authenticated model GET returned HTTP 200, with `generateContent` supported, input limit 1,048,576 and output limit 65,536. These are model context/output limits, not remaining account quota.
- Owner explicitly confirmed the key's Free Tier access and approved one 500-output-token, 60-second disposable `calculateTotal` review. This is owner-confirmed account evidence, not independently fetched billing/quota evidence. Public Standard Free Tier availability is separately documented.
- **Exactly one generation POST** was attempted at `2026-11-07T03:45:27.321Z` (November 6 local time). HTTP **400**, **91 ms**; timeout **60,000 ms**. No retry, fallback or replacement request.
- **Diagnostic mistake corrected:** I passed an object to `generate(prompt)` even though the existing adapter requires two strings, `generate(system, user)`. That produced an invalid request shape. This is a verified local caller defect and a likely explanation for the 400, not proof of a Gemini service or model failure. The adapter discarded the upstream error body, so the exact server rejection text cannot be recovered. The retained sanitized code is `provider_error`.
- The caller now validates both strings before dispatch, uses the existing adapter, native JSON schema and supported `thinkingLevel: low`. A fake-response test exercises the real adapter and checks the exact URL, strings, schema, JSON mode and 500-token cap. Another test rejects malformed arguments before any call. This correction has **not** been live-tested.
- No final content, code, finish reason, input/output/reasoning tokens or billing amount were supplied. These are **UNKNOWN**, not zero. No generated-code syntax or behavior result exists. No project code was written or executed.
- The one-attempt journal is retained and prevents reusing that authorization. Fresh explicit approval is required before any corrected live probe.
- Gemini remains absent from the production project-worker registry. Builder **BLOCKED**, Tester **BLOCKED**, Reviewer **BLOCKED**. Even a successful generic answer would still require role-specific contracts, artifact binding, independent test execution and review independence before production qualification. No activation or verification receipt was fabricated.

Evidence: `verification/gemini-routing-20261106/model.json`, `live-attempt.json`, `live-result.json`; corrected script `scripts/verify-gemini-capability-20261106.js`; shared validator/caller `src/services/capability-review.js`.

## 2. Mistral: CONNECTED — FREE GENERATION NOT VERIFIED

The earlier authenticated catalog GET returned HTTP 200 and listed `codestral-2508`; 55 models were returned, with no Devstral in that catalog. This is historical catalog evidence, not successful inference or free-plan entitlement. No new Mistral inference, balance or billing request was sent in this task.

Current official [usage and limits](https://docs.mistral.ai/admin/billing-usage/usage-limits), checked November 7, says Free-mode Vibe/Studio budget excludes API access; API use requires billing activation/pay-as-you-go. No account-specific zero-cost promotion or API entitlement was established. The owner's earlier $10 Studio observation does not prove API allowance. Do not enable billing or consume prepaid funds to test this.

Configured model: `codestral-2508`. [Official model page](https://docs.mistral.ai/models/codestral-25-08) lists coding/chat/structured-output support and paid reference rates $0.30/M input and $0.90/M output. A hypothetical 1,000-input/500-output-token review is $0.00075 at those rates, **not an authorized request**. Quota, rate limits and current remaining free API allowance are UNKNOWN; catalog responses supplied no usable quota headers. Mistral remains parked and no live review test is authorized.

## 3. Dynamic roles and continuation preparation

Existing project roles, histories, checkpoints, native CLI transports, DeepSeek accounting and owner acceptance remain in place. Existing worker registry supports DeepSeek, Codex Personal/School and Claude Code. Configured API adapters do not automatically become project workers.

Added a pure, non-dispatching `continuationPlan` helper. It proposes replacing only the unfinished unavailable role, ranks explicitly verified role quality/reliability before price, requires known remaining allowance, permitted worker/model evidence, cost authorization, a saved checkpoint and three independent model families. It checks actual prior Builder/Tester family provenance. Codex Personal and School are the same family and cannot independently review/test one another's work in this three-family workflow.

Mock scenarios cover Builder, Tester and Reviewer replacement, exhausted/unknown quota, authentication failure, unknown termination, missing checkpoints, unauthorized costs, completed-phase preservation and same-family conflicts. Unknown outcomes preserve locks/reservations. Context/schema/task errors are not mislabeled quota exhaustion. Every result is PAUSED or PROPOSED, `dispatch:false`, `needsApproval:true`.

**Boundary:** this helper is preparation, not an activated automatic team selector. It is not wired to dispatch, and broader role reshuffles remain unimplemented pending qualified evidence and an approved policy. Existing task fallback remains disabled. No model is permanently assigned a role.

## 4. Cached Model Health

Added a compact expandable **Model Health — cached evidence** section on **Agent team**. It uses the existing provider-health cache and recorded usage/events/balance. `GET /api/console/studio/model-health` reads local evidence only. Refresh does not query providers or create approvals. An optional `chat` query scopes fallback-policy inspection to an actual session.

Six rows: Codex Personal, Codex School, Claude Code, DeepSeek, Gemini and Mistral. Exact API model settings are shown; native default model IDs remain UNKNOWN when not reported. Configuration, catalog access, generation evidence and quota are separate. The malformed Gemini diagnostic is explicitly INCONCLUSIVE, not a provider outage. Authentication alone never produces AVAILABLE.

Token usage, estimated costs and cached DeepSeek balance have source/time/freshness labels. Balance is not subscription quota. Actual invoices and currently remaining subscription/API allowance remain UNKNOWN unless supported evidence exists. No private account scraping or authenticated quota refresh was performed. Codex/Claude logins are historical authentication evidence; they do not establish current included quota. Claude was owner-reported near exhaustion; do not assume it can run Monday.

Optional settings documented only in `.env.example`: notice 70%, warning 85%, critical 95%, freshness 300,000 ms. Actual `.env` was not edited. Percentages require a fresh explicit used/limit pair of the same allowance unit. Unknown/stale measurements do not invent percentages or green availability. Temporary rate-limit reset is honored only where actually recorded. Quality is UNKNOWN without verified outcomes.

Limitations: no new provider-specific quota connector, continuous poller, quality scorer or automatic fallback activation was added. Unsupported daily/weekly/session usage remains UNKNOWN. Cost is explicitly estimated, not provider-invoiced. Cached balance may be STALE. This conservative view cannot predict exhaustion where providers supply no current allowance evidence.

## 5. Verification actually performed

| Check | Result | Evidence |
|---|---|---|
| Full serial application suite at implementation checkpoint | **634/634 PASS**, 0 failed/skipped/cancelled; 4,114,473 ms | `full-serial.txt` |
| Final focused suite after caller/diagnostic-label corrections | **43/43 PASS**, 0 failed/skipped/cancelled; 2,816 ms | `final-focused.txt` |
| Real Chrome, actual regular dashboard | **9/9 PASS**, no page errors, blocked/write requests or horizontal page overflow | `main-browser.json` |
| Disposable simulated three-agent Chrome workflow | **13/13 PASS**; real restricted Node tests **2/2** | `mock-browser/result.json` |
| Real Windows MXC isolation | **6/6 PASS**, independent Git root also verified | `isolation.json` |
| Syntax and tracked targeted whitespace checks | PASS | checked dashboard, routes and diagnostic script |
| Main database preservation | All **64 tables** compared with supported backup; only backend runtime PID changed | `preservation.json` |

All verification artifacts in this table are under `docs/verification/gemini-routing-20261106/`. The final focused run includes the new tests added after the 634-case checkpoint; **do not describe 634 as a frozen final-tree full-suite result**, and do not add overlapping counts together. No model generation occurred during automated or browser tests.

Mock workers are explicitly SIMULATIONS. Their fixture Builder/Tester/Reviewer reports, Tester-authored tests, hash-bound review evidence, Stop behavior, reload persistence and pending owner acceptance were checked. The Reviewer read recorded evidence; it did not execute tests. None of this proves real three-agent execution.

Windows isolation probes verified local instructions readable, parent read/write denied, hub instructions denied, child-process parent reads denied and network denied. Temporary fake probes were removed. Native login brokers remain trusted processes; this does not claim their credential homes are completely OS-confined. No permissions or sandbox restrictions were changed.

The old recorded backend PID 34820 was absent and port 3000 unreachable; no process was stopped. Dev Squad was started normally as PID 6920. The new endpoint and actual dashboard were then checked in Chrome. There were no active worker executions. Historical Counter lock remains retained.

Protected project fingerprints match prior evidence: original Counter `76ce5a26ce603064a14a266dede55595dd80011dbc981b1a0e77f6a6a7c2d785`; Counter Test 2 `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`; successful To-Do `e3c2d205f4f35621d61941abfa25b61325832ae1652ebcb17f4707dacf0274d2`. Expense Tracker still contains only managed `AGENTS.md`.

## 6. Expense Tracker and Monday blockers

Existing project `aceea0a7-7c8b-4b32-9371-cf94a029a6ee`, session `b1e11259-d5f7-427e-b004-c66d9a818fe3` were preserved. [Open the actual session](http://127.0.0.1:3000/team#project/aceea0a7-7c8b-4b32-9371-cf94a029a6ee/chat/b1e11259-d5f7-427e-b004-c66d9a818fe3).

Actual Chrome navigation, roles, conversation/session display, health section, refresh and preview drawer passed. There are zero executions and no active run approval; write permission and fallback settings were not enabled. No new demo project/session was created. Screenshots: `expense-tracker-dashboard.png`, `model-health-dashboard.png`, `expense-preview-dashboard.png` in the evidence folder.

Live Preview GET returns `authorization_required`: **“Start your application separately, then authorize its exact local URL. Dev Squad never launches it.”** The same message is visible in Chrome. This project has no generated app yet, so an Expense Tracker running preview, file diff, tests and genuine review cannot be demonstrated now. The simulated workflow establishes those existing report/test/acceptance surfaces with fixtures only. No broad preview change is needed based on this evidence; after an authorized build, run the produced app and separately authorize its exact local address.

Before Monday:

1. Obtain fresh approval for **one corrected Gemini capability request**: existing model `gemini-3.8-flash`, low thinking, same disposable example/schema, 500 output tokens including thinking, 60 seconds, no retries/fallback/paid activation/project writes. Retain the consumed journal; use a separate newly authorized attempt record. If successful, inspect/test its code in isolation and qualify the production role contract before proposing it in a lineup.
2. If Gemini remains unavailable, the structurally integrated alternative is DeepSeek / Codex Personal / Claude Code, subject to fresh access and allowance confirmation. Claude quota is not established. Codex School cannot solve a same-family independence conflict with Personal. Do not silently substitute a worker.
3. Refresh the expired DeepSeek public price lease and separately authorize any fresh model/balance checks and exact demo scope. The earlier $0.02, one-POST/4,096-output, Codex/Claude one-invocation proposal is **inactive and not approved**; it does not authorize Gemini or this demo.
4. Reconfirm native included allowance and Claude extra usage OFF where Claude participates; then obtain explicit owner approval for the exact independent lineup, models, limits, pricing/reservations and project write access. Do not start the demo during this maintenance task.

## 7. Files changed in this task

- `src/services/capability-review.js`: strict disposable response validation, correct two-string caller and separate role-evidence status.
- `src/services/continuation-plan.js`: pure safe continuation proposal; no dispatch or state mutation.
- `src/services/model-health.js`: cached measurements, freshness, honest warnings and status.
- `src/routes/console.js`, `src/dashboard/dashboard.js`: local read-only endpoint and compact existing-dashboard section.
- `src/config/index.js`, `.env.example`: optional display-only warning configuration; no real environment edits.
- `tests/capability-review.test.js`, `tests/continuation-plan.test.js`, `tests/model-health.test.js`: focused regressions.
- `scripts/verify-gemini-capability-20261106.js`, `verify-gemini-readiness-isolation-20261106.js`, `verify-gemini-readiness-workflow-20261106.js`, `verify-model-health-main-20261106.js`: bounded diagnostics and repeatable local verification.
- This report, evidence and `docs/PROMPT_LOG.md`. Existing unrelated dirty work is preserved.

Supported backup was taken before changes: `backups/backup-1794023339947-9b61595c-e6a4-437c-8707-27fbaeb87115.sqlite`. No migration. The only operational evidence-cache update records the actual catalog/probe and the local diagnostic error; it creates no verification receipt or activation. `.env` is ignored and untracked. No credentials/headers were printed, no billing/routing settings changed, no paid request, autoacceptance, publishing or deployment.

Official sources checked November 6–7: [Google pricing](https://ai.google.dev/gemini-api/docs/pricing), [Google thinking](https://ai.google.dev/gemini-api/docs/thinking), [Google structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Mistral usage/limits](https://docs.mistral.ai/admin/billing-usage/usage-limits), [Codestral](https://docs.mistral.ai/models/codestral-25-08). Google 3.8 supports low/medium/high reasoning; reasoning shares the output cap. Public availability is not a current account quota receipt. Google's pages were retrieved as public Markdown where the web reader rejected their content type; prior sanitized excerpts are retained under `verification/reviewer-api-check-20261106/`.
