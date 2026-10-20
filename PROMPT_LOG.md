PROJECT: Dev Squad AI
CHECKPOINT: 1 of 4 — Backend Foundation
TARGET COMPLETION: Monday, October 19, 2026
MVP DEADLINE: Thursday, October 22, 2026
TESTING: Friday, October 23, 2026

ROLE:
You are the senior backend engineer building Dev Squad AI.

PROJECT OVERVIEW:
Dev Squad AI is an expandable AI software development
team that will eventually coordinate multiple AI agents
to plan, write, debug, test, and review software.

Our primary goal is to reduce AI token consumption by
using free or inexpensive cloud AI models for routine
development tasks.

Claude and Codex will eventually serve as senior
developers responsible for complex tasks and reviews.

The system will use a lightweight custom orchestrator.

IMPORTANT:
We are building the backend first.
Do not build the frontend yet.

TECH STACK:
- Node.js
- Express
- SQLite
- JavaScript
- REST API
- Environment variables for configuration

==================================================
1. PROJECT INITIALIZATION
==================================================

Inspect the current working directory.

If it contains an existing project, report what
you find before making destructive changes.

If empty, initialize Dev Squad AI.

Create a modular backend structure with folders for:

- Routes
- Controllers
- Services
- Database
- Models
- Providers
- Agents
- Orchestrator
- Configuration
- Middleware
- Tests
- Workspace management

Keep the architecture simple and expandable.

==================================================
2. DATABASE FOUNDATION
==================================================

Use SQLite.

Create database migrations.

Create the following tables:

PROJECTS:
- ID
- Name
- Description
- Status
- Workspace path
- Created date
- Updated date

TASKS:
- ID
- Project ID
- Description
- Assigned agent
- Status
- Created date
- Updated date
- Completion date

AGENTS:
- ID
- Name
- Role
- Capabilities
- Status
- Provider reference

AGENT_EXECUTIONS:
- ID
- Task ID
- Agent ID
- Execution status
- Result summary
- Error information
- Start time
- End time

AI_PROVIDERS:
- ID
- Provider name
- Model name
- Configuration metadata
- Enabled status

TOKEN_USAGE:
- ID
- Execution ID
- Provider ID
- Input tokens
- Output tokens
- Estimated cost
- Timestamp

PROJECT_CONTEXT:
- ID
- Project ID
- Context summary
- Important decisions
- Last updated

PROJECT_FILES:
- ID
- Project ID
- Relative file path
- File metadata
- Last modified

ERROR_LOGS:
- ID
- Related task ID
- Error category
- Safe error message
- Timestamp

Use foreign keys, indexes where appropriate,
parameterized queries, and database constraints.

Never store API keys in the database.

==================================================
3. PROJECT MEMORY AND PERSISTENCE
==================================================

Dev Squad AI must remember projects between sessions.

Implement the ability to:

- Create a project.
- Retrieve an existing project.
- List saved projects.
- Update project information.
- Save task history.
- Retrieve previous tasks.
- Store project context summaries.
- Store important development decisions.
- Track generated file locations.
- Track agent execution history.

Projects must remain available after restarting
the backend.

Do not automatically rerun unfinished tasks
when the application restarts.

Instead, identify interrupted tasks and mark
them as requiring review before resumption.

Prepare the architecture for future task
resumption without implementing complex
autonomous recovery yet.

==================================================
4. WORKSPACE MANAGEMENT
==================================================

Generated project files must be stored separately
from the SQLite database.

Create a configurable workspace directory.

Requirements:

- Each project receives its own directory.
- Store relative paths in the database.
- Prevent path traversal.
- Prevent access outside authorized workspaces.
- Do not overwrite existing files without approval.
- Do not execute generated code automatically.

Support configuring workspace storage on an
external hard drive later.

Do not assume the external drive is connected.

==================================================
5. CONFIGURATION AND API SECURITY
==================================================

Create environment-based configuration.

Include an .env.example file containing placeholders.

Configuration should support:

- Server port
- Database location
- Workspace directory
- AI provider selection
- AI model selection
- API key environment variable names
- Request timeout
- Token limits
- Logging configuration

Never hardcode API keys.

Never commit .env files.

