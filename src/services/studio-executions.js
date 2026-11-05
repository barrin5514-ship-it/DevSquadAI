import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {ApiError} from '../middleware/errors.js';
import {transaction} from '../middleware/ai-validation.js';
import {cleanOutput} from './workspace-output.js';
const now=()=>new Date().toISOString(),hash=s=>createHash('sha256').update(s).digest('hex');

// PID alone is unsafe: Windows can reuse it. Keep its OS creation identity too.
// Inspection is read-only and fails closed if Windows cannot supply evidence.
export function inspectProcessTree(pid){
 if(!Number.isSafeInteger(pid)||pid<1)return {verified:false,reason:'No recorded process identity.'};
 if(process.platform!=='win32')return {verified:false,reason:'Windows process inspection is unavailable.'};
 const script=`$all=@(Get-CimInstance Win32_Process -ErrorAction Stop);$ids=@(${pid});for($i=0;$i -lt 20;$i++){$next=@($all|Where-Object {$ids -contains $_.ParentProcessId -and $ids -notcontains $_.ProcessId}|Select-Object -ExpandProperty ProcessId);if(!$next.Count){break};$ids+=$next};ConvertTo-Json -Compress -InputObject @($all|Where-Object {$ids -contains $_.ProcessId}|ForEach-Object {@{pid=[int]$_.ProcessId;parent=[int]$_.ParentProcessId;birth=$_.CreationDate.ToUniversalTime().ToString('o')}})`;
 const r=spawnSync(path.join(process.env.SystemRoot||'C:\\Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:128000});
 try{if(r.status!==0)throw Error();const rows=JSON.parse(r.stdout||'[]');if(!Array.isArray(rows)||rows.some(p=>!Number.isInteger(p.pid)||typeof p.birth!=='string'))throw Error();return {verified:true,processes:rows};}catch{return {verified:false,reason:'Windows process inspection failed; no lock may be released.'};}
}

export class StudioExecutions {
 constructor(studio,{inspect=inspectProcessTree}={}){this.studio=studio;this.db=studio.db;this.inspect=inspect;}
 create(job,agent,phase,root,checkpoint){const id=randomUUID(),stamp=now();this.db.prepare('INSERT INTO studio_executions VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,job.id,job.request_id,agent,phase,hash(root),checkpoint,'starting','{}',stamp,stamp);this.studio.event(job.id,'worker_lifecycle',{executionId:id,status:'starting',phase},agent);return id;}
 get(id){const r=this.db.prepare('SELECT * FROM studio_executions WHERE id=?').get(id);if(!r)throw new ApiError(404,'Execution not found');return {...r,evidence:JSON.parse(r.evidence)};}
 list(chat){return this.db.prepare('SELECT id FROM studio_executions WHERE chat_id=? ORDER BY rowid').all(chat).map(r=>this.get(r.id));}
 record(id,update){const r=this.get(id);const content=cleanOutput(this.studio.team,update);this.db.prepare('UPDATE studio_executions SET status=?,evidence=?,updated_at=? WHERE id=?').run(update.status||r.status,JSON.stringify({...r.evidence,...content}),now(),id);this.studio.event(r.chat_id,'worker_lifecycle',{...content,executionId:id},r.agent);}
 recovery(chat){const j=this.studio.get(chat),lock=this.db.prepare('SELECT * FROM studio_locks WHERE chat_id=?').get(chat);if(!lock)return {needed:false,available:false,reason:'No unresolved folder lock.'};const r=this.list(chat).findLast(x=>x.request_id===j.request_id);return {needed:true,available:!!r,executionId:r?.id||null,reason:r?'Reconcile checks recorded process identity, termination evidence and unchanged checkpoint. It never starts a worker.':'This older attempt has no recorded PID or process identity. Safe termination cannot be established; the lock must remain.'};}
 reconcile(chat,{executionId,version}){const j=this.studio.get(chat),r=this.get(executionId);if(r.chat_id!==chat||r.request_id!==j.request_id||j.version!==version||!['paused','stopped'].includes(j.status)||this.studio.active.has(chat))throw new ApiError(409,'Execution scope changed or work is still active.');if(!r.evidence.pid||!r.evidence.birth||!r.evidence.treeCaptured)throw new ApiError(409,'Reliable process identity and descendant evidence are missing. Lock retained.');
  const observed=this.inspect(r.evidence.pid);if(!observed.verified)throw new ApiError(409,observed.reason);if(observed.processes.some(p=>p.pid!==r.evidence.pid||p.birth===r.evidence.birth))throw new ApiError(409,'The recorded worker is still active. Lock retained.');
  // Descendants captured before termination must also be gone. A new process
  // using the same PID is not the old worker and must never be terminated here.
  for(const child of r.evidence.descendants||[]){const check=this.inspect(child.pid);if(!check.verified||check.processes.some(p=>p.pid===child.pid&&p.birth===child.birth))throw new ApiError(409,'A recorded descendant is active or cannot be checked. Lock retained.');}
  if(!r.evidence.closeObserved||r.evidence.terminationRequested&&!r.evidence.treeKillConfirmed)throw new ApiError(409,'Process-tree termination was not confirmed. Lock retained.');
  const repo=this.studio.root(j.project_id);if(hash(repo.root)!==r.root_hash||repo.fingerprint()!==r.checkpoint_hash)throw new ApiError(409,'Project files changed since this execution. Inspect them before recovery.');
  return transaction(this.db,()=>{const current=this.studio.get(chat);if(current.version!==version||current.request_id!==r.request_id)throw new ApiError(409,'Execution changed during reconciliation.');const lock=this.db.prepare('SELECT * FROM studio_locks WHERE chat_id=?').get(chat);if(!lock||hash(lock.root)!==r.root_hash)throw new ApiError(409,'Lock ownership changed.');this.record(r.id,{status:'reconciled',reconciledAt:now()});this.db.prepare('DELETE FROM studio_locks WHERE chat_id=? AND root=?').run(chat,lock.root);return this.studio.change(chat,'paused',{alert:'Worker termination reconciled. Saved work is preserved; resume the pending step explicitly.'},'worker_reconciled',r.agent);});
 }
}
