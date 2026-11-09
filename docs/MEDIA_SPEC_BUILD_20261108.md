# Media spec verification — November 8, 2026

**Media reading and handoffs verified. Application-building acceptance is partial.** Chrome exercised the regular dashboard code against disposable SQLite databases and fresh projects named VisionTest. The images and video were synthetic. Vision requests marked live below reached the provider. Builder, Tester, and Reviewer turns were simulated. The local test runner executed a hand-written check of the saved fixture HTML. It did not run code returned by a provider.

## Implementation

- A Send with a saved image or video validates its bytes and reads it before the Builder. The description is limited to 16 KiB and kept in the project's internal `.devsquad-media` directory. The saved event binds its hash to the project, session, attachment hash, and original checkpoint. The Builder receives that description and the owner's instruction as text.
- Nemotron uses the exact free OpenRouter model with zero-price routing and fresh model, account and allowance checks. It requests the documented strict JSON schema when the account catalog lists structured output support. Codex Personal is the only native fallback. Its capture retains one terminal answer and numeric usage while discarding progress messages. [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- FFmpeg samples at most 12 evenly spaced still frames locally. The reader receives those images together in one request. The description identifies that audio was untranscribed.
- A Chrome reproduction showed that the existing upload changed the displayed checkpoint before Send. A focused HTTP test reproduced the 409. Proposal matching now accounts for the one newly uploaded attachment, then authorizes the full actual fingerprint and saved media input. An unrelated file change still produces 409.
- The first Nemotron request returned a complete HTTP response whose text the local spec parser did not accept. The older event did not retain the specific validation reason. The strict schema and safe reason codes were added before the later probes. The retest on the same synthetic mug succeeded through Nemotron.
- The current composer supports one image or video per Send. Text-only jobs follow their existing path. No schema migration, routing-setting change, or budget gate was added.

## Acceptance evidence

| Case | Result | Observed evidence |
| --- | --- | --- |
| 1. Mug PNG | Media PASS · build partial | Nemotron saved “purple mug,” exact `ZEBRA-C635AF0F`, yellow surface and white background. Chrome showed the spec. The fixture Builder wrote `index.html` from the text and the static check passed. No live Builder application was produced. |
| 2. Orange-star PNG | Media PASS · build partial | Nemotron saved a five-pointed orange star and exact `ORBIT-F4E902B7`. Neither was in the prompt. Chrome showed the new spec and the fixture used it. No live Builder application was produced. |
| 3. Twelve-second counter MP4 | Media PASS · behavior not proven | Six FFmpeg still frames were sent in one request. The saved sequence was 0, 0, 1, 2, 2, 3, with a blue final background. The summary included “Audio not transcribed. Video understood from sampled still frames only.” No live Builder counter was generated or exercised. |
| 4. Fallback and unavailable readers | PASS | Simulated exhausted Nemotron allowance caused zero OpenRouter requests in that case. Live Codex Personal read the same mug and code. Chrome displayed “via fallback.” With both readers simulated unavailable, Chrome showed the pause, no Builder started, and the checkpoint hash was unchanged. |
| 5. Text-only Send | PASS with simulated development roles | Chrome sent one run POST. There were no media events or vision calls. The three simulated roles reached owner review with one real local static test. |
| 6. Resume after role swap | PASS with simulated development roles | The fallback case paused after the saved spec at Tester. The supported role update returned 200 and Resume returned 202. The same session reached owner review with the new simulated Reviewer. The saved spec and original checkpoint binding were reused. There was one total live vision call across both attempts. |
| 7. Corrupt PNG | PASS | Chrome uploaded a truncated PNG that passed the existing signature check. Local decoding paused the run. No vision call, fabricated spec, or Builder invocation occurred. The checkpoint hash was unchanged. |

The control, second image, and video each recorded attachment upload HTTP 201 and run HTTP 202. Chrome showed the persisted summaries with no page errors. Role swaps and resume used the normal API against the same disposable project, followed by a Chrome reload. No owner acceptance was recorded. One multi-case browser harness timed out between sessions. The corrupt and text cases passed when checked in separate disposable sessions.

Local evidence is under ignored `data/vision-build/`. Each listed folder contains `results.json` and a Chrome screenshot.

| Case | Folder | VisionTest project ID | Session ID |
| --- | --- | --- | --- |
| Mug after schema change | `live-7UOXC9` | `6723626d-343f-4419-b012-1397fea0ee9a` | `7ef08be0-94cf-49ed-8719-fae60700c0d7` |
| Orange star | `live-L04phI` | `b951d647-8a45-40ac-a97e-d08c7709e6d9` | `cd6af756-8392-4d53-a018-f2ce7249f20a` |
| Counter video | `live-FNiJfb` | `fc651eac-226b-462c-a300-99c3cbcc722b` | `f6bdf2bb-b022-4868-8871-e2b10c0013ff` |
| Quota fallback and resume | `fallback-NB232D` | `943f0cf9-8e89-476b-8f6a-347401c73bbd` | `05b126fb-34ce-4b4f-83c1-3c5ef70c9d83` |
| Both unavailable | `offline-d5w0gW` | `ab3d2359-2feb-4fd7-8e75-15fc9a0006fd` | `ba325dd6-ddbb-423a-8750-942aba25d2ac` |
| Text-only | `offline-XgoVEf` | `60d16c62-2144-4c6b-a525-fdde98bc126c` | `513eb1e5-d5d6-4083-b474-4c3b3d8e638a` |
| Corrupt image | `offline-76wza7` | `dbca1606-6a42-416c-854d-e9f604c76f07` | `31685888-b640-471b-bfa0-357ee4567298` |

## Live vision call ledger

Nemotron used `nvidia/nemotron-3.5-super-vl:free` at `openrouter.ai`. Times include the quota read after the response where applicable. Quota columns show provider-reported remaining daily requests. A delayed counter can explain an unchanged reading, but the timing of the quota update is unverified. Codex used the native Personal profile and its default model. Native HTTP status, per-call cost, and remaining allowance were unavailable.

| Case | Route | Result | Time | Input / output / total | Reported cost | Quota before → after |
| --- | --- | --- | --- | --- | --- | --- |
| Initial mug | Nemotron | HTTP 200, spec rejected | 2.111 s | 391 / 150 / 541 | $0 | 22 → 22 of 50 |
| Initial mug fallback | Codex Personal | Final spec saved | 9.847 s | 13,540 / 207 / not supplied | Unknown | Unknown |
| Orange star | Nemotron | HTTP 200, spec saved | 1.790 s | 471 / 111 / 582 | $0 | 21 → 21 of 50 |
| Counter video | Nemotron | HTTP 200, spec saved | 2.255 s | 1,847 / 238 / 2,085 | $0 | 21 → 21 of 50 |
| Simulated exhausted Nemotron | Codex Personal | Final spec saved | 8.760 s | 13,553 / 192 / not supplied | Unknown | Unknown |
| Mug with strict schema | Nemotron | HTTP 200, spec saved | 2.197 s | 406 / 101 / 507 | $0 | 20 → 19 of 50 |

Both native Codex replies reported 8,960 cached input tokens and zero reasoning output tokens. The fallback case's Nemotron zero quota was simulated. Total live generation requests were four free OpenRouter vision requests and two included native Codex vision invocations. All four OpenRouter replies reported zero cost.

## Local checks and backend

- Focused serial regressions passed 57 of 57.
- The restricted serial run passed 765 of 770. Four existing Windows file-action tests were denied at the native directory-pinning step. The Windows timeout/Stop test missed its expected rejection. All five passed on the Windows host with the same source. The full Windows host run passed 769 of 770, with zero skipped. The only failure was the existing Windows timeout and Stop fixture in `tests/studio-worker-recovery.test.js:17`. The worker reported “Isolated test process termination is unknown; no pass was recorded.” The same fixture passed in the focused host recheck. The cause of this intermittent termination check is unverified. All new media tests passed in the full run.
- The regular backend remained on the previous code. The restart, staging, commit, and push were held because the full suite was red.

## NOT DONE / NOT PROVEN

- Automatic approval review rejected the live Builder command because the outbound payload and billing scope were not established. No live Builder, Tester, or Reviewer turn ran. The three live-reading cases do not prove that a real agent builds the requested visual or counter behavior.
- Native video understanding, audio transcription, Codex fallback with multiple sampled frames, and performance across arbitrary attachments remain unverified.

## Release recheck

- The Windows host run of `tests/studio-worker-recovery.test.js` alone passed 12 of 12.
- The release candidate's one full serial run passed 769 of 770, with no skips. The runner exited with code 1. The failure was the real Windows timeout and Stop fixture, which reported “Isolated test process termination is unknown; no pass was recorded.”
- The failing fixture invokes `StudioWorkers.command()` directly. The media code runs only through the Studio job pipeline for a message with media. The native launcher, process observer, recovery service, and failing test match the pre-media commit `f53d1c3`.
- A separate Git archive of `f53d1c3` passed all 134 neighboring Studio tests through worker recovery, including the real Windows fixture. The first comparison archive omitted the mandatory `AGENTS.md` and was stopped after fixture setup failures. The corrected comparison used the file from the same commit. The evidence points to an intermittent Windows process-verification failure. It did not reproduce on the pre-media comparison, and the precise cause is unconfirmed.
- The red suite held the restart, commit, push, and live VisionTest Send. The existing backend returned HTTP 200 on PID 18960. Zero live calls were made in this recheck.

## Owner-authorized release run

The owner authorized one additional full serial run. All 770 tests passed on the Windows host, including the native timeout and Stop fixture. The runner exited cleanly. The earlier process-verification failure remains intermittent and its precise cause is unconfirmed.

The former backend process was already absent. After verifying a supported SQLite backup, the normal server started as PID 4392. The database lease and listener matched, health and the dashboard returned HTTP 200, SQLite reported integrity OK, and all 67 application tables matched the pre-start snapshot. The first startup command did not launch because PowerShell resolved multiple Node entries. Using Node's exact executable path corrected the command.

## VisionTest test-runner repair

The original VisionTest request `9803a8d9-0960-4ffd-95b2-bff22877f8cb` stopped before executing assertions. The project has no package manifest. A Windows MXC replay of the exact saved page and Tester file reproduced Node's attempt to read DevSquadAI's own root `package.json` and the OS error “operation not permitted.” The hub manifest is valid JSON with `"name": "dev-squad-ai"` and `"type": "module"`. Its SHA-256 in the replay was `d8588f70094a983c9d1a52afe54d2900c1612151c865b05767c56e8680c4f0d3`. The bug was the test copy's missing package boundary. The sandbox's denial was expected.

The runner adds an empty manifest only to a manifest-free disposable copy. It preserves actual project manifests and the tested revision hash, and keeps Node inside the existing MXC boundary. A real malformed nested manifest still blocks the test and records the project-relative path, Node error code and readable detail. Retry of this loader failure verifies the saved Tester execution, test hashes and checkpoint before running the same test files. Its worker allowance permits only the assigned Reviewer after passing tests.

All three new regressions failed before the fix and passed after it. The focused Windows suite passed 68 of 68, the exact saved-file replay executed six assertions with six passes, and the full Windows serial suite passed 773 of 773 with a clean exit. After a verified SQLite backup the regular backend restarted from PID 4392 to PID 27412. Both health and the dashboard returned HTTP 200, and all 67 application tables matched the pre-start snapshot. The live continuation uses the original disposable database after this repair is pushed.
