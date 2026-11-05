> Active policy updated: DeepSeek is the sole Senior Developer and lead reviewer. Claude Code/Codex manual workflows are retired. Older sections below are historical context, not current agent assignments. See the current policy section at the end.

# Orchestrator architecture

## Inspection and proposal recorded before implementation

The existing application is an Express backend using Node's built-in SQLite. Migrations 001 and 002 preserve projects, tasks, agents, executions, generated drafts, test evidence, manual reviews, owner approvals, lessons and usage. Five HTTP provider adapters exist; generation validates schema, paths and JavaScript syntax without executing code. Existing tests cover 62 foundation/AI behaviors. There is no dashboard.

Reusable pieces: Store, Workspace, ProviderAdapter, validateDraft, UsageService, migration runner and existing JSON API/error conventions. The legacy task status vocabulary and review workflow are already used by clients and will remain intact.

Missing: approved hierarchical plans, explicit team states/history, multiple exact models under one provider, independent named senior handoffs, bounded correction attempts, restart recovery for the new workflow, and a progress view.

Proposed implementation: additive team tables linked to existing tasks; a TeamOrchestrator service with action-specific transitions; reuse existing drafts and usage tables; immutable handoff snapshots and manual decision records; one explicit outbound attempt per authorized dispatch; a fixed verified model catalog using the prior recorded live evidence; current zero-price catalog checks for OpenRouter before a generation; read-only dashboard. No generated files are applied, deployed, or executed. Approved restricted testing remains an external manual handoff with recorded evidence.

Risks: prior successful calls do not guarantee present availability, free-model pricing/expiry can change, small benchmarks do not establish specialist quality, manual reviewer identity/test evidence cannot be cryptographically authenticated, and localhost clients are trusted (not a multi-user security boundary). Live calls default off; each dispatch additionally requires explicit authorization. Historical routes remain compatible and will not be permitted to mutate team-owned workflows through legacy review/generation actions. Sensitive values must not enter durable team inputs/outputs.

Data flow: owner request -> manual senior plan -> owner plan approval -> bounded child tasks -> exact model assignment -> explicitly authorized generation -> immutable SQLite draft -> external test evidence -> Claude/Codex review packet -> actual manually submitted review -> correction or VERIFIED -> owner approval -> COMPLETED. Parent request can be verified only after every child completes.

## Implemented components

- Migration 003 adds team_jobs, team_events, team_packets and team_provider_limits. Existing task IDs remain the join key. Existing project/task schemas and legacy APIs are preserved.
- src/orchestrator/team.js implements action-specific state transitions and evidence gates. src/orchestrator/team-models.js holds the three previously verified model identities and explicit manual senior roles.
- Existing ProviderAdapter, usage reservations, static validator, generated_drafts, draft_tests, senior_reviews and user_approvals are reused. New team packets freeze the current draft and test evidence; legacy review/generation endpoints reject team-owned tasks.
- src/routes/team.js exposes the workflow. /team now uses the protected interactive console described in the dated upgrade section below. Text is rendered using textContent, not HTML interpolation.

## State and approval rules

PENDING -> PLANNING -> AWAITING_APPROVAL is the root request's manual planning path. Only an explicit owner plan approval creates 1–12 child tasks; the root becomes ASSIGNED. Each child follows PENDING -> ASSIGNED -> IN_PROGRESS -> AWAITING_REVIEW. An actual senior decision moves it to CHANGES_REQUESTED or VERIFIED. A correction requires explicit reassignment and produces a fresh immutable draft. VERIFIED -> COMPLETED requires a separate owner action. The root becomes VERIFIED only after every child is COMPLETED, then also requires owner acceptance.

Provider/validation failures become FAILED; rate limits and interrupted attempts become BLOCKED. Both require explicit reassignment, never an automatic restart/retry. Each child permits at most three attempts including manual drafts. No generic state-mutation API exists. A database trigger prevents legacy task completion before the team owner gate.

## Routing and external requests

