# Provider diagnosis and live workflow evaluation — 2026-10-22

The usable development-test path PASSED: dashboard submission, manual owner plan, explicit live Mistral generation, immutable SQLite draft/checkpoints, independent tests, deliberate actual-artifact handoff to NVIDIA, improved draft, independent tests and dashboard evidence. Full task completion is NOT approved: both coding tasks remain AWAITING_REVIEW; DeepSeek paid review and final owner acceptance are still required. No live automatic failure recovery is claimed. Existing automatic fallback remains covered by mocked fault tests.

## Preservation and scope

- Standard implementation, no BMAD. Existing uncommitted work preserved; no reset, commit, push, deployment, package install, CoachLab, CLI or WSL changes.
- Supported npm run backup verified backups/backup-1792687990391-704be481-11fe-4a47-9527-30f11f74622b.sqlite before workflow changes. Main SQLite: all35 business-data table hashes unchanged, plus only team_runtime_lease changed on server startup; integrity ok, foreign-key errors0. Real .env byte hash unchanged.
- Evaluations use data/provider-diagnosis-20261022/evaluation.sqlite and its separate evaluation-workspaces. Production records/files were not sent. Only synthetic prompts and the generated synthetic artifact/test findings were sent.
- Internal expiring EvaluationGrant allows only exact owner-confirmed included/trial models, disposable evaluation.sqlite, at most12requests overall/3perprovider/1024outputtokens. It does not rewrite free flags, account receipts or paid policy; HTTP bodies cannot create grants. Actual ledger reserves before POST and counts failed/unknown requests. Scoped models are excluded from automatic selection. Normal session/operation/plan/lock/checkpoint/usage/final-owner safeguards remain.
- Evaluation scope is now closed using scope-closed.json; restart cannot silently recreate this assignment's grants. Both main and evaluation live controls are off; DeepSeek paid remains false. Existing main default remains Groq, currently blocked from routing by its observed access error.

## Exact inventory and count definitions

-9 registered provider definitions: cerebras, groq, gemini, openrouter, mistral, nvidia, cloudflare, huggingface, deepseek.
-6 have saved keys: Groq, Gemini, OpenRouter, Mistral, NVIDIA, DeepSeek. No values or fingerprints appear in this report.
-4 have both a saved key and a provider-level configured model: Groq openai/gpt-oss-120b; Gemini gemini-3.8-flash; Mistral codestral-2508; DeepSeek deepseek-flash. OpenRouter has no generic default model: it supplies two explicit team routes. NVIDIA has a key but no saved model; its evaluated model was overridden only in evaluation scope.
-8 team model entries:7 developers and1 senior. Six routes have existing key/model configuration when the two OpenRouter routes are counted. NVIDIA/Cloudflare show documented candidates rather than complete persistent setup. Main SQLite has4 ai_providers metadata rows and3 agent_models rows; these are not additional unique active routes.
-3 exact models successfully generated in this assignment: codestral-2508, nvidia/nemotron-3.5-super-vl-120b-a12b, poolside/laguna-s-2.1:free. The latter received a READY probe, not a new coding benchmark.
-5 team models have documented generation evidence when history is included: those3 plus Groq (local data/groq-live-OeStWr/verification-report.json:265input138output403total) and retired MiniMax (local2026-10-21smoke246input72output318total). Historic success does not prove current access. Four current dashboard records have generation timestamps; Groq's older standalone report remains separately dated historical evidence.
-1 currently eligible automatic candidate: Laguna, subject to fresh zero-price check/cooldown before actual dispatch.0 enabled, because live session is off.7 other team model entries are ineligible; these categories overlap with history/test status.
-3 team models have no successful generation evidence: Gemini (503/timeouts), Cloudflare (not configured), DeepSeek (paid generation deliberately excluded). Cerebras/Hugging Face have no configured model or key and are not counted as configured/untested model entries.

## Provider findings, fixes, retests and next steps

