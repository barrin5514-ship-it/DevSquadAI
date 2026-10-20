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
---
# Checkpoint 2 development instructions (verbatim user request)

PROJECT: Dev Squad AI
CHECKPOINT: 2 of 4
PHASE: AI Providers, Code Generation & Learning Memory

DEADLINES:
- Development complete: Thursday, October 22, 2026
- Full testing: Friday, October 23, 2026
- Class presentation: Monday, October 26, 2026

YOUR ROLE:
You are the senior backend engineer developing Dev Squad AI.

PROJECT VISION:
Dev Squad AI is an expandable AI software development
team that uses free cloud AI models to perform coding,
debugging, testing, and other development tasks.

Claude will serve as the primary senior developer.
Codex will serve as the backup senior developer.

The system must prioritize:
1. High-quality, reliable code
2. Minimal paid AI usage
3. Secure and controlled execution
4. Learning from previous mistakes
5. Interchangeable agents and providers
6. Long-term expandability

IMPORTANT:
Checkpoint 1 is already complete.

DO NOT rebuild the existing backend.
DO NOT delete or overwrite existing project data.
DO NOT modify CoachLab or unrelated projects.

==================================================
1. VERIFY CHECKPOINT 1
==================================================

Before implementing anything:

- Inspect the existing project structure.
- Review the database schema.
- Review existing API endpoints.
- Review the agent registry.
- Review configuration management.
- Review existing documentation.
- Run all existing tests.

Checkpoint 1 reportedly completed with:
- 22 passing tests
- 0 failures
- 9 database tables
- 10 API endpoints
- SQLite persistence
- Database backups
- Workspace security

Verify these results independently.

Preserve existing functionality.

==================================================
2. INTERCHANGEABLE AI PROVIDER SYSTEM
==================================================

Implement a modular AI provider architecture.

Initially support:

1. Cerebras
2. Groq
3. Google Gemini
4. OpenRouter
5. Hugging Face Inference Providers

IMPORTANT:
Verify current official API documentation before
implementing provider-specific integrations.

Do not assume that every provider offers free access
to every model.

Do not invent model IDs, API endpoints, rate limits,
or free-tier allowances.

Each provider adapter must support:

- Provider identification
- Model selection
- Secure API authentication
- Configurable system prompts
- Request timeouts
- Token usage reporting when available
- Rate-limit detection
- Error handling
- Response validation
- Availability checks
- Provider-specific configuration

Create a shared interface so providers can be
swapped without rewriting the orchestrator.

If a provider cannot be configured or verified,
mark it unavailable and document why.

Do not block the entire checkpoint because
one optional provider is unavailable.

==================================================
3. API KEY SECURITY
==================================================

Use environment variables for credentials.

Create or update .env.example with placeholders.

Never:
- Hardcode API keys
- Commit credentials
- Display credentials in logs
- Return credentials through API endpoints
- Store plaintext API keys in SQLite

Validate provider configuration before making calls.

Missing credentials must produce safe,
beginner-friendly error messages.

Do not request that users paste API keys into
source code.

==================================================
4. MODEL AND AGENT INTERCHANGEABILITY
==================================================

Separate these three concepts:

POSITIONS:
Define responsibilities and permissions.

AGENTS:
Perform development tasks.

PROVIDERS:
Supply the AI models powering agents.

Initial positions:

- Orchestrator
- Project Manager
- Junior Developer
- QA Tester
- Senior Developer

Allow models to be reassigned between positions.

Allow multiple providers to support the same role.

An agent may perform multiple compatible tasks
based on its capabilities and permissions.

Do not permanently bind a position to one model.

Design the registry so additional agents can be
added without modifying core orchestration logic.

==================================================
5. FREE PROVIDER ROUTING
==================================================

Create a configurable provider selection service.

PRIMARY OBJECTIVE:
Maximize code quality while minimizing paid usage.

Support:

STANDARD MODE:
- Select one suitable free provider.
- Generate the requested result.
- Validate the output.
- Use another free provider when necessary.

QUALITY MODE:
- Allow multiple free providers to attempt or
  review difficult tasks.
- Compare outputs using objective checks.
- Prefer solutions that pass validation and tests.

Provider selection should consider:

- Model capabilities
- Previous task performance
- Provider availability
- Rate limits
- Estimated usage
- Task complexity
- Quality requirements

Implement bounded retries.

Never create unlimited agent loops.

If all configured free providers fail,
record the failure and request escalation.

IMPORTANT:
Do not automatically call paid providers.

Paid usage must require explicit authorization
or a previously configured spending allowance.