Groq openai/gpt-oss-120b is the default. Optional model keys laguna and minimax select poolside/laguna-s-2.1:free and minimax/minimax-m3.1-flash:free. Gemini and unverified/paid IDs are not in the team allowlist. Keys and provider free-account flags must be configured; the new workflow does not silently enable OpenRouter. Laguna's historical free listing expires 2026-10-31, so it becomes unavailable on that date until its evidence is deliberately updated.

TEAM_LIVE_ENABLED defaults false. A separate user-authorized dispatch must also send authorizeRequest=true. This flag is a trusted local operator assertion, not proof of identity. An OpenRouter dispatch first checks the account-filtered live model catalog for zero pricing, then sends at most one generation with zero-price constraints and provider fallbacks disabled. No live calls were used to verify this implementation. Groq free-account confirmation remains the operator's responsibility, as in the existing adapter.

Usage reservations honor the existing persistent request/token budgets. A conservative shared cap of 20 requests/minute and 50/day is imposed per provider; these are local ceilings, not a claim about Groq account quota. All usage-ledger calls count, including failures. A 429 persists the adapter's bounded Retry-After cooldown across restarts. Unknown usage stays null. Catalog checks may count against the local request reservation although they are not generation calls.

## Local operation and endpoints

Start with npm start and open http://127.0.0.1:3000/team. Keep the backend bound to loopback; it has no multi-user authentication. Legacy browser-origin mutations remain rejected; the protected same-origin console supports browser actions and manual receipts. Do not expose this service to a network without adding authentication and authorization. Owner/reviewer names are assertions recorded by the local operator, not authenticated subscriptions or API connections.

All endpoints return {data: ...}. Use POST with application/json under /api/team. GET /api/team returns projects/models/progress; GET /api/team/tasks/:id returns task/history/draft/packets/reviews/usage.

| POST path | Body | Purpose |
|---|---|---|
| /projects/:projectId/requests | {"request":"Build a helper"} | Create root request |
| /tasks/:id/start-plan | {} | Open manual planning |
| /tasks/:id/plan | {"author":"Claude","summary":"Plan summary","steps":["Implement helper"]} | Record actual plan; Codex can also author |
| /tasks/:id/approve-plan | {"approvedBy":"owner","approve":true} | Approve decomposition |
| /tasks/:childId/assign | {"modelKey":"groq"} | Explicit assignment; omitted key defaults Groq |
| /tasks/:childId/run | {"authorizeRequest":true} | Separately authorized single outbound attempt |
| /tasks/:childId/manual-draft | {"author":"Claude","files":[{"path":"src/helper.js","content":"export const x=1;"}]} | Import actual manual senior output, no execution |
| /tasks/:childId/tests | {"draftId":"current UUID","passed":true,"evidence":"Command, sandbox, results","recordedBy":"Owner operator"} | Record approved external testing |
| /tasks/:childId/packet | {"reviewer":"Codex","proposedChanges":"Summary"} | Freeze independent handoff |
| /tasks/:childId/review | {"packetId":"UUID","reviewerIdentity":"Codex","decision":"approved","findings":"Actual findings","receivedBy":"Owner operator"} | Record received review; rejection also requires requiredCorrections |
| /tasks/:id/complete | {"approvedBy":"owner","approve":true} | Accept VERIFIED work |
| /tasks/:rootId/verify-children | {} | Verify all children completed |

The initial diff compares against an empty baseline; correction diffs compare against the previous draft. It is a full before/after textual draft diff, not a production Git diff. Review packets state that limitation. No production source files are read into model prompts or overwritten. Child tasks are sequentially dispatched by the operator; autonomous dependency scheduling, production patch application, arbitrary sandbox execution, deployments and cloud senior APIs are deliberately absent.

## Verification and operating limits

This foundation is intended for one trusted local backend process. Manual actor names, owner consent and external test evidence are operator assertions; network exposure or multiple concurrent server replicas require additional identity and coordination controls. No generated program is executed by the service. The syntax-check subprocess parses only. Automatic test sandboxes, production patching, authenticated cloud reviewers and deployment remain manual/future work.

No live provider calls were performed during implementation. Existing provider adapters were preserved. Local configuration inspection confirmed Groq remains default, Gemini retains manual_only, the OpenRouter account is not silently enabled for team dispatch, and TEAM_LIVE_ENABLED is false.

