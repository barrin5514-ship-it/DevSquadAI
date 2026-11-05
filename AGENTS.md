# Dev Squad AI verification rules

Preserve unrelated work, project records, credentials, approvals and worker isolation.
Never start a potentially billable worker without specific owner authorization.
The owner explicitly removed project spending caps and money-approval steps.
Their Send action starts that assigned workflow; maintenance tasks must not send.
Keep token/cost tracking, Stop, stuck detection, folder locks and no-self-review.
Never force-release an unresolved lock or count assignment as model execution.

For every feature or fix:
1. Investigate the original failure and implement the smallest useful correction.
2. Run targeted tests, then appropriate regressions serially on this low-RAM PC.
3. Exercise the running application's actual interface whenever tooling permits.
4. Verify frontend/backend requests and resulting database/filesystem evidence.
5. Exercise important failure/recovery paths and repeat the original scenario.
6. Check relevant application/browser errors and existing navigation/workflows.
7. Record actual commands, results, environment, evidence and limitations.
8. Do not call unit tests, compilation or mocks functional completion.

Use VERIFIED only when required functional checks passed. Otherwise report
PARTIALLY VERIFIED, FAILED or BLOCKED and identify precisely what remains.
Clearly label deterministic local workers as simulations, never real AI evidence.
No hidden reasoning or credentials may enter terminal output or saved events.
Final acceptance belongs to the owner. No push, merge or deployment without approval.
