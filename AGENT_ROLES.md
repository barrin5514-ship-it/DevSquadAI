> Current policy (2026-11-02): Big Three roles rotate per job. Default: DeepSeek Builder, Codex Tester, Claude Code Reviewer. Builders cannot review their own step. Other providers are parked; older assignments below are historical. See docs/BIG_THREE_PLAN.md.

# AI development team roles

The human owner defines requirements and approves plans, final work, production application and deployment. Completing a task only records acceptance; it never deploys or applies code.

Claude is the Lead Senior Developer. Claude provides architecture, plans, direction and correction guidance through manual handoffs. Codex is the Independent Senior Reviewer. Codex reviews actual drafts and external test evidence and reports findings. Either senior can author a manual draft; the other must review it. Self-review is rejected. Neither role has an assumed API integration or subscription-derived API entitlement.

Groq GPT-OSS 120B remains the default development model. Poolside Laguna S 2.1 and MiniMax M3.1 Flash are optional exact-model assignments after their provider's free account access is confirmed locally. Their coding/debugging/testing/planning specialties remain provisional. Gemini is excluded from automatic team routing. Inkling is not included.

The orchestrator manages state, immutable evidence, budgets and handoffs. It is not a senior reviewer and never fabricates a review decision. The dashboard provides project, plan, assignment, authorization, and manual review controls. It has no control that executes generated code. Live generation is separate from code execution.

Legacy checkpoint-2 endpoints retain their existing primary/backup display and Codex fallback flag for compatibility. The new /api/team workflow explicitly implements the hierarchy above; Codex is an independent reviewer here, not merely a backup. The user has authorized manual Claude/Codex handoffs in this phase. No legacy agent rows were silently renamed or automatically assigned to new models.


## Current multi-model policy — 2026-10-21

- Human owner: approves plans, free-operation scope/resume, each future paid quote, and final completion.
- Groq openai/gpt-oss-120b: default developer; coding/debugging/testing/planning. Historical successful generation, current authenticated catalog access not verified in this environment.
- OpenRouter poolside/laguna-s-2.1:free: coding/testing candidate; free listing expires 2026-10-31. MiniMax minimax/minimax-m3.1-flash:free: planning/debugging candidate. Both support all four development categories provisionally. Current zero-price access is rechecked before every dispatch; local free-account confirmation is currently missing.
- Cerebras gpt-oss-120b and qwen-3.8-27b: catalog candidates for development only, disabled. Current official offering is an expiring credit trial requiring a payment method, not a renewing free tier. Missing key does not justify enabling trial/paid access.
- DeepSeek deepseek-flash (optional deepseek-v4-pro when configured): prepaid advanced developer/debugger; review specialty advisory/prepared only. Disabled by default, never an automatic fallback; every paid development POST needs its own exact owner-approved quote and persistent budget reservation. No paid calls were made.
- Claude Code and Codex: optional independent manual senior reviewers. Author and reviewer cannot match. Findings do not complete work; the owner must accept it. No OpenAI/Anthropic paid API or local CLI bridge.

Fallback transfers verified checkpoint context and preserves draft versions. It does not continue an interrupted response verbatim, automatically execute tests, apply production patches or schedule all project tasks. See ORCHESTRATOR_ARCHITECTURE.md for the precise execution scope.


## Current team policy — DeepSeek senior restructure

Development Team: Groq (primary developer), Poolside Laguna (developer/testing), MiniMax (developer/debugging). Senior Developer: DeepSeek, lead independent reviewer and advanced developer. DeepSeek reviews correctness, bugs, security, requirements, test coverage, integration and corrected submissions, then reports findings to the owner.

DeepSeek never reviews its own draft, including one attributed to another model label when its usage provenance identifies DeepSeek. Such work remains paused for a genuinely independent review arrangement; owner acceptance cannot substitute for independent review. No alternative reviewer is silently invented.

Claude Code and Codex CLI are absent from active roster, choices, dashboard cards and review assignment. Their software, historical agent rows, packets, review receipts, drafts, checkpoints and documentation are preserved. They cannot submit new active reviews, approve work or regain access through the obsolete configuration flag. Generic internal coordinator/validator identities remain implementation records; the public roster exposes only the three developers and DeepSeek.

DeepSeek remains disabled until deliberate configuration and explicit owner usage authorization. It is never chosen by free fallback. Each paid development or review operation requires its own valid quote, current balance check, local budgets and owner confirmation. No paid requests were made to implement this change.


## 2026-10-21 provider expansion (activation pending)

See [PROVIDER_EXPANSION.md](PROVIDER_EXPANSION.md) for Gemini diagnostic findings, Mistral/NVIDIA/Cloudflare adapter setup, official conditional free-access research, key/account evidence, separate routing/live approval gates, usage/context/backoff controls, mocked handoff validation and the unsubmitted calculator plan. Seven developer provider cards reuse the existing executor/data architecture; DeepSeek remains sole senior and paid access stays disabled. All four expanded routes remain off pending credentials/evidence and explicit owner routing activation. Existing sections above are historical where superseded.
