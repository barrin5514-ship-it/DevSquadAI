# Big Three — approved BMAD plan, 2026-11-02

## Brief
Reuse the existing local hub. Connect DeepSeek, Codex and Claude Code for a small hello check; prepare rotating job roles and basic durable failover with mocks. No autonomous repository worker is activated by this change.

## Requirements
- Default roles: DeepSeek builds, Codex tests, Claude Code reviews. The owner may change or rotate roles per shared job.
- Every builder of a step, including partial contributors, is excluded from reviewing it. Both Codex profiles count as the same identity.
- Save progress and append-only history before failover. Limits, quota and expired logins may trigger a different available worker. Unknown termination pauses safely. Repeated timeouts require evidence the previous worker stopped.
- Paid DeepSeek requests still require their existing explicit authorization and budgets. Role assignment never grants spending permission.
- Green means a completed actual hello response, not installation, login or a mock result. No credential contents enter logs or the browser.
- Webhook URL starts empty; no report leaves the computer until an owner supplies and enables an allowed destination. No retries.
- Preserve business data and owner acceptance. Run serial tests and save their output here.

## Architecture
Extend `BigThreeCoordinator` and its existing immutable SQLite history. Store roles inside versioned state, with separate build/test/review phases and contributor identity. Add owner-protected role endpoints to the existing same-origin console. Production job execution remains blocked until isolated worker connectors exist; simulated workers prove the scheduling rules without spending money.

Use a separate hello-only CLI connector: fixed executable, fixed prompt, empty temporary working directory, native CLI login, no application credentials in its environment, bounded time/output, and tools disabled. It cannot execute a job or repository tests. DeepSeek hello remains blocked pending a specific cost approval; the existing paid pipeline is preserved.

## Stories and done checks
1. Inventory, backup, baseline, setup instructions. **Done:** key presence only inspected; both native CLI logins verified. Baseline: 243/249 pass; 6 legacy mock tests use dates beyond retired Laguna's expiry. Backup: `backup-1793671520425-c5656656-bc4b-473e-8298-763a16aa771e.sqlite`.
2. Rotating roles, mock failover and bounded connection adapters. Prove saved progress, independence, locking, expiry/limits, clean pause and no paid dispatch.
3. Dashboard role selectors, Rotate roles and Test all 3, with real/simulated/not-run labels.
4. Empty webhook setting plus restricted report sender, verified using a mock transport only.
5. Full serial tests, visual verification, secret review, scoped commit and push if a repository destination is available.

## Current connections (not fresh inference verification)
DeepSeek adapter/key/model exists; configured model `deepseek-flash`. Codex 0.161.0: ChatGPT login. Claude Code 2.1.312: logged in using claude.ai / Pro. Neither CLI previously had a working hub connector. Gemini/Groq/Mistral/NVIDIA/OpenRouter settings and adapters are retained as parked backups. Cloudflare/Hugging Face have no saved keys. MiniMax/Cerebras stay excluded.

## Owner setup
DeepSeek: existing `DEEPSEEK_API_KEY` remains in local ignored `.env`. Manage keys at https://platform.deepseek.com/api_keys . Never send it in chat. Current model and peak price must be checked before any paid dispatch.

Codex: use `codex login` in your own terminal if login expires. No OpenAI API key is required for the verified ChatGPT login. Personal/school profiles remain unmapped unless the owner provides their separate secure configuration locations; configuration profiles do not by themselves prove separate authenticated accounts.

Claude Code: use `claude auth login` in your own terminal if needed. Keep its native subscription login; do not copy OAuth credentials into `.env` or the dashboard.

Git: this checkout has no remote. Owner must provide the intended repository URL before push. Preserve all previous local changes; do not reset or clean.

## Official references checked 2026-11-02
- https://learn.chatgpt.com/docs/non-interactive-mode
- https://code.claude.com/docs/en/cli-reference
- https://api-docs.deepseek.com/quick_start/pricing/
- https://api-docs.deepseek.com/guides/thinking_mode/
- https://docs.bmad-method.org/plan/break-work-into-stories-and-track-it/

No installed BMAD workflow package was located; the owner-approved planning stages are followed manually. No BMAD configuration is modified.