## Interactive dashboard upgrade — 2026-10-21

The dashboard is now an interactive owner console. Existing provider adapters and database migrations remain in place. No new migration or database reset was needed: project descriptions/context retain requirements, team_jobs retains the plan and state, and team_events stores plan versions and decision history.

A new `src/routes/console.js` mounts at `/api/console` before legacy routes. It allows same-origin JSON browser writes only with a per-process random capability obtained from its no-store session endpoint. It validates loopback Host values, exact Origin, Fetch Metadata, and the custom capability header; no CORS is enabled. Legacy `/api/team` and `/api` browser mutation restrictions remain intact. This is CSRF/DNS-rebinding protection for a trusted local app, not authentication against hostile local processes or users.

Project creation validates all fields and credential exclusions first, then creates a project, root request, and requirements context in one SQLite transaction using existing services. The existing workspace service creates the empty project directory; an exceptional transaction failure can leave an empty UUID directory, never generated application files.

Plan generation reuses the existing guarded dispatch path, ProviderAdapter, usage budget, rate limits, zero-priced OpenRouter catalog checks, timeout and one-request policy. The root moves PLANNING -> IN_PROGRESS -> AWAITING_APPROVAL; malformed responses or provider failures are recorded as FAILED/BLOCKED. Planning attempts are bounded at three. A valid structured plan contains objective, features, stack, tasks, testing, deliverables, and blockers. The actual model is recorded as author. Owner edits retain previous versions in task events and never impersonate a senior reviewer.

Unapproved plans can be edited, returned to PLANNING, or rejected to BLOCKED with feedback. Approved plans remain locked. Explicit reassignment is available while a child is ASSIGNED; it sends no request. Console development dispatch must identify the exact displayed model, so a stale assignment cannot silently route to a different provider/model. Development prompts include the approved parent plan, prior draft, senior corrections, and owner corrections, subject to the existing input-size policy.

After VERIFIED, an owner can request corrections on a child, returning it to CHANGES_REQUESTED. A new draft, tests and independent packet are required before completion. Accepting the root marks its project completed only after all children are completed. There is still no file application or deployment endpoint.

Settings permits an explicit in-memory session opt-in for live requests after free-account confirmation. This replaces the need to edit TEAM_LIVE_ENABLED merely to use browser controls; the existing environment value remains the startup default. It does not modify keys, provider free flags, model choices, billing or `.env`. Every planning/development request separately requires authorizeRequest=true. Turning it off prevents new dispatches, not an already authorized in-flight request. Local clients and same-origin dashboard tabs share this process permission.

Browser controls cover project creation, planning/editing/approval/rejection, model assignment/reassignment, one-request authorization, manual draft imports, test evidence, downloadable immutable review packets, actual review receipts, owner corrections, and acceptance. HTML is rendered with textContent and DOM construction; provider/file text is never injected as HTML. External fonts, trackers, assets, frameworks and CDNs were not added. / redirects to /team. The six responsive views use locally served CSS and JavaScript with the existing CSP.

Limits: manual senior identities are not authenticated, test evidence is an operator receipt, current task list is bounded at 500 and recent event feed at 200 (individual task history remains available), refresh is explicit, and unsaved form edits do not autosave. Draft format support remains JavaScript/JSON/Markdown/text. Automatic task scheduling, code execution, previews, production patching and deployments remain absent.

See DASHBOARD_GUIDE.md for the owner workflow. Optional human-avatar Team View is deferred. Design references were used only as general inspiration for clear mission/task views; no proprietary assets or layouts were copied. References inspected: https://agentos.guide/ , https://theagentcrew.org/blog/mission-control-part-2-your-agent-hq/ , https://github.blog/ai-and-ml/github-copilot/how-to-orchestrate-agents-using-mission-control/ . Searches did not establish exact authoritative matches for every other named design reference, so no unsupported attribution is claimed.


## Multi-model checkpoints and recovery — 2026-10-21 (supersedes single-attempt routing above)

