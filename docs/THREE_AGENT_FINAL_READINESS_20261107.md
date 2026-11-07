# Three-agent execution readiness

**Verdict: PARTIALLY READY — SPECIFIC BLOCKERS.** The Expense Tracker workflow remains inactive. Production pricing and balance need an owner-triggered refresh, the selected Codex profile needs included-usage confirmation, and the project still requires owner-controlled write permission.

## Audit findings and repairs

| Audit finding | Repair or remaining requirement |
|---|---|
| Team approval was unavailable in the dashboard | **Three-agent team → Approve a bounded team run** displays the exact project, saved session, roles, model selection, file fingerprint, estimated reservation, hard local limits and current blockers. The confirmation saves approval. Send remains a separate action. |
| Approval did not bind files | New team approvals bind the deterministic guarded project fingerprint, saved execution inputs, role assignments, provider configuration and execution limits. Recheck at Send and before dispatch. After Builder and Tester, dispatch checks the fingerprints of the saved handoffs. Prior approvals retain their stored form and Builder-only mode is preserved. |
| DeepSeek funding evidence was stale | A separate owner-triggered, read-only check uses the official pricing page and the existing model and balance adapter. It atomically records verified model, rates, source, timestamp and usable USD balance. It requires the configured rates to match the published rates. The new evidence expires after five minutes. Existing balance reservation and spending checks still apply. |
| Codex login did not prove available usage | Codex Personal native ChatGPT login was verified. The official account rate-limit call returned a weekly usage window on November 7, 2026. Exact remaining invocations are **UNKNOWN**. The owner must confirm included allowance in the approval panel. |
| Expense Tracker remained read-only | This is intentional. The project’s existing access setting is disabled. The managed workspace, local Git root and protected instructions passed verification. There is no Expense execution or lock, and the unrelated historical lock remains. |

Public DeepSeek rates verified on November 7 were USD 0.30 per million uncached peak input tokens and USD 1.20 per million peak output tokens. The production price lease and saved balance remain stale. The old paid-balance route is retired. The new read-only check requires the owner's explicit dashboard action and does not turn on legacy paid execution. [Official DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/)

The exact Nemotron route passed a separate read-only catalog and account check. It must be checked again in the running application before approval. The Codex rate-limit query was limited to the account interface and issued zero model turns. [Official Codex account rate limits](https://learn.chatgpt.com/docs/app-server#6-rate-limits-chatgpt)

## Pending owner actions and proposed scope

Use the existing **Dev Squad Three-Agent Test** Expense Tracker session. Use **Projects → Project options → Enable agent changes** for this exact workspace. Choose the temporary roles below, save the roles, and keep automatic fallback off. In the session open **Three-agent team → Approve a bounded team run**, then use the separate read-only DeepSeek check. Refresh Nemotron access in **Agent team**. Confirm included Codex allowance only after checking the dedicated Personal profile. Keep the scope inactive until separately authorized.

| Temporary role | Model and limits |
|---|---|
| Builder | DeepSeek `deepseek-flash`. One generation POST, 90 seconds, 4,096 output tokens, 24,000 serialized input bytes, USD 0.02 local task cap. Conservative reservation estimate USD 0.013344 at verified peak rates. |
| Tester | Codex Personal native ChatGPT subscription default. One invocation, five minutes, 32 KiB captured output. The selected native model ID is not reported by the account checks. |
| Reviewer | `nvidia/nemotron-3.5-super-vl:free`. One request, 60 seconds, 2,048 output tokens, reasoning disabled, zero price and exact returned model required. |

The scope allows three worker calls, one per role, for 30 minutes after approval. Failed mandatory gates stop the run, with no automatic fallback, retries or correction calls. The Reviewer receives the current artifacts and independent execution evidence. The owner retains final acceptance.

## Verification

- Focused baseline passed 40/40. The repaired approval, worker, budget and funding tests passed 67/67 before final candidate verification.
- Production read-only inspection confirmed the Expense folder fingerprint and its protected instructions, zero executions, unchanged assignments and the retained historical lock. The new schema migration is for the verification receipt. Production was not migrated during these checks.
- Chrome passed 10/10 checks using the regular dashboard and a disposable workspace. Opening the panel and refreshing read-only funding did not arm or dispatch work. Owner confirmation armed the bound scope, and a separate Send ran three simulated worker turns. The real Windows isolation runner executed two independent Node tests. The simulated Reviewer received the resulting artifacts and evidence. Reopening preserved the review, consumed authorization and owner acceptance gate.
- The first full serial run passed 638/640. Both failures asserted the old migration count. The corrected foundation file passed 22/22 and now asserts the new table. The first Chrome attempt found the panel was not mounted in the drawer. The mount was repaired, Chrome passed on recheck, and the UI regression suite passed 28/28. The final full run covers both corrections.
- The final disposable checkout passed **641/641** with `node scripts/test-serial.js`, zero failures, cancellations or skips. It included the real Windows isolated timeout and Stop regression.

## Git verification

The repair commit `8b6298c68a877385c820141a7612a22fff708f25` includes the tested source, additive migration and regression tests. The staged scan found no credential matches, and every staged file matched the tested candidate. A normal push to `feature/workspace-ui-redesign` succeeded with certificate and revocation checks enabled. The remote hash matched the repair commit before this documentation checkpoint. The audited starting commit was `df9b99c73b4d3ad276e02d4dc7860adff43b6140`. [GitHub repair commit](https://github.com/barrin5514-ship-it/DevSquadAI/commit/8b6298c68a877385c820141a7612a22fff708f25)

## Remaining blockers

- **P1:** The running production service needs to load the tested repair and its additive migration through the normal maintenance process. The owner must request the fresh read-only DeepSeek check and refresh Nemotron access.
- **P1:** The owner must explicitly enable agent changes on the selected project, save the temporary assignments, confirm included Codex allowance, and authorize the exact bounded run. No run approval, role change or write access was activated for Expense Tracker.
- Legacy project adoption and unrelated shared-job paths are outside this repair.
