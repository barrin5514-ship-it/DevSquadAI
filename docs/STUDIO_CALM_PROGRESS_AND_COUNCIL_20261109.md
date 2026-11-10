# Calm live progress and council-first repairs

## Live status flood

Demo Three had 514 progress-only lifecycle rows after the old correction-limit pause, between 7:16:39 and 7:22:40 PM Eastern. The DeepSeek stream reports every 128 new visible characters in addition to the byte-activity updates. `studio-executions.js` previously appended a `worker_lifecycle` row for every update. `studio-live.js` replayed each row, and `live-workspace.js` formatted each as a new waiting entry. The browser also rebuilt the whole live panel every second.

Progress-only updates now keep the latest safe activity time and character count on the existing execution record. They create zero timeline rows. Older progress rows are omitted from live replay and chat history views. The original stored evidence is preserved. An active worker's single line advances in five-second increments, in place, using the start of that execution. A new worker or stage starts its own clock. Worker stream handling and inactivity timers operate as before.

**Meaningful events:** Stage starts and final outcomes, saved files, handoff delivery and receipt, fallback switches, council start and decision, recorded test results, numbered corrections, pauses, and Awaiting Owner remain events and display as they arrive. Lifecycle evidence that contains more than progress is preserved. Individual council diagnoses remain in Technical details under the council's decision.

**Heartbeats:** Progress text, last activity time, and received-character counts alone update one execution row. They do not enter the visible history. The SSE connection's separate keep-alive comment remains unchanged.

## Demo Three trace

Chat `a725f4e8-899d-4a29-925c-5876f40df749` was paused on request `e42af70a-0461-4f49-a221-f401c655c22d`. The original Send and all recorded retries for this chat had no council authorization. On the November 9 resumption the following saved findings went directly back to the Builder, with the checkpoint and test evidence recorded for each round.

| Correction | Test result event → correction event | Saved finding |
| --- | --- | --- |
| 4 | 7388 → 7393 | Requested photograph uses an image asset with a mug description. |
| 5 | 7498 → 7501 | Requested photograph uses an existing raster asset with a mug description. |
| 6 | 7658 → 7661 | Mug image is not a single-pixel PNG placeholder. |
| 7 | 7755 → 7758 | Embedded PNG has valid image data and is not a flat placeholder. |
| 8 | 7982 → 7985 | Mug image source is resolved and its local asset exists. |

The findings had distinct normalized keys, even though all concerned the mug image. The old direct path was expected for a run without council permission. The first-failure bypass on authorized runs and the generic pause card were gaps in the requested workflow. Correction eight saved its Builder files. Event 8133 records the Tester pre-dispatch error for incomplete project context. The worker-visible text files totaled 30,022 bytes against a 24,000-byte guard. No Tester execution or Reviewer call followed that Builder turn. The files match the final checkpoint and no workspace lock was recorded. The checkpoint guard is still in place.

For an authorized run, the first actionable test failure or review finding now starts the council before another Builder write. Voters see the same saved evidence, guarded file excerpts, and recent correction history. The Reviewer must tie the plan to compatible diagnoses from two provider families. An agreed plan is recorded before Builder correction starts. Fresh independent tests and review still gate Awaiting Owner. Disagreement, missing quorum, and unknown outcomes pause with the evidence preserved. There is no fixed correction count.

For an older run without council permission, the direct route remains available. The paused card says council is off and offers **Enable council and retry** for an eligible team. The button is disabled while the current checkpoint exceeds the input guard. No files, roles, permissions, or saved run state were changed in the owner's Demo Three chat.

## Updated regressions

- **A council disagreement is saved and a new discussion can agree without applying the disputed repair** now checks a clean pause without a rewrite.
- **Availability exhaustion during a correction pauses with the latest finding and checkpoint** now has the council agree first, then exercises the Builder's simulated HTTP 429.
- Added tests for first-failure council order, unchanged direct correction without council permission, explicit same-chat opt-in with stale retry rejection, and the paused card's reason and disabled option.
- Added browser-facing and persistence regressions for a stream of 170 progress updates, one live line, the five-second cadence, stage reset, and meaningful event visibility.

The focused run initially passed 102/103. The availability fixture's assertion needed to account for the agreed plan alongside the preserved findings. The three affected checks passed in the focused rerun.

Playwright drove real Chrome against a disposable database and simulated providers. An initial screenshot caught a duplicate across the conversation and Logs panel. The final display places the active status in the conversation whenever both panes are open. The 42 display tests passed, and the final Chrome simulation delivered 133 raw heartbeat updates, one in-place visible status line, and zero heartbeat rows. The status reset for the Tester. The observer saw the file save and handoff within about two seconds of their respective recorded events. The first failed test, council start, agreement, and correction appeared in that order. The repaired files passed two real local fixture tests. The simulated Reviewer approved and the run reached Awaiting Owner. History survived reload without the progress lines. No live provider calls occurred.

The full serial suite on the final tree passed 811/811 with exit code 0. A tool disconnect interrupted an earlier repeat, so the final run recorded its exit code locally. After a verified SQLite backup the backend restarted from PID 13296 to 33364, with health and the dashboard both returning HTTP 200. All 67 application tables matched before and after the restart. Read-only Chrome confirmed the original Demo Three request and version, the visible input-size pause, the disabled council Retry, and no old progress-only entries in the displayed history. No write requests were sent to that chat.
