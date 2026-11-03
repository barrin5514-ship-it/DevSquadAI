> Current policy (2026-11-02): Big Three roles rotate per job. Default: DeepSeek Builder, Codex Tester, Claude Code Reviewer. Builders cannot review their own step. Other providers are parked; older assignments below are historical. See docs/BIG_THREE_PLAN.md.

# Dev Squad AI — Interactive Mission Control

A local development workspace with an interactive browser dashboard, interchangeable AI providers, reviewed code drafts, and learning memory. Open http://127.0.0.1:3000/team to create projects, manage plans and assignments, authorize requests, and record reviews. Generated code is never automatically executed.

## Install and run

Requires Node.js 24 or newer (the built-in SQLite module avoids another database dependency).

1. Open a terminal in this folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and adjust the storage locations if needed.
4. Run `npm start`.
5. Open http://127.0.0.1:3000/team. See [Dashboard guide](DASHBOARD_GUIDE.md). Health remains available at http://127.0.0.1:3000/api/health.

The default server listens only on your own computer. This checkpoint has no authentication or multi-user authorization. Do not expose it to a network; network deployment requires authentication and access controls. Use one backend process per database. Request bodies are limited to 32 KB.

If your managed Windows machine uses a system certificate authority, Node may need `NODE_OPTIONS=--use-system-ca` for npm. Do not disable certificate verification.

## Configuration

Required: `DATABASE_PATH`, `WORKSPACE_DIR`, `BACKUP_DIR`. Relative paths resolve from the terminal's current directory. Database and backups must be outside the workspace, and the database must be outside the backup folder. An external drive can be configured later by using an absolute workspace path; no particular drive is assumed. Startup fails safely if storage cannot be opened.

Optional: `PORT` (3000), `HOST` (127.0.0.1), `REQUEST_TIMEOUT_MS` (30000), `TOKEN_LIMIT` (4096), `LOG_LEVEL` (info, error, silent), `AI_PROVIDER` and `AI_MODEL` (none), and `AI_API_KEY_ENV` (the name of a future key variable, not its value). Legacy AI_PROVIDER, AI_MODEL and AI_API_KEY_ENV remain compatible configuration fields; Checkpoint 2 uses per-provider settings in PROVIDER_SETUP.md. Request timeout also bounds provider calls. Logs contain fixed operational messages, never request bodies, credentials, or stack traces. Fatal CLI failures still print a safe error even in silent mode.

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

Project statuses: active, paused, completed, archived. Task creation always produces pending work. Unknown fields are rejected. Project names are limited to 200 characters; other text fields to 10,000. Coding submissions use the generation endpoint below. No background execution or automatic resumption exists.

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

See ARCHITECTURE.md, DATABASE_SCHEMA.md and ORCHESTRATOR_ARCHITECTURE.md for developer details.


## Checkpoint 2 API

See PROVIDER_SETUP.md before making real calls. Existing routes remain available. New routes use the same data/error envelope. Static-output validation failures can trigger bounded fallback; all-provider failure returns 503 with the recorded task ID. No paid provider is automatically used.

| Method | Path | Body or purpose |
|---|---|---|
| GET | /api/providers/availability | Five adapter configuration/cooldown states |
| GET | /api/models | Configured candidate models; not a claim of live verification |
| POST | /api/providers/:id/check | `{}`; check configured model catalog connectivity |
| GET | /api/positions | Five positions and permissions |
| POST | /api/agents/:id/models | providerId, model; add a configured model assignment |
| POST | /api/projects/:id/generate | request; optional category, mode, complexity, agentId, taskId |
| GET | /api/drafts/:id | Retrieve a draft and static checks |
| GET | /api/tasks/:id/drafts | All candidate/revision drafts for a task |
| GET | /api/usage | Optional provider, agent, project, task query filters |
| GET | /api/performance | Recent agent/provider/model/category statistics |
| POST | /api/mistakes | Record a mistake; see LEARNING_MEMORY.md |
| GET | /api/projects/:id/mistakes | Recent mistake history |
| POST | /api/mistakes/:id/corrections | Record correction and manual verification evidence |
| POST | /api/lessons | correctionId, summary, category |
| POST | /api/lessons/:id/approve | approvedBy; enforces verification prerequisite |
| GET | /api/projects/:id/lessons | category query; only verified approved lessons |
| POST | /api/tasks/:id/tests | draftId, passed (boolean), evidence, recordedBy |
| POST | /api/tasks/:id/reviews | draftId, reviewerIdentity, status, findings; requiredCorrections for rejection |
| GET | /api/tasks/:id/reviews | Workflow state, hierarchy and actual review records |
| POST | /api/tasks/:id/approve | draftId, approvedBy; requires tests and senior approval |

