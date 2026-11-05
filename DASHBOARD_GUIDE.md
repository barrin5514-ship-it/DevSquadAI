> Active policy updated: DeepSeek is the sole Senior Developer and lead reviewer. Claude Code/Codex manual workflows are retired. Older sections below are historical context, not current agent assignments. See the current policy section at the end.

# Using the Dev Squad AI dashboard

Open **http://127.0.0.1:3000/team**. The dashboard and API share one local backend; there is no separate frontend server.

## Your first project

1. In **Mission Control**, enter a project name and describe what you want built. A short description is optional. Select **Create Project**. This saves the project and requirements in SQLite and opens its workspace without contacting an AI.
2. Select **Start planning**. You can write all seven plan sections yourself, or request an AI plan. The editor covers the objective, features, stack, development tasks, testing, deliverables, and blockers.
3. For an AI plan, first visit **Settings** and explicitly enable free requests for this server session. This does not send a request or enable billing. Provider keys and existing free-account confirmation must already be configured. Return to the workspace, inspect the provider and exact model, check the single-request authorization, and select **Generate Plan**.
4. Edit and **Save plan**. Saving an edit records you as the editor. Check the owner confirmation and select **Approve Plan**. Alternatively supply feedback and select **Request Changes** or **Reject Plan**. Approval creates development tasks, but does not run them. Approved plans are locked.
5. Select a development task, choose an available model, and select **Assign model**. Assignment is separate from dispatch. You can **Reassign model** before dispatch. Check the displayed provider/model and authorization, then select **Authorize & Generate Draft** for one external request. Each task allows at most three attempts, with no automatic retries.
6. Inspect the generated files. They are drafts in SQLite, not files applied to your application. Download a draft bundle if needed. Supported draft files remain JavaScript, JSON, Markdown and text; arbitrary HTML/CSS application generation and previews are not added by this dashboard upgrade.
7. Test outside this app in a separately approved restricted disposable environment. Enter the actual result, command, isolation details, limitations, and recorder under **Save test evidence**. The application does not run generated code.
8. Prepare a review packet for Claude or Codex. Save test evidence first: the packet freezes it. Download the packet, send it manually to the reviewer, and record only their actual findings. No Claude or Codex subscription is automatically connected. Self-review is rejected; approval requires passing test evidence. A rejection needs specific corrections and a fresh draft/review cycle.
9. After senior approval, the owner can **Accept completed work** or **Request corrections**. Corrections invalidate completion eligibility until a fresh draft is tested and reviewed. Once every child task is accepted, select the project plan, **Verify completed project**, and accept it separately. The project then appears as completed. Acceptance never applies files or deploys.

## Finding your way around

- **Mission Control:** create projects; see active work, real activity, and counts.
- **Project Workspace:** select a project and a task; inspect its plan, files, tests, review, corrections, history, and token usage.
- **AI Team:** exact model identities, configured availability, assignments, blockers, and manual senior handoffs. Availability is configuration plus historical verification, not a continuous uptime claim.
- **Approval Center:** links to pending plan decisions, dispatch authorization, testing/review, corrections, and final acceptance.
- **Activity History:** recorded events and provider-reported tokens. Unknown token counts stay unknown. Detailed saved plan versions can be expanded.
- **Settings:** safe provider status and an explicit session permission for free requests. Credentials are never displayed. This permission resets to the server's configured default on restart; it is not written to `.env`.

Use **Refresh** to retrieve current server state. This also renews the dashboard capability after a restart. Unsaved form edits are not an autosaved draft: save before navigating or refreshing. No fake live activity or autonomous progress is displayed.

## Configuration and limitations

Groq remains the default. Optional Laguna and MiniMax remain gated by the existing OpenRouter free-account confirmation, current catalog zero prices, and model eligibility. The current local setup reports OpenRouter's free confirmation missing; the dashboard shows that reason rather than enabling it silently. Gemini remains disabled for team routing. Missing provider configuration must be completed by the trusted local setup operator; keys never belong in a project description.

