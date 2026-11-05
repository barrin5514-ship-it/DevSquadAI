> Active policy updated: DeepSeek is the sole Senior Developer and lead reviewer. Claude Code/Codex manual workflows are retired. Older sections below are historical context, not current agent assignments. See the current policy section at the end.

# Senior review workflow

1. The owner submits a request. Claude prepares a plan externally; the local operator records the real plan. The owner approves it before child tasks are created.
2. Assign a child to a verified available model. Dispatch requires both a disabled-by-default server setting and separate explicit authorization for the outbound request. Alternatively import an actual Claude/Codex draft manually.
3. A returned draft is stored in SQLite. Schema, file paths and JavaScript syntax are checked without execution. Nothing is installed, applied or deployed.
4. For behavioral testing, the owner separately approves an external restricted disposable environment. Do not run generated files in the application process or ordinary host shell. This phase provides no arbitrary-code runner. Record the command, isolation, results and limitations with the current draft ID; a claimed test is not an automatically verified test run.
5. Create a handoff packet for Claude or Codex. It includes task ID, assigned developer model, actual author, proposed changes, exact files/content hash, draft diff, test evidence and reviewer. At creation there are no findings or decision. Send it manually; the backend contacts neither senior.
6. After receiving the actual review, submit the reviewer identity, findings, approved/rejected decision, corrections (required for rejection), and who recorded it. The reviewer must match the frozen packet and differ from the draft's author. Approval requires passing test evidence captured in that packet.
7. Rejection becomes CHANGES_REQUESTED. Reassign explicitly, then generate/import a new draft. Old test evidence and decisions cannot approve the replacement. Three attempts per child bound correction/failure loops. A new packet/test record is required for each revision.
8. Approval becomes VERIFIED, not COMPLETED. Only the owner's explicit acceptance completes the child. Once every child is completed, verify the root and request its separate owner acceptance.

Packets freeze evidence. If a packet was created before testing, its reviewer can reject it requesting test evidence; a corrected draft and new packet then follow. Existing review packets are never edited to manufacture approval. Failed tests can likewise lead to a rejection/correction cycle.

Manual reviewer identities and evidence are trusted local operator receipts, not cryptographic authentication. Preserve the actual external review text and test output. A subscription to Claude or Codex does not provide API access. Independent review may be performed by either senior on the other's imported draft. Production changes, destructive commands, deployments and GitHub pushes have no automatic execution route and still require human approval outside this phase.

## Browser controls

The interactive /team workspace now exposes these handoffs without constructing API requests. Plans may be prepared manually or by an explicitly authorized development model; neither is an independent senior review. Settings provides session opt-in, followed by separate per-request authorization. Download review packets and record the actual external findings in the review form. The owner may return VERIFIED child work for corrections; a fresh draft, tests and independent review remain mandatory. See DASHBOARD_GUIDE.md.


## Current DeepSeek review workflow (supersedes manual agent handoffs)

Developer draft -> durable checkpoint and frozen DeepSeek review request -> owner requests a quote -> owner explicitly authorizes one paid review -> authenticated USD balance and local budget checks -> one provider POST -> validated structured findings -> correction/new draft/re-review if rejected -> VERIFIED only with passing frozen tests -> separate final owner approval.

Additive migration 005 leaves team_packets and senior_reviews unchanged as historical audit tables. New deepseek_review_requests stores draft/checkpoint IDs, immutable snapshot and hash, explicit request status, bounded attempt count, quote/execution/model, findings and timestamps. Database triggers prohibit changing the frozen identity/snapshot. No manual submitted decision can impersonate a provider review. New reviews never use legacy manual receipt records as approval evidence. Failed/interrupted requests retain their snapshot and block completion; restart marks an in-flight review failed without issuing another request.

Quote purpose and review-request identity are explicit. The development endpoint cannot consume a review quote. Immediately before consuming a reservation, status, expiry, prices, balance and budgets are checked; task locks prevent concurrent review/generation and a consumed quote cannot issue another POST. Review token usage is attributed to the DeepSeek senior identity. All review outcomes, including valid reports persisted before a later bookkeeping error, retain durable evidence; uncertain charge reservations are not automatically released.

DeepSeek-authored code cannot receive DeepSeek independent approval. With no other active reviewer configured, it pauses rather than treating the owner or the same model under another name as independent. This is a remaining operational limitation of the single-senior structure.

Legacy /api/tasks/:id/reviews POST and legacy manual completion reject new submissions. Historical GET records remain readable. Legacy unfinished coding requests must enter the owner-approved team workflow for new DeepSeek review; their old records are not deleted or silently converted into paid requests.


## 2026-10-21 provider repair and verified connection

See [PROVIDER_REPAIR.md](PROVIDER_REPAIR.md) for Groq network-denial diagnostics, the repaired OpenRouter catalog size bound, the single owner-authorized successful MiniMax free smoke test, exact retirement cutoff, DeepSeek read-only account/balance verification, secure local key setup and missing owner spending budgets. DeepSeek paid generation and live session defaults remain disabled; no new MiniMax generation is authorized. Older untested statements above are historical.


## Task-scoped one-shot paid review

The backend supports an internal --paid-review-grant=<local-file> startup capability. It does not enable global paid/live routing. Only a trusted owner/operator may prepare it after specific approval with a reliably recorded timestamp. The grant and immutable compact HTTP body are bound to database file identity, actual project/task/revision/frozen-review IDs and hashes, key fingerprint, exact model/settings, verified price lease, dollar/output/count limits and original expiry. There is no grant-minting HTTP endpoint.

The normal review-quote/review-run endpoints enforce it. Quote creation is idempotent; request slots and the full approved task allowance are consumed atomically before network dispatch, across SQLite connections. Account preflight is at most one models GET plus one fresh balance GET; one POST, no retry/fallback. Unknown outcomes retain slots and funds. Restart, re-quoting, omitting the startup file or changing grant ID cannot replenish an already-scoped task. Expired/exhausted grants cannot dispatch.

Completed reservations retain the consumed lifetime allowance; fresh balance calculations exclude already-completed charges to avoid double-counting. Application reservations and heuristic token estimates are not guaranteed provider invoice ceilings. A returned static recommendation is not test execution or final owner acceptance. See DEEPSEEK_REVIEW_PROPOSAL_20261023.md for the first actual approved scope and evidence.
