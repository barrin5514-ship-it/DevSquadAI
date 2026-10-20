# Architecture

The dependency flow is routes → controllers → services/models → SQLite and workspace storage. `src/app.js` assembles these components for both the HTTP server and isolated tests.

- `src/routes`: REST URL mapping.
- `src/controllers`: input validation and JSON responses.
- `src/services`: project and tracked file operations.
- `src/models`: parameterized SQL persistence methods.
- `src/database`: ordered transactional migrations and online backups.
- `src/workspace`: per-project directories, path checks and overwrite protection.
- `src/config`: environment validation; no secret values are returned by the API.
- `src/middleware`: validation and safe errors.
- `src/agents`: expandable registry, capabilities and system prompt configuration.
- `src/providers`: safe provider listing; future adapters will resolve keys from environment variable names.
- `src/orchestrator`: startup interruption detection only.
- `tests`: isolated automated tests.
- `scripts`: manual backup command.

Express is the only runtime dependency. Node 24 supplies SQLite and the test runner. SQLite uses foreign keys, WAL journaling, a busy timeout, and a migration ledger. Each migration executes in a transaction. Restarting applies only unapplied migrations.

The four initial roles are Orchestrator, Junior Developer, QA Tester and Senior Developer. The senior role is a manual review checkpoint. Registry readiness is descriptive only: no worker loop or AI invocation exists. Registering a new agent is an insert through `registerAgent`, without changing routing. Provider records start empty, and provider metadata/system prompts are omitted from public registry responses.

Project context stores a current summary and an array of important decisions; updating context replaces that snapshot. Tasks and executions preserve separate history. The restart policy marks running work as requiring review. Resumption, retries, scheduling, prompt execution, token accounting services, provider adapters, and frontend work are future checkpoints.

The filesystem and SQLite do not share a transaction: if a project insert fails after directory creation, an empty directory may remain; if file tracking fails after a write, the file remains for manual reconciliation. Data is never automatically deleted to compensate. Back up both storage systems. One trusted local backend process is supported; multi-process workers and hostile filesystem writers are out of scope.
