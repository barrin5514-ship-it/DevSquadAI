# Codex startup access investigation — November 6, 2026

**Status: BLOCKED for production repair; non-generating diagnosis verified.** Branch `feature/workspace-ui-redesign`; HEAD preserved at `9983d20f1ee6394cbfbff484ae9f7345c91195d7`. The owner declined the proposed single-file permission change and instructed us to report the blocker. No production permission or application-code change was applied.

## A. Root cause and evidence

**VERIFIED:** the configured selected folder is correct and canonical, but Counter Test 2 has no `.git` root of its own. It is nested under DevSquadAI's Git repository. Codex's default discovery walks toward that ancestor repository, while the worker's filesystem policy denies reads outside the selected project.

Identified denied operation: a real Node process launched by the installed Codex MXC sandbox cannot `readFileSync` the parent `DevSquadAI/AGENTS.md`: **EPERM**. Metadata probes can see this file and the hub `.git` directory. Therefore successful metadata or host readability does not establish a permitted file read. The actual startup error omits the denied path; the direct filesystem probes and controlled startup comparison establish the discovery/access conflict, rather than a full syscall trace of the earlier execution.

Controlled comparisons, all with the existing root-deny profile and no added read grants:

| Check | Actual result |
| --- | --- |
| Counter Test 2 root: inspect its `AGENTS.md` / `.git` | Both absent; no files changed |
| Counter Test 2 sandbox reads hub `AGENTS.md` | EPERM |
| Fresh OneDrive root reads its own local instruction fixture | Passed, 84 bytes, SHA-256 recorded without contents |
| Same fresh root reads hub `AGENTS.md` | EPERM |
| Fresh `%TEMP%` root reads its own instruction fixture | Passed, same bytes/hash |
| Fresh `%TEMP%` root reads hub `AGENTS.md` | EPERM |
| Personal ephemeral `thread/start`, fresh OneDrive root without its own `.git` | Failed `-32603`: instruction loading access denied, 10.293 seconds |
| Same folder/account/profile/instruction file after **only** `git init` in that disposable folder | **Passed**, 6.087 seconds; `instructionSources` contained only its local `AGENTS.md`, correct cwd and `devsquad_demo` permission profile; zero turns |

The last check was already underway when the owner declined permission changes; its result was recorded, and no production repair followed. It changed only the disposable fixture's Git metadata. No security instructions in an existing project were removed or replaced.

**CONFIRMED mechanism:** repository/instruction discovery crossing the selected workspace boundary. A proper local Git root allows startup while retaining the same restrictions. **Not established:** that every possible startup operation now succeeds in Counter Test 2, or that a model response works. The earlier Builder's discarded stderr cannot be proven identical to the separately captured startup failure.

Alternative explanations checked:

- Cwd/normalization: all three tested roots matched their canonical real paths; successful startup returned the exact fixture cwd.
- OneDrive: local instruction reads passed both inside and outside OneDrive, and startup passed in the original OneDrive fixture after local Git initialization. OneDrive alone is not the cause of this reproduced conflict.
- ACLs: host ACL metadata inspected read-only. Folder deny entries exist, but their existence alone is not a diagnosis; no ACL was altered. The same file reads inside the selected root and the successful same-policy startup argue against a blanket host ACL/readability failure. Exact Windows syscall tracing was not performed.
- MXC: existing policy denied outside reads and permitted inside reads as expected. Startup succeeded with that same named profile. No global sandbox bypass or blanket CLI incompatibility is required to explain this comparison.
- Profile configuration: Personal and School both passed independent native login checks; homes are distinct and not symlinks. Personal has a config file, School does not. Only presence of relevant setting names was inspected; none of the checked root-discovery/document/provider/default-permission/sandbox keys appeared in Personal's file. No config values or auth files were printed/read by this agent. The native CLI broker uses its own authentication normally.

Official references checked November 6:

- https://developers.openai.com/codex/config-advanced — default `.git` project-root discovery and ancestor instruction/config discovery. We did **not** set `project_root_markers=[]`.
- https://developers.openai.com/codex/app-server — `thread/start` loads a thread and reports instruction sources; `turn/start` separately begins model work. We sent **no turn/start, turn/steer, review/start or command execution RPC**.
- Installed version's generated experimental protocol schema confirmed `permissions`, `cwd`, `ephemeral`, and returned `instructionSources` before using them. Generated files are in a disposable temporary folder, not production dependencies.

## B. Repair applied / not applied

**No production repair or permission change applied.** Specifically, no read exception for hub `AGENTS.md`, parent-folder access, home-folder access, full-disk access, instruction disablement, root-protection disablement, auth change, or sandbox switch.

New task files:

- `scripts/inspect-codex-startup-20261106.js`: diagnostic-only stdio client for the installed app-server; allowlists just `initialize`, `initialized`, and ephemeral `thread/start`; rejects any other method in its send function. Uses the existing isolation configuration, CLI environment, dedicated profile selection and process observer. 30-second bound, 64 KiB stream ceiling, PID/birth-checked cleanup. This is not a new application worker/transport or a model execution path.
- This report, task-specific files in `docs/verification/startup-*`, and an appended row in `docs/PROMPT_LOG.md`.
- Disposable fixture directories only: local `AGENTS.md` fixtures, one fixture-local `.git`, static generated CLI protocol files. Existing Counter projects unchanged.

The proposed file-only read grant was **declined**. A safer alternative is now evidenced: prepare each managed project as an independent Git root, retaining applicable security instructions locally. That requires deliberate application integration and handling of existing instructions/history; it has **not** been applied to Counter Test 2 or silently introduced as an alternative fix after the owner's stop instruction.

