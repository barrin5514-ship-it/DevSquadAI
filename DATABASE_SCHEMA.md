# Database schema

All IDs are text; application-created entities use UUIDs, while initial agent IDs are stable role names. Dates are ISO UTC strings. `schema_migrations` is an additional internal migration ledger.

| Table | Columns |
|---|---|
| projects | id, name, description, status, workspace_path, created_at, updated_at |
| tasks | id, project_id, description, assigned_agent, status, created_at, updated_at, completed_at |
| agents | id, name, role, capabilities (JSON), status, provider_id, system_prompt |
| agent_executions | id, task_id, agent_id, status, result_summary, error_information, started_at, ended_at |
| ai_providers | id, provider_name, model_name, configuration_metadata (JSON), enabled |
| token_usage | id, execution_id, provider_id, input_tokens, output_tokens, estimated_cost, timestamp |
| project_context | id, project_id, context_summary, important_decisions (JSON), updated_at |
| project_files | id, project_id, relative_path, file_metadata (JSON), modified_at |
| error_logs | id, task_id, category, safe_message, timestamp |

Foreign keys link tasks/context/files to projects, agents to providers, executions to tasks/agents, usage to executions/providers, and errors to tasks. Deletes do not cascade; referenced data is protected. Foreign-key columns are indexed, including composite indexes for project task history. Context is unique per project; file paths are unique per project; workspace folders are unique. Names/descriptions, statuses, boolean enabled flags, valid JSON, and nonnegative token counts/costs have constraints.

SQL values are bound through parameters. Table and column names are fixed by source code. Filesystem validation occurs in the workspace service before writes; direct database manipulation is not a supported way to create files. Never store API keys in any table, including configuration metadata or text. Store safe summaries rather than raw provider exceptions. Token usage and error logs are schema foundations; live metering and orchestration logging await later checkpoints.

Migration source: `src/database/migrations/001_foundation.sql`. The initialization code enables SQLite foreign keys for every application connection. Backups use Node's SQLite online backup procedure, followed by integrity and foreign-key checks.

## Additive Checkpoint 2 migration

`002_ai_learning.sql` creates new relations without dropping/rebuilding the original nine tables. Existing projects, tasks and context are tested through an actual 001-to-002 upgrade. It adds Project Manager and initializes position assignments; the original junior role is enabled for generation subject to provider permissions/configuration.

| Table | Important fields and relationships |
|---|---|
| positions | id, name, JSON permissions |
| agent_positions | agent_id + position_id composite primary key |
| agent_models | agent_id + provider_id + model composite primary key |
| generated_drafts | id, task_id, execution_id, files JSON, checks JSON, content_hash, created_at |
| task_workflows | task_id, state, current_draft_id, category, updated_at |
| draft_tests | draft_id, passed, evidence, recorded_by, created_at |
| senior_reviews | id, task_id, draft_id, reviewer_identity, manual review_method, status, findings, required_corrections, created_at |
| user_approvals | draft_id, approved_by, created_at |
| agent_mistakes | id, project_id, task_id, agent_id, provider_id, model, category, description, context, detection_method, created_at |
| corrections | id, mistake_id, correcting_agent (actual identity), summary, verification_status, test_results, senior_review_status, created_at |
| learned_lessons | id, correction_id, project_id, summary, category, fingerprint, verification_status, approval_status, approved_by, created_at, updated_at |
| agent_performance | agent_id + provider_id + model + category key; attempts, successful_results, failed_results, approved_reviews, rejected_reviews, reported_tokens, updated_at |
| usage_events | id, execution_id, provider_id, model, agent_id, task_id, nullable input/output/total tokens, source, nullable estimated_cost, reserved_tokens, outcome, created_at |

There are 22 domain tables after this migration, plus schema_migrations. Foreign keys preserve referential integrity; state/JSON/numeric constraints guard core values. Lookup indexes cover task drafts/reviews, project/category lessons/mistakes, correction chains and usage by provider/agent/task/execution. Project usage is derived through tasks rather than duplicated.

`coding_completion_guard` prevents completion of a coding workflow task without passing evidence for its current draft, latest approved senior review and recorded user approval. Service methods validate matching task/draft/project identities and require a new draft after rejection. Original non-coding rows are not rewritten by that guard.

Unknown usage is SQL NULL, never a fabricated zero. The old token_usage ledger remains unchanged for compatibility; new generation accounting uses usage_events. Performance reported_tokens is a sum of only available reports, not a complete usage total. Corrections and test/review evidence are explicit manual records rather than results of an unimplemented execution engine.
