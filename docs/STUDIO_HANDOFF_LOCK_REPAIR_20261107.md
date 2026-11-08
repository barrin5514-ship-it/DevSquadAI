# Studio write-lock and Zapier checkpoint handoff repair — 2026-11-07

**Status: IMPLEMENTED and locally VERIFIED. Live Zapier delivery is NOT verified; the Dev Squad side was exercised with simulated workers and a simulated Zap callback.**

## 1. Original flow and root cause

`ProjectStudio.drive()` inserted one `studio_locks` row at Send. The row was deleted in `finally` only when `retainLock` was false. `retainLock` was set from the worker error:

```js
retainLock = error?.stopped === false || error?.unknownOutcome === true;
```

A DeepSeek/Nemotron HTTP worker can have an unknown remote outcome (`unknownOutcome:true`) even though its local request is closed and it cannot write the workspace. A native CLI can have `stopped:false` when its process-tree termination is unverified. Both cases produced the same “folder stays locked” state, so the folder lease was coupled to billing/outcome uncertainty.

The Studio path also had no Zapier checkpoint handoff: `WebhookOut` only delivered old messenger reports; `ProjectStudio` advanced Builder → Tester → Reviewer locally. There was no Studio handoff record, stable ID, or callback endpoint.

## 2. What changed

### 2.1 Durable handoff record — migration 019

`src/database/migrations/019_studio_handoffs.sql` adds `studio_handoffs`:

- one durable record per chat/request/phase/checkpoint;
- stable ID derived from chat, request, phase, checkpoint and test-evidence hashes;
- status, mode (`local`/`zapier`), delivery/accepted timestamps, and safe detail JSON;
- no source files, credentials or provider text.

### 2.2 Write lease separated from outcome and billing

`ProjectStudio` now records a `writeAccess` lease and an `activeExecutionId`:

- The lock exists only while a writer is active.
- `apply()` requires the exact current execution ID, current role, held lease, and active controller. The old `executionId` cannot write after a handoff, a new run, or a takeover.
- `releaseWrite()` deletes only that chat/root lock, records `workspace_write_released`, and preserves:
  - execution outcome (`unknown` stays unknown);
  - the API reservation row and amount;
  - failure diagnostics and checkpoint history;
  - `verifiedCheckpoint:false` when no Builder checkpoint was accepted.
- `releaseWrite()` is called before each Zapier handoff and after a saved test/review result. The next role reacquires a fresh lease automatically. There is no manual unlock between roles.
- Unknown native outcomes with no verifiable process evidence still retain the lock. Unknown API outcomes release it because the local request is closed and late writes are rejected by the execution-ID check.

### 2.3 Automatic Zapier checkpoint handoffs

New `src/services/studio-handoffs.js`:

- creates the stable handoff record after a verified Builder checkpoint or saved Tester evidence;
- sends `studio_checkpoint_handoff` through the existing `WebhookOut` Zapier Catch Hook;
- waits for an exact callback; a duplicate returns `already_accepted` and starts nothing;
- if the hook is disabled, callback token is missing, delivery fails, delivery is unknown, or the callback times out, the run pauses, the write lease is released, and no next role starts;
- with `STUDIO_ZAPIER_HANDOFFS` off, the existing local transition is used and is recorded as a local handoff (no external delivery).

New `WebhookOut.sendStudioHandoff()` sends only IDs and hashes. New callback route:

```text
POST /api/console/studio/zapier/callback
X-Studio-Callback-Token: <STUDIO_ZAPIER_CALLBACK_TOKEN>
```

The callback uses a separate timing-safe capability token, not the dashboard token. It validates the handoff ID, chat, request, phase, next phase, checkpoint hash, test-evidence hash and `action:"continue"`, then accepts the handoff once. The callback route is registered before the dashboard capability middleware.

### 2.4 Startup recovery for existing stuck sessions

`ProjectStudio` now calls `recoverStaleWrites()` at startup. For each lock:

- API-backed unknown execution (`deepseek`/`nemotron`): release the write lease; preserve the unknown outcome and reservation.
- Native execution with verified termination evidence: release.
- No execution/identity, or a still-active recorded process: keep the lock and report that recovery is unverified.
- Historical native lock with no process evidence is deliberately preserved.

`StudioExecutions.recovery()` now reports no unresolved lock after release. The dashboard shows the unknown outcome without the critical “folder stays locked” warning and leaves Send available.

### 2.5 Dashboard

`src/dashboard/conversations.js` now:

- shows “Worker outcome is unknown. No verified checkpoint was saved. Write access was released; no retry was started.” for a released unknown outcome;
- shows the current handoff state (`Awaiting Zapier handoff`, local handoff, blocked, paused) and its phase/next phase;
- no longer treats the mere word “unknown” as a locked-folder warning;
- keeps the critical non-dismissible warning only while a real lock remains.

### 2.6 Configuration and documentation

`.env.example` and `docs/zapier-setup.md` document:

```dotenv
STUDIO_ZAPIER_HANDOFFS=false
STUDIO_ZAPIER_CALLBACK_TOKEN=
STUDIO_HANDOFF_TIMEOUT_MS=120000
```

## 3. Verification

### Automated

