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

## Conditional approval recheck — 2026-11-03

Step1 FAIL / unresolved. Read-only diagnostics found Windows error32 (sharing violation) around node_repl.exe runtime validation in the saved sandbox log. Corrected the earlier CLI syntax: this installed CLI uses `codex sandbox`, not `codex sandbox windows`. Reset only this chat's temporary JavaScript kernel, not other helper processes, applications or authentication. One correctly formed non-model echo in the prepared demo, using the existing managed workspace profile, failed with exit1 and setup-refresh error in1064ms (20-second bound, no timeout). This did not verify filesystem isolation. The process stderr did not independently supply error32 on this latest attempt; saved diagnostic evidence and current failure are distinguished.

Owner explicitly required stop on failure. Therefore step2 artifact/review mock verification and step3 current CLI account/allowance checks were NOT RUN in this attempt. No grant/approval clock was created, no model/provider request or Zapier action occurred, and no sandbox policy, credentials, application code or database was changed. Conditional paid/included-call approval remains INACTIVE because all prerequisites did not pass.

Next diagnostic step: owner saves work, fully quits/reopens Codex desktop to release possible runtime-file locks. That is a recommendation, not a proven fix. Do not kill unidentified helper processes, switch to weaker sandboxing, disable protections or publish/start the Zap as a workaround. Public official reference: https://learn.chatgpt.com/docs/windows/windows-sandbox . Exact sanitized probe result is in CODEX_SANDBOX_RECHECK_20261103.json.

## Post-PC-reboot recheck — 2026-11-03

Owner reported restarting the PC and authorized exactly one sandbox check, with continuation conditional on success. Available RAM1.76GiB. One non-model command in the actual pinned demo folder failed exit1/setup-refresh in1233ms (20s bound, no timeout). Latest log tail again identifies runtime read/execute validation failure, Windows error32 and node_repl.exe. This is fresh log evidence, distinct from the shorter CLI stderr which did not expose the OS code. No sandbox permissions or settings were weakened, and no helper process was killed.

Step1 FAIL. Stopped: step2 end-to-end artifact/review mocks and step3 current native accounts/included allowance were NOT RUN. Conditional spending/native-call approval remains INACTIVE; no grant or approval clock started, no agent/model/provider call, Zapier trigger/publication, database or application-code change. Existing demo remains prepared only.

Simplest next options: update/repair the official Codex desktop and CLI installation as a matched vendor-supported runtime, then arrange a new single check; or provide the sanitized error32/node_repl runtime-validation report to OpenAI support. Neither is claimed as a proven fix. Do not repeat PC restarts indefinitely, disable sandboxing, use Full Access or replace the boundary with a folder-only promise. Official Windows troubleshooting: https://learn.chatgpt.com/docs/windows/windows-sandbox .

## One-batch test and usage audit — 2026-11-03

Owner authorized serial tests, existing demo mock checks, native included-usage verification, safe live preparation without starting/publishing, and commit/push. Native Node version check is accepted as command-startup evidence only, not proof of worker read/write/network isolation.

Tests:307/307 first-party tests passed serially (183.962s,128MiB heap); found the explicit runner omitted the existing4 offline pilot checks. Restored that explicit first-party file while still excluding ignored disposable workspaces. Those4/4 passed separately (0.541s), total311/311,0fail/skip/cancel. Runner --list confirms25 first-party files. No broad repeated suite. Three-round worker mock, source provenance,9 independent tests on reviewed local fixture, concurrent/unknown paid reservations, rotation/failover/no-self-review and existing application review/acceptance tests passed. No live-generated artifact or completed business review was inferred from mock worker reports.

Read-only native account audit, no model calls: Codex app-server account/read (refreshTokenfalse) and account/rateLimits/read reported native ChatGPT/team, primary12%used and secondary10%used, no available credit balance (hasCreditsfalse,unlimitedfalse). Paid-overflow-disabled status is not established by that response. Claude native auth/status reported claude.ai/Pro but supplies neither allowance nor extra-usage settings. Browser usage page redirected to reauthentication; no credentials entered or account settings changed. Combined included-only/no-extra-charges verification NOT PASSED. Official sources: https://learn.chatgpt.com/docs/app-server , https://code.claude.com/docs/en/costs , https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans .

Read-only database verification: original demo jobready/taskPENDING,0Buildergrants,0workerattempts,integrityok. Production DemoBoundary is still a deliberately disabled placeholder, not a certified sandboxed launcher. Regular artifact/review import remains unproven; passing mocks do not supply that integration. No activation was made, no approval clock started, no paid/generation/Zapier call or loop started, no routing/billing/spending/acceptance change. The$0.01 scope is an application reservation cap, not a guaranteed provider-side dollar ceiling; do not promise a hard provider cap from estimated token counts.

Live setup NOT READY. Owner should keep Zap unpublished and Start untouched. Remaining account check: use the actual native Claude account in Claude Settings→Usage to verify remaining included allowance and disabled usage credits/extra usage; likewise verify Codex Team paid-overflow policy. Actual isolated launcher and business artifact/review integration must be completed/verified before activating any grant. Once those prerequisites pass, owner publishes Zap, opens AI Team→Webhook out, enters/enables the hook for that backend session, saves, and starts only the prepared to-do messenger job. These are future instructions, not current authorization to bypass a disabled button.

## Isolation-first implementation stop and Claude owner confirmation — 2026-11-03

Owner authorized completing review-import and production isolation, with an explicit stop if isolation cannot safely be enabled. Claude usage is now PASS, owner-confirmed:44%weeklyused,extrausageOFF. This supersedes the earlier pending usage evidence for Claude; it is labelled owner-reported, not a fresh provider/browser verification, and does not create a live grant. Native Codex billing/usage evidence is otherwise unchanged.