| Provider / exact model | Actual generation evidence | Routing / diagnosis / fix / next step |
| --- | --- | --- |
| Groq — openai/gpt-oss-120b | Historical success; this assignment POST403 in0.770s, no tokens | Earlier catalog403 was not assumed to establish generation failure; now actual POST independently returned provider-reported network-access denial. Correct official URL/schema. Confirmed error classification, underlying network/account/security policy unknown. Added sanitized diagnostics and exclusion from automatic routing after an access error. Ask Groq/network support to investigate; no bypass/key substitution or repeated tests. Successful explicit future catalog verification can clear the owner-action gate. |
| Gemini — gemini-3.8-flash | Existing503/30s/60s reports; current minimal JSON POST503 in2.453s | Official endpoint/schema retained. Service-unavailable classification, no Retry-After returned. Specific capacity/account/region cause unknown; no default SDK retry used (direct REST). Capture timing/retry evidence; preserve actual thinking token accounting. Revisit provider status/quota/account only when new evidence justifies another separately authorized request. |
| OpenRouter/Laguna — poolside/laguna-s-2.1:free | Historical coding benchmark; current READY HTTP200 in0.919s,36input3output39total | Authenticated account catalog and key GET200, exact pricing prompt0/completion0, Free Tier observed0/50used50remaining before test. Shared quota may change outside app. Existing exact free slug and zero max_price constraints preserved. Eligible, live controls off. Published retirement October31; no paid substitution. |
| OpenRouter/MiniMax — minimax/minimax-m3.1-flash:free | Historical successful generation, now retired;0new inference | Official page says launch free period ended October22; account catalog no longer lists exact free slug. Existing noonUTC cutoff retained. Paid base slug is not substituted. Seven old fixtures now pin their intended before-retirement time; exact runtime retirement tests remain. Owner may separately research a replacement, no need to change providers to mask this failure. |
| Mistral — codestral-2508 | Current workflow200,4.387s,855input341output1196total; complete stop | Prior36/160/196success and faulty decimal assertion were conversation-reported, distinct from current results. Reused owner's Free/included-allowance confirmation without rechecking. Current code syntax passes; generated assertions3/3, independent22/22. NVIDIA improved its weak one-sided/exact-input decimal test. Automatic routing stays disabled because persistent flag/activation were not changed. Future production/paid/routing use needs its own approval. |
| NVIDIA — nvidia/nemotron-3.5-super-vl-120b-a12b | READY200,6.742s,38/3/41,reasoning0. First handoff timed out29.990s/no headers/unknown usage. Explicit bounded retry200,28.922s,3154/520/3674,reasoning0,complete stop | Old nvidia/nemotron-3-super-120b-a12b was404function unavailable for account; current public page marks old free endpoint deprecated. Passive documented candidate updated to3.5 with262Kcontext; saved model remains unset, no silent active switch. Official reasoning_effort:none supported and now optional in adapter. Earlier60s timeout came from standalone timeout:60000; handoff default came from config REQUEST_TIMEOUT_MS default30000. New timing distinguishes waiting for headers from reading body, but not DNS/TCP/TLS/server queue separately. Evaluation-only90s allowance justified for larger nonstreaming coding completion; later28.922s success DOES NOT prove30s was inherently too short or identify old timeout cause. No remote cancellation/zero-credit-consumption claim. Five generated assertions and22independent tests pass. Current access works for these synthetic evaluation calls; ongoing/production entitlement unknown. |
| DeepSeek — deepseek-flash | Account/balance GET historical; no paid generation submitted | Deliberately disabled paid senior review, not diagnosed as a broken adapter. Existing budget/prepaid/quote/per-request/independence gates retained. Both tasks await senior review; no free developer approval substituted. |
| Cloudflare — candidate @cf/qwen/qwen2.5-coder-32b-instruct | Untested, token/account ID/model missing | Configuration blocker, not provider failure. Owner must configure account-scoped credentials and verify Workers Free remaining Neurons/no overage; no requests made. |
| Cerebras — no configured model | Untested; no key | Existing disabled policy retained; no new free-eligibility claim or requests. |
| Hugging Face — no configured model | Untested; no key | Missing configuration; no technical-failure claim or requests. |

## Every inference request in this assignment

