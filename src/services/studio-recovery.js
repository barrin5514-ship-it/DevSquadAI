import fs from 'node:fs';import {hashText} from './project-files.js';
import {isPackageConfigError,packageConfigError} from './studio-test-plan.js';
const names={'application-tests':'The isolated test runner','codex-personal':'Codex (Personal)','codex-school':'Codex (School)','claude-code':'Claude Code',deepseek:'DeepSeek',nemotron:'NVIDIA Nemotron'},phases={builder:'building',tester:'testing',reviewer:'reviewing'};
export function failureMessage(agent,phase,code){const who=names[agent]||'The assigned agent',work=phases[phase]||'its step';const reasons={owner_stop:'was stopped by the owner; this is not a failed test',provider_unavailable:'is unavailable and has no eligible authorized fallback',auth_missing:'has no saved login in the selected dedicated profile',review_conflict:'cannot review its own work; no independent authorized fallback remains',provider_outage:'reported a provider outage',incomplete:'returned a response the app could not read as a complete result',response_truncated:'reached the requested output-token limit before finishing; no complete files were saved. Use Edit & Retry with a smaller task in this chat',auth_expired:'could not use the selected native login; sign in to that dedicated profile',auth_timeout:'could not finish the local login check',inactivity_timeout:'sent no output for three minutes; work was paused',connection_error:'could not complete its connection',sandbox_error:'could not initialize the isolated launcher',schema_error:'could not accept the response schema',usage_limit:'reached a usage or rate limit',rate_limit:'reached a provider rate limit',payment_required:'cannot use the current prepaid account',insufficient_balance:'does not have enough verified prepaid balance',pricing_unverified:'does not have verified current pricing',balance_unverified:'does not have a fresh verified prepaid balance',prepaid_limit:'would exceed an existing prepaid provider policy limit',timeout:'did not finish before its time limit',session_limit:'reached its native turn limit; no complete artifact was saved. Retry the saved stage with a smaller task',output_limit:'returned more output than the connection allows',body_limit:'returned more raw stream data than the bounded safety limit allows',answer_limit:'returned more visible answer than the bounded response limit allows'};return who+' stopped while '+work+': '+(reasons[code]||'the step failed; inspect the saved error details')+'. Earlier saved files and history were preserved.';}
export function savedPackageTests(studio,job,repo,requestId=job.request_id){
 const {tests,testProvenance:p}=job.state,checkpoint=repo.fingerprint();
 if(!tests?.independent||tests.passed!==false||tests.testedRevisionHash!==checkpoint||!p?.files?.length||p.tester!==job.state.roles.tester||tests.testExecutionId!==p.executionId)return null;
 const executions=studio.executions.list(job.id),writer=executions.find(e=>e.id===p.executionId);
 const runner=executions.findLast(e=>e.request_id===requestId&&e.agent==='application-tests'&&e.phase==='tests');
 if(writer?.agent!==p.tester||writer.phase!=='tester'||writer.status!=='completed'||!['failed','blocked'].includes(runner?.status)||runner.checkpoint_hash!==checkpoint)return null;
 const event=studio.db.prepare("SELECT content FROM studio_events WHERE chat_id=? AND kind='execution_finished' AND created_at>=? AND json_extract(content,'$.revisionHash')=? ORDER BY id DESC LIMIT 1").get(job.id,runner.created_at,checkpoint);
 const output=event?JSON.parse(event.content):null;
 if(output?.packageConfigFailure?.code!==packageConfigError&&tests.packageConfigFailure?.code!==packageConfigError&&!(output?.exit===1&&isPackageConfigError(String(output.stdout||'')+'\n'+String(output.stderr||''))))return null;
 return p.files.every(f=>/\.test\.[cm]?js$/.test(f.path)&&fs.existsSync(repo.resolve(f.path))&&hashText(fs.readFileSync(repo.resolve(f.path),'utf8'))===f.hash)?p:null;
}
// An identical image can get a new reference path when the owner edits a
// paused prompt. Every other file must still match the failed checkpoint.
function reattachedMediaMatches(repo,j,events){
 const media=j.state.mediaInput;
 if(!media||!/^references\/[a-f0-9-]{36}\.[a-z0-9]+$/i.test(media.path))return false;
 const prior=events.findLast(e=>e.kind==='run_requested'&&e.content.requestId===j.request_id)?.content.mediaInput;
 if(!prior||prior.path===media.path||prior.kind!==media.kind||prior.hash!==media.hash)return false;
 return repo.fingerprint(media.path)===j.state.failure.checkpointHash;
}
function failureCheckpoint(studio,j,phase,events){
 const failure=j.state.failure;
 if(!failure?.checkpointHash)return null;
 // Older runs could stamp a pre-dispatch Tester failure onto the saved Builder.
 if(phase==='tester'&&!failure.checkpointFiles&&(failure.code==='provider_unavailable'||failure.connectionCleared)){
  const boundary=events.findLastIndex(e=>e.kind==='run_requested'&&e.content.requestId===j.request_id);
  const eventsInAttempt=boundary<0?[]:events.slice(boundary+1);
  const checkpoint=eventsInAttempt.findLast(e=>e.kind==='build_saved')?.content.teamCheckpointHash;
  const executions=studio.executions.list(j.id).filter(e=>e.request_id===j.request_id&&!e.phase.startsWith('council_'));
  if(checkpoint&&checkpoint===j.state.teamCheckpointHash&&executions.length===1&&executions[0].phase==='builder'&&
   executions[0].checkpoint_hash===failure.checkpointHash&&eventsInAttempt.some(e=>e.kind==='files_saved'))return checkpoint;
 }
 return failure.checkpointHash;
}

