# One-checkbox Big Three demo — 2026-11-03

Open Big Three Demo in the left sidebar, or http://127.0.0.1:3000/team#demo/b5e4176a-ad93-4614-8980-e07ab63bf320.

## Owner flow for a fresh eligible demo

1. Check: I approve this run: DeepSeek up to $0.01, one included call each for Codex and Claude Code, 3 rounds, 5-minute limit.
2. Click Run Big Three.

No separate scope/Start checkbox or preparation button is shown for a bound demo. Role controls are under Roles and saved progress. Stop remains available. When all setup is ready, the yellow checklist is hidden even before consent; the button still requires consent. Only actual missing setup is listed. A saved/enabled webhook requires no setup steps.

## Existing run is already finished

At the beginning of this task, the actual saved demo was finished at round three, shared job awaiting_owner, task VERIFIED, with one completed spending scope. No new job or scope was created and no model, Zapier or Start request was made in this task. Completed runs cannot be replayed or their scopes renewed. The button therefore stays disabled on this historical run, showing a neutral completed-run notice and a link back to its saved task. The owner may inspect and accept the completed work through the existing acceptance gate; a fresh run needs a separately prepared/approved demo rather than resetting this one.

## Existing guards preserved

The combined UI calls the existing protected approve-scopes endpoint with the same exact $0.01/paid/native consent fields only when no scope exists. It then refreshes actual saved job, loop and grant state before calling the original protected messenger Start endpoint. Preparation failure/unknown outcome, Stop, expired/exhausted grants, wrong roles, changed loop bounds or missing configuration prevent dispatch. No automatic retries or fallback. Concurrent clicks are locally fenced and durable server request limits remain authoritative. Existing valid scopes are reused, never replenished. Detailed model/output/thinking/90-second worker limits, fresh price verification, the 30-minute approval window, per-task spending checks, native auth, no-self-review and owner acceptance are unchanged. The five-minute limit remains the existing wait for each handoff, not a new total wall-clock guarantee. The local $0.01 cap is not a guaranteed provider-side ceiling.

## Restart evidence and correction

The private webhook file was unchanged across an actual supported DevSquadAI-only restart; API confirms configured and enabled afterward. Its URL was never printed, returned or committed.

That restart exposed an existing recovery bug: the query selected only task_id while the strict demo review validator also required draft_id. It wrongly downgraded the valid completed demo to AWAITING_REVIEW. Corrected the query to include draft_id; all original review eligibility checks remain. Added a regression proving valid current reviews survive recovery while mismatched revisions remain unapproved.

Took supported backup backups/backup-1793731739095-dc83f5b1-5846-4c09-8c1f-1a7cf06010e7.sqlite before recovery. Rechecked the actual immutable review, frozen evidence, task/revision, completed worker attempt and exact erroneous transition, then used the existing guarded state transition/checkpoint workflow to restore VERIFIED. No raw status SQL, invented review or owner acceptance. Draft, review and scope snapshot hashes stayed unchanged. Another supported restart confirmed task VERIFIED, job awaiting_owner, messenger finished at round three, the same one scope, and webhook still enabled.

## Local checks

UI/mock targeted checks: 27/27 passed. Separate restart regression: 1/1 passed. Full final serial suite results: see ONE_CLICK_DEMO_FULL_TESTS_20261103.txt. Browser interaction was not claimed: evidence is actual served HTML/JavaScript, local API and DOM/mock regression checks. All live records inspected by their saved IDs, with no live provider requests or external webhook delivery.

Final local results: preliminary full suite 340/340 passed before the additional restart regression. Final serial suite 340/341 passed (421.093 seconds): the existing team rejection/correction test failed while recording evidence because its prior mock generation was not in AWAITING_REVIEW. The same case passed its one isolated diagnostic rerun (1/1, 4.207 seconds). No test meaning, timeout or production guard was changed to mask it. Exact intermittent cause remains unverified; low RAM (1.35 GiB observed) and a two-second syntax subprocess limit are context, not a confirmed diagnosis. The final full suite is not claimed wholly green. UI/mock targeted checks 27/27 and new restart regression 1/1 passed. See ONE_CLICK_EXISTING_FAILURE_CHECK_20261103.txt and the full log.
