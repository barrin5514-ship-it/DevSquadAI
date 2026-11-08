# Antigravity CLI and Qwen3-Coder — free worker discovery

Date: November 7, 2026, local Windows. Branch `feature/workspace-ui-redesign`; HEAD `9983d20f1ee6394cbfbff484ae9f7345c91195d7`. **No software installed, authentication changed, generation sent, worker activated, project executed, push or deployment.**

## Decision

| Candidate | Verdict | Production worker integration |
|---|---|---|
| Google Antigravity CLI | **BLOCKED — installation and owner sign-in required** | **NOT VERIFIED** |
| `qwen/qwen3-coder:free` | **BLOCKED — exact model absent from live catalogs** | **NOT VERIFIED** |

Neither is ready for Monday's production three-agent demo. Successful catalog authentication is not successful generation. There are no model responses or coding-quality measurements to compare. No provider has been permanently assigned Builder, Tester or Reviewer.

## 1. Existing Dev Squad preserved

Read `AGENTS.md`, latest Gemini verification/preparation reports, provider configuration/adapter, project worker and role registry, independence checks, CLI environment, isolation launcher, process observer, usage/health and continuation preparation.

The actual project-worker registry supports DeepSeek, Codex Personal, Codex School and Claude Code. Codex uses its separate native login homes; Claude uses its native CLI login. DeepSeek retains its existing API transport and authorization/accounting. Parked API adapters do not automatically qualify as project workers. Current Gemini evidence is HTTP 503/high demand, not a valid generation or role-integration receipt. No replacement Gemini test was sent.

Role independence includes model family and prior author/Tester provenance; Personal and School Codex are not independent families. Existing tests require real Tester-authored files and trusted runner evidence. Existing checkpoints, Stop, unknown-outcome reservations/locks, process birth identities and final owner acceptance remain intact. The new continuation planner proposes rather than dispatches; fallback remains disabled.

## 2. Antigravity installation, authentication and plan

**VERIFIED locally:** `agy` and `antigravity` were not found on the current command path. The official Windows directory `C:\Users\barri\AppData\Local\agy\bin` is absent. Other checked locations (`.local/bin`, `.antigravity/bin`, local Programs/Antigravity/bin) contained no matching executable. This is bounded discovery, not a whole-drive scan. No version/help/model command could be run. An installation elsewhere remains possible if the owner provides its path.

