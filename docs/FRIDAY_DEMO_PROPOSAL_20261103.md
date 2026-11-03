# Friday demo proposal — 6 November 2026

**Prepared, not authorized to run.** No provider generation, paid account check, native agent job, Zapier trigger or publication is authorized by this file.

## Small, fixed job

Build a simple browser to-do app with tests. The locally supplied screen adds, completes and removes tasks. The builder returns only `src/todo.js`: an in-memory list with trimmed text, stable unique IDs, defensive copies and rejected invalid inputs. No imports, dependencies, network, storage or command execution are needed. Nine independent owner-provided tests cover these requirements. The initial module deliberately throws “Builder has not run”; the prepared project is not a completed app.

Separate demo repository/branch: `demo/friday-todo-20261106`. No remote. The hub repository is never the workers' working directory. The durable database binding pins actual job/task IDs, folder, branch, base revision and seed-file hashes. The IDs/folder are recorded in `FRIDAY_DEMO_VERIFICATION_20261103.md` after local preparation. Original source is retained in the initial demo commit; each successful worker receipt retains prior/new bytes and hashes. No reset or clean.

Rotation starts with DeepSeek Builder → Codex Tester → Claude Reviewer. Maximum3 rounds,5-minute prompt wait; no model retries. Existing no-self-review, durable handoff, task-lock and owner-acceptance rules remain. A report is not proof of test execution. No work is accepted automatically.

## Exact proposed DeepSeek request and estimate

`docs/friday-deepseek-request.json` is the complete proposed request, produced from `src/services/demo-spec.js`. Serialized-payload SHA256:

`92a90fc18d4fb53445cab45ddfaf0d7185227e60cb379b6a247106ff07dd2ff4`

- Model `deepseek-flash`; official host `api.deepseek.com`; thinking explicitly disabled; JSON object output; no tools, search or fetch.
- One generation POST, maximum1024 output tokens,90-second worker limit, no retry/fallback. Propose at most one model GET and one fresh USD-balance GET as part of that separately approved scope.
- Message text:855 UTF-8 bytes. Input estimate285 tokens (bytes/3, not a tokenizer measurement). Expected output650 tokens.
- Highest published uncached input rate: **$0.30/1M**; output **$1.20/1M**. Expected arithmetic: `(285×0.30 +650×1.20)/1,000,000 = $0.0008655`.
- Conservative local reservation estimate:4951 input tokens (message bytes+4096 framing allowance),1024 output → **$0.002715** after upward micro-dollar rounding.
- Proposed one-task cap: **$0.01**. This is application-enforced reservation accounting, not a guaranteed provider-side dollar ceiling. An estimated input bound is not a hard tokenizer guarantee. Actual invoice/cost is unknown until usage returns; record supplied counts and calculated price separately.
- A fresh approved startup scope binds task/job/database identity, key fingerprint, repository/base, exact payload hash, model, request counts, price lease and expiration. Approval lasts at most30 minutes from the actual owner approval, or earlier price-lease expiry. No clock starts during preparation.
- The full$0.01 is atomically reserved in the existing spending ledger before POST. Concurrent/repeated calls cannot replenish the unique HTTP slots. Unknown outcomes retain reservations. Existing lower request/day/lifetime limits still block dispatch; they are not raised by this proposal. No global paid routing is enabled.

Public pricing evidence checked2026-11-03; refresh before a later approved dispatch: https://api-docs.deepseek.com/quick_start/pricing/ . Official model page lists the exact model and separate peak/off-peak rates. This estimate uses the higher rates, with no cache discount. Thinking is disabled; this is not a reasoning-mode quote. Model/account access and balance will only be checked after specific authorization.

## Blocking safety checks — do not publish/start yet

1. **Codex isolation is BLOCKED.** Installed native Windows sandbox helper returned `helper_unknown_error: setup refresh had errors`. Default read-only mode does not establish the requested restriction against reading unrelated folders/credentials. A folder or branch alone is not security isolation. No bypass, WSL startup, installation, account, ACL or firewall change was made. A dedicated Windows/WSL/VM boundary needs its own approved setup and harmless-decoy denial tests. The production boundary currently refuses all native launches and generated-test execution.
2. **Native allowance is UNVERIFIED.** Installed Codex0.161.0 uses native ChatGPT login; Claude2.1.312 uses claude.ai/Pro. Those checks prove login category only. Owner must check current usage and disable/unselect additional-credit/API/extra-usage billing before permitting one bounded call each. Do not assume subscription usage is unlimited or guarantees no extra charges.
3. **Regular task acceptance remains separate.** Shared worker reports/receipts do not create an approved independent application review or complete/accept the business task. Existing mandatory review gates remain unchanged. A live pilot must demonstrate the existing artifact/review import path before claiming routine workflow readiness; do not mark a worker's prose as a completed test or accepted artifact.

Official references: https://learn.chatgpt.com/docs/sandboxing , https://learn.chatgpt.com/docs/non-interactive-mode , https://code.claude.com/docs/en/cli-reference . CLI transport uses native login, fixed argument arrays, bounded stdin/stdout and time, no inherited API billing overrides; its process wrapper is not itself a sandbox. CLI output cap is32KiB bytes; it is not a guaranteed model-token or subscription-cost cap. Timeouts/cancellation remain unknown until process-tree cleanup is proven and therefore do not trigger unsafe failover.

## Owner's sequence after blockers are resolved

1. Approve the chosen isolation setup and pass its filesystem/network/process-cleanup tests. Do not run agents merely to see whether isolation works.
2. Confirm native included allowance/no extra charges for exactly one Codex Tester and one Claude Reviewer invocation. School profile remains unmapped; no alternate login is fabricated.
3. Approve the exact bound demo task and DeepSeek payload above: one model GET, one balance GET, one POST,1024 output tokens,90seconds,no retry/fallback,$0.01 local cap, fresh30-minute approval/price lease. Any changed payload/cap requires a new proposal.
4. Approve sending the cleaned demo reports to your Zapier AI and private `handoffs` branch; confirm its plan/task allowance and zero-unapproved-overage controls. The unpublished fake setup success is owner-reported, not re-triggered here. Keep the Zap unpublished while blockers remain.
5. Only after the local worker/grant preflight is green, publish your Zap yourself. Then enter/enable the hook under **AI Team → Webhook out** for that backend session and select **Start approved messenger loop** for this exact prepared job. Do not use “Test all3” or “Send one fake setup report” as the demo start button.
6. Watch the3 round receipts; use Stop if needed. If waiting expires, it pauses. Review actual test/review evidence, and retain final acceptance yourself. No automatic acceptance, merge, deployment or code push from the demo.