Never expose credentials through API responses
or application logs.

Validate configuration at startup.

==================================================
6. BACKEND API
==================================================

Create the following REST endpoints:

GET /api/health

GET /api/projects

POST /api/projects

GET /api/projects/:id

PATCH /api/projects/:id

GET /api/projects/:id/tasks

POST /api/projects/:id/tasks

GET /api/tasks/:id

GET /api/agents

GET /api/providers

For now, agent and provider endpoints may return
safe registry information or empty configurations.

Implement input validation and appropriate
HTTP status codes.

Return consistent JSON responses.

Do not expose internal stack traces.

==================================================
7. AGENT REGISTRY FOUNDATION
==================================================

Create a modular agent registry.

Prepare these initial roles:

- Orchestrator
- Junior Developer
- QA Tester
- Senior Developer

Each agent should support:

- Unique identifier
- Name
- Role
- Capabilities
- Status
- Provider assignment
- System prompt configuration

Do not implement live AI calls yet.

The senior developer should initially be
a manual review checkpoint.

The architecture must allow additional agents
to be registered later without rewriting
the entire system.

==================================================
8. DATABASE BACKUPS
==================================================

Implement a safe database backup utility.

Requirements:

- Use SQLite-compatible backup procedures.
- Avoid copying an active database unsafely.
- Support configurable backup locations.
- Preserve existing backups.
- Handle backup failures gracefully.
- Never delete project data automatically.

Document how to restore a backup.

Test backup integrity and restoration using
temporary test data.

Do not overwrite the production database
during restoration tests.

==================================================
9. AUTOMATED TESTING
==================================================

Create automated tests for:

- Database initialization
- Database migrations
- Project creation
- Project retrieval
- Project updates
- Task persistence
- Project context persistence
- Database restart persistence
- Invalid input
- Missing project IDs
- Workspace path validation
- Missing configuration
- API error handling
- Database backup and restoration

Use isolated test databases.

Do not modify production data during tests.

Run the full test suite.

Fix failures and rerun tests before reporting.

==================================================
10. DOCUMENTATION
==================================================

Create:

README.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
PROMPT_LOG.md
DEVELOPMENT_LOG.md

Explain:

- How to install dependencies
- How to start the backend
- How to run tests
- How the database works
- How project persistence works
- How backups work
- How the API works
- How future AI providers will connect

Use beginner-friendly explanations.

Record the development instructions in PROMPT_LOG.md.

Record any genuine coding-agent mistakes discovered
during development and how they were corrected.

Do not fabricate mistakes.

==================================================
11. DEVELOPMENT RULES
==================================================

IMPORTANT:

- Work only on Checkpoint 1.
- Do not build the frontend.
- Do not implement live AI generation yet.
- Do not install unnecessary dependencies.
- Do not modify CoachLab.
- Do not delete existing user data.
- Never commit credentials.
- Never push to GitHub without permission.
- Use small, meaningful Git commits.
- Review diffs before committing.
- Test all important functionality.
- Explain technical decisions simply.

If a problem occurs:

1. Identify the cause.
2. Attempt a safe correction.
3. Run the relevant tests.
4. Document the outcome.
5. Escalate if the problem cannot be resolved safely.

Do not repeatedly attempt the same failing action.

==================================================
12. COMPLETION REPORT
==================================================

When Checkpoint 1 is finished, report:

1. Project structure created
2. Database tables created
3. API endpoints implemented
4. Persistence test results
5. Backup verification results
6. Security checks performed
7. Number of tests passed and failed
8. Git commits created
9. Any mistakes caught and corrected
10. Remaining issues or blockers

Clearly distinguish completed functionality
from planned functionality.

Confirm whether Checkpoint 1 meets its
definition of done.

DEFINITION OF DONE:

- Backend starts successfully.
- Database initializes successfully.
- Projects can be created and retrieved.
- Tasks persist after restart.
- Project context persists after restart.
- Workspace paths are validated.
- Backup and restoration tests pass.
- API endpoints return expected responses.
- Automated tests pass.
- No credentials are committed.
- Documentation is updated.

STOP AFTER CHECKPOINT 1.

Do not begin Checkpoint 2 until the user
reviews and approves the results.