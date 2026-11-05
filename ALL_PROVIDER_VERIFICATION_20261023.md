# Free-only provider verification — October 23, 2026

Supported SQLite backup completed first: `backups/backup-1792811338085-04680ed9-e4ef-4752-a9c2-deadf189e4ca.sqlite`; integrity and foreign keys checked by the supported script. Historical projects, review requirements and owner acceptance remain in place. No global routing, billing or spending-limit change was made.

## Local results

Changed only the confirmed NVIDIA dispatch defect: for the exact current Nemotron3.5SuperVL model, regular dashboard generation supplies `reasoning_effort:none` as evaluation mode already did. Two regressions cover the normal path and rejection without free-account authorization. Targeted mock suite **20/20 PASS**. No provider request was made by these tests. Full suite was launched separately; its result must be read from `data/all-providers-free-20261023/full-tests.log` before claiming success. It was still pending when local tools became unresponsive; no full-suite pass is asserted here.

Setup and remaining local workflow blockers are documented in `FREE_PROVIDER_SETUP_20261023.md`. The existing main task-scoped capability supports Gemini only; other provider mock success after normal activation is not proof of an authorized main-app scoped run with global routing off. Hugging Face has no current verified free team route/model. Do not weaken those gates or use the evaluation server as main-dashboard evidence. The NVIDIA source fix has not been confirmed loaded by a backend restart; process inspection stalled, so no server was forcibly stopped.

## Actual live requests: three read-only GETs, zero inference

Durable reserved-before-send ledger: `data/all-providers-free-20261023/catalog-ledger.json`. No retries, fallback, balance GET or DeepSeek request. Recorded UTC times fall on October23 local EDT. None of these read-only calls proves successful generation or account billing entitlement.

| Provider | Local setup | New model/catalog check | New coding/dashboard task | Working now? / blocker |
|---|---|---|---|---|
| Gemini | Key/model present, free flag true | Not sent in this run | Not sent | Historical main-app coding verified; current saved-key project association needs confirmation before fresh scope |
| Groq | Key/model present, free flag true | **403**, 2.571s; error `network_access_denied`; exact sanitized message: Access denied. Please check your network settings. Retry-After absent | Stopped under owner rule | No; current catalog access denied. Does not independently prove generation unavailable |
| Mistral | Key/Codestral present, free flag false | **200**, 2.631s; `codestral-2508` listed | Not sent | No new verification; current Free allowance/no-overage unverified; private allowance page requires sign-in |
| NVIDIA | Key present; persistent model missing, free flag false | Not sent | Not sent | Not ready; owner model/active non-production trial allowance confirmation required; regular reasoning fix mock-tested |
| Cloudflare | Token/account/model absent, free flag false | Not sent | Not sent | Not ready; private owner setup and current Workers Free Neuron allowance needed |
| Hugging Face | Token/model absent, free flag false | Not sent | Not sent | Not ready; credit-funded access is not a zero-price model guarantee, account allowance and safe regular team route missing |
| OpenRouter/Laguna | Key/free flag present; explicit team route | **200**, 3.332s; `poolside/laguna-s-2.1:free`, all returned prices zero, context262144 | Not sent | Catalog only; scoped main path and the mandatory dispatch price GET must fit the one-catalog budget; local retirement October31 |
| MiniMax | Historical only | Excluded | Excluded | Retired; history preserved |
| Cerebras | Historical only | Excluded | Excluded | Owner removed from scope; no setup/test |
| DeepSeek | Already verified paid reviewer | Excluded | Excluded | Retained at owner's clarification; new paid calls not authorized in this free-only run |

## Read-only account/browser evidence

AI Studio Projects showed Default Gemini Project on Free tier. Its Gemini3.8Flash limits screen showed5RPM/250KinputTPM/20RPD with28-day peaks1/5,1.03K/250K,5/20; those are not a current remaining quota. Saved key-to-project association was not established by reading/revealing keys. Owner was asked to confirm that association. Mistral's private limits page reached sign-in; no login/credential/billing change occurred. Public official sources and exact secure config names are linked in the setup guide.

The regular dashboard home was visually inspected and showed Local backend connected, existing projects/approval history, disabled provider reasons and DeepSeek review history. No new draft/test/summary/checkpoint workflow was completed, no task was accepted, and a later AI Team navigation hit a browser command deadline. Do not describe that as a completed all-provider visual workflow test.

## What remains

Owner setup/account evidence is needed for the missing/uncertain providers. Missing evidence is not proof a provider is paid, so no provider/history was deleted. Confirmed paid-only/retired access stays excluded. Gemini can use its existing bounded main-task path once the correct Free project is confirmed. Other routes need a carefully tested bounded task mechanism without global routing activation; account eligibility must be established first. Full-suite completion, final preservation/diff checks and loading the source fix still require responsive local tools. No extra live requests are implied by this report.