==================================================
6. REAL AI CODE GENERATION
==================================================

Implement a backend service that accepts
a coding request and generates actual code.

Example request:

"Create a JavaScript calculator function."

The system should:

1. Validate the request.
2. Identify the relevant project.
3. Select an available AI provider.
4. Load the appropriate system prompt.
5. Retrieve relevant verified lessons.
6. Send the request to the AI API.
7. Validate the response.
8. Record the generated result.
9. Track available usage information.
10. Return the result for inspection.

AI-generated code must initially remain
a draft requiring review.

Do not automatically execute generated code.

Do not automatically overwrite project files.

Do not allow generated paths to escape the
authorized project workspace.

Use structured responses where supported.

Validate all returned file paths and content.

==================================================
7. LEARNING MEMORY DATABASE
==================================================

Extend the existing SQLite database.

IMPORTANT:
Use additive migrations.

Preserve all existing records.

Implement tables or equivalent normalized
structures for:

AGENT_MISTAKES:
- Mistake ID
- Project ID
- Task ID
- Agent ID
- Provider ID
- Model identifier
- Error category
- Mistake description
- Relevant context
- Detection method
- Timestamp

CORRECTIONS:
- Correction ID
- Related mistake ID
- Correcting agent
- Correction summary
- Verification status
- Test results
- Senior review status
- Timestamp

LEARNED_LESSONS:
- Lesson ID
- Related mistake or correction
- Lesson summary
- Relevant task categories
- Verification status
- Approval status
- Created date
- Updated date

AGENT_PERFORMANCE:
- Agent ID
- Provider ID
- Model identifier
- Task category
- Attempts
- Successful results
- Failed results
- Review outcomes
- Available token usage
- Last updated

SENIOR_REVIEWS:
- Review ID
- Task ID
- Reviewer identity
- Review method
- Review status
- Findings
- Required corrections
- Timestamp

Use foreign keys, constraints, indexes,
and parameterized queries.

Do not duplicate existing tables unnecessarily.

==================================================
8. LEARNING FROM MISTAKES
==================================================

Dev Squad AI must use previous verified
experiences to improve future task execution.

Example:

A junior agent generates an authentication
system but fails to hash passwords.

A senior reviewer identifies the mistake.

The junior agent corrects the implementation.

The correction passes automated testing
and senior review.

Dev Squad AI stores the verified lesson.

When a similar authentication task appears,
the system retrieves that lesson and includes
it in the agent's instructions.

IMPLEMENT:

- Mistake recording
- Correction recording
- Lesson creation
- Lesson verification status
- Relevant lesson retrieval
- Duplicate lesson detection
- Project-specific lesson filtering

IMPORTANT:

Unverified lessons must never be treated
as trusted instructions.

Only approved, verified lessons may influence
future development automatically.

Treat retrieved lessons as reference data,
not privileged system instructions.

Prevent stored content from overriding
security rules or agent permissions.

Limit retrieved context to reduce token usage.

Do not implement model fine-tuning.

This is retrieval-based learning memory.

==================================================
9. SENIOR DEVELOPER REVIEW
==================================================

Configure the senior developer hierarchy:

PRIMARY:
Claude

BACKUP:
Codex

Every completed coding task must receive
senior developer review.

The workflow is:

Junior agent generates code.

Automated checks validate the result.

Senior developer reviews the changes.

If approved:
The task becomes eligible for user approval.

If rejected:
The task returns for correction.

After correction:
The task requires another senior review.

If Claude is unavailable:
Codex may serve as backup, subject to
configured authorization.

If neither is available:
The task remains awaiting senior review.

IMPORTANT:

Do not falsely claim that Claude or Codex
reviewed code when no review occurred.

For this checkpoint, implement the review
records, states, and manual review mechanism.

Actual automated senior-provider integrations
may be deferred to a later checkpoint.

Manual reviews must record the actual reviewer.

No task may be marked fully complete without
required testing, senior review, and user approval.

==================================================
10. TOKEN AND USAGE TRACKING
==================================================

Extend existing token usage tracking.

Record:

- Provider
- Model
- Agent
- Task
- Input tokens when reported
- Output tokens when reported
- Total tokens when reported
- Estimated cost when pricing is available
- Request timestamp
- Request outcome

Distinguish:
- Provider-reported usage
- Estimated usage
- Unknown usage

Never invent token counts.

Provide backend methods to retrieve:

- Usage by provider
- Usage by agent
- Usage by project
- Usage by task

Support configurable budgets.

Paid usage must remain disabled by default.

