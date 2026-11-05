# Free model benchmark

Run date: 2026-10-20. OpenRouter authentication PASS; live generation PASS for two of three candidates. No retries.

Prompt: Write a JavaScript function called add that accepts two numbers and returns their sum. Return code only.

System instruction: Return only the requested JavaScript code. Existing ProviderAdapter.generate used unchanged; diagnostic fetch wrapper enforced zero-price routing and low/disabled reasoning as supported by each model. Cap: 512 output tokens, timeout 60 seconds. Latency includes complete HTTP response retrieval, not just first token.

| Exact model | HTTP | Latency ms | Input | Output | Total | Reported cost | Syntax | Behavioral | SQLite draft |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| thinkingmachines/inkling:free | 403 | 4715 | N/A | N/A | N/A | Not reported | NOT_RUN | NOT_RUN | No draft |
| minimax/minimax-m3.1-flash:free | 200 | 10987 | 224 | 16 | 240 | $0 | PASS | PASS | PASS |
| poolside/laguna-s-2.1:free | 200 | 8266 | 42 | 16 | 58 | $0 | PASS | PASS | PASS |

Both successful models returned function add(a, b) { return a + b; }. Neither required code cleanup. Both reported cost=0. Inkling returned 403 stating its free model is only available on agentic harnesses; no Retry-After header or tokens were returned. No rate-limit response occurred. Catalog availability did not predict the endpoint's harness restriction; no identity spoofing or fallback was attempted.

## Restricted execution and persistence

Code was first syntax-checked using existing validateDraft and Node --check. Only the complete manually reviewed addition function matching a strict allowlist was permitted to execute. Execution occurred in a separate disposable-directory Node child, with permission mode and no grants, no inherited credentials, disabled string code generation, 32 MiB heap cap, 2-second timeout, and bounded output. The exact allowed code has no imports, network, file, process, dynamic-code or property-access operations. This is a restricted test for this specific reviewed function, not a general untrusted-code sandbox.

Cases: (2,3)=5; (0,0)=0; (-2,3)=1; (-2,-3)=-5; (1.25,2.5)=3.75; (1000000,2000000)=3000000. Each successful model passed 6/6. Behavioral evidence persisted in draft_tests and was verified by reopening SQLite. No generated code executed in the main application.

Code-only replies were wrapped locally as one src/add.js draft for the existing validator and persisted using the existing migrated generated_drafts schema; usage_events preserved actual provider counts. This verifies adapter output and isolated storage, not the normal JSON-prompt orchestrator end-to-end. Existing production database and agent assignments were untouched. Drafts remain awaiting senior review.

## Groq baseline comparison

Existing baseline: Groq openai/gpt-oss-120b, HTTP 200, 265 input / 138 output / 403 total, syntax PASS, SQLite PASS. Latency not recorded. Baseline behavioral execution was not run. Its JSON-draft prompt and system context differ from this code-only test, so token counts and timings cannot establish a model-quality or cost-efficiency ranking. No additional Groq request was made.

## Provisional role recommendations (no assignments)

| Role | Recommendation | Evidence boundary |
|---|---|---|
| Coding | Keep Groq default; Laguna S 2.1 as an opt-in candidate | Basic correctness demonstrated; Laguna is coding-focused but its listed free period expires October 31. |
| Debugging | Groq operational default; MiniMax M3.1 Flash next evaluation candidate | MiniMax catalog positioning and access test only; no debugging task benchmarked. |
| Testing | Groq operational default; Laguna S 2.1 next evaluation candidate | Function passes tests; ability to write tests itself remains untested. |
| Architecture/planning | Keep Groq; evaluate MiniMax later | No planning benchmark. Inkling is blocked in this harness and is not recommended for deployment. |

One call per candidate cannot estimate reliability. Laguna was faster in this sample (8.266s versus 10.987s), which is not a stable latency ranking. OpenRouter is not enabled for automatic routing; no OPENROUTER_MODEL or free-confirmation flag was written into .env. Groq remains default; Gemini retains manual_only capability.

## Artifacts

- thinkingmachines/inkling:free: data/openrouter-benchmark/run-bS19j3/report.json and benchmark.sqlite
- minimax/minimax-m3.1-flash:free: data/openrouter-benchmark/run-PE3elr/report.json and benchmark.sqlite
- poolside/laguna-s-2.1:free: data/openrouter-benchmark/run-YP2cTz/report.json and benchmark.sqlite

Automated tests: npm.cmd test — 62 passed, 0 failed.
