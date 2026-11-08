# Codex CLI stdin investigation — 2026-11-07

## Conclusion

No Dev Squad stdin-delivery defect was reproduced. The stdin line is normal Codex prompt-plus-pipe behavior, not an error or evidence that stdin remains open. The School worker_error has a confirmed separate cause (workspace credits exhausted). Personal's timeouts occurred after native thread/turn start; their exact CLI/provider-side cause remains UNDETERMINED. No production code was changed. No live model request was made.

## Actual launch path

- src/services/studio-workers.js:20 passes the selected project root as cwd, fixed instructions, a bounded task packet, the chosen Codex profile, its existing isolation arguments, and the response schema to DemoCliTransport.run. This file was read only.
- src/services/demo-workers.js:17-20 builds Codex exec arguments with a positional instruction. Claude uses its native print/stream-json workflow. Neither invokes a shell. No packet is written to a prompt file or placed in arguments.
- src/services/demo-cli-transport.js:25 checks native authentication BEFORE spawning. The selected Personal/School CODEX_HOME is set in an allowlisted environment that excludes API-billing keys. Claude uses its native environment without a Codex profile.
- src/services/demo-cli-transport.js:48 spawns the fixed executable with cwd=root, shell=false and stdio=[pipe,pipe,pipe]. Stdin is never inherited from the terminal. Its non-TTY status does not vary between runs.
- src/services/demo-cli-transport.js:51 installs stream/close/error handlers and immediately calls child.stdin.end(JSON.stringify(packet)). There is no intervening await or delayed write; Node queues the full UTF-8 packet and closes the writable stream after flushing it. The stdin error handler categorizes a pipe error as connection_interrupted.
- Both agent branches share that same write-and-close path. Codex chooses stdin-as-context because it receives both a positional instruction and piped input; Claude consumes the pipe using its own print-mode contract.

