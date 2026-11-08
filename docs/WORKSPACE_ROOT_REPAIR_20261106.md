# Track A — managed workspace roots

November 6, 2026, America/New_York. Branch `feature/workspace-ui-redesign`; existing HEAD `9983d20` preserved. **PARTIALLY VERIFIED; existing-project migration deferred for the class-demo cutoff.** No model turn or production permission change.

## Inspected and confirmed

Read AGENTS.md, both Codex failure/access reports, Step 4 evidence, `Workspace.create`, `Store.createProject`, Studio project registration, isolation and CLI startup. Existing managed creation only makes a directory; registration can link an existing folder. Neither automatically establishes an independent repository. The prior controlled non-generating startup succeeded only after a disposable nested folder got its own Git root and local instructions. This does not prove the original discarded stderr was identical or that model inference works.

Supported backup taken before edits: `node scripts/backup.js`, verified as `backups/backup-1793977734187-b71e6f40-e8db-4479-bafc-662794e23b0e.sqlite`.

## Implemented, bounded scope

New `src/services/managed-workspace-root.js` creates **new folders only**, runs bounded local `git init` with empty templates/global configuration excluded, and writes local `AGENTS.md` preserving supplied trusted instruction sources in explicit outer-to-inner order, then project-specific instructions. A hidden manifest records source hashes, resulting instruction hash and precedence. Sources must be regular, bounded instruction files. Existing folders/repositories are rejected without overwrite or automatic migration. No Git commit is made.

The class simulator uses this helper for its new, disposable repository, copying the actual hub security instructions before adding simulation-only instructions. It never changes Windows ACLs, root-deny, parent-read permissions, profile credentials or instruction loading.

**Not wired into normal project creation yet.** That integration and any Counter Test 2 migration remain pending. This avoids silently adding Git/instructions to existing owner folders. The new helper is real executable code used by the isolated demo, not a claim that regular production workspaces were migrated.

## Verification

`tests/managed-workspace-root.test.js`: four tests pass for new Git roots, source preservation/precedence, checkpoint stability, rejection of existing folders, nested independent roots, and rejection of missing/unrelated/oversized instruction sources. Included in the final 61-test serial run described in the class report; zero failures/skips.

Prior actual non-generating Codex evidence is retained in `startup-thread-own-git-20261106.json`: correct cwd and local instruction source, named MXC permissions unchanged, zero turns, normal process termination. Real sandbox probes in `startup-instruction-read-access-20261106.json` showed inside reads permitted and parent instruction reads denied. These were not repeated as model calls. The new full-security-instruction helper output has not received a fresh native startup check in this task; do not conflate the earlier simpler fixture with that additional verification.

Real Chrome verification in this task covered the isolated class application (12 checks, including checkpoint persistence after restart) and the owner-ready page. The regular dashboard still responds HTTP 200. Existing Counter project IDs, histories and historical lock remain unchanged. Personal/School account setup was not altered; previous independent login checks remain evidence of authentication, not current quota or inference.

## Files, security and remaining work

Files: `src/services/managed-workspace-root.js`, `tests/managed-workspace-root.test.js`, this report, verification logs and `docs/PROMPT_LOG.md`. No existing workspace creation method was replaced. Unrelated changes remain untouched. No commits/push/merge/deploy.

The 10:15 AM ET cutoff passed while class-demo implementation was underway. Further Track A production integration/investigation was deferred; remaining time prioritized the verified simulation. Final targeted verification of the existing helper was included with demo checks.

**Can Counter Test 2 safely receive the repair now? CONDITIONAL, not performed.** Before applying anything: snapshot its exact IDs/root/fingerprints/lock, plan preservation of every applicable ancestor/local override instruction, verify precedence under the new root, and authorize that explicit existing-folder migration. Do not silently initialize its Git metadata or overwrite an instruction file. Checkpoint and acceptance evidence must remain truthful.

Next owner action: use the class simulation now. After class, resume Track A integration and approve an explicit Counter Test 2 migration proposal. Fresh non-generating startup must pass before proposing any separately approved model request. Real inference readiness remains **UNVERIFIED**.

Later production integration update: see [WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md](WORKSPACE_ROOT_PRODUCTION_INTEGRATION_20261106.md) for the subsequent managed-root fix and its exact verification limits. This earlier report remains historical evidence; the simulation remains a backup, not live AI proof.
