# Dev Squad AI — Checkpoint 1

A local backend for saving development projects, tasks, context, files, and agent history. No frontend, generated-code execution, or live AI requests are included.

## Install and run

Requires Node.js 24 or newer (the built-in SQLite module avoids another database dependency).

1. Open a terminal in this folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and adjust the storage locations if needed.
4. Run `npm start`.
5. Open http://127.0.0.1:3000/api/health. Expect `{"data":{"status":"ok"}}`.

The default server listens only on your own computer. This checkpoint has no authentication or multi-user authorization. Do not expose it to a network; network deployment requires authentication and access controls. Use one backend process per database. Request bodies are limited to 32 KB.

If your managed Windows machine uses a system certificate authority, Node may need `NODE_OPTIONS=--use-system-ca` for npm. Do not disable certificate verification.

## Configuration

Required: `DATABASE_PATH`, `WORKSPACE_DIR`, `BACKUP_DIR`. Relative paths resolve from the terminal's current directory. Database and backups must be outside the workspace, and the database must be outside the backup folder. An external drive can be configured later by using an absolute workspace path; no particular drive is assumed. Startup fails safely if storage cannot be opened.

Optional: `PORT` (3000), `HOST` (127.0.0.1), `REQUEST_TIMEOUT_MS` (30000), `TOKEN_LIMIT` (4096), `LOG_LEVEL` (info, error, silent), `AI_PROVIDER` and `AI_MODEL` (none), and `AI_API_KEY_ENV` (the name of a future key variable, not its value). AI settings are reserved for later adapters. Request timeout controls HTTP request receipt, not future AI execution. Logs contain fixed operational messages, never request bodies, credentials, or stack traces. Fatal CLI failures still print a safe error even in silent mode.

Never put secrets in project descriptions, context, provider metadata, or prompts. Keys belong only in environment variables; `.env` and local databases are ignored by Git.

## API

Successful responses use `{"data": ...}`. Errors use `{"error":{"message":"..."}}`. Creation returns 201, bad input 400, missing resources 404, and unexpected failures 500 with a generic message.

| Method | Path | Purpose/body |
|---|---|---|
| GET | /api/health | Check database connectivity |
| GET | /api/projects | List projects |
| POST | /api/projects | Create with `name`, optional `description` |
| GET | /api/projects/:id | Read project |
| PATCH | /api/projects/:id | Update `name`, `description`, `status` |
| GET | /api/projects/:id/tasks | Read task history |
| POST | /api/projects/:id/tasks | Create with `description`, optional `assigned_agent` |
| GET | /api/tasks/:id | Read task |
| GET | /api/agents | Safe agent registry |
| GET | /api/providers | Safe provider registry, initially empty |

Project statuses: active, paused, completed, archived. Task creation always produces pending work. Unknown fields are rejected. Project names are limited to 200 characters; other text fields to 10,000. No task execution or resumption endpoint exists yet.

Example in PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/projects -Method Post -ContentType 'application/json' -Body '{"name":"My first project"}'
```

## Persistence and workspace

SQLite is stored on disk and reused on restart. Context, decisions, file tracking, and execution history are available through internal model/service methods; they are not extra REST endpoints in this checkpoint. Running tasks and executions become `requires_review` at startup. Pending tasks remain pending. Nothing runs automatically.

Each project gets a UUID directory. The database stores that relative folder name and relative file names. `ProjectService.writeFile` checks paths, records file locations, and refuses to overwrite unless its caller explicitly passes `{approveOverwrite:true}`. Future callers must obtain human approval before setting that flag. Symlinks/junctions and traversal are rejected. Workspace files must be writable only by trusted local users: checks cannot prevent a hostile local process from replacing directories during a write. Generated code is never executed.

## Tests

Run `npm test`. Tests use temporary directories and isolated databases, including restore tests. No production database is opened by tests.

## Backup and restore

Run `npm run backup` after configuring `.env`. It opens the existing database and uses SQLite's online backup API, then checks integrity and foreign keys. Timestamp plus UUID names preserve older backups. Failure does not delete data. No automatic retention deletion is implemented.

To restore:

1. Stop the backend. Preserve its current database and any `-wal`/`-shm` files together; do not replace an active database.
2. Choose a verified backup and copy it into a **new empty directory** under a new database filename. Never overwrite an existing database.
3. Set `DATABASE_PATH` in `.env` to this restored copy. Leave `WORKSPACE_DIR` pointing to the corresponding project files.
4. Start the backend, verify health, project and task records, and context. Running work in the snapshot will require review.
5. Retain the original data until you have confirmed the restore.

Database backups do not include generated workspace files. Back those up separately while writes are stopped. Restoration tests demonstrate the same fresh-destination approach using temporary data.

See ARCHITECTURE.md and DATABASE_SCHEMA.md for developer details. Stop at Checkpoint 1; later work requires review and approval.
