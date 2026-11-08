# Antigravity CLI installation — November 7, 2026

- Official Windows installer from https://antigravity.google/cli/install.ps1 was downloaded and reviewed before execution; source/hash retained in verification/antigravity-install-20261107/.
- Installed only the standalone CLI at C:\Users\barri\AppData\Local\agy\bin\agy.exe. Version 1.5.2. Authenticode signature Valid, publisher Google LLC. Installer verified SHA-512 and added its bin directory to the user PATH; existing terminals may need reopening. No IDE or unrelated package installed.
- Installer output prefixes some successful setup messages with ERROR: logging before google.Init. Actual setup reported success; executable version/help and signed publisher were independently checked.
- Local help confirms models, agents, ACP, print/headless mode, JSON/stream-JSON, JSON schema, per-session settings and --print-timeout. No hard output-token cap advertised. No headless generation was run.
- Authentication remains UNVERIFIED. An earlier answer reporting completed sign-in was superseded by the owner saying the window did not open. Execution policy remained RemoteSigned; no policy or security change was made. The first launcher was no longer running; exact reason not established. A direct visible cmd terminal was opened in an empty temporary folder, with no prompt supplied.
- If needed, the owner can open PowerShell, change to the temporary sign-in folder, and launch the installed executable with --sandbox. Use personal Google browser sign-in; do not choose API key or Cloud billing, enter payment details, or submit an ordinary AI message.
- Available account models and remaining free quota are NOT VERIFIED pending actual sign-in. Published free baseline limits are not account proof. Check /usage and credit-overage settings after login; do not buy credits.
- Separately authorized live test readiness: BLOCKED pending successful login, current model/quota check, verified tool restrictions and enforceable test limits. A hard 500-token CLI cap remains unverified.
- Zero AI generation requests. No Dev Squad routing, projects, checkpoints, auth profiles, security configuration, spending settings or worker activation changed. No push/deploy.
- Evidence: official-install.ps1, installer-source.json, installation-output.txt, installation-receipt.json, cli-help.txt, models-help.txt under docs/verification/antigravity-install-20261107/.

Sources: https://antigravity.google/docs/getting-started?tab=cli ; https://antigravity.google/docs/install/ ; https://antigravity.google/docs/cli/headless/ ; https://antigravity.google/docs/plans/

## Post-login verification

Owner subsequently confirmed the sign-in appeared and was completed. The earlier pending status above is historical. The supported `agy models` command exited 0 and listed `gemini-3.8-flash-low`, `gemini-3.8-flash-medium`, `gemini-3.8-flash-high`, `claude-sonnet-4-6`, `claude-opus-4-6-thinking`, and `gpt-oss-120b-medium`. Model-list visibility does not prove free entitlement for each model.

The officially documented built-in `--print /usage` command, with slash-command handling explicitly enabled for that process, exited 0 without a generation request. Gemini Models weekly allowance: **98% remaining**, reset `2026-11-14T05:42:16Z` (November 14, 12:42 AM America/New_York). Claude/GPT group: **100% remaining**, reset `2026-11-14T06:08:05Z` (November 14, 1:08 AM America/New_York). These are provider-reported group percentages, not token balances or per-model guaranteed access. The quota command refreshes account configuration/usage from the backend; no auth token or credential file was read/copied.

Authentication connection: **VERIFIED**, combining owner-confirmed personal sign-in with successful backend quota report. Exact subscription plan and paid-credit overage status were not supplied by these commands and remain **UNKNOWN**. Do not infer a free plan or free third-party-model eligibility from a 100% quota row. Owner must verify Free access and no credit-overage use before any zero-cost test. No billing changes made.

Headless command support: **VERIFIED from installed 1.5.2 help**, including JSON, JSON schema, timeout and session-only settings. Headless model inference remains **NOT TESTED**. A possible future candidate is the actually listed `gemini-3.8-flash-low`; it was not assigned or activated. The hard 500-generated-token cap remains unsupported in reviewed help. A later test would need explicit approval for enforceable 60-second/8 KiB capture limits, verified no-tool restrictions and unknown total generated-token ceiling. Output capture is not a spending or token cap. Native Windows sandbox/tool containment still requires its own bounded verification before allowing tools.

Final status: **CONNECTED — LIVE TEST PENDING**, production worker integration **NOT VERIFIED**. Zero generation requests. Existing Dev Squad routing, projects, checkpoints and security configuration remain unchanged. Evidence: models-check.json and usage-check.json. Stop after report; no live request authorized.

Sources: https://antigravity.google/docs/cli/headless/ and https://antigravity.google/docs/cli/commands/usage .