This is a single-user localhost application with no account login. Manual owner/reviewer names and test receipts are trusted operator assertions. Browser writes use an exact local origin, JSON, and a per-process dashboard capability; other websites and legacy browser mutations remain blocked. Do not expose this service to a network.

Automatic behavioral testing, authenticated senior APIs, production file application, deployment, and GitHub publishing remain manual or future work. The optional human-avatar Team View is deferred; the implemented roster uses lightweight initials and verified activity.

## Verification performed

The automated suite covers the original functionality and the new console API using mocked providers. A separate browser walkthrough on port 3001 used an isolated mock server/database and clearly labeled mock test/review receipts to exercise planning through final acceptance. No provider network call or real senior review occurred in that walkthrough. That mock server is not the main application.

The main database contains **Calculator · dashboard walkthrough**, created through the browser with a manually entered plan and one Groq assignment. No generation was dispatched there. Its live-request permission remains off.

## Premium dashboard and connection labels — 2026-10-21

The six existing navigation entries and owner controls are preserved. Mission Control now has a compact split introduction/form, refined typography, charcoal/navy panels, consistent blue/violet accents, clearer card hierarchy, keyboard focus styles, and responsive layouts. Projects and task controls retain the existing workflow.

**AI Team** now has separate **Development Team** and **Senior Review Team** sections. Groq, Laguna and MiniMax are the development roster. Claude Code and Codex CLI are displayed as reviewers, with manual handoff guides and links to the real approval queue. Gemini is shown separately as disabled. There is no automatic-review button or worker.

Read status labels independently:

| Label | What it actually means |
|---|---|
| API configured | A key is present for the existing route. This is not a successful connection check. |
| API live-tested, with a date | Prior successful live verification is recorded for that exact model. No fresh request occurred on page load. |
| Routing enabled / disabled | Existing model eligibility and the current session's live-request switch both affect this label. Each request still needs owner authorization. |
| CLI authenticated, with check time | A local read-only login-status check succeeded at the displayed time. This is a snapshot, not ongoing monitoring or a review connection. |
| CLI authentication not checked | No valid local evidence is available. Unknown is not displayed as connected. |
| Manual review available | The existing packet export and actual-findings recording workflow is available. |
| Automatic review disabled | No safe automatic review bridge has been implemented or enabled. |
| Disabled | Gemini is excluded from team routing. |

Developer cards show actual assignments, recorded model events, and recent usage from the existing ledger. No ledger rows means **No usage recorded here**; historical benchmark usage is not invented as local activity. Senior cards show pending packets and recorded review receipts, not fabricated live reviewer work. Their unrecorded usage remains unknown.

**Settings** now separates provider configuration, historical test evidence, routing status, and recent usage. **Activity History** includes an approvals/review-history panel built from recorded events. Existing forms, review controls, self-review restrictions, correction limits and owner acceptance remain in place.

The server reads an optional ignored `reviewer-connection-status.json` beside its database, limited to two authentication booleans and valid check timestamps. A missing, oversized or invalid snapshot yields unknown status. Extra fields are not returned. This file contains no authentication credentials, and the application never invokes a CLI to render these labels. Snapshot checks were made during this investigation; normal logins and their credential stores were left unchanged.

Read [Windows review isolation](WINDOWS_REVIEW_ISOLATION.md) for the separate investigation. Native packet-only isolation is still unverified. Linux/WSL2 automatic review has been retired from the active roadmap; the historical investigation is retained only as reference. No local Codex bridge is planned. There is no setup action required to use the dashboard or manual handoffs.


## Checkpoints, smart assignment and handoffs — 2026-10-21

The existing premium layout and owner workflow remain. Development Team now includes Groq, two OpenRouter candidates, two disabled Cerebras trial candidates and disabled prepaid DeepSeek. API configured, historical live-test evidence and routing permission are distinct; a stored successful test does not establish present connectivity. Usage values are provider reported or shown as unknown.