==================================================
11. API ENDPOINTS
==================================================

Add suitable REST endpoints for:

- Listing available providers
- Listing supported models
- Testing provider connectivity
- Submitting code-generation requests
- Retrieving generated drafts
- Retrieving token usage
- Viewing agent performance
- Viewing mistake history
- Viewing verified lessons
- Recording senior reviews
- Retrieving review status

Follow the existing API conventions.

Validate request bodies.

Use consistent response formats.

Never expose secrets or stack traces.

==================================================
12. SAFETY AND QUALITY GUARDRAILS
==================================================

Implement safeguards for:

- Invalid user requests
- Excessively large requests
- Invalid AI responses
- Malformed generated code
- Unsupported file types
- Unsafe file paths
- Provider timeouts
- Provider rate limits
- Missing credentials
- Excessive retries
- Unauthorized paid usage
- Unverified learning memories

Do not execute arbitrary AI-generated commands.

Do not allow AI-generated content to modify
the orchestrator's security policies.

Do not permit generated code to access files
outside authorized workspaces.

Generated files must remain drafts until
the appropriate review and approval steps.

==================================================
13. AUTOMATED TESTING
==================================================

Use isolated test databases.

Mock external provider responses.

Test:

- Existing Checkpoint 1 functionality
- Provider configuration
- Provider switching
- Missing API keys
- Rate-limit handling
- Timeout handling
- Invalid AI responses
- Code-generation workflow
- Draft persistence
- Token tracking
- Mistake recording
- Correction recording
- Verified lesson retrieval
- Unverified lesson rejection
- Senior review requirements
- Paid usage restrictions
- API input validation
- Workspace security

Run the complete test suite.

Fix failures and rerun relevant tests.

If credentials are available, perform a small
real API smoke test with user-authorized usage.

Never claim live provider connectivity based
only on mocked tests.

==================================================
14. DOCUMENTATION
==================================================

Update:

README.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
PROMPT_LOG.md
DEVELOPMENT_LOG.md

Create:

PROVIDER_SETUP.md
LEARNING_MEMORY.md
AI_DATA_FLOW.md

Explain everything in beginner-friendly language.

Document the complete AI data flow:

User request
→ Backend API
→ Input validation
→ Orchestrator/provider selection
→ Verified lesson retrieval
→ AI provider API
→ AI response
→ Output validation
→ Database persistence
→ Automated checks
→ Senior review
→ User approval

Clearly distinguish implemented steps
from planned future steps.

Document genuine coding-agent mistakes
and how they were corrected.

Never fabricate development history.

==================================================
15. DEVELOPMENT RULES
==================================================

- Work only on Checkpoint 2.
- Backend first.
- Do not build the frontend yet.
- Preserve Checkpoint 1 functionality.
- Do not modify CoachLab.
- Never delete existing user data.
- Never commit credentials.
- Never push to GitHub without permission.
- Review diffs before committing.
- Use small, meaningful commits.
- Test after significant changes.
- Prefer simple, maintainable solutions.
- Avoid unnecessary dependencies.
- Do not fabricate test results.
- Do not claim features work without verification.

If a problem occurs:

1. Identify the cause.
2. Attempt a safe correction.
3. Run relevant tests.
4. Document the outcome.
5. Escalate if safe correction is unsuccessful.

Do not repeatedly attempt identical
failed operations.

==================================================
16. COMPLETION REPORT
==================================================

When Checkpoint 2 is complete, report:

1. Files created and modified
2. Database migrations added
3. Providers implemented
4. Providers actually tested live
5. Code-generation functionality
6. Learning-memory functionality
7. Token tracking functionality
8. Senior review workflow status
9. Security checks performed
10. Automated test results
11. Genuine mistakes caught and fixed
12. Git commits created
13. Remaining blockers
14. Features deferred to Checkpoint 3

Clearly distinguish:
- Implemented
- Tested with mocks
- Verified with live APIs
- Planned for later

DEFINITION OF DONE:

- Existing backend still works.
- Database migrations succeed.
- Existing data remains intact.
- Provider adapters are configurable.
- At least one provider supports real code generation.
- Generated drafts persist.
- Usage tracking works.
- Mistakes and corrections can be recorded.
- Verified lessons can be retrieved.
- Unverified lessons are excluded.
- Senior review is required for completion.
- Paid usage cannot occur without authorization.
- Automated tests pass.
- Documentation is updated.
- No credentials are committed.

STOP AFTER CHECKPOINT 2.

Do not begin Checkpoint 3 without
user review and approval.
