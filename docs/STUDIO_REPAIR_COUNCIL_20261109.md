# Repair council verification

The normal Studio Send proposal identifies the available council routes and discloses the extra calls before Send. The request binds them to the existing task, chat, folder, database, provider terms and expiry. A previous bounded Builder-only or review-only permission cannot authorize a council. An unchanged retry can use the original council's remaining rounds and expiry. An agreed correction uses the same correction counter as the existing workflow.

The failed execution keeps `evidence.failureEvidence` in the existing SQLite execution row. Completed visible replies are retained after redaction, up to 6,144 UTF-8 bytes. Parse details record the failed check and parser-supplied offset, line and column when available. The evidence includes findings and the checkpoint and media references. Stream framing, provider reasoning fields and native CLI transcripts are excluded. The raw reply is omitted from timeline and webhook records. Older replies that were discarded cannot be recovered.

Each available advisor gets the same saved failure evidence and a bounded snapshot of relevant project files. Codex and Claude use the existing native login transports in one-final-response mode. DeepSeek uses the existing direct API adapter with thinking disabled. An advisor can supply one diagnosis, and the assigned Reviewer can supply one synthesis. Each call has a 60-second ceiling, native capture is 8 KiB, and DeepSeek requests at most 768 output tokens. There are at most two rounds per original Send.

Agreement requires the same cause and fix labels from at least two distinct provider families. The Reviewer synthesis must cite the matching execution IDs and explain the plan. Different labels for an equivalent cause can yield no agreement. The application pauses if synthesis is unavailable or invalid. Advice cannot apply files. An agreed correction goes through the ordinary Builder, isolated independent tests, independent Reviewer and owner acceptance gates. An unknown outcome gets advice only, with its original reservation and recovery state preserved.

If two consecutive completed Builder replies from the same provider at the same checkpoint fail validation, the existing fallback policy can offer a named eligible Builder. The owner changes the assignment in Team and retries. Dev Squad does not silently dispatch this offer.

Codex advice uses a read-only MXC profile with the existing root deny and network restrictions. See [OpenAI's permission profile reference](https://learn.chatgpt.com/docs/permissions).

## Local verification

The first regression reproduced the missing route with HTTP 400 before implementation. The focused suite passed 132 of 132. The 12 council-specific tests passed again after the final usage and fallback changes. Cases include agreement, three-way disagreement, an absent advisor, two unsuccessful rounds, exhausted correction budget, Reviewer rejection, failed independent tests, an unchanged happy path, advice-only unknown outcomes, and an owner-only fallback offer.

In a disposable project, Playwright Chrome submitted exactly one Send with simulated providers. The first Builder reply failed validation. Three diagnoses and the Claude synthesis appeared in the timeline, and the agreed plan and execution details remained visible after reload. The correction saved the app file, two local independent tests passed, and a fresh simulated review put the job in Awaiting Owner. The first browser script matched hidden text in the development output pane. Scoping the selector to the visible conversation proved the timeline itself.

| Simulated consultation | Execution | Input / output tokens | Recorded cost |
|---|---|---:|---:|
| DeepSeek diagnosis | `c9978e74-6e61-4861-97ba-d6eb4027b9b0` | 25 / 15 | $0.0000255 estimated |
| Codex Personal diagnosis | `c37ad664-0313-4c46-be0e-4e79fec9410c` | 17 / 12 | Unknown |
| Claude Code diagnosis | `6f75f398-903c-4aec-9819-9d632bf538ea` | 17 / 12 | Unknown |
| Claude Code synthesis | `a5a1d26f-ec9f-408a-b00d-20d877ebb8ea` | 17 / 12 | Unknown |

The failed Builder execution was `32d1e8c0-892f-47bc-9cd7-40db737598c1`. The implementation execution was `77458e60-b76c-42f3-a032-6d8ad97f04de`. These token counts and prices came from the fixture. This job made no live provider calls and incurred no provider charge.

The full Windows serial suite passed 789 of 789 with exit code 0. After the supported SQLite backup was verified, the regular backend restarted from PID 12868 to PID 3392. Health and the dashboard returned HTTP 200. SQLite integrity was OK, 22 migrations were recorded, no execution was active, and all 67 application tables matched the pre-restart snapshot.
