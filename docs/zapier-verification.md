# Zapier messenger verification — 2026-11-02

## Actual results

- Supported SQLite backup taken before migration: `backups/backup-1793678256477-1465e722-9453-4e3e-898b-215f7d83a930.sqlite` (ignored by Git).
- Baseline: **275/275** passed, serial execution, 135.334 seconds (`zapier-baseline-tests.txt`).
- Final full suite: **296/296** passed, zero failed/skipped/cancelled, 63.210 seconds (`zapier-final-tests.txt`). Focused messenger/UI suite: **23/23** passed (`zapier-focused-tests.txt`).
- Full mock loop: builder → cleaned report → matching GitHub file → tester → next file → independent reviewer. **3 mock workers, 3 mock webhook deliveries, 2 mock GitHub reads**. Also proved the same sequence using background scheduling, without manual pickup.
- Failover: simulated DeepSeek usage limit → Codex continues saved partial work → Claude independently reviews. Per-job rotation and no-self-review remain enforced. No task was accepted by the loop.
- Rejected wrong job/round/role, duplicate and concurrent pickups, invalid Git blob/JSON, known credentials, and unauthorized dashboard mutations. Stop fences late worker/read results. Expired waits pause; unknown webhook outcomes are retained and never resent. Restart requires explicit resume of the original unexpired wait.
- **Zero live agent jobs, provider requests, real webhook deliveries, real GitHub pickup requests or Zapier AI actions.** Setup sample was tested with mocks only.

## Regular application

Restarted only the identified Dev Squad server, preserving its consumed hello scope; applied additive migration010. Integrity check: `ok`. Read-only hash comparison confirmed all **41 original tables** unchanged (runtime lease and migration ledger excluded); `.env` unchanged. No messenger jobs were added to the main database. Existing connection results remain visible.

`http://127.0.0.1:3000/team` and `/team/zapier-setup` returned HTTP200. Browser visual inspection of AI Team confirmed empty/off webhook, setup guide link, missing read-only-token notice, and an explicit warning that real coding workers are not enabled. No test/start/send/accept control was clicked. Mock UI regression checks cover default3 rounds/300seconds and Stop dispatch while the page is busy; these are not claims of a real worker run.

## Remaining setup and limits

- Owner creates a repository-specific fine-grained token with Contents read-only, enters it privately in `.env`, then confirms the permissions. Application performs only its fixed Contents GET; a successful GET cannot independently establish absence of write permissions.
- Owner builds the draft Zap using `zapier-setup.md`, including Get File Contents for the latest SHA before Create or Update File. The inactive mailbox is on `handoffs`, separate from `master`. No Zapier account configuration or purchase was performed.
- Published Webhooks/AI multi-step use requires a qualifying paid plan/trial. The local mock proof costs nothing. Standard AI + file read + file write budgets up to9 action tasks for3 reports; verify actual plan and overage rules before activation.
- General coding workers/isolation remain unimplemented and disabled. A hello connector is not a repository worker. Implement/approve those separately before a live3-round job, plus exact task, repository, commands, report-sharing consent, and task-specific DeepSeek quote/cap. Global paid routing and owner acceptance remain unchanged.
- Cleaning covers known credentials, common labelled/token formats, paths and addresses. It is a defence, not proof that arbitrary unlabelled private information can never occur. Review the proposed pilot data before sharing it externally.

## Corrections during verification

The first focused run was blocked by sandbox loopback denial (`EACCES`) in a local HTTP test, not an application assertion. Re-ran once with authorized local loopback access:23/23 passed. A browser URL lookup could not attach; selecting the inventoried existing tab succeeded. No live model or webhook call was retried.

Unrelated dirty `PROVIDER_SETUP.md` and historical untracked root reports were preserved and excluded from this change. No reset, clean, history rewrite, routing change, spending change, or other project modification.
