# Antigravity live-test preflight — November 7, 2026

**BLOCKED before generation. Authorized invocation allowance: 0/1 used.**

Owner confirmed free access and paid overages OFF; approved one gemini-3.8-flash-low test, 60 seconds, 8 KiB captured output, no hard token cap, no retries or fallback. These confirmations are retained; no repeat billing/login approval is needed.

Installed CLI 1.5.2 local help was inspected. Current default native provider is in use, no startup hooks/plugins were configured in the inspected CLI settings. The public settings schema returned HTTP 200 and contained no retry/fallback/maxAttempts property; installed help exposes no retry-disable flag. Google documents automatic in-process retries for transient model errors, including 502/503/504 and some 429 cases. No supported way to disable them was established. It would be incorrect to equate one CLI launch with one provider attempt.

No native generation was dispatched. There is no response, HTTP status, token usage, cost, generated JavaScript or behavior-test result. No timeout, usage-limit or authentication failure was observed because the test was not launched. This is an authorization/control mismatch, not a generation failure.

Prepared test target: exact model gemini-3.8-flash-low; existing personal Google login; disposable empty temporary folder outside all application workspaces; same add(a,b) review requesting explanation, invalid-input edge case, improvement and corrected finite-number function as structured JSON. No project files or personal data. Native JSON/schema support is documented. Proposed per-session safety settings would use strict tool permission, sandbox enabled, no outside-workspace access, useG1Credits false, and deny all read_file/write_file/command/unsandboxed/read_url/execute_url/mcp namespaces. No global setting or permission was modified. Tool rules are documented; their enforcement in an actual agent turn has not been exercised.

A future supervisor must limit total captured stdout/stderr to 8,192 bytes, stop the owned process tree at 60 seconds (with separately reported cleanup time), verify process identities/termination, retain incomplete output only as diagnostics, and inspect returned code before isolated behavior tests. No reusable production worker was implemented. Existing diagnostic lifecycle uses a 64 KiB internal limit, so it must not be described as meeting 8 KiB without a dedicated bound. No unsupported retry parameter was invented.

**Required owner decision:** either retain strict zero internal retries (test remains blocked), or explicitly allow the native CLI's built-in transient retries inside the same one invocation and 60-second window. The application would still never relaunch it, retry the invocation or select a fallback. Keep model, free access, no-hard-token-cap and 8 KiB restrictions unchanged. This is a narrow change of the retry condition, not duplicate approval for an already permitted call.

All Dev Squad routing, projects, Expense Tracker, checkpoints, historical locks, credentials and security configuration remain unchanged. Only diagnostic evidence/report/prompt log were written. No paid request, publishing or deployment. No regression rerun was necessary: no production code changed.

Sources checked today: https://antigravity.google/docs/changelog?tab=cli ; https://antigravity.google/docs/cli/reference/ ; https://antigravity.google/schemas/v1/settings.json ; https://antigravity.google/docs/permissions/ . Evidence: docs/verification/antigravity-live-test-20261107/preflight.json and previously saved installed cli-help.txt.
