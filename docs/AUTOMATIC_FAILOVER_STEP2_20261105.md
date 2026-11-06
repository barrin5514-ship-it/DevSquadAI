# Step 2 — Automatic agent failover

Started November 5; final verification completed November 6, 2026 (America/New_York). Branch: `feature/workspace-ui-redesign`, base `3616a438f45d405ffe3534c1ba96d80584c082be`. Status: **PARTIALLY VERIFIED**. No live AI/provider request or external webhook was sent. No commit, push, merge or deployment.

## Existing integration: verified locally, external connection unverified

Inspected the existing `webhook-out`, `github-handoff`, `messenger-loop` and `big-three` services before implementation. A private persisted Zapier Catch Hook is configured and delivery is enabled. The read-only GitHub handoff reader is configured, with owner-confirmed read-only status. Neither URL nor token is recorded here.

Historical messenger job `b5e4176a-ad93-4614-8980-e07ab63bf320` has three delivered-report records, two received prompts and a finished third round. These historical setup/mock records do not establish real AI execution or current external connectivity. The legacy dispatch endpoints are retired with HTTP 410. The current Studio worker pipeline uses internal orchestration, not Zapier; its automatic handoffs now extend that existing runner. No legacy route was reactivated and no configuration was cleared. Connecting the active Studio pipeline to the old external mailbox remains separate work; this report does not claim Zapier was restored to that pipeline.

## Implemented

- Existing priority order: Codex Personal → Codex School → Claude Code → DeepSeek. A bounded search chooses the first eligible, approved, independent worker and records the actual selection.
- Task-specific preapproval in **Team → Automatic handoffs…**. Saved permissions bind to actual chat/project IDs and a hash of the selected root, using the existing dashboard capability and version checks. Saving never runs an agent.
- Old jobs retain their existing Codex-only quota fallback. No existing job was silently opted into Claude or paid fallback.
- Fresh native-login checks use each dedicated Codex profile and Claude's subscription login. Login verification does not prove remaining quota. Account setup was not repeated and tokens were not read or copied.
- Confirmed quota/auth/outage/connection errors and safely stopped timeouts can hand off. Unknown process or remote API outcomes pause with the folder lock retained; sandbox failures do not trigger a workaround.
- Preserved phase, files, conversation context, test evidence, approvals and execution history. Completed Builder work is not restarted when a Tester changes. Persisted unavailable/attempted sets prevent ping-pong and duplicate fallback loops within a run.
- Codex Personal and School count as one reviewer family. If all remaining choices conflict with authorship, the task pauses rather than self-reviewing.
- Durable notifications contain time, reason, from/to worker, phase and checkpoint hash. No fabricated tool activity or streaming is introduced.

## Paid boundary

Any DeepSeek turn in an explicitly enabled automatic-handoff workflow requires its matching task budget, official base/model/key configuration, valid existing price lease and recorded prepaid balance no older than five minutes. Checks do not refresh the balance over HTTP. No production budget/grant was created.

Existing policy/reservation tables were reused: no schema migration. Before edits, the supported backup command was run:

```powershell
node scripts/backup.js
```

Backup: `backups/backup-1793936324268-bdb7f974-0d07-4fc0-a9ee-e568260620cd.sqlite` (ignored).

Reservations use a conservative UTF-8 request-size bound plus instruction overhead and the approved maximum output, at the current configured rates. Transactions enforce lifetime held totals, uniqueness by execution, remaining task budget, recorded balance and any positive legacy request/daily/total controls. Completed and unknown reservations remain held. Concurrent attempts cannot reuse the same allowance. The bounded adapter method receives the approved output limit; there are no hidden transport retries.

This is **application-enforced conservative reservation**, not a guaranteed provider-side dollar ceiling. Token estimates are not exact bills. Known token cost is recorded; unknown usage is never zero. The older owner-started, unscoped workflow remains as previously configured; this change does not globally impose a budget on it or enable paid routing.

## Automated tests

All tests ran serially with a 128 MiB JavaScript heap per test process. Fixtures use disposable databases/folders and mocked providers.

```powershell
node --max-old-space-size=128 --test --test-concurrency=1 tests/studio-failover.test.js tests/studio-roles.test.js tests/roles-ui.test.js tests/project-studio.test.js tests/conversation-ui.test.js tests/studio-protocol.test.js
node --max-old-space-size=128 scripts/test-serial.js
```