| # | Provider/model | Output cap | HTTP / elapsed | Input / output / total | Reasoning | Finish / result |
| --- | --- | ---: | --- | --- | --- | --- |
|1|Groq openai/gpt-oss-120b|128|403 /0.770s|unknown|unknown|network_access_denied; no output|
|2|Gemini gemini-3.8-flash|128|503 /2.453s|unknown|unknown|service_unavailable; no output|
|3|NVIDIA nemotron-3.5-super-vl-120b-a12b|128|200 /6.742s|38 /3 /41|0|stop; READY complete|
|4|Mistral codestral-2508|1024|200 /4.387s|855 /341 /1196|0|stop; persisted draft,3/3assertions,22/22independent|
|5|NVIDIA same3.5model|1024|no headers /29.990s|unknown|unknown|timeout; unknown remote outcome; no draft|
|6|NVIDIA same3.5model|1024|200 /28.922s|3154 /520 /3674|0|stop; persisted improved draft,5/5assertions,22/22independent|
|7|OpenRouter poolside/laguna-s-2.1:free|128|200 /0.919s|36 /3 /39|0|stop; READY complete|

Total7/12requests; provider counts Groq1, Gemini1, Mistral1, NVIDIA3, OpenRouter1. Requested output caps total3584. Known provider usage4083input867output4950total and0reportedreasoning across the four successful requests; usage for three failed/unknown requests remains unknown. The NVIDIA retry was deliberate owner-authorized diagnosis, not an automatic loop. No further calls are authorized by this report. HTTP200 does not establish billing source, prepaid balance, remaining trial credits or production rights. No paid DeepSeek, paid endpoints, credit purchase or billing changes.

## Real workflow and independent verification

- Created synthetic project and manual plan through the actual browser dashboard on loopback3001, approved plan, assigned Mistral, disabled fallback, authorized one draft request, saved external test evidence through dashboard.
- Draft44aeddb3-b18d-462a-b60e-8b0680f6795a belongs to task1bf07351-7f01-4846-b30c-d9ead66c1653. Its immutable hash/checkpoints retained.
- Created a separate deliberate development-handoff task using the normal session/token-protected console routes, with the actual source artifact embedded and hash recorded in handoff.json. NVIDIA did not review its own work, and was not made senior. First failed attempt and unknown usage remain in the SQLite ledger; explicit retry used a new operation ID and preserved checkpoints.
- Improved draft6120e314-b129-4849-8f8e-405bf9354f80 belongs to taskac6a12e8-ece3-4422-a9f3-919fad231eef. It corrects the tolerance check and adds rejection checks. No files were applied to either project workspace.
- Inspected source before execution. Only inspected arithmetic code was run, with export syntax removed for a VM harness; logic/assertions unmodified. Restricted child has Node permission mode/read access only to its temporary directory, no inherited credentials, dynamic code generation disabled,1-second VM and5-second process timeouts. This is a bounded test of the reviewed artifact, not a general hostile-code sandbox.22 independent cases cover integer/negative/zero results,0.1+0.2 absolute tolerance and8invalid values in both positions.
- Both drafts/state/test evidence/usage/checkpoints survive evaluation server restart. Both remain AWAITING_REVIEW; parent tasks remain ASSIGNED. Owner approval cannot bypass an independent DeepSeek review. No production-ready or fully-approved completion claim.

## Tests and genuine corrections

Initial restricted baseline hit localhost/socket restrictions and stalled; stopped only its command. Initial elevated staged174run reported165pass/9fail:7 older cases depended on current time being before MiniMax retirement;2 transient failures occurred while the diagnostic parser change was being developed. Baseline and edits overlapped, so that run is not presented as a pristine pre-edit baseline. Corrected non-JSON HTTP-error handling so503status/Retry-After survive. Corrected7fixtures with explicit before-retirement Date clocks and retained boundary tests. A focused restricted run hit temporary-sidecar rename EPERM; elevated checks passed without weakening filesystem policy. Inventory helper initially referenced nonexistent model_name in agent_models; corrected to actual model column, no data change. First new-scope test import accidentally duplicated EvaluationGrant and used wrong relative paths; corrected before final suite. OpenRouter read-only helper initially stopped locally on its missing generic model, sent no API request; retried with its existing explicit Laguna route and captured successful GET evidence. No free flags were falsified and no provider failure was hidden.

