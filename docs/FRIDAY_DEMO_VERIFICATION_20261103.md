# Friday demo preparation — verified limits

## Outcome: PARTLY PREPARED / LIVE RUN BLOCKED

No live worker, model generation, authenticated provider GET, paid request, Zapier trigger or publication occurred. The reported fake Zap success is the owner's evidence; it was not repeated. A transport implementation and mock tests do not certify an isolated live worker.

## Main application records

- Dashboard: http://127.0.0.1:3000/team . Backend HTTP200 after supported restart.
- Project: **DEMO ONLY · Friday to-do app · 2026-11-06** (`5b67bb7d-6d35-46c4-bb60-fb7257219631`).
- Task: **Build a simple to-do app with tests.** (`34076590-93a0-496d-9238-acd8ccb0502b`), **PENDING**.
- Shared job: `b5e4176a-ad93-4614-8980-e07ab63bf320`, **ready but authorization/isolation blocked**. No round started.
- Initial roles: DeepSeek Builder, Codex personal Tester, Claude Code Reviewer. Maximum3 rounds;300-second wait.
- Folder: `C:\Users\barri\OneDrive\Desktop\Next Chapter Projects\DevSquadAI\workspaces\5b67bb7d-6d35-46c4-bb60-fb7257219631` (ignored storage, separate Git repository, no remote).
- Demo branch: `demo/friday-todo-20261106`; pinned seed commit: `57e0ef22e96349861edf4da2f9ae3529e225ef3f`.
- **Zero main-database worker attempts and Builder grants.** Webhook empty/off. Preparing the plan did not accept work, enable global routing, start approval clocks or change budgets.
- Read-only original-row hash comparison: all pre-existing rows preserved, `.env` unchanged, SQLite integrity`ok`. Sanitized evidence: `friday-demo-preparation-results.json`.
- Supported backup before additive migration011: `backups/backup-1793684721227-7d44e760-7fa9-4bbe-bd30-e1925f96c30d.sqlite`. The backup/database/demo checkout are excluded from Git.

## Implemented and tested locally

ID/repository/branch/base/hash binding; bounded immutable shell/test manifest; one allowlisted Builder source file; per-role/worker durable attempt slot; original/revised source provenance; native CLI fixed-argument/stdin transport;32KiB output cap and90-second time limit; sanitized error categories; no model retry; unknown process/timeout outcomes pause instead of unsafe failover. Packet prose never authorizes spending or acceptance.

DeepSeek's new **inactive-until-startup** Builder scope uses its existing official adapter and spending ledger. It binds the exact proposed body, task/job/database/key fingerprint, model, repository/base, price lease and real approval expiration. It permits at most one model GET, one fresh balance GET and one POST, with the full$0.01 reserved atomically before POST. Concurrent/duplicate/expired/altered scopes cannot dispatch; unknown outcomes retain the reservation. Existing lower budgets remain effective. No active scope was created on the main database.

The full mock messenger flow completed with DeepSeek-shaped Builder output, Codex-shaped Tester output, Claude-shaped Reviewer output,3 mock reports and2 prompt pickups. A separate local process actually ran9 independent tests on the **reviewed hand-written fixture**; these are not claims about a live-generated artifact. Production generated-code testing remains blocked until isolation is verified. Existing mock failover and no-self-review regressions remain in the full suite.

Baseline: **296/296** passed, serial,73.152s. Full implementation suite: **310/310** passed,0failed/skipped/cancelled,280.526s, serial with128MiB heap. Final targeted post-check results are saved in `friday-worker-postcheck-tests.txt`; this rechecks approved-price arithmetic and provenance preservation after a late checkpoint error. Syntax/diff and staged secret checks are performed before commit. Windows available memory declined from2.36GiB to0.65GiB; no apps were closed or memory settings changed.

## Verified connections versus unverified execution

Local non-generation checks: Codex0.161.0, native ChatGPT login; Claude Code2.1.312, native claude.ai/Pro login. Authentication category is **VERIFIED**, remaining included allowance and absence of paid extra usage are **UNVERIFIED**. No tokens were extracted or copied. A successful earlier hello is not a live repository-worker test.

Codex's native Windows sandbox helper returned **`helper_unknown_error: setup refresh had errors`**. A request for its help text unexpectedly invoked this setup-refresh path; it was not retried or bypassed. No successful isolation probe occurred. Do not claim no native helper side effect can have occurred; this inspection did not independently audit helper state. No deliberate install, authentication change, ACL/firewall/mount change or WSL startup was performed.

The production `DemoBoundary` deliberately returns not-ready and refuses launch/tests. CLI transport is implemented but has no verified production isolation launcher; this is a **BLOCKER**, not an owner-toggle to turn off protection. The new paid capability cannot override it. A separate demo-only boundary with forbidden-file/network/cleanup tests and fresh scoped native-usage approval must be implemented/verified before any live dispatch. Do not repurpose personal Ubuntu or copy host login tokens as a shortcut.

Browser attachment failed, so this turn's dashboard evidence is **API-only**, not a visual verification. Owner can refresh AI Team and inspect the Friday demo blocker, ready loop/role assignments and disabled Start control. Do not press the old hello/sample controls as a workaround.

The regular business task artifact/review import path also needs proof before routine completion. Shared reports do not supply an application-approved independent review; the old mandatory review and owner acceptance gates remain unchanged. In particular, never ask DeepSeek to approve its own Builder output or fabricate an approved review to finish this demo.

## Proposal and next decision

See `FRIDAY_DEMO_PROPOSAL_20261103.md` for the exact cost arithmetic, bound payload, one-shot limits, native account checks and owner-only Zap publication/start sequence. **Keep the Zap unpublished now.** Resolve the isolated worker/cleanup and artifact-review integration blockers first; then obtain the specific paid/included-usage/report-sharing approval and refresh pricing. A money-only approval does not certify safety or unblock the current launcher.

Future ideas were recorded only in `FUTURE_IDEAS.md`. No future feature was built. Other providers, existing source/artifacts/reviews/checkpoints/acceptance rules and unrelated dirty work were preserved.

## Genuine corrections

The first mock connector test incorrectly supplied Claude JSON to the Codex parser; corrected the fixture to Codex JSONL. Initial scoped-usage tests caught missing execution/provider foreign-key setup; corrected the local receipt setup without sending any real request. An expired fixture's approval interval was invalid; corrected the test to separately exercise expiry with mock time. Cost calculation now uses the scope's validated price snapshot rather than unrelated optional environment prices. A late-checkpoint regression verifies source provenance is retained. Codex login status is written to stderr; both streams were privately parsed to establish category without displaying them. No failed model call was retried.

## Final bounded checks

Final post-check:14/15 passed; the one failure was a5-second local Git preparation timeout under memory pressure. Raised only the local Git preparation bound to20seconds (worker90-second limits unchanged). A bounded rerun of that failure plus CLI parsing/pricing tests passed3/3 in2.183s. No full suite repeated after these small corrections. The hub test command now explicitly enumerates its24 first-party test files, avoiding unfinished tests in ignored demo workspaces; --list verified scope without executing them. Final task remainsPENDING; no active grant or live attempt.