**Official installation source:** [Google's CLI quickstart](https://antigravity.google/docs/getting-started?tab=cli) links the standalone PowerShell installer at **https://antigravity.google/cli/install.ps1** and CMD installer at **https://antigravity.google/cli/install.cmd**. The full IDE is not required. Neither script was downloaded or executed. Approval is required before installation. Proposed installation work: download the official script for review, inspect destinations/updates, then install the CLI only after approval; do not pipe an unreviewed remote script into execution.

[Google authentication documentation](https://antigravity.google/docs/install/) describes personal Google browser sign-in and OS-keyring credential storage. After installation, the owner should launch `agy` interactively in a disposable folder, select personal Google sign-in, and complete the browser flow themselves. Do not use the existing Gemini API key, ADC, a Cloud project or API billing as a substitute. Native login can be shared across Antigravity surfaces; do not promise separately isolated identities without checking the installed implementation. No credential store was inspected here.

[Published plans](https://antigravity.google/docs/plans/) include baseline CLI access for individuals without Pro/Ultra, with variable capacity-based weekly limits. Account-specific entitlement, quota, available models and card-free signup are **UNVERIFIED** until owner sign-in. Any billing/card requirement is a stop condition. Do not buy AI credits. If applicable, verify credit overages are **Never**; do not change spending settings in this task. Public free access does not establish this account's remaining quota.

## 3. Antigravity headless feasibility — published, not locally verified

[Official headless documentation](https://antigravity.google/docs/cli/headless/) describes `-p`, pinned `--model`, JSON/stream-JSON output, JSON schema, token metadata and nonzero errors. A soft-denied tool can still exit zero; validate the envelope and actual result. `--print-timeout 60s` is documented; default timeout is unlimited. Working folder can be selected by the parent process. `agy models` supplies actual slugs after setup. No hard 500-output-token option was found in the reviewed reference; an 8 KiB capture cap is not a token or spending cap. One CLI invocation is not proven to equal one internal model request. Process-tree cancellation must be locally verified before generation.

Provisional command shape, **not approved or runnable yet**:

```text
agy --sandbox --model <SLUG_VERIFIED_AFTER_SIGN_IN> --output-format json --print-timeout 60s -p <SHARED_REVIEW_PROMPT>
```

No `--dangerously-skip-permissions`, auto/accept-edits mode or broad tool grants. The installed version must confirm these flags. A verified deny policy for terminal tools, file writes, plugins/hooks and unwanted context is still needed; merely asking the model not to use tools is insufficient. Use a new disposable folder, never DevSquadAI or Expense Tracker, with an outer 60-second supervisor and 8 KiB total capture bound. The exact selected model and enforceable limits must be presented for separate approval.

[Google's Windows sandbox documentation](https://antigravity.google/docs/sandbox/) requires Windows 11 24H2 plus the August 2026 update or later. Registry reports DisplayVersion 26H2, build 26300.9818; the legacy ProductName field says Windows 10 Home, so that label alone is not an OS-support verdict. Build evidence is promising, but actual CLI sandbox availability remains **NOT VERIFIED**. The docs warn unsupported hosts may ignore `--sandbox`; a flag is not proof. Windows sandbox read access outside user profiles also needs review against Dev Squad's stricter selected-folder policy. Do not bypass a failed boundary.

Usage: documented `/usage` and token output are potential supported sources, not measurements gathered here. Model, auth, remaining quota, token usage, cleanup and generation results all remain **UNKNOWN/NOT RUN**.

## 4. Qwen3-Coder through OpenRouter

**VERIFIED read-only calls** using the existing saved key at official `https://openrouter.ai/api/v1`:

| GET endpoint | HTTP | Duration |
|---|---|---|
| `/models` | 200 | 827 ms |
| `/models/user` | 200 | 354 ms |
| `/key` | 200 | 62 ms |

The exact requested model **`qwen/qwen3-coder:free` was absent from both model lists**. Its public [model page](https://openrouter.ai/qwen/qwen3-coder:free) still exists, but a product page is weaker availability evidence than current catalog results. No authoritative retirement date was provided; do not invent one. Its active-route prices, context limits, structured-output/tool parameters and generation access cannot be verified from an absent catalog entry.

Saved API key exists and authenticated successfully. Account response explicitly reported `is_free_tier: true`, free daily requests **used 0 / limit 50 / remaining 50**, observed `2026-11-07T05:29:53.713Z`. This is a provider-reported point-in-time quota, not a guarantee for later requests. No rate-limit headers were supplied. The separate deprecated key `rate_limit` field says requests -1 per 10s and explicitly says to ignore it; it is **not unlimited free use**.

[OpenRouter free-model documentation](https://openrouter.ai/collections/free-models/) publishes 20 requests/minute and 50/day for unfunded free-variant usage, with failed attempts counting. Credit purchases are unnecessary for `:free` access and are not authorized. The larger purchased-credit tier is not proposed. General account eligibility does not make this missing Qwen route accessible.

The existing OpenRouter model configuration is empty; it was preserved. No API key, account label, fingerprint, auth header or private billing values were printed. No new account/key setup is necessary for current read-only access. If ever needed, use [OpenRouter](https://openrouter.ai/) and its [API keys page](https://openrouter.ai/settings/keys), enter the key locally as `OPENROUTER_API_KEY`, and avoid billing activation/top-ups.

No Qwen inference was attempted. Current Qwen verdict is BLOCKED, not CONNECTED—LIVE TEST PENDING, because the exact route is unavailable.

## 5. Verified free alternatives — not selected or activated

A further public catalog GET returned 460 models and 12 `:free` variants. It was needed to inspect alternatives beyond the Qwen-focused filter. All listed price fields for these alternatives were zero; eligibility was checked from actual pricing, not their names. The first public-only supplementary fetch lacked Node's Windows CA flag and failed TLS before receiving a response; using the project's supported `--use-system-ca` fixed that local diagnostic without disabling certificate verification. No generation or authenticated retry occurred.

| Alternative only | Input/output price | Context | Max output | Catalog capabilities |
|---|---|---:|---:|---|
| `cohere/north-mini-code:free` | $0 / $0 | 256,000 | 64,000 | `max_tokens`, tools/tool choice; native JSON/structured-output parameter not advertised |
| `nvidia/nemotron-3.5-super-vl:free` | $0 / $0 | 1,000,000 | 131,072 | `max_tokens`, JSON/structured outputs, reasoning, tools/tool choice |

No expiration date was reported for either. Account-filtered visibility and generation for these alternatives were **not separately established**; no substitution was made. [Cohere's model page](https://openrouter.ai/cohere/north-mini-code:free) describes a coding-focused model; [NVIDIA's page](https://openrouter.ai/nvidia/nemotron-3.5-super-vl:free) includes coding validation among its uses. Neither's local coding quality/reliability was measured here. Prior NVIDIA hosted-service success does not verify OpenRouter's separate route.

## 6. Prepared fair comparison, inactive

Shared disposable prompt:

```text
Review function add(a, b) { return a + b; }
Explain it, identify one invalid-input edge case, suggest an improvement,
and return a corrected add function that accepts only finite numbers.
Return JSON with explanation, edgeCase, improvement, and code.
Do not use tools, change files, or claim tests ran.
```

For Qwen, the conditional future endpoint is `POST https://openrouter.ai/api/v1/chat/completions`, exact model `qwen/qwen3-coder:free`, `max_tokens: 500`, 60 seconds, no tools, stream false, `provider.allow_fallbacks: false`, and zero `max_price` for prompt/completion/request. This is **not a dispatchable proposal while the model is missing**. Reconfirm route pricing, account visibility and supported parameters before seeking approval. No general free router, paid counterpart, model array or substitute is allowed. No active grant or approval clock was created.

Antigravity cannot yet name an authenticated model or enforce a documented 500-token limit. Installation/sign-in and non-generating boundary checks come first. A later approval must explicitly cover its actual enforceable limits; no live test is authorized by this report.

## 7. Dev Squad role compatibility and tests

| Role | Antigravity | Exact Qwen free route |
|---|---|---|
| Builder artifact contract | NOT VERIFIED | BLOCKED / NOT VERIFIED |
| Tester with trusted independent execution | NOT VERIFIED | BLOCKED / NOT VERIFIED |
| Reviewer with artifact/evidence binding | NOT VERIFIED | BLOCKED / NOT VERIFIED |

Potential transport fit is not qualification. API/CLI text can enter a future guarded patch/review validator, but only the existing isolated runner can provide evidence that tests actually ran. Neither candidate is registered, assignable or eligible for fallback. An eventual Antigravity Gemini-backed worker must be tracked as the Gemini family rather than a new independent family merely because it uses a different executable.

- **52/52 targeted tests passed**, serial: existing provider safety/diagnosis, malformed outputs, capability contracts, per-role continuation, independence, authorization, unknown quota and cached Model Health. These are fixtures/current-platform checks, not successful candidate integration.
- **9/9 actual Chrome checks passed**: preserved Expense Tracker session/roles, no execution approval, existing health rows/refresh, honest unknowns, preview authorization requirement, no page errors, writes or provider traffic. Screenshots and JSON are in the evidence folder.
- **16/16 process identity/execution-history tests passed**, serial; see `termination-tests.txt`. Combined targeted tests: **68/68**, zero failed/skipped/cancelled.
- No production code changes or full-suite rerun. New files are read-only discovery/browser diagnostics, this report and evidence; prompt log updated.

## 8. Preservation and Monday recommendation

Compared all **64 database tables** with the prior supported backup: only the already-recorded backend runtime PID differs. Project file fingerprints match original Counter, Counter Test 2, successful To-Do and Expense Tracker evidence. Historical lock `fc00a59b-c31e-4b93-b448-35ebbc0de048` remains. No schema changes, migration or new backup needed for this read-only task. `.env` remains ignored/untracked.

Existing Expense Tracker project `aceea0a7-7c8b-4b32-9371-cf94a029a6ee`, session `b1e11259-d5f7-427e-b004-c66d9a818fe3`: zero executions; no duplicate, new scope, write-access activation or role changes. Pending workflow was not triggered.

**Recommendation:** neither requested candidate is ready for Monday yet. The shortest potential alternative is an explicitly owner-selected, currently listed OpenRouter route, because the existing key/free quota works and no new software login is needed. Consider a separate bounded test of `cohere/north-mini-code:free` for coding quality or the structured-output-capable NVIDIA alternative for a review contract; this is a proposal, not selection or authorization. The existing DeepSeek/Codex/Claude lineup remains the structurally integrated option, subject to current allowance/access and a separately approved run. Do not assume Claude has quota.

**Exact next owner decision:** approve standalone Antigravity CLI installation from Google's source (then personally sign in), or choose one verified zero-priced OpenRouter alternative for account-visibility confirmation and a separately approved one-request test. No new live generation is approved or started. No Expense Tracker execution.

Evidence: `docs/verification/antigravity-qwen-20261107/openrouter-readonly.json`, `public-free-catalog.json`, `preservation.json`, `targeted-tests.txt`, `termination-tests.txt`, `main-browser.json` and screenshots. Sources checked November 7, 2026. Stop after reporting.