Example after configuring a verified free provider:

```powershell
$project = Invoke-RestMethod http://127.0.0.1:3000/api/projects -Method Post -ContentType 'application/json' -Body '{"name":"Calculator demo"}'
Invoke-RestMethod "http://127.0.0.1:3000/api/projects/$($project.data.id)/generate" -Method Post -ContentType 'application/json' -Body '{"request":"Create a JavaScript calculator function","mode":"standard"}'
```

Generation initially supports JavaScript plus JSON/Markdown/text supporting files. Successful syntax checks do not prove behavior. Behavioral tests must be performed separately in an appropriate controlled environment and their real evidence recorded; this application does not execute the draft. No task becomes complete without a senior review and user approval. Manual review identities/evidence are trusted operator attestations, not authenticated claims.

The API is for trusted local clients only and has no user authentication. Browser-origin mutations are rejected, but that is not network authentication. Leave HOST at 127.0.0.1 and do not expose this server. Keys stay in environment configuration, are not put into prompts or persisted, and provider errors are sanitized.

**Provider status:** adapters are mock-tested. Prior live Groq and OpenRouter benchmark evidence is recorded in PROMPT_LOG.md and FREE_MODEL_BENCHMARK.md; it is not a claim of present uptime. Gemini remains excluded from team routing. No live provider requests were made to test the interactive dashboard.

## Team orchestration foundation

The interactive dashboard is at `/team` after starting the backend. See [Dashboard guide](DASHBOARD_GUIDE.md) for browser controls and manual boundaries. See [ORCHESTRATOR_ARCHITECTURE.md](ORCHESTRATOR_ARCHITECTURE.md) for action endpoints, [AGENT_ROLES.md](AGENT_ROLES.md) for the owner/Claude/Codex hierarchy, and [SENIOR_REVIEW_WORKFLOW.md](SENIOR_REVIEW_WORKFLOW.md) for manual evidence handoffs.

The workflow keeps live calls off by default (`TEAM_LIVE_ENABLED=false`). The owner can explicitly enable free-request controls for the current session in Settings, then separately authorize each request. This does not change `.env`, provider free confirmations, or billing. Plans, independent review receipts and owner acceptance are explicit; generated drafts are never automatically applied, tested on the host, deployed or pushed.

Browser writes use the dedicated same-origin `/api/console` boundary with a per-process capability. Legacy API browser-mutation restrictions remain unchanged. This is a trusted localhost application, not a multi-user authenticated service. Run `npm test -- --test-concurrency=1` for the complete mocked suite.


## Multi-model recovery update

Durable hashed checkpoints, explicit free-provider fallback consent, category-based smart assignment and owner-authorized resume are available in the existing /team dashboard. Cerebras trial models and optional prepaid DeepSeek remain disabled; Claude/Codex reviews remain manual. See ORCHESTRATOR_ARCHITECTURE.md, DASHBOARD_GUIDE.md and PROVIDER_SETUP.md for scope, configuration, budgets and current verification limits. Linux/WSL2 automatic review is retired from the active roadmap; historical investigations are preserved.


## Current AI team

Developers: Groq (primary), Poolside Laguna (development/testing), MiniMax (development/debugging). DeepSeek is the Senior Developer and sole lead independent reviewer. Paid usage stays disabled until configured and individually authorized; a paused review is never reported as approval. Claude/Codex manual integrations are retired from the active application and preserved only in audit history. See SENIOR_REVIEW_WORKFLOW.md for the new flow and its self-review/billing limits.
