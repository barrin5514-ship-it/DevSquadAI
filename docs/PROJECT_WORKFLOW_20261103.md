# Project workspace — 2026-11-03

## Use it

Open Big Three or Projects in the sidebar. Choose a project, type a task and click Run. Add project can link an existing absolute local folder, or create a new managed folder when that field is blank. Each project retains its own tasks/chats, reports, usage and file revisions. New task / chat starts a separate conversation; selecting history never dispatches an agent.

Fresh Friday project: FRIDAY · Fresh to-do app · 2026-11-06.
Project ID: d6cf55a4-198c-40a7-98b4-8bb6d8c5af95.
Chat ID: b38be3dd-b586-440c-922b-755c188a900a.
Open http://127.0.0.1:3000/team#project/d6cf55a4-198c-40a7-98b4-8bb6d8c5af95/chat/b38be3dd-b586-440c-922b-755c188a900a . Its prepared goal and starter files are ready; Run has not been requested. You can leave the Task box blank when continuing that selected prepared chat. A new chat requires typing a task.

## Active workflow

DeepSeek builds, Codex supplies independent test files, the application executes those tests in an MXC-isolated copy, and Claude reviews the current revision and recorded evidence. A review is a model's recommendation, not a claim that the model itself ran tests. No agent may review a step it built. Final acceptance remains a separate owner button, without a checkbox.

The project runner has no DeepSeek dollar cap, per-run Codex/Claude call count, three-round cap, handoff deadline, spending grant or consent/preparation step. Work can proceed through correction cycles. SDK/transport output bounds and individual connection/process safeguards still exist; these are not a five-minute run timer. No paid API or credential setting was changed. DeepSeek requests use the existing paid account when the owner clicks Run; no app spending ceiling is promised. Other providers stay configured and parked.

The old scoped/demo, paid quote/run and hello-dispatch browser routes are retired with HTTP 410; old records, receipt validators and accounting history remain for audit. Old grant files are not loaded as executable project permissions. The new runner does not invoke the archived capped worker pipelines. Legacy financial record validation has not been erased or rewritten.

Zapier and its private saved URL remain configured but are not required or triggered by the new built-in role handoff. No remote task, hook or GitHub mailbox was activated here.

## Stop, stuck alerts and history

Stop remains visible in a sticky bar during any active run, even while viewing another project or earlier work. It cancels the owned operation; late replies cannot apply a patch. Unknown native process outcomes keep the folder locked rather than allowing overlapping work. Interrupted runs pause on restart and never silently redispatch.

A problem is tracked separately from other failures. The same failing test or problem on three consecutive cycles pauses with a durable STUCK alert, even if additional failures vary. Known worker errors are also counted across explicit continuations, without automatic network retries. Different problems reset their individual streaks; there is no substitute turn cap.

Each file's previous and next content/hash is retained in immutable revision rows. Each task has append-only events. Duplicate Run request IDs stay deduplicated across later continuations; this is duplicate protection, not a usage cap. Project/root locks prevent concurrent jobs in the same or overlapping folders. Earlier uncommitted files are read as current context, never reset or cleaned, and their previous bytes are retained before a worker edit.

## Folder boundary and current limits

Model file access is mediated through a pinned selected-project root; traversal, symbolic links/junctions, hard-linked files, hidden credential files, data storage and common credential filenames are excluded. Native tools/MCP/shell hooks are disabled and CLI authentication stays with its trusted native login broker. This does not claim the login broker itself cannot read its own authentication files.

Generated tests execute only after a real, non-model MXC outside-folder probe, in a disposable copy containing no credentials. The original project is outside that test sandbox. No fallback to an unisolated runner exists. Worktrees alone are not treated as isolation. The local first-party smoke test passed three assertions through the new runner; no model was called.

Independent execution currently supports dependency-free JavaScript/Node test files. Other languages or projects needing installed dependencies/build tooling may pause for a dedicated runner; no installation is automatic. Model context and response size remain bounded, with a contextTruncated flag when applicable. A model review of supplied context is not proof of whole-repository correctness. Live generation through this new workflow has deliberately not been exercised.

## Database and verification

Supported SQLite backup before migration: backups/backup-1793734138581-b2cb1e66-6304-4c82-b16b-535d0f280126.sqlite. Migration 013 adds projects' folder bindings, chats, append-only events, root locks and immutable file revisions. All original rows across 50 snapshotted tables survived; .env hash is unchanged and integrity_check is ok. Only the requested new Friday project/chat and first-party starter files were added to production data. The old completed demo and its usage records remain intact.

Final full suite: 347/347 passed serially, zero failed/skipped/cancelled (224.197 seconds). Focused final checks: 33/33 passed. Actual local MXC fixture: 3/3 passed, zero model requests. These runs include targeted coverage for folder escape/hard links, no self-review, concurrent/duplicate Run, Stop, persistent history, more than three correction rounds, recurring individual failures, and retired API dispatch.

## Flaky-test diagnosis

The old correction test failed because it tried to record evidence after the prior mock generation did not reach AWAITING_REVIEW. The historical failure did not retain the child process error, so its exact one-off cause cannot be proved retrospectively. The identified defect is a two-second child-process syntax-check startup window that treats a slow or unavailable Node launch like invalid JavaScript. On a low-memory PC this can reject valid mock source.

Changed that bounded startup allowance to ten seconds, kept parse-only --check and credential-free environment, and distinguish syntax_check_unavailable (HTTP 503) from actual invalid syntax (HTTP 422). Deterministic regressions cover both outcomes. The formerly flaky correction case passed in the final full suite in 898 ms; no retry loop or assertion relaxation was added to that test. This confirms the tested fragility is fixed; it does not turn a missing historical subprocess diagnostic into a verified cause.

Browser: refreshed and visually inspected the actual Friday project/chat. Project picker, Task box, Run, READY state and saved goal were visible; no consent or preparation controls. Run was not clicked. Screenshot is saved outside the Git checkout in the owner's local visualizations folder.

## Delivery status

The pre-push visibility check reports barrin5514-ship-it/DevSquadAI is PUBLIC, contrary to the earlier private-repository requirement. New changes are committed locally, but push is held pending the owner choosing to restore private visibility or explicitly approve public publication. No GitHub visibility change was made. The private-key/URL staged scan passed; .env, database files, node_modules and project workspaces are excluded.
