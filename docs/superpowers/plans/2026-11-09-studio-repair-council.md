# Studio Repair Council Implementation Plan

**Goal**
Diagnose a paused stage with the authorized team and continue only from a verified checkpoint.

**Architecture**
Retain bounded, redacted final output and findings on Studio executions. Bind council routes and limits to the existing Send proposal. Save one round record per failed execution, and use the existing Builder correction and independent review pipeline to implement any agreed plan. No schema migration is needed.

- [x] Reproduce a paused Builder in the HTTP fixture and assert a bounded council can continue it.
- [x] Add execution evidence, diagnosis and synthesis validation, and dispatch authorization.
- [x] Verify disagreement, absence, exhausted rounds, unknown outcomes, and independent test and review gates.
- [x] Show the plan and diagnoses in the Studio conversation. Verify in Chrome with simulated providers.
- [x] Run the full serial suite and verify the SQLite backup and restart.