- Targeted: **70 passed, 0 failed, 0 skipped**.
- Final full suite with normal Windows access: **518 passed, 0 failed, 0 cancelled, 0 skipped**, 228.854 seconds.
- An earlier full run found a missing legacy usage notice: corrected the display fallback while retaining scoped notices. A subsequent restricted-shell run reported 513/518 with five Windows OS access failures (process inspection/fixture cleanup and filesystem pinning). Only its identified disposable fixture was cleaned up. The final normal-Windows run above passed these same tests; no permission or sandbox configuration was changed and no test was weakened.

Sixteen new tests cover A–H plus scope/version/expiry, preflight continuity, budget concurrency, retained unknown reservations, stale price/balance, adapter output binding, no unsupported fallback and API capability protection. A–H are simulated provider conditions, not live account-availability evidence.

Evidence: `docs/verification/step2-failover-targeted-20261105.txt` and `step2-failover-full-20261105.txt`.

## Running-app and Chrome evidence

```powershell
node scripts/verify-studio-failover.js "C:\Users\barri\.codex\visualizations\2026\10\20\01a15721-9f6d-7e52-9209-7d64d043b76c\failover-step2-20261105"
```

**11 checks passed** using the real application, a separate temporary database, Chrome/Playwright, local Node worker simulations and the real isolated test runner. The browser saved fixture-only handoff permission, sent fixture-only work, observed Personal quota failure → School Tester without repeating Builder, checked exact project/checkpoint, ran **8 actual isolated Node tests**, received a separately bound simulated review, and verified one job/four attempts/one handoff/no lock left. Restart retained history, test evidence and `awaiting_owner`. The reviewer inspected recorded evidence, did not execute tests. No owner acceptance was performed. No browser JavaScript errors.

The first verification script attempt clicked Send before the settings save guard cleared; the verifier was corrected to wait for the save completion. This was not a worker failure.

Screenshots (local only):
- `C:\Users\barri\.codex\visualizations\2026\10\20\01a15721-9f6d-7e52-9209-7d64d043b76c\failover-step2-20261105\school-handoff-checkpoint.png`
- Same folder: `verified-local-failover-after-restart.png`, `main-app-readonly-permissions.png`.

The regular backend was restarted only after authoritative lease and exact executable/script identity checks confirmed it was idle. Other processes were untouched. A read-only Chrome check on the regular app opened Team → Automatic handoffs, with all POSTs blocked and no save/Send. Its endpoint returned HTTP 200; the existing legacy two-Codex policy and zero production task budgets were confirmed. A first navigation used a mismatched project/chat URL; verifying the actual relationship corrected the smoke-test URL without modifying data. Browser evidence is `docs/verification/step2-main-browser-20261105.json`.

Production still has **13 projects, 14 sessions, Studio event high-water mark 93, zero task budgets**, and the original Counter lock `fc00a59b-c31e-4b93-b448-35ebbc0de048`. Original Counter, Friday task, accounts, routing, business records and previous uncommitted work are preserved. No Counter Test 2 or other live work started.

## Changed files and remaining work

New service `src/services/studio-failover.js`; targeted integration in `project-studio`, `studio-profile-failover`, `studio-workers`, `studio-recovery`, `studio-usage`, `native-diagnostics`, console routes and dashboard roles/conversation/live-workspace views. New regression file `tests/studio-failover.test.js`, functional verifier `scripts/verify-studio-failover.js`, this report, verification evidence and the standing manual prompt log. Earlier uncommitted composer changes remain preserved.

**Unverified:** live provider failover, current provider quota, current external Zapier delivery and live DeepSeek paid fallback. Broader main-app fallback still needs the owner's task-specific preapproval; DeepSeek additionally needs current price/balance evidence and budget. No account-health check can guarantee a later request succeeds.

Final diff check passed. Local credential-value matching across the 27 changed/untracked source and evidence files found no configured secret values or actual Catch Hook URLs; tracked files contain no `.env`, `node_modules`, data directory or SQLite database. This is a current-working-tree check, not a full historical secret audit.

**Next:** ready to inspect Step 3 under separate owner authorization. The unresolved original Counter lock remains a Step 3 item; it was not repaired or cleared here. Step 4 must wait. Step 2 is locally functionally verified but remains **PARTIALLY VERIFIED** overall because no real AI failover was authorized or performed.