Choose a task category and Select eligible free developer to assign without sending a request. Enable free controls in Settings only after verifying account eligibility. Before Generate, explicitly authorize the operation and choose whether to allow bounded fallback. With fallback checked, up to three distinct free model attempts can use the task's remaining three-attempt budget. Uncheck it for one model attempt. Paid models are never selected automatically.

Checkpoint saved shows actual durable timestamps and offers a frozen handoff download. Provider handoff history shows actual recorded switches, reasons and checkpoint IDs. Running, review required, awaiting owner approval, completed and failed reflect persisted workflow state; waiting for free capacity reflects a recorded capacity blocker. Switching/resuming are historical events, not fabricated ongoing activity. No invented percentage is added.

Pause and checkpoint is available before dispatch. A running request is not forcibly killed by that control. After failure/restart, inspect evidence and authorize Resume with free capacity; no background timer bypasses an outstanding approval. Known retry times are earliest availability estimates, not capacity guarantees. After three attempts, preserve evidence and use the existing manual workflow. To continue after a consumed attempt ceiling, explicit further design/owner action is needed; the UI does not silently reset attempts.

DeepSeek is shown as paid and disabled. Preparing it requires a later deliberate owner decision, secure local key configuration, current verified price bounds/expiry, spending ceilings and enabled paid policy. The dedicated API requires a separate exact quote and explicit owner confirmation per request; this dashboard does not enable billing or offer an automatic paid fallback. DeepSeek advisory review is not an automatic senior approval integration. Cerebras cannot be enabled as a free fallback under its currently documented offer.

Generated files remain SQLite drafts. Behavioral tests, application of production changes, independent senior reviews and final acceptance retain their existing manual gates. Linux/WSL2 automated reviewer setup is retired; historical reports are retained.


## Current workflow — DeepSeek Senior Developer

AI Team separates Development Team (Groq, Poolside Laguna, MiniMax) and Senior Developer (DeepSeek). The senior card shows configured versus historically verified provider response, review readiness, last observed balance with timestamp, request/daily/lifetime budgets, conservative local reservations, review queue and actual report history. Refresh never queries the provider. Balance checks require their own explicit owner action and configured/enabled access; they authorize no model request.

After development, record actual external test evidence. Request DeepSeek review freezes the draft, requirements, diffs, tests and checkpoint without charging. Review pauses while DeepSeek is disabled/unconfigured or until the owner explicitly requests a cost estimate and authorizes that specific paid review. The estimate expires after five minutes and is bound to the request/model/prices. Enabling external request controls alone never submits a review. Missing/expired prices, insufficient budgets/balance, stale snapshots, self-review, malformed output and failed access cannot become approval.

DeepSeek findings appear under the task and in the review history. A rejection creates CHANGES_REQUESTED; reassign a developer and produce a new draft. Existing free generation receives the required corrections. Supply new tests and request a new independently authorized review. Only DeepSeek approval with frozen passing evidence reaches VERIFIED; a separate owner action reaches COMPLETED. Paid outages leave the draft awaiting review and preserve unknown reservations; there is no automatic paid retry.

Owner-authored draft imports remain available. Retired agent author/reviewer selections and manual review-receipt forms are removed. Historical packets/findings can still be inspected/downloaded in audit sections; they cannot be reused to approve current work. Existing uncompleted child tasks verified by retired reviewers return to awaiting review, with an explicit event/checkpoint. Completed historical work remains intact.

These budgets are local conservative reservation checks, not a verified provider-side charge cap or a promise that all charges are prevented. Final charges can differ from estimates. Check provider billing independently; uncertain outcomes retain their reservation and need owner reconciliation. No automatic top-up or credit purchase exists.


## 2026-10-21 free-developer activation

See [FREE_DEVELOPER_HANDOFFS.md](FREE_DEVELOPER_HANDOFFS.md) for verified account/catalog evidence, quota, exact retirement deadlines, Windows certificate-store startup, dashboard status semantics, mocked handoffs and the unsubmitted calculator demonstration. OpenRouter free confirmation is enabled; live generation and DeepSeek paid access remain off. MiniMax retires October 22 at 12:00 UTC; Laguna is excluded starting October 31 UTC. No paid replacements are selected.


