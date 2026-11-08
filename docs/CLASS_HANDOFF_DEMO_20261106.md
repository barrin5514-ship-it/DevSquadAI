# Track B — class handoff simulation

November 6, 2026, America/New_York. **VERIFIED for the local simulation, not live AI execution.** Branch `feature/workspace-ui-redesign`; no commit/push/merge/deploy or paid call.

## Open and present

**http://127.0.0.1:3002/class-demo** — server left running, zero owner jobs started. Regular Dev Squad remains separate at http://127.0.0.1:3000/team.

1. Type a small task, for example: “Build a small to-do list with tests.”
2. Click **Run simulation**.
3. Explain the three labeled rounds: **Codex Builder → Claude Tester → DeepSeek Reviewer**. Reports show source, destination, time, saved revisions and checkpoint.
4. Show the actual local fixture tests (4/4), simulated review and pending **Approve simulation outcome** gate. Only the owner clicks approval.
5. Refresh to show saved history. Expand **Prepared simulated Zapier event**: it says **NOT SENT**.

Optional failure demonstration: include `[SIMULATE FAILURE]` in the task; it pauses deliberately. **Stop simulation** is visible while a run is active. Saved simulations can be reopened from the dropdown. A read-only link opens the existing full workspace interface for that simulation.

## What actually works

Uses the existing `createApp`, SQLite Studio sessions/events/revisions/checkpoints, role validation, task locks, Stop, independent-review binding and owner acceptance. The new page is a small presentation surface over that existing pipeline, not a replacement dashboard.

Every agent response is a **fixed deterministic fixture**, clearly labeled SIMULATION. The prompt is saved but does not create custom code. A trusted fixed to-do utility and four test cases are written through the existing artifact workflow. A separate real Node process runs those tests with file-read permissions confined to the demo root and no credential environment. Neither simulated Claude nor simulated DeepSeek claims to execute them. Review binding remains independent of Builder/Tester identity; owner acceptance is never automatic.

Storage is separate: `data/class-handoff-demo/simulation.sqlite` and its local disposable repository. `.env` is never loaded by the demo launcher. Provider keys, handoff token and webhook settings are absent from its configuration. HTTP provider/GitHub/webhook fetch is rejected. The full-workspace view is read-only; all non-demo mutation routes are blocked. The demo's local same-origin capability protects its mutation endpoints.

## GitHub and Zapier: inspected, not claimed connected

Existing `GitHubHandoff` implements a bounded, authenticated GET of the fixed `handoffs/next-prompt.json` on the `handoffs` branch, with encoding/size/hash checks. It is a reader, not a remote commit/push integration. Legacy demo seeding code can make restricted local demo commits; the class simulator makes **no commits** and does not invoke that legacy flow. There is no new GitHub commit or live retrieval evidence from this task.

Existing `WebhookOut` supports cleaned reports and a sample/test event, with persisted private settings and bounded no-retry delivery. The main app's configured/enabled booleans were read without revealing its URL; both were true and remain unchanged. The class simulator does not inherit that URL or enable delivery. Its prepared event is displayed locally only, **NOT SENT**. No Zap was published or triggered. Network verification remains unverified and requires separate authorization.

## Files changed

- `src/services/class-handoff-demo.js`: isolated credential-free application instance, fixed simulated workers, actual Node fixture runner, local API and safe mutation boundary.
- `src/dashboard/class-demo.html` and `class-demo-ui.js`: prompt, three-round timeline, current role, reports, history, test/checkpoint evidence, Stop and owner approval; truthful integration labels.
- `scripts/run-class-handoff-demo.js`: starts loopback port 3002 without loading .env or starting any job.
- `scripts/verify-class-handoff-demo.js`: real Chrome verification against a separate disposable database.
- `tests/class-handoff-demo.test.js`: integration, failure/Stop/duplicate protection, origin/capability/approval checks and restart persistence.
- The new managed-root helper/tests, both reports, verification files and `docs/PROMPT_LOG.md`.

## Tests and browser evidence

Serial command, 128 MiB heap:

```powershell
node --max-old-space-size=128 --test --test-concurrency=1 tests/class-handoff-demo.test.js tests/managed-workspace-root.test.js tests/studio-failover.test.js tests/studio-run-scope.test.js tests/webhook-out.test.js tests/messenger.test.js
```

**61 passed, 0 failed, 0 skipped.** This is the relevant suite, not a claim that the entire application suite ran. The new demo contributes five integration tests; the managed-root helper contributes four. Each successful fixture run also actually executes four local Node behavior tests.

```powershell
node --max-old-space-size=128 scripts/verify-class-handoff-demo.js
```

**12 real Chrome checks passed:** startup labels, no premature approval, visible Stop, three handoffs, accurate test findings, NOT PUSHED/NOT SENT, reload, backend restart, deliberate failure, owner Stop, zero page errors and no stale simulation locks. Test runs used disposable databases; no owner demo task was accepted. Final presentation-only round/current-agent text was rechecked in Chrome.

The actual owner-ready server was separately opened in real Chrome: page ready, zero jobs, zero page errors. Screenshots/logs: `docs/verification/class-handoff-demo-browser-20261106/`, `class-demo-owner-ready-20261106.png/.json`, `class-handoff-demo-browser-20261106.txt`, and `dual-track-tests-20261106.txt`.

## Limitations and next action

No live agents, AI quality assessment, real GitHub operations or Zapier delivery are verified by this simulation. Its fixed fixture is deliberately small. The new page is on port 3002, not a production routing change on port 3000. It remains usable without Codex model startup; Track A production integration is pending. Counter projects and the original historical lock are preserved. Existing global routing, spending settings and fallback approvals are untouched.

**Next owner action:** open the URL, enter the task and click **Run simulation**. No paid/provider approval is needed for this local simulation. Do not publish or trigger Zapier for this version; its event is intentionally local. Any later real integration event or live model run requires its own approval.

Later production integration update: see [WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md](WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md) for the subsequent managed-root fix and its exact verification limits. This earlier report remains historical evidence; the simulation remains a backup, not live AI proof.