Before any implementation, one correctly formed actual Codex sandbox command was attempted from the pinned demo folder under the existing managed workspace profile. It failed exit1/setup-refresh in1658ms, without timeout. The earlier `node --version` success established only that this chat could run Node, not that the production CLI sandbox could start or enforce the demo-only filesystem/network boundary. No repeated attempt, weakened profile, process termination or workaround was used.

Stopped as requested. Production isolation NOT READY; review-import integration NOT COMPLETED in this batch. No application code, schema/database, routing/billing/credentials, live grant or clock changed. No live agent, paid/model request, Zapier trigger, publication or Start action. Available RAM1.69GiB. No tests run after the failed prerequisite; last verified full coverage remains311 checks from the preceding batch. Changed only sanitized evidence and logs. To continue safely, the native Codex runtime must first be repaired/updated through its official supported path and demonstrate command startup plus forbidden-file/network denial; a folder/branch or passing Node version check cannot substitute for that proof.

## 0.166.0 completion — 2026-11-03

Both code blockers are now implemented and tested. Real Codex0.166.0 startup passed (14.517s). Legacy elevated confinement rejected root-read denial, so no broad-read fallback was granted. The supported MXC backend passed all8 real decoy checks: inside read/write, outside read/write denial, fake-credential denial, junction denial, child-process denial and network denial. No saved global sandbox configuration was changed. Node's preserve-symlinks flags avoid its attempted inspection of denied ancestor metadata; they do not relax MXC permissions. The proof pins the actual demo/job/task/base/root and CLI binary hash.

Production NativeDemoBoundary now loads only that demo's matching proof, explicitly choosesMXC and refuses legacy fallback. Native vendor authentication remains with its native broker; no tokens are copied. Codex receives the strict filesystem/network policy with shell/web/MCP/apps/plugins/multi-agent tools disabled; Claude uses restricted/tool-free/strict-empty-MCP mode. Both recheck native login category before inference; API-key authentication cannot dispatch. Native invocation bytes/time and one-call-per-agent lifetime slots remain bounded, including role changes. Tests run insideMXC on the exact source revision before the tester model receives their evidence.

Review integration inserts a real SQLite draft, records exact-revision independent tests, then imports a schema-validated independent review bound to draft/source/test hashes. The actual worker family is checked; no self-review or inherited approval. Failing tests cannot be approved; reviewerExecutedTests remainsfalse because the reviewer inspects runner evidence. Findings return to shared job state and the regular dashboard. A valid current native review can make the taskVERIFIED; final completion still requires the existing explicit owner acceptance. Mock-only evidence cannot satisfy production acceptance. Review/test bindings are frozen and original revisions remain preserved. Legacy non-demo approval paths stay intact.

Added a protected, prepare-only dashboard action for the exact approved scopes. It fetches only the official public DeepSeek pricing page, verifies highest uncached peak rates0.30/1.20 per1M tokens, and starts at most30minutes from the owner's actual dashboard action, not an invented chat timestamp. Scope remains model/payload/task/job/database/key/base bound: max$0.01 local reservation,1modelGET+1balanceGET+1POST,1024output,thinkingoff,90seconds,no retry/fallback;1included CLI invocation each. Existing lower spending limits still apply. Unknown reservations/slots remain held. Scope preparation makes no model/account request and never starts the loop; duplicate or expired scopes cannot reset their clocks. Stop during the public-price GET fences creation. The local cap is not a provider-side dollar guarantee.

Supported SQLite backup taken before migration012: backups/backup-1793719593215-df73c886-a67a-487d-a343-61f52be89a64.sqlite. Main application restarted through supported procedure. All original rows in48 tables and .env hash preserved; integrityok,migration12,taskPENDING,loopready,0Builder scopes,0worker attempts,0review imports. MXC isolation statusready. No live job, paid/model request, native generation, Zapier trigger/publication or Start action. Real runner smoke test against the trusted incomplete placeholder correctly reported9 failures; it did not fabricate a pass or add evidence to the main task.

Full serial suite321/321 passed (222.875s,0failed/skipped/cancelled); subsequent targeted36/36 passed for pipeline/acceptance, and final5/5 passed for exact consent, native-auth refusal, mock/production separation and Stop fencing. The added Stop regression brings covered distinct checks to322; it ran separately, not in a repeated full suite. All tests serial,128MiB heap. Final syntax/diff/staged-secret checks occur before commit. Browser inspection timed out; UI is verified by targeted DOM regression and HTTP/API checks, not claimed as visually inspected.

Remaining owner setup: GITHUB_HANDOFF_TOKEN is absent and GITHUB_HANDOFF_READONLY_CONFIRMED isfalse. Configure only a repository-specific fine-grained Contents-read-only token privately, then restart. No writer/CLI credential was substituted. Webhook remains empty/off. Claude44%used/extrausageOFF remains owner-confirmed. Once setup is ready, owner publishes Zap, pastes/enables/saves hook, prepares exact approved scopes using its checkbox, then checks loop consent and presses Start within30minutes. No extra cost approval is requested for the unchanged proposal; the dashboard action provides a fresh bounded clock.

Corrections found locally: quoted special-path CLI override keys were interpreted literally; switched to one valid TOML table. Elevated backend cannot enforce root deny; selected supportedMXC instead of weakening. Native Node main-path canonicalization hit denied ancestors; documented runtime flags solved it under unchanged policy. Added the explicit Codex JSON report contract and made tester prompts consume actual prior runner evidence. Stale price checks, duplicate grants/calls, wrong review bindings and simulated production approvals fail closed. No runtime/package/auth/security-policy installs or broad ACL/firewall changes.
