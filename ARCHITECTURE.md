# Architecture — Checkpoint 2

The existing backend remains Express + Node 24 SQLite with no new dependencies. Routes validate input and call services; services use parameterized SQL and existing workspace validation.

| Module | Responsibility |
|---|---|
| src/routes/api.js, src/controllers/api.js | Preserved project/task/registry API |
| src/routes/ai.js | Generation, availability, memory, review and usage endpoints |
| src/orchestrator/generation.js | Bounded provider routing, draft persistence, workflow states |
| src/orchestrator/recovery.js | Existing interrupted task/execution handling |
| src/providers/config.js | Provider configuration, fixed official hosts and safe error types |
| src/providers/adapter.js | Shared generate/check interface with Gemini and chat-completion protocols |
| src/services/draft-validation.js | File/schema/path checks and non-executing JavaScript syntax checks |
| src/services/learning.js | Mistakes, corrections, approved bounded lesson retrieval |
| src/services/reviews.js | Test evidence, manual review and user-approval gate |
| src/services/usage.js | Persistent pre-request budget reservations and usage queries |
| src/agents/registry.js | Extensible agent registration and position mapping |
| src/database | Existing migration runner and backup utility; additive 002 migration |
| scripts/smoke.js | Explicitly authorized, isolated, one-request live smoke test |

Positions carry permissions; agents carry capabilities and status; provider/model assignments are a separate relation. The initial five positions are Orchestrator, Project Manager, Junior Developer, QA Tester and Senior Developer. The original four agents remain, plus manager. The junior agent becomes ready to generate, but no call occurs without an eligible configured provider. Additional agents can use registerAgent; a known role maps to its position. Compatible extra positions can be assigned through the agent_positions relation by trusted administrative code.

Adapters expose safe configuration availability, a catalog connectivity check and normalized generation results. One current model per provider is configured through environment variables; multiple providers can be assigned to the same agent. Changing a provider model requires explicitly assigning that configured model. No API changes provider hosts, keys, free policy or agent security permissions.

Standard mode tries one eligible provider at a time; quality mode retains multiple statically validated candidates. Maximum attempts and lifetime request/token-reservation budgets bound work. Statistics inform routing, but static success is not behavioral correctness. Test execution remains deliberately absent. Drafts are never published to workspace files by this workflow.

The original task status enum is preserved. A related task_workflows row represents generation, senior review, correction, user approval and escalation states. Legacy non-coding tasks remain intact. Current draft IDs bind all evidence and approvals to a specific immutable candidate. A rejected candidate cannot regain approval; generation creates a new draft and another review is required.

Existing token_usage has NOT NULL token/cost columns. Rather than rebuild or falsify those historical rows, usage_events extends accounting with per-request nullable measurements and outcomes. Counts are provider_reported when available, otherwise unknown. The estimated source value is reserved for a future explicit tokenizer estimator. Local budget reservations are separately labeled. Monetary estimates require configured prices and reported input/output counts; unknown costs remain null.

Local trust boundary: no network authentication; run only on localhost with one process. Browser-origin mutations are blocked. Manual evidence and identities are operator attestations. Prompts and lessons cannot change server-side permissions or approval gates. Prompt injection still requires human code review, and static checks do not establish that code is safe to execute.

The existing filesystem/SQLite operations are not one transaction. The generation workflow avoids that problem by storing drafts only in SQLite. Existing ProjectService.writeFile retains explicit overwrite approval and file tracking. Backups continue to use SQLite's online backup API; workspace files must be backed up separately. No automatic deletion, recovery, paid fallback or frontend has been added.
