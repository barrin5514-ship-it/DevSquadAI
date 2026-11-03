# Earlier to-do demo call audit — 2026-11-03

## Plain-English finding

The saved production records describe real DeepSeek, Codex and Claude responses, not the isolated mocked test runs. They do not establish who initiated the run. The owner says they never pressed Start; this report does not attribute that action to them.

Job: b5e4176a-ad93-4614-8980-e07ab63bf320. Task: 34076590-93a0-496d-9238-acd8ccb0502b. Production scope: dd6be4e1-ecf3-4aa1-8c28-76bea3d80a11. All remain preserved in the main database.

## Recorded evidence (November 3, Eastern Standard Time)

- Scope preparation: 1:37:55 PM (18:37:55.032 UTC).
- Start event: 1:38:40 PM (18:38:40.246 UTC).
- DeepSeek model GET and balance GET: recorded HTTP 200.
- DeepSeek inference POST: 1:38:45 PM, HTTP 200, 3.296 seconds, completed. Provider-reported tokens: 220 input, 752 output, 972 total. Calculated cost recorded: $0.0009684. This is a calculation, not an independently verified provider invoice or charge. No fresh authenticated balance or billing lookup was performed in this audit.
- Codex tester: completed; native usage record has 15,519 input tokens and 198 output tokens, with zero cached input tokens. Saved test evidence is classified isolated_runner, not a fixture-only mock.
- Claude Code reviewer: completed; native usage record has 2 input tokens, 5,044 cache-creation input tokens and 1,352 output tokens. These categories do not independently prove included-plan billing or its charge.
- Three report deliveries are recorded as accepted by Zapier. Matching GitHub handoffs were recorded between turns. Finished at 1:40:53 PM (18:40:53.749 UTC), round three.

These values differ from the application's known unit-test fixture responses. The production ledger is consistent with the real worker pipeline. Local records are evidence of saved responses, not independent provider-side audit attestations.

## Attribution limitation

The old Start endpoint unconditionally wrote Owner started the bounded loop when called through the dashboard capability. That wording was not a verified human-click receipt. There is no retained per-request caller identity or button-action trace sufficient to identify the initiator. A dashboard-capable local client could invoke the endpoint, so the label alone cannot contradict the owner's account. No credential, IP, authorization header or webhook URL was inspected for attribution or exposed.

The old scoped/demo and hello dispatch routes now return HTTP 410. Their data remains readable as history. New project jobs record a Run request ID and durable events rather than asserting a verified human identity. This is still a trusted localhost app, not a multi-user authenticated service.

## This task's activity

No inference requests, old demo replay, Zapier report or Run action occurred during this implementation/audit. Only a static, credential-free local sandbox fixture was executed. The fresh Friday project/chat was prepared with a ready status and no Run request. See PROJECT_STUDIO_MAIN_VERIFICATION_20261103.json and FRIDAY_TODO_PREP_20261103.json.