function changedCheckpoint(studio,j,current,expected,latest){
 const stored=j.state.failure?.checkpointFiles;
 const complete=Array.isArray(stored)&&hashText(JSON.stringify(stored))===expected;
 const saved=new Map(complete?stored:latest);
 const actual=new Map(current),paths=complete?[...new Set([...saved.keys(),...actual.keys()])]:[...saved.keys()];
 const changedFiles=paths.sort().filter(path=>saved.get(path)!==actual.get(path)).map(path=>{
  const before=saved.get(path)||null,after=actual.get(path)||null;
  const row=before&&studio.db.prepare('SELECT id FROM studio_revisions WHERE chat_id=? AND relative_path=? AND next_hash=? ORDER BY rowid DESC LIMIT 1').get(j.id,path,before);
  return {path,before,after,change:!before?'added':!after?'removed':'modified',revisionId:row?.id||null};
 });
 const names=changedFiles.slice(0,8).map(file=>file.path+' ('+file.change+')');
 const summary=names.length?names.join(', ')+(changedFiles.length>8?' and '+(changedFiles.length-8)+' more':''):'the earlier record has no file list to identify the difference';
 return {available:false,reason:'The project changed after the failed step. Review these files before retrying: '+summary+'.',changedFiles,complete};
}

// A resume never guesses that a model finished. It checks saved file hashes and
// resumes the failed phase, rather than silently sending paid work back to Builder.
export function resumePlan(studio,j){
 if(j.state.executionMode==='builder-only'&&studio.executions.list(j.id).length)return {available:false,reason:'The one Builder attempt was consumed. Independent testing and review remain pending; no automatic resume is authorized.'};
 if(!['paused','stopped'].includes(j.status))return {available:false,reason:'No paused step needs resuming.'};
 const events=studio.db.prepare('SELECT kind,agent,content FROM studio_events WHERE chat_id=? ORDER BY id').all(j.id).map(e=>({...e,content:JSON.parse(e.content)}));let phase=j.state.failure?.phase||j.state.phase,agent=j.state.failure?.agent||j.state.roles[phase],legacy=false;
 if(!j.state.failure&&events.some(e=>e.kind==='error'&&/Work paused: incomplete/.test(e.content.alert||''))){const index=events.findLastIndex(e=>e.kind==='worker_started');let prior='builder';for(const e of events.slice(0,index))if(['builder','tester','reviewer'].includes(e.content.phase))prior=e.content.phase;if(index>=0&&j.state.roles[prior]===events[index].agent){phase=prior;agent=events[index].agent;legacy=true;}}
 try{const repo=studio.root(j.project_id);if(j.state.pinnedRoot&&repo.root!==j.state.pinnedRoot)throw Error('The selected project root changed.');const latest=new Map();for(const r of studio.db.prepare('SELECT relative_path,next_hash FROM studio_revisions WHERE chat_id=? ORDER BY rowid').all(j.id))latest.set(r.relative_path,r.next_hash);const current=repo.fileHashes(),actual=new Map(current),checkpointHash=hashText(JSON.stringify(current)),expected=failureCheckpoint(studio,j,phase,events);if([...latest].some(([name,hash])=>actual.get(name)!==hash)||expected&&expected!==checkpointHash&&!(phase==='builder'&&reattachedMediaMatches(repo,j,events)))return {...changedCheckpoint(studio,j,current,expected,latest),phase};const missingEvidence=phase==='reviewer'&&(!j.state.tests?.executed||!j.state.tests.passed||j.state.tests.testedRevisionHash!==checkpointHash);if(missingEvidence){phase='tester';agent=j.state.roles.tester;legacy=false;}const savedTests=phase==='tester'&&!!savedPackageTests(studio,j,repo);return {available:true,phase,agent,checkpointHash,legacy,savedTests,savedFiles:latest.size,reason:savedTests?'Retry the unchanged independent test files with the local runner. Only the Reviewer may be called if the tests pass.':missingEvidence?'The Reviewer has no passing tests for the current checkpoint. Resume will rerun the Tester stage first.':legacy?'Codex response was rejected before tests ran. The old log did not retain the format details. Saved Builder files are unchanged.':j.state.failure?.message||'Resume the saved unfinished phase. No completed Builder step will be repeated.'};}catch(e){return {available:false,reason:e.message};}
}
