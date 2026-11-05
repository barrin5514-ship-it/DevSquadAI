# Stage 4 — live preview and development output

Date: November 4, 2026 (owner's local date). Branch: `feature/workspace-ui-redesign`.

## Implemented

- Real project-specific application preview beside the conversation and development panel.
- Existing Layout controls reused for close/show, keyboard/pointer sizing, expand/restore and saved preferences.
- Authorize & open preview, Refresh preview, Revoke preview authorization and Open externally.
- Explicit server-not-started, loading, ready, unavailable, embedding-blocked and expired-authorization explanations.
- Terminal, Tests, Logs, Problems and Tool Calls read actual saved Studio events. These are read-only panels; no shell endpoint or general server launcher was added.
- Future independent test executions record the fixed Node command arguments, MXC launcher, timestamps, exit code, duration, bounded stdout/stderr and tested-copy hash. TAP supplies names/durations when available. A source change during execution prevents passing the result as current evidence.
- Unknown/stopped execution records a null exit rather than a pass. Old transcripts are not reconstructed. Mock records remain explicitly labeled.

## Services reused and preservation

Project/session IDs, file boundary, Studio events, revision hashes, existing worker/test/review runner, dashboard capability, layout preferences and conversation controls are reused. No database migration, provider request, task Run, owner acceptance, routing/billing change, commit, push, merge or deployment.

Supported SQLite backup verified before edits: `backups/backup-1793802699580-7f069f35-dda0-4ab4-b579-6a67344f5b93.sqlite`. Original dirty work preserved.

One clearly labeled UI-only project and empty session were added through regular APIs:

- Project `b435f858-b897-4dd5-9aa4-e515a432290e`: UI CHECK ONLY · Stage 4 preview · 2026-11-04.
- Session `c923a415-6d04-4cf8-b043-1636c470d355`. No worker run or generated revision.
- Original Friday project `d6cf55a4-198c-40a7-98b4-8bb6d8c5af95` and task `b38be3dd-b586-440c-922b-755c188a900a` remain unstarted.

## Preview boundary

The owner explicitly authorizes an exact HTTP loopback server for an actual project. The hub's own port, privileged/common administration ports, credentials, URL paths/queries in the configured origin, non-loopback addresses and unsupported schemes are rejected. DNS answers must all be loopback, are pinned, and must not change. Requests have a three-second bound, 2 MiB response bound and 128 KiB form bound. Cross-origin redirects and sensitive paths are rejected before following them.

Project content is served on a random, separate loopback hostname/port inside a sandboxed iframe. A trusted same-origin wrapper restricts frame navigation to that broker. The main dashboard CSP is unchanged. Additional CSP restricts scripts/resources/forms/network to the broker; no popups, nested frames, service workers, sockets or other local services. Target CSP/X-Frame-Options remain present, and a framing block is explained rather than removed. Browser source/host checks prevent ordinary unrelated websites from using the broker. Cookies, authorization headers and target Set-Cookie are never forwarded; configured keys/common credential signatures block textual responses. Concurrent authorization cannot create an untracked broker. Expired/revoked/project-mismatched generations fail closed.

Authorization is memory-only, expires after one hour, and is lost on backend restart. No capability or application URL is committed. Closing the pane destroys its embedded document without altering chat/task state. Backend shutdown closes brokers. An external tab uses the broker for its application requests, preserves target headers, and follows ordinary browser rules for top-level navigation; it is not an OS sandbox or a guarantee against all navigation outside that tab.

This boundary does not prove which native process owns a port or constrain the authorized development server's own filesystem/network behavior. Authorize trusted project servers only. Browser framing rules are treated conservatively, so some applications that could permit carefully configured embedding may still require external viewing.

## Browser evidence

Regular dashboard on port 3000, not an evaluation dashboard:

- Real controlled HTTP application opened and rendered; counter click and text/form POST worked.
- Navigation to its second page worked independently of chat.
- A request to the hub from application JavaScript was blocked by browser CSP.
- X-Frame-Options DENY navigation produced the embedding-blocked explanation.
- Open externally created a separate tab showing the application; tab inspected and closed.
- Refresh, expand/restore, keyboard resize, close/reopen, project switching and layout persistence inspected.
- Dashboard refresh retained the running application's counter state.
- Hub URL rejected with a useful message; Friday project did not inherit another project's authorization.
- At 1280 × 800: document width exactly 1280, no sideways overflow. Also inspected the smaller default browser pane.
- Original session/conversation, file tree and Agents panel remained available. No Send/Run/acceptance action performed.
- Empty-session output correctly stated that no command transcript was recorded.

Separate temporary database/browser fixture (explicitly MOCK ONLY): all five output tabs inspected; command/exit/duration, recorded test name, mock label, revision and review history rendered. These mock records were never inserted into the production database and are not evidence that a production agent or project test ran.

Screenshots: `devsquad-workspace-stage4.png` (real main dashboard/controlled application) and `devsquad-stage4-mock-output.png` (marked fixture). Stored in the Codex visualization directory, outside Git.

## Automated verification

Initial full serial suite: 392/392 passed. Browser found a required-field mismatch in preview authorization; fixed and added a real console API regression test. Focused API/security/output tests: 10/10 passed. Runner/Studio tests: 18/18 passed, including sandbox-proof rejection and changed-source evidence. Final full serial result: **396/396 passed**, zero failures/skips/cancellations, 243.94 seconds. Syntax checks and final whitespace diff check passed. A final conservative sensitive-file policy tightening (databases, private-key formats and CLI credential folders) then passed all 8 focused preview/API tests.

Additional coverage: origin/port/path rejection, non-loopback and changed DNS, credential/header stripping, redirect denial, target CSP/XFO preservation, project/generation scope, expiration/revocation, duplicate authorization, shutdown, command redaction and TAP evidence parsing.

## Limits and remaining work

- No interactive terminal, automatic development-server start, HMR/WebSockets, third-party/CDN resources, service workers, or cookie/authentication forwarding. Applications requiring those features are not claimed supported.
- The controlled application is a validation fixture, not the unfinished Friday to-do implementation. It is stopped after verification. To preview a real project, start its trusted app separately and authorize that exact server.
- Existing historical events cannot gain previously unrecorded stdout, durations or test names. New recording is verified locally with mock command transport; a new real production sandbox execution was not triggered in this UI task.
- Stage 5 remains: searchable prompt history/export, remaining navigation, broader keyboard/accessibility checks, integration and final polish. Estimate: 6–10 focused hours, subject to findings. Unsupported features remain on the persistent checklist.

## Corrections made during preparation

The first UI-test session creation supplied an unsupported title field and was rejected without creating a session; corrected to the existing empty-body session API. Browser testing found the optional preview fields incorrectly marked required; regression added. Preview clipping was corrected so the embedded application cannot cover the output drawer. The first-party fixture now declares UTF-8 explicitly. None of these corrections changed business records or approval rules.

## Final restart and cleanup

Only the identified idle DevSquadAI backend was restarted using its normal entry point. The final backend responds on port 3000. Preview authorization was cleared on restart, while the existing session persisted. Browser authorization of the now-stopped controlled server showed Server not started. The test lease was revoked. Both controlled fixture servers were stopped, and the browser was returned to the original Friday task with preview closed. API verification: READY, zero run_requested events, zero revisions.

## Stage 4 files

- Added: src/services/workspace-preview.js, workspace-output.js; src/dashboard/preview.js, output.js.
- Extended: src/app.js, src/routes/console.js, src/services/project-studio.js, studio-workers.js, src/dashboard/index.html, workspace-shell.js, dashboard.css. Existing unrelated edits in shared files were preserved.
- Tests: tests/workspace-preview.test.js, workspace-preview-api.test.js, workspace-output.test.js; controlled browser fixtures tests/fixtures/preview-application.mjs and output-dashboard.mjs.
- Documentation: this report, WORKSPACE_REDESIGN_CHECKLIST.md, PROMPT_LOG.md.

Final hygiene: 52 changed/untracked files scanned against configured local API/handoff credential values; zero matches. `.env`, data, backups and node_modules remain Git-ignored; no tracked .env/database/dependency-directory files found. The normal fixture Stop-Process command failed; the exact two verified fixture PIDs were then terminated successfully with taskkill. No other project process was targeted.
