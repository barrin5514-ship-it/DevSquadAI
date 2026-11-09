import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
import {cliEnvironment} from './cli-hello.js';

export const isolationVersion=1;
const sha=x=>createHash('sha256').update(x).digest('hex');
const fileHash=file=>{const h=createHash('sha256'),fd=fs.openSync(file,'r'),chunk=Buffer.alloc(512000);try{let n;while((n=fs.readSync(fd,chunk,0,chunk.length,null)))h.update(chunk.subarray(0,n));return h.digest('hex');}finally{fs.closeSync(fd);}};
// One TOML table avoids treating quotes around :root as literal path characters.
// MXC is selected explicitly: never fall back to a broader legacy sandbox.
export function isolationArgs(root,{readOnly=false}={}){
 const runtime=JSON.stringify(path.dirname(process.execPath).replaceAll('\\','/'));
 const base=readOnly?':read-only':':workspace';
 const workspace=readOnly?',":workspace_roots"={"."="read",".env"="deny"}':'';
 return ['--include-managed-config','--permission-profile','devsquad_demo','-C',root,'-c',`permissions={devsquad_demo={extends="${base}",filesystem={":root"="deny",":minimal"="read",":tmpdir"="deny",":slash_tmp"="deny",${runtime}="read"${workspace}},network={enabled=false}}}`,'-c','windows.sandbox="mxc"'];
}
export function isolationFingerprint(root,exe){return sha(JSON.stringify({version:isolationVersion,root:fs.realpathSync(root),exe:fs.realpathSync(exe),binary:fileHash(exe),node:process.version,args:isolationArgs(root)}));}
export class NativeDemoBoundary {
 constructor(team){this.team=team;this.exe=path.join(process.env.USERPROFILE||'','AppData/Local/Programs/OpenAI/Codex/bin/codex.exe');}
 binding(jobId){const b=this.team.db.prepare('SELECT * FROM demo_worker_bindings WHERE job_id=?').get(jobId);if(!b)throw new ApiError(403,'Only the prepared demo repository is allowed');return b;}
 proof(jobId){const b=this.binding(jobId),file=path.join(path.dirname(this.team.config.database),'demo-isolation-proof.json');const s=fs.lstatSync(file);if(s.isSymbolicLink()||s.size>16000)throw Error('Invalid isolation evidence');const p=JSON.parse(fs.readFileSync(file,'utf8'));if(p.version!==isolationVersion||p.jobId!==jobId||p.taskId!==this.team.coordinator.read(jobId).task_id||p.root!==fs.realpathSync(b.root)||p.baseRevision!==b.base_revision||p.fingerprint!==isolationFingerprint(b.root,this.exe)||p.backend!=='mxc'||!p.checks||Object.keys(p.checks).sort().join(',')!=='childReadDenied,credentialDecoyDenied,insideRead,insideWrite,junctionDenied,networkDenied,outsideReadDenied,outsideWriteDenied'||!Object.values(p.checks).every(v=>v===true))throw Error('Isolation proof does not match this demo/runtime');return p;}
 status(jobId=null){try{if(!jobId)jobId=this.team.db.prepare('SELECT job_id FROM demo_worker_bindings LIMIT 1').get()?.job_id;this.proof(jobId);return {ready:true,backend:'mxc',reason:'Verified demo-only filesystem, child-process and network boundary. Paid/native execution grants remain separate.'};}catch{return {ready:false,backend:'mxc',reason:'Windows worker isolation requires a matching MXC confinement proof; command startup alone is insufficient.'};}}
 // Native usage authorization is an execution capability, not a role assignment
 // or quota statement. A scope must be installed separately by the owner.
 authorized(jobId,worker,role){try{this.proof(jobId);const file=path.join(path.dirname(this.team.config.database),'demo-native-grant.json'),s=fs.lstatSync(file);if(s.isSymbolicLink()||s.size>16000)return false;const g=JSON.parse(fs.readFileSync(file,'utf8')),j=this.team.coordinator.read(jobId),b=this.binding(jobId);return g.approvedBy==='owner'&&g.jobId===jobId&&g.taskId===j.task_id&&g.baseRevision===b.base_revision&&g.maxRounds===3&&g.waitSeconds===300&&g.callsPerNativeAgent===1&&g.noRetry===true&&g.noFallback===true&&Number.isFinite(Date.parse(g.approvedAt))&&Date.now()>=Date.parse(g.approvedAt)&&Date.now()<Date.parse(g.expiresAt)&&Date.parse(g.expiresAt)-Date.parse(g.approvedAt)<=1800000&&g.roles?.[role]===worker&&g.claudeOwnerConfirmed===true&&g.codexIncludedConfirmed===true;}catch{return false;}}
 async launch({agent,cwd,stdin,signal}){
  const b=this.team.db.prepare('SELECT * FROM demo_worker_bindings WHERE root=?').get(fs.realpathSync(cwd));if(!b||!this.status(b.job_id).ready)throw new ApiError(403,'Demo isolation is not verified');
  const {DemoCliTransport}=await import('./demo-cli-transport.js');
  // Vendor CLI authentication stays with its trusted native broker. Codex gets
  // the verified MXC tool policy; Claude has no file, shell, MCP or network tools.
  // The model receives only the bounded packet, never authentication storage.
  const transport=new DemoCliTransport();const receipt=await transport.run(agent,JSON.parse(stdin),cwd,{signal,timeoutMs:90000,maxOutputBytes:65536,codexIsolation:agent==='codex'?isolationArgs(cwd):null});return {exit:0,receipt};
 }
 async test({cwd,revisionHash,signal}){
  const b=this.team.db.prepare('SELECT * FROM demo_worker_bindings WHERE root=?').get(fs.realpathSync(cwd));if(!b||!this.status(b.job_id).ready||sha(fs.readFileSync(path.join(cwd,'src/todo.js')))!==revisionHash)throw new ApiError(403,'Exact demo revision and isolation proof required');
  const start=Date.now(),result=await this.command(cwd,[process.execPath,'--preserve-symlinks','--preserve-symlinks-main','--test','--test-isolation=none','--test-concurrency=1','tests/todo.test.js'],signal,15000);
  const text=result.stdout,passed=Number(/(?:#|ℹ)\s*pass\s+(\d+)/.exec(text)?.[1]||0),failed=Number(/(?:#|ℹ)\s*fail\s+(\d+)/.exec(text)?.[1]||0);
  return {kind:'isolated_runner',backend:'mxc',revisionHash,passed:result.exit===0&&passed===9&&failed===0,count:passed,failed,exitCode:result.exit,elapsedMs:Date.now()-start,outputHash:sha(text),testsExecuted:passed+failed===9};
 }
 command(cwd,command,signal,timeout){return new Promise((resolve,reject)=>{let child,raw='',errors='',done=false,timer;const end=(error,exit)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',stop);if(error)reject(new ApiError(503,error));else resolve({exit,stdout:raw});};const stop=()=>{if(child?.pid)spawnSync(path.join(process.env.SystemRoot||'C:\\Windows','System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{timeout:5000,stdio:'ignore',windowsHide:true});end('Stopped or timed out; process-tree outcome requires reconciliation');};if(signal?.aborted)return end('Stopped before dispatch');try{child=spawn(this.exe,['sandbox',...isolationArgs(cwd),'--',...command],{cwd,env:cliEnvironment(),shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});timer=setTimeout(stop,timeout);signal?.addEventListener('abort',stop,{once:true});child.stdout.on('data',c=>{raw+=c;if(Buffer.byteLength(raw)+Buffer.byteLength(errors)>32768)stop();});child.stderr.on('data',c=>{errors+=c;if(Buffer.byteLength(raw)+Buffer.byteLength(errors)>32768)stop();});child.once('error',()=>end('Isolated test process could not start'));child.once('close',code=>end(null,code));}catch{end('Isolated process failed safely');}});}
}
