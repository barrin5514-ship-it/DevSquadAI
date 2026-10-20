# AI data flow

User request → backend validation → agent permissions and provider selection → verified lesson retrieval → AI API → bounded response decoding → file/schema/path/syntax validation → persistent draft and usage → recorded behavioral test evidence → manual senior review → user approval.

## Implemented

- `POST /api/projects/:id/generate` accepts request, optional category, mode (`standard`/`quality`), complexity (`normal`/`high`), agentId, and taskId for an eligible correction.
- A new task is marked running with a separate `generating` workflow. Corrections reuse the task but reset its current draft reference. Concurrent corrections are rejected while generation is running.
- The agent must be ready, have the implement capability, and hold a position with generate permission. Model assignments are a separate relation. No role is permanently tied to a model.
- The provider receives the request, bounded verified reference lessons and configured system guidance. Existing project files and secrets are not automatically uploaded.
- Each attempt reserves a local budget before network activity. Usage, outcome and execution history are recorded even for invalid outputs when usage is available.
- Output must be a files JSON object with 1–10 files and at least one JavaScript file. Allowed types are .js, .mjs, .cjs, .json, .md and .txt. Total content is capped at 100 KB; remote responses at 512 KB. Hidden paths, traversal, junctions, duplicate case-insensitive names and unsupported types are rejected.
- Node's `--check` parses JavaScript through stdin without evaluating it; JSON is parsed. Imports, commands, generated tests and generated code are never executed. Static validation is not a security audit or behavioral test.
- Valid drafts are immutable records in SQLite; no generated files are written to project workspaces. A draft that passes static checks becomes awaiting_senior_review, while the original task stays requires_review.
- Record externally obtained tests through `POST /api/tasks/:id/tests`, then an actual senior review through `POST /api/tasks/:id/reviews`. Approval requires passing test evidence. Rejection requires corrections and a new draft; old draft evidence cannot authorize the replacement.
- Approved senior review makes the task eligible_for_user_approval. `POST /api/tasks/:id/approve` records user approval and completes the task. A database trigger enforces the test/review/approval gate for coding workflows.
- On restart, running work requires review and in-flight usage is marked interrupted. It is never rerun. All-provider failure creates escalation_required and safe error records.

## Senior hierarchy

Claude is the primary intended senior reviewer. Codex is the backup, and recording a Codex manual review requires `ALLOW_CODEX_MANUAL_REVIEW=true`. Humans can record their own actual manual reviews. No automatic calls to either senior provider are implemented, and no review is invented when they are unavailable.

## Deferred

Frontend, sandboxed execution/behavioral test runner, automated senior-provider integrations, publishing approved files, paid-provider spending authorizations, autonomous recovery and scheduling. User approval completes the recorded coding task; it does not export or execute its draft. Checkpoint 3 requires separate approval.
