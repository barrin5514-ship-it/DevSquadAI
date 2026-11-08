# Demo Workflow Debugging Implementation Plan

> For agentic workers: use systematic-debugging, test-driven-development and native inline execution. Owner authorizes repairs without intermediate approval. No agents or paid calls.

Goal: verify truncation accounting/recovery, Windows scope enforcement and one-Send handoffs using disposable simulations.

Architecture: retain adapters and orchestration. Add fixture coverage at actual provider/HTTP boundaries, patch only reproduced defects, and run serial regressions. Preserve uncommitted work and production data.

Tech stack: Windows, Node 24, Express, SQLite, node:test.

Spec: owner request in this chat (full workflow repairs with simulated providers).

Constraints: no live provider request; no production project/record/config changes; no commit/push; no scope/approval weakening.

Review focus: complete truncation vs unknown usage; fallback enabled/disabled; caller-controlled scope tampering; actual files/test evidence at handoff; duplicate and resumed dispatch.

- [x] Read current instructions, diff/ledger and DeepSeek pipeline; run existing DeepSeek fixtures (21/21).
- [x] Task 1: tests/workflow-debug-deepseek.test.js reproduces complete length response accounting versus interrupted stream; patch src/services/studio-workers.js only if reproduced; run focused stream/accounting/fallback checks.
- [x] Task 2: run tests/demo-workers.test.js serially on Windows; enumerate tampered scope cases; reproduce any accepted mutation before a minimal scope fix.
- [x] Task 3: exercise normal HTTP Send and saved actual files/test evidence with simulated workers; cover limits, disabled fallback, missing artifacts, duplicate Send and pause/resume. Repair only reproducible gaps.
- [x] Final: full serial suite, final diff and documentation/prompt-log evidence. Leave local; no commit.

Completion: final focused19/19, Windows demo-workers27/27, full serial734/734, Chrome one-Send simulation passed. Branch kept local as owner requested; no integration or cleanup of existing work.