Official source: [OpenAI non-interactive mode / advanced stdin piping](https://learn.chatgpt.com/docs/non-interactive-mode#advanced-stdin-piping). Current installed codex exec --help independently says that a piped stdin is appended as a stdin block when a prompt argument is supplied. Only --help was invoked; no native model turn was launched.

## Retained live evidence

The exact retained stderr in the failed cases is Reading additional input from stdin... followed by a newline (39 bytes). Complete raw stdout/reasoning and an input-EOF acknowledgment were not retained; neither is reconstructed here. Successful executions did not retain diagnostic stderr, so this report does not claim to have seen that exact historical line on successful turns. The launch mode was the same, and local completed fixtures emit the same line.

| Sweep cycle | Execution | Result | Total elapsed | Evidence |
| --- | --- | --- | --- | --- |
| 1 | bf276982-ae8f-42b6-8cbf-478e49f026a9 | failed / worker_error | 6.310s | Explicit structured out-of-credits error; exit 1 |
| 2 | 926ee90c-5081-421f-8dc4-495fcdad3111 | completed / complete | 27.623s | Native turn completed; exit 0 |
| 2 | 5b166f63-7420-42bd-8db2-957f94eabc61 | completed / complete | 27.926s | Native turn completed; exit 0 |
| 3 | 0450ac30-0afd-42f2-ba7b-4db4f318bab5 | failed / inactivity_timeout | 207.364s | Native session and turn started, then about 180 seconds with no output |
| 4 | 4ad31574-3a2d-4715-abda-65f3b12ed1bc | completed / complete | 27.040s | Native turn completed; exit 0 |
| 4 | 75eb6455-f7b7-4639-9ca9-dcf49ad07dea | failed / inactivity_timeout | 208.995s | Native session and turn started, then about 180 seconds with no output |
| 6 | 5e2fe7de-2821-416a-97ec-cbacacbcc2b4 | failed / inactivity_timeout | 209.199s | Native session and turn started, then about 180 seconds with no output |

Three Personal Tester stalls are 0450ac30-0afd-42f2-ba7b-4db4f318bab5, 75eb6455-f7b7-4639-9ca9-dcf49ad07dea, and 5e2fe7de-2821-416a-97ec-cbacacbcc2b4. They had 3642, 3764 and 3572 stdout bytes respectively, not an empty process waiting silently at startup. Their session/turn-start events preceded their last activity. The watchdog requested termination 180.430, 180.568 and 180.447 seconds after last recorded activity. Each had observed closure and verified local termination. This localizes the failures after turn start but does not reveal the provider/network/model cause or prove the complete historical request payload.

School execution bf276982-ae8f-42b6-8cbf-478e49f026a9 failed in 6.310 seconds with explicit workspace-out-of-credits errors on stdout. Its stdin notice was not the cause. The earlier hunt Reviewer 655df730-4495-4389-a6e9-139253a8fefd showed the same account condition; its classification repair was completed in the preceding task.

Saved policy was fallbackEnabled=false in all four failed sweep Codex Tester attempts; each recorded task_policy_disabled. The failure and release checkpoint hashes match and verifiedCheckpoint=true in all four. Hence the sweep pausing instead of handing off was its configured policy, not evidence that the pipe blocked fallback. These historical checkpoints should not be confused with the current shared workspace after later cycles. No policy or lock was changed.

## Local checks — no models

- data/codex-stdin-delivery.test.mjs: seven checks use the real transport and real Windows child-process pipes, but substitute small local Node reader programs for AI executables. They exercise Personal/School environment selection and Claude protocol shape, immediate/delayed reads, large Unicode packets, full-byte SHA-256 comparison, one end call, writable finish, child EOF, and exactly one child launch. No real account or provider is contacted.
- The seventh fixture acknowledges the entire packet at EOF, emits thread/turn started, then deliberately goes quiet. It produces the same stdin notice plus inactivity_timeout with observed closure. This proves that pattern can occur AFTER complete input delivery; it does not reproduce the underlying live provider hang.
- Final command: node --test --test-concurrency=1 data/codex-stdin-delivery.test.mjs tests/native-diagnostics.test.js — 14/14 passed.
- Final selected transport command: node --test --test-concurrency=1 --test-name-pattern='CLI parsers|native transport|timeout, cancellation' tests/demo-workers.test.js — 4/4 passed.
- Total 18 focused checks, zero failed/skipped. The standalone seven-check run overlaps the 14 and is not counted again. No full serial suite was run, as requested while DeepSeek is working. The combined tree's full suite remains owed.

## Confirmed display defect in the other worker's area — NOT EDITED

src/services/project-studio.js:91 builds the chat error with diagnostics.stderr || diagnostics.stdout. Therefore the ordinary stdin startup notice wins over useful structured stdout errors such as exhausted credits. This misleading display is a Dev Squad bug, separate from the valid launch mechanism. That file belongs to DeepSeek's work, so this hunter stopped short of editing it. Suggested minimal correction for that owner: show the explicit sanitized error rather than the known stdin startup notice; retain both original diagnostic fields for inspection. No lock, Zapier, run-scope or failover file was edited.

## Correct handling / what remains unknown

Keep the inactivity watchdog. After verifying local termination, preserve the tested checkpoint and use an eligible independent fallback only when its saved policy authorizes one. Otherwise pause clearly. Do not treat this startup notice as an error, invent a quota diagnosis for Personal, silently retry, or relax isolation.

No production change means no backend reload is required for this investigation; the backend was not restarted while DeepSeek's job is in flight. No live proof was run. To settle Personal's upstream cause, a separately authorized follow-up needs safe input-byte/hash/EOF-completion timing and native request/turn status metadata, without raw prompts, tokens, headers or reasoning. A controlled local endpoint could verify the actual installed CLI's provider-bound input without inference, but that was not performed here.

Changed artifacts only: this report, sanitized evidence JSON/logs in docs/verification/codex-stdin-20261107, ignored local fixture files under data, and append-only ledger/prompt-log entries. Application source files remained unchanged by this task. No account changes, commit, push, deployment, project creation, model call, lock change or Zapier change.
