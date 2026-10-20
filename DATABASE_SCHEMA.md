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