The existing Express/SQLite application remains intact. Additive migration 004 adds immutable hashed team_checkpoints, durable team_operations, task locks, per-model health/backoff, a single-backend runtime lease and prepaid quote reservations. Existing rows are preserved. A recoverable source archive and integrity/foreign-key-verified SQLite backup were created before changes at data/checkpoints/multimodel-20261021-142224; baseline was 100/100 tests.

Routing uses planning/coding/debugging/testing categories, declared provisional capabilities, local availability, prior failures, provider cooldown and free eligibility. Groq remains default. Smart assignment prefers MiniMax for planning and Groq for coding; specialties are provisional. Free model candidates are fixed allowlisted identities, not arbitrary provider names. OpenRouter verifies account-filtered current zero pricing before every attempt and constrains every POST to zero prices with provider fallback disabled. Cerebras trial models and DeepSeek are excluded. Independent senior review remains a separate manual Claude/Codex gate: developer output cannot approve itself or complete a task.

Each operation requires live session permission and explicit owner authorization. The dashboard defaults its clearly labeled free fallback checkbox on, but the API requires allowFallback=true to broaden a single request. At most three distinct free model attempts fit within the task's existing three-attempt lifetime ceiling; there is no infinite retry, scheduled polling or background resumption. Provider Retry-After (seconds or HTTP date) and persisted exponential per-model cooldown are respected. A failed/unavailable provider is skipped; all unavailable capacity pauses safely. Local token/request budgets still apply. Requests whose outcome is ambiguous can have consumed provider quota; their usage remains unknown. No interrupted model text is treated as completed work.

Every workflow event atomically appends a checkpoint with its event using a savepoint inside existing transactions. Additional snapshots precede operations/switches and follow failures/pauses. The versioned snapshot includes project/task IDs, original objective, approved plan, assignment/author, completed and remaining child tasks, current immutable code draft/files/hash, file references, test evidence, known errors, stage, last successful event, next action and timestamp. Hash verification and draft reconciliation precede handoff. Writes are bounded and scan for configured credentials; snapshots never read production files or credential stores. A failed insert rolls back without replacing previous checkpoints. Checkpoints are immutable and currently retained indefinitely; automatic pruning is not implemented.

The replacement model inspects the supplied frozen draft/code context and evidence, then produces another validated draft. This is draft-level continuation: the app does not autonomously edit production files, execute generated code, run behavioral tests, or apply patches. Existing completed child work is recorded, not recreated. New drafts never overwrite old versions. Large context fails closed at the existing provider byte limit and requires owner reduction; it is not silently truncated. Test execution/evidence and independent reviews remain external manual actions. Parent tasks are not automatically scheduled.

A task lock is durable for the complete authorized operation. Operation IDs return recorded completed results and reject concurrent/conflicting/interrupted replays. A process lease prevents another backend from resetting active tasks as interrupted. A dead owner's lease can be recovered; uncertain process ownership fails closed (PID reuse may require investigation). After restart, interrupted operations are marked and their checkpoint retained, locks released, and IN_PROGRESS tasks blocked for explicit reconciliation. Already committed drafts remain awaiting review. No automatic retry after crash. This design is for a single trusted local backend, not distributed workers.

Console API additions: POST tasks/:id/auto-assign {category}; pause {reason}; resume {authorizeRequest,allowFallback,category?,operationId?}; run/generate-plan accept allowFallback/category/operationId. Existing run expectedModel remains mandatory on the browser route. GET task details includes checkpoint metadata, a verified handoff packet and operation history. Reusing an operation ID with changed policy is rejected. Owner plan/completion approval cannot be bypassed by resume.

DeepSeek is optional prepaid preparation, DEEPSEEK_PAID_ENABLED=false by default and unchanged locally. Its generic adapter is blocked from both legacy and team automatic routing. The dedicated paid service requires a configured official model, unexpired operator-verified worst-case USD input/output rates, positive per-request/daily/lifetime ceilings, a fresh five-minute quote bound to the exact context/model/prices, explicit owner paid confirmation and maximum USD, live session opt-in, and a fresh usable USD balance. Estimates use UTF-8 input bytes plus framing allowance and a capped output; they are reservations, never final charges. Pending/completed/unknown reservations count against durable budgets. A quote is consumed once; uncertain POST outcomes retain the entire reservation and never retry. No credits are purchased. Balance GET itself is gated. API: paid-quote {outputTokens}; paid-run {quoteId,approvedBy:'owner',confirmPaid:true,maximumUSD}; /paid/balance {approvedBy:'owner',confirmPaid:true}. Paid development still needs the approved plan and independent manual review. DeepSeek's review specialty is advisory/prepared; it cannot replace the current authenticated/manual senior receipt and owner gates. No automatic paid reviewer is implemented.