## C. Regression and process checks

Supported backup first:

```powershell
node scripts/backup.js
```

Verified backup: `backups/backup-1793976365524-378e8594-e2a3-48d0-9b51-5a08ac02bec4.sqlite`. No migration.

Relevant serial baseline/integration command:

```powershell
node --max-old-space-size=128 --test --test-concurrency=1 tests/native-diagnostics.test.js tests/studio-protocol.test.js tests/studio-run-scope.test.js tests/studio-failover.test.js tests/studio-worker-recovery.test.js tests/studio-executions.test.js
```

**65 passed, 0 failed, 0 skipped.** No new production fix was applied, so this is existing safeguard regression evidence, not proof of repaired production startup. Log: `docs/verification/startup-regressions-20261106.txt`.

Actual non-generating read comparisons used:

```text
codex.exe sandbox <unchanged isolationArgs(selectedRoot)> -- <fixed Node executable> -e <bounded stat/read probe>
```

Three root comparisons, then three instruction-read comparisons, serially. Probes returned only metadata, permitted-read byte count/hash or error code; never file contents or secrets. Existing root remained read-only in practice. `CODEX_HOME` selected Personal; environment came from `cliEnvironment()`.

Non-generating startup commands:

```powershell
node --max-old-space-size=128 scripts/inspect-codex-startup-20261106.js "<disposable OneDrive fixture>"
git init --quiet "<same disposable fixture>"
node --max-old-space-size=128 scripts/inspect-codex-startup-20261106.js "<same disposable fixture>" "docs/verification/startup-thread-own-git-20261106.json"
```

Both checks ended normally; process absence verified with native PID/birth observation. No automatic retries, fallback or model-generating turn. Initial thread failure and second successful thread initialization are different controlled configurations, not repeated model requests.

Requested A–N coverage:

| Requirement | Evidence / limit |
| --- | --- |
| A correct instruction discovery | Actual successful thread returned only the fixture-local instruction path |
| B Windows paths/ancestors | Canonical-root comparison, metadata probes and same-root Git A/B check |
| C permitted instruction reads | Real MXC read passed inside fresh OneDrive and temporary roots |
| D denied reads | Real MXC parent instruction read denied in all three roots |
| E startup error capture | Existing targeted regression and actual sanitized thread-start error |
| F Personal profile | Native login and actual non-generating startup use dedicated Personal home |
| G School profile | Independent native login passed; School startup not attempted in this task |
| H selected root preserved | Successful startup returned exact cwd; original root untouched |
| I no parent access grant | No permission modifications; actual outside reads still denied |
| J unknown failure / unsafe fallback | Existing serial failover/unknown-outcome regressions passed |
| K quota/auth authorized fallback | Existing deterministic fallback regressions passed, not live failover |
| L original Counter preservation | Read-only DB and file fingerprints unchanged |
| M execution tracking/Stop | Existing serial protocol/recovery/execution regressions passed |
| N credential safety | No auth-token file read/copied/displayed; redaction regressions passed |

There are no newly added production-repair unit tests because the permission proposal was declined and no production repair was implemented. Future workspace-root integration needs its own focused tests before adoption.

## D. Actual dashboard verification

Real installed Chrome via Playwright, regular URL:

`http://127.0.0.1:3000/team#project/7d913bbc-9f16-4a5a-abf8-e0202b04a3dd/chat/99273d3f-9164-4727-8b73-b59a5fc83e6e`

Read-only browser check passed: correct project/session, paused status, Personal Builder / School Tester / Claude Reviewer, fallback still false, one historical execution, original failure visible, **zero browser JavaScript errors**. Mutation and event-stream requests blocked for this inspection. No Send/Resume, acceptance, model activity or new error event was fabricated. Main backend not restarted.

Evidence: `startup-main-browser-20261106.json` and `.png`. Non-generating initialization success is not inference success, a build, a test run or a completed AI response.

## E. Safety and preservation

Production remains 14 projects / 15 sessions / zero running tasks. Counter Test 2 paused with one original execution and no task lock. Original Counter historical lock remains.

- Original Counter fingerprint: `76ce5a26ce603064a14a266dede55595dd80011dbc981b1a0e77f6a6a7c2d785`.
- Counter Test 2 empty-root fingerprint: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.

Both match the previous report. Both native logins preserved; no credential copying, reauthentication or configuration change. No live AI turns, paid calls, DeepSeek calls, Zapier, grant activation, Counter build, database record edits, commit, push, reset, merge or deploy. Existing uncommitted work preserved. Non-generating CLI startup may perform normal account/config metadata interactions; no claim is made that every underlying HTTP request was packet-captured.

## F–H. Blocker, status and next action

**BLOCKED:** the production nested workspace still lacks its own Git root, so the existing isolated startup can encounter parent instructions it cannot read. Owner declined changing permissions. No production fix was applied after that instruction.

**Is Dev Squad ready for one separately approved real Codex Builder execution in Counter Test 2? NO.** The successful fixture startup establishes a viable local direction, not repaired Counter Test 2 or successful generation.

Next concrete proposal: approve a narrowly scoped managed-workspace-root repair that establishes an independent Git root and preserves all applicable security instructions within that root, without granting any outside reads. Existing files/instruction precedence, checkpoints, startup permissions and source provenance must be tested before touching Counter Test 2. Then, only after local checks pass, request a fresh separate bounded model startup test. Do not reuse the consumed diagnostic script or approval. No upstream binary replacement is currently justified by the successful same-version, same-policy comparison.
