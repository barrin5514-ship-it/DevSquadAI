# Start readiness and private webhook persistence — 2026-11-03

Demo URL: http://127.0.0.1:3000/team#demo/b5e4176a-ad93-4614-8980-e07ab63bf320

## Confirmed diagnosis

The saved loop and job were ready at round zero; GitHub reader and MXC isolation were ready. The webhook was configured and enabled before this task, but there were zero execution scopes. Existing UI logic therefore rendered Start messenger loop disabled. The button was below the scope section; it was not removed by the recorded loop state. The browser's current checkbox state was not inspected. A fresh render starts the separate loop consent unchecked.

## Changes

Start messenger loop now appears near the top of every saved job card, including non-ready states. The adjacent Why Start is not available yet checklist names missing webhook URL/delivery, GitHub readiness, isolation, execution scope, job/loop state and unchecked loop consent. It updates when consent changes. It never prepares scopes, resets a loop or dispatches a request. Backend gates remain authoritative; expired/exhausted scopes cannot be replenished here.

Webhook URL and enabled choice are stored atomically in webhook-out.json beside the existing local database. This local file and temporary write files are Git-ignored; URL values never appear in status/browser responses, logs, review history or this report. No schema migration. Invalid/oversized/symlink settings fail closed. A failed disk save preserves the prior in-memory setting and returns a sanitized error. Blank URL input preserves the saved secret; Clear saved webhook is an explicit action. New files use mode 0600 where supported, with inherited Windows access permissions; no claim of encryption or a new Windows ACL boundary.

The old implementation retained the owner's hook only in memory and exposed no retrieval API. It could not be safely migrated without the owner re-entering it. Restarted only the uniquely identified DevSquadAI backend once through its normal entry point to load this fix. The former memory-only hook must be entered once more; future restarts restore the URL and enabled choice. No memory scraping or secret-returning endpoint was added.

## Verification

Post-upgrade regular API: HTTP 200, GitHub reader ready, isolation ready, webhook empty/off, persistent setting code loaded, no storage error, zero scopes, job/loop ready and round zero. No worker or paid/provider request, Zap trigger, Start, scope activation or owner acceptance. Current UI is checked through actual DOM regressions and served-script/API evidence, not claimed as visually inspected in a browser.

Targeted checks: 22/22 passed, including restart restoration with no delivery, disabling/clearing a saved URL, invalid storage, failed atomic save, exact task navigation, visible Start and checkbox behavior. The first negative storage test initially matched the generic word privately in the status message; corrected it to check the actual fixture secret. No real secret was exposed. Full suite results are recorded below after completion.

## Exact owner steps

1. Refresh the demo URL above.
2. Click Open AI Team / webhook settings.
3. Paste the Catch Hook URL into Zapier Catch Hook URL.
4. Select Enable report delivery to the saved Zapier URL.
5. Click Save webhook setting. This saves only; it does not send a report.
6. Open the demo URL again.
7. Check the consent beginning I authorize the exact demo scopes.
8. Click Prepare approved demo scopes. This starts the bounded 30-minute approval window, not the job.
9. Check I approve this bounded loop using separately authorized workers.
10. When your Zap is published and you are ready to run, click Start messenger loop within that approval window.

No step above was clicked on behalf of the owner.

Full supported serial suite: 335/335 passed, zero failures/skips/cancellations, 112.927 seconds. Evidence: DEMO_START_FULL_TESTS_20261103.txt. Syntax/diff checks passed. Targeted evidence: DEMO_START_TARGETED_20261103.txt.