## 2026-10-21 provider repair and verified connection

See [PROVIDER_REPAIR.md](PROVIDER_REPAIR.md) for Groq network-denial diagnostics, the repaired OpenRouter catalog size bound, the single owner-authorized successful MiniMax free smoke test, exact retirement cutoff, DeepSeek read-only account/balance verification, secure local key setup and missing owner spending budgets. DeepSeek paid generation and live session defaults remain disabled; no new MiniMax generation is authorized. Older untested statements above are historical.


## 2026-10-21 provider expansion (activation pending)

See [PROVIDER_EXPANSION.md](PROVIDER_EXPANSION.md) for Gemini diagnostic findings, Mistral/NVIDIA/Cloudflare adapter setup, official conditional free-access research, key/account evidence, separate routing/live approval gates, usage/context/backoff controls, mocked handoff validation and the unsubmitted calculator plan. Seven developer provider cards reuse the existing executor/data architecture; DeepSeek remains sole senior and paid access stays disabled. All four expanded routes remain off pending credentials/evidence and explicit owner routing activation. Existing sections above are historical where superseded.

## Saved live evaluation — 2026-10-22

Read PROVIDER_DIAGNOSIS_20261022.md for a beginner walkthrough. Main workspace: http://127.0.0.1:3000/team. Separate saved disposable evaluation: http://127.0.0.1:3001/team. Open either named disposable project and its development task to inspect Generated artifacts, Recorded test evidence, Progress history & token usage and Checkpoint saved. Mistral produced a real draft; NVIDIA received the actual artifact and improved it. Both passed22independent tests. Both correctly remain AWAITING_REVIEW because DeepSeek paid senior review/final owner acceptance were not authorized. No code was applied. Live controls are off and evaluation grants are closed; inspecting saved results sends no model request. Generation verified, routing eligible and routing enabled are separate states; scoped evaluation is never an automatic routing candidate.


## Plain-English explanations above saved code

Generated artifacts now show an In plain English note, a short list of main parts and, for test files, what passing means. Expand Show saved code below the explanation to inspect the exact stored file. Previous draft versions can also be expanded and have revision-specific explanations. Saved plans, review records, historical change packets and recorded test results have short context descriptions above their structured text. These descriptions are not new review decisions or test results.

The four current explanations were written locally after reading both saved versions. They live separately in data/artifact-summaries/<draft-or-revision-id>.json, linked to the real database path, task/revision IDs and draft/file hashes. SQLite was not modified and no schema migration was needed. Notes that are missing, malformed or no longer match a revision are not reused; the code remains inspectable with an honest explanation-pending message. Sidecars are local ignored data: preserve that directory separately when backing up explanations, because the SQLite-only backup does not include it.

Future summaries are not activated. Recommended first step: write a local explanation after each new revision, with no additional provider usage. An optional later design could ask the already-authorized development model for a separate explanation alongside each file, store it outside the immutable artifact and validate its revision/hash binding. Plan roughly 150–300 extra output tokens per file, as an estimate rather than a guarantee. Dollar cost depends on the exact model and allowance; free access cannot be assumed. Require a displayed estimate and explicit authorization before adding provider-generated summaries, and never alter existing review or acceptance gates. No automatic summary generation, retries or additional provider requests were enabled.

## Choose a visual style before redesign

Open http://127.0.0.1:3000/team/style-preview . Three identical fictional workspaces show sidebar navigation, a project, verified and accepted sample tasks, colored provider statuses and code with an explanation.

- Dark studio: charcoal surfaces, bright blue accents and code-editor colors.
- Light clean: white surfaces, soft gray borders and a minimal document feel.
- Bold modern: purple/blue gradients and colorful provider badges.

Use the three jump links to compare them. Tell your assistant which one you prefer; this page does not save or apply a choice. All sample data is fictional. No connection, billing, routing or acceptance action is available on the preview. The real dashboard retains its existing style apart from the requested explanation boxes.
