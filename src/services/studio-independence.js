import fs from 'node:fs';
import {ApiError} from '../middleware/errors.js';
import {hashText} from './project-files.js';

// Two logins for Codex are still the same AI family, not independent reviewers.
export const workerFamily = id => id?.startsWith('codex-') ? 'codex' : id==='nemotron'?'nvidia':id;
export function independentRoles(roles) {
  if (workerFamily(roles.builder) === workerFamily(roles.tester))
    throw new ApiError(409, 'The Tester must be independent of the Builder, including its model family.');
  if (workerFamily(roles.tester) === workerFamily(roles.reviewer))
    throw new ApiError(409, 'The Reviewer must be independent of the Tester, including its model family.');
  return roles;
}

export function assertIndependentPhase(studio, job, phase, agent) {
  if (job.state.executionMode === 'builder-only' || phase === 'builder') return;
  const builders = studio.detail(job.id).events
    .filter(e => ['build_saved', 'builder_only_saved'].includes(e.kind)).map(e => e.agent);
  if (phase === 'tester' && [...builders, job.state.roles.builder].some(a => workerFamily(a) === workerFamily(agent)))
    throw new ApiError(409, 'The Tester cannot independently test work built by the same worker or model family.');
  if (phase === 'reviewer' && [...job.state.authors, job.state.testProvenance?.tester].some(a => a && workerFamily(a) === workerFamily(agent)))
    throw new ApiError(409, 'An author or Tester cannot review the same step, including through another profile.');
}

export function independentTestFiles(repo, files, tester, executionId, prior=null) {
  if (!files.length) throw new ApiError(409, 'The Tester supplied no independent tests. Builder-authored tests cannot satisfy this gate.');
  if (files.some(f => !/\.test\.[cm]?js$/.test(f.path)))
    throw new ApiError(409, 'The tester may add independent test files, not change the implementation');
  const changed = repo.changes(files).filter(f => f.before !== f.after || prior?.tester===tester && prior.files.some(old=>old.path===f.path&&old.hash===f.after));
  if (!changed.length) throw new ApiError(409, 'The Tester supplied no new or changed independent tests. Unchanged Builder tests are insufficient.');
  return {tester, executionId, files: changed.map(f => ({path:f.path, hash:f.after}))};
}

// Recheck the evidence at acceptance as well as during execution. A model's
// written claim that it tested something is never sufficient evidence.
export function hasIndependentTests(studio, job, repo) {
  const t=job.state.tests, p=job.state.testProvenance;
  if (!t?.executed || !t.passed || !Number.isSafeInteger(t.count) || t.count<1 || (t.failed??0)!==0 || (t.skipped??0)>=t.count || t.independent !== true || !p?.files?.length ||
      t.testExecutionId !== p.executionId || t.testedRevisionHash !== repo.fingerprint() ||
      workerFamily(p.tester) === workerFamily(job.state.roles.builder) ||
      workerFamily(p.tester) === workerFamily(job.state.roles.reviewer)) return false;
  const execution=studio.executions.list(job.id).find(e=>e.id===p.executionId);
  if (!execution || execution.agent!==p.tester || execution.phase!=='tester' || execution.status!=='completed') return false;
  return p.files.every(f=>fs.existsSync(repo.resolve(f.path)) && hashText(fs.readFileSync(repo.resolve(f.path),'utf8'))===f.hash);
}