- Final focused handoff tests: **7/7 passed** (`node --test --test-concurrency=1 --test-timeout=120000 tests/studio-handoffs.test.js`).
- Final full serial suite after the last recovery-field change: **682/682 passed**, zero fail/cancel/skip (`docs/verification/studio-handoffs-20261107/full-serial-final.txt`).
- Existing project, execution, failover, run-scope, recovery, console, conversation UI, foundation, budget and worker tests all remained green.
- New tests cover:
  - one Send, two simulated Zapier handoffs, final owner review;
  - active writer holds lock; release after saved checkpoint;
  - unknown API outcome releases write access with no checkpoint, preserves the unknown execution, and rejects a late `apply()`;
  - missing hook / missing callback token pauses before the next role;
  - duplicate callbacks and repeated delivery do not start another role or resend;
  - startup recovery releases only a verifiably ended API writer and keeps its unknown reservation.

### Dashboard simulation (actual UI, simulated workers)

Evidence: `docs/verification/studio-handoffs-20261107/result.json` and `dashboard-handoff-simulation.png`.

Checks passed **12/12**:

- one dashboard Send returned 202;
- successful run ended at `awaiting_owner`;
- both automatic Zapier handoffs accepted;
- no manual unlock and no lock remained;
- Builder file, independent test and review evidence existed;
- exactly one worker call per role;
- an active slow Builder held the folder lock;
- unknown-outcome Send was accepted;
- unknown outcome released write access and left no lock;
- dashboard showed unknown outcome without saying the folder stays locked;
- no page JavaScript errors;
- **liveModelCalls: 0** — all workers and Zap delivery were simulated.

### Production recovery (after restart)

The production backend was restarted through `node --use-system-ca src/server.js`; migration 19 applied. There were no active executions at restart. Results:

| Session | Before | After |
|---|---|---|
| `b1e11259…` Expense | paused, DeepSeek unknown, lock, $0.007748 reservation | paused, write access released, no lock, execution remains `unknown`, reservation remains `$0.007748` |
| `efaca8ae…` newer Expense | paused, DeepSeek unknown, lock, $0.007676 reservation | paused, write access released, no lock, execution remains `unknown`, reservation remains `$0.007676` |
| `fc00a59b…` historical Counter | paused, native timeout, lock, no execution identity | **lock preserved**; recovery cannot prove the old native process is gone |

- `schema_migrations`: 19
- `PRAGMA integrity_check`: `ok`
- `PRAGMA foreign_key_check`: no rows
- `studio_locks`: only the historical Counter lock remains
- Dashboard check: status `Outcome Unknown`, non-critical warning, `recovery.needed:false`, Send enabled, no page errors. Screenshot: `production-recovered-expense.png`.
- The old bounded team-send approvals remain recorded and are not treated as successful. New work should use a new session; the recovered folder is no longer blocked by the old writer.
- Pre-restart backup: `backups/backup-1794086439880-14c2ee53-0cbd-45c4-9ab0-1db2fd260d0a.sqlite`.

## 4. Zapier: live or simulated?

**Simulated. No live Zap was verified or created.**

- The existing Zapier Catch Hook is configured and enabled in this local installation.
- `STUDIO_ZAPIER_HANDOFFS` is currently **false** in `.env`; `STUDIO_ZAPIER_CALLBACK_TOKEN` is not set.
- The Dev Squad trigger and callback were exercised with a fake `hooks.zapier.com` delivery that called the real local callback endpoint with the real token check.
- No real Zap action, Zapier task, public tunnel, or external delivery was run.
- The local callback URL is not reachable from Zapier’s cloud. A live setup additionally needs a trusted HTTPS tunnel/reverse proxy and a real Zap that forwards the payload plus `action:"continue"`.

Missing for live use:

1. A Studio-specific Zap (or action path) that receives `studio_checkpoint_handoff` and POSTs the exact payload to the callback.
2. A public HTTPS route to this loopback backend.
3. `STUDIO_ZAPIER_HANDOFFS=true`.
4. A private `STUDIO_ZAPIER_CALLBACK_TOKEN` matching the Zap.

Without those, Studio stays on local handoffs; if the enabled flag is set without the hook/token, the run pauses safely after the completed role rather than starting the next role.

## 5. How the owner can verify

1. Run `node scripts/test-serial.js`; expect all tests to pass.
2. Run `node --test --test-concurrency=1 --test-timeout=120000 tests/studio-handoffs.test.js` for the focused lock/handoff cases.
3. In the dashboard, open a disposable project, set DeepSeek / Codex Personal / NVIDIA Nemotron, turn automatic fallback off, and Send one task.
   - With Studio Zapier off: local checkpoint handoffs complete and end at owner review.
   - With `STUDIO_ZAPIER_HANDOFFS=true` and a working Zap/callback: the dashboard shows `Awaiting Zapier handoff` between roles; no lock remains between roles; the final state is owner review.
4. For the unknown path, use a disposable session whose Builder fails after a closed local request. The dashboard should show `Outcome Unknown`, “No verified checkpoint was saved”, no critical locked-folder warning, and Send should be available; the execution and reservation remain in history.
5. Open the recovered Expense session now: it should show no lock, keep the unknown outcome/reservation, and not be marked successful.

## 6. Limitations

- The simulated callback is not live Zapier evidence.
- The callback route assumes a reachable local/public endpoint; no tunnel was configured.
- The historical Counter lock has no execution/process identity and remains locked by design. It requires owner-verified recovery, not a guessed release.
- No owner acceptance was performed.
- No commit, push, merge or deployment was performed.