Final full suite183/183 passed,0fail/skipped/cancelled; nine new meaningful diagnostics/scope tests. Existing mock fallback/locking/partial-response/idempotency/retirement/paid-budget/independent-review/owner-approval coverage passed. Earlier intermediate181/181 run also passed. package.json has no build step; modified JavaScript syntax and git diff whitespace checks pass. No credential matches found in the final scan (see verification output); .env remains ignored/untracked. Main startup stderr empty. Browser inspection confirmed stored output/test evidence and senior-review gate; screenshot data/provider-diagnosis-20261022/dashboard-proof.png.

## Files changed by this assignment

Targeted source: src/providers/adapter.js, diagnostics.js, expansion.js; src/orchestrator/team.js, routing.js; src/services/team-status.js; new src/services/evaluation-grant.js. Read-only verification script scripts/verify-free-developers.js clears an access-error gate only after a future successful explicit Groq catalog/model verification. New scripts/provider-diagnosis.js and scripts/evaluation-server.js provide auditable explicit disposable evaluation, not background polling or automatic production activation. Tests: new tests/provider-diagnosis.test.js; fixed fixture clocks in tests/team.test.js, handoffs.test.js, provider-repair.test.js. Docs: this report, PROVIDER_EXPANSION.md, PROVIDER_SETUP.md, DASHBOARD_GUIDE.md, PROMPT_LOG.md. Ignored diagnostic evidence lives under data/provider-diagnosis-20261022/; existing uncommitted files outside this work were not reset or claimed as new changes.

## Beginner dashboard walkthrough

1. Open http://127.0.0.1:3001/team for the saved disposable evaluation. It is separate from your existing http://127.0.0.1:3000/team workspace. Evaluation authorization is closed; live controls are off.
2. Open Disposable provider evaluation — finite addition, then its development task. Expand Generated artifacts, Recorded test evidence, Progress history & token usage, and Checkpoint saved. You can inspect/download the draft without executing or applying it.
3. Open Disposable deliberate handoff — Mistral to NVIDIA and its development task. Inspect corrected decimal assertion, five model assertions,22independent test cases, the retained failed attempt, actual usage and saved checkpoint.
4. AWAITING_REVIEW is expected. Do not treat Request DeepSeek review as an authorized payment or bypass final owner approval. No further live request or persistent provider activation is part of these inspection steps.
5. Main dashboard AI Team now separates generation evidence, current errors, retirement and disabled routing. Mistral/NVIDIA were tested with scoped consent; their persistent free flags remain false and NVIDIA_MODEL remains unset.

## Official sources checked2026-10-22

- NVIDIA current model/free-hosted example: https://build.nvidia.com/nvidia/nemotron-3.5-super-vl-120b-a12b
- NVIDIA exact hosted schema, reasoning_effort defaults/high/none and stream options: https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b-infer
- Old deprecated free endpoint: https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b
- Trial/restricted evaluation terms: https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf ; https://docs.api.nvidia.com/nim/docs/faq
- Groq OpenAI compatibility/model endpoint: https://console.groq.com/docs/openai ; https://console.groq.com/docs/models
- Gemini troubleshooting/transient503 and SDK retry distinctions: https://ai.google.dev/gemini-api/docs/troubleshooting ; pricing https://ai.google.dev/gemini-api/docs/pricing
- Mistral official chat API: https://docs.mistral.ai/api/endpoint/chat ; model https://docs.mistral.ai/models/codestral-25-08 ; account allowance https://docs.mistral.ai/admin/billing-usage/usage-limits
- OpenRouter exact retirement pages: https://openrouter.ai/minimax/minimax-m3.1-flash:free ; https://openrouter.ai/poolside/laguna-s-2.1:free

Actual request/evidence metadata: data/provider-diagnosis-20261022/requests.json, final-verification.json, mistral-tests.json, nvidia-tests.json, openrouter-access.json, pipeline-final.json and handoff*.json. No sensitive headers or credentials are included.