Claude Code/Codex subscription authentication and local bridges are outside this implementation. Linux/WSL2 automatic review is retired from the active roadmap. Historical isolation reports remain; no WSL/Windows settings were changed.


## DeepSeek senior restructuring — current architecture

The application is extended, not rebuilt. Migration 005 adds an explicit four-member active roster and a new immutable DeepSeek review-request table. Historical agents/reviews/packets remain untouched except retired identities are disabled and the generic senior identity is designated DeepSeek. Groq/OpenRouter adapters, free routing, checkpoints, operation IDs, cooldowns, runtime lease and existing owner plan/completion gates remain.

SeniorReviewService freezes and validates packets, enforces author/provider independence, parses the provider's structured correctness/security/requirements/test-coverage/integration report, and drives verified/correction states. It uses DeepSeekService's existing paid authorization, balance, quote, reservation and usage infrastructure. Paid quote purpose and request ID are persisted. No paid model request occurs because of a GET, task completion, review preparation, fallback, restart or provider recovery.

Paid reviews preserve the developer's assignment/author/draft. A separate senior execution/usage record is created. Failures leave AWAITING_REVIEW; interruptions become failed review requests on restart and require new explicit authorization. Rejected review corrections enter the next developer prompt. Current draft identity, immutable hash and frozen passing test evidence are rechecked before approval. Owner completion queries current DeepSeek approval, never a retired manual packet. Historical completed projects stay completed; uncompleted child approvals from retired reviewers require a fresh DeepSeek review.

Public /api/agents shows Groq, Poolside Laguna, MiniMax and DeepSeek. Internal scaffold identities and historical model mappings remain for referential integrity. Retired identities cannot be assigned new work. CLI authentication snapshots are no longer read by active status code. The dashboard has three developer cards and one Senior Developer section. No CLI is installed, removed or executed.

Console API additions: review-quote {reviewId,outputTokens} and review-run {quoteId,approvedBy:'owner',confirmPaid:true,maximumUSD}; packet accepts reviewer:'DeepSeek' and produces a paused request. Manual review POST rejects with HTTP 410. Existing paid development endpoints retain explicit purpose separation. Existing review audit GETs remain read-only.

The paid API path is verified with mocks only. Local budgets/reservations are verified application controls, not independent enforcement of the provider's final charges. DeepSeek stays disabled until the owner configures its API/model, current worst-case USD prices and expiry, spending limits, paid activation and session permission, then authorizes a specific quote. Key values are never shown. No live/paid generation, balance request or credit purchase was made during implementation.


## 2026-10-21 free-developer activation

See [FREE_DEVELOPER_HANDOFFS.md](FREE_DEVELOPER_HANDOFFS.md) for verified account/catalog evidence, quota, exact retirement deadlines, Windows certificate-store startup, dashboard status semantics, mocked handoffs and the unsubmitted calculator demonstration. OpenRouter free confirmation is enabled; live generation and DeepSeek paid access remain off. MiniMax retires October 22 at 12:00 UTC; Laguna is excluded starting October 31 UTC. No paid replacements are selected.


## 2026-10-21 provider expansion (activation pending)

See [PROVIDER_EXPANSION.md](PROVIDER_EXPANSION.md) for Gemini diagnostic findings, Mistral/NVIDIA/Cloudflare adapter setup, official conditional free-access research, key/account evidence, separate routing/live approval gates, usage/context/backoff controls, mocked handoff validation and the unsubmitted calculator plan. Seven developer provider cards reuse the existing executor/data architecture; DeepSeek remains sole senior and paid access stays disabled. All four expanded routes remain off pending credentials/evidence and explicit owner routing activation. Existing sections above are historical where superseded.
