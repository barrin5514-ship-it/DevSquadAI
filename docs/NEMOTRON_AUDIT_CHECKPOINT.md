# Nemotron integration audit checkpoint

The application checkpoint combines the free OpenRouter Nemotron worker with the workspace and execution repairs it depends on. The changes share runtime modules and tests, so they are committed together.

## Review scope

- Managed workspace registration, protected instructions, folder ownership, and recovery.
- Native worker diagnostics, redaction, Windows timeout enforcement, and process cleanup.
- Task-bound approvals, independent test provenance, artifact-bound reviews, and final owner acceptance.
- Conversation and project tools that display execution state, saved evidence, and controls.
- Cached Model Health and temporary role selection for `nvidia/nemotron-3.5-super-vl:free`.

The Nemotron path requires current zero-price catalog and account evidence, an exact task approval, and an unused execution slot. It pins the requested model, disables reasoning and fallback, and checks the returned model and structured result before applying files. Unknown outcomes retain existing recovery protections.

## Verification

Application commit `82b5930d6762c4a3a1711b22cbf172d2ce446606` records the exact tree exported from the Git index. In a separate local directory, `node scripts/test-serial.js` completed with **635 passes, zero failures, zero cancellations, and zero skips**, including the real Windows timeout and Stop test.

The earlier integration verification recorded 657 automated passes in the broader checkout, 11 regular-dashboard checks, 20 simulated workflow checks, and four restart checks. Comparing both test reports by name accounts for all 22 omitted cases in the three standalone experiment files. The browser and restart counts are historical evidence. The earlier coding probe was a separate, bounded request. Live team role performance remains unverified.

A read-only comparison of all 64 production database tables against the supported pre-integration backup found only the runtime process lease difference from the prior restart. Four protected workspace fingerprints and the historical execution lock matched, and Expense Tracker had zero executions.

## Publication scope

This branch contains the application changes, automated tests, and this summary. Local evidence, screenshots, account observations, manual handoff notes, and date-specific diagnostic scripts are retained locally. The standalone classroom simulation, capability-review experiments, and continuation-plan experiments are outside this checkpoint. No provider inference was requested during checkpoint preparation.

The staged application files were checked for configured credential values, common token and key formats, and private local paths. The exported tree was checked for database signatures and forbidden file paths. Two credential-shaped URLs in unchanged tests were reviewed as dummy fixtures for rejection and redaction. The staged changes contained no credential matches.
