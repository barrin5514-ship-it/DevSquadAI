// A single owner-approved native invocation. Never relaunch after any outcome.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
import {observedDiagnostic} from '../src/services/diagnostic-lifecycle.js';
import {stopDiagnosticIdentity} from '../src/services/diagnostic-process-stop.js';
import {observeProcessTree} from '../src/services/native-process-observer.js';
import {cliEnvironment} from '../src/services/cli-hello.js';import {loadConfig} from '../src/config/index.js';
const out='docs/verification/antigravity-live-test-20261107',model='gemini-3.8-flash-low',limit=8192;
fs.mkdirSync(out,{recursive:true});
const hash=s=>createHash('sha256').update(s).digest('hex');
function snapshot(){process.loadEnvFile('.env');const db=new DatabaseSync(loadConfig().database,{readOnly:true});try{return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,hash(JSON.stringify(db.prepare('SELECT * FROM "'+name+'"').all()))]));}finally{db.close();}}
// The existing process observer owns only verified PID/birth identities. The
// capture bound here is tighter than its normal 64 KiB diagnostic ceiling.
async function bounded(exe,args,cwd,timeoutMs=60000){
 let total=0,overflow=false,root=null;const stdout=[],stderr=[];
 const start=Date.now();const lifecycle=await observedDiagnostic(exe,args,{cwd,env:cliEnvironment(),timeoutMs,settleMs:3000,
  onSpawn(child){const t=observeProcessTree(child.pid);root=t.verified?t.processes.find(p=>p.pid===child.pid):null;},
  onData(chunk,isError,child){const remaining=Math.max(0,limit-total);(isError?stderr:stdout).push(chunk.subarray(0,remaining));total+=Math.min(remaining,chunk.length);if(chunk.length>remaining){overflow=true;if(root)stopDiagnosticIdentity(root.pid,root.birth);}}
 });
 return {lifecycle,elapsedMs:Date.now()-start,overflow,capturedBytes:total,stdout:Buffer.concat(stdout).toString('utf8'),stderr:Buffer.concat(stderr).toString('utf8')};
}
if(process.argv[2]==='--self-test'){
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'agy-capture-fixture-'));
 const a=await bounded(process.execPath,['-e','setTimeout(()=>console.log(JSON.stringify({fixture:true})),1200);setTimeout(()=>{},1800)'],cwd,6000);
 const b=await bounded(process.execPath,['-e','setTimeout(()=>process.stdout.write("x".repeat(9000)),1200);setTimeout(()=>{},8000)'],cwd,6000);
 const checks={normalCapture:a.lifecycle.exit===0&&a.lifecycle.terminationVerified&&JSON.parse(a.stdout).fixture===true,overflowStopsAt8192:b.overflow&&b.capturedBytes===8192&&b.lifecycle.terminationVerified};
 fs.writeFileSync(out+'/capture-self-test.json',JSON.stringify({checks,modelInvocations:0},null,2));console.log(JSON.stringify({checks,modelInvocations:0}));if(!Object.values(checks).every(Boolean))process.exitCode=1;
}else if(process.argv[2]==='--live'){
 const before=snapshot(),exe=path.join(process.env.LOCALAPPDATA,'agy/bin/agy.exe'),cwd=fs.mkdtempSync(path.join(os.tmpdir(),'agy-approved-review-'));
 const settings={useG1Credits:false,toolPermission:'strict',allowNonWorkspaceAccess:false,enableTerminalSandbox:true,verbosity:'low',permissions:{allow:[],ask:[],deny:['read_file(*)','write_file(*)','command(*)','unsandboxed(*)','read_url(*)','execute_url(*)','mcp(*)']}};
 const schema={type:'object',properties:{explanation:{type:'string'},edgeCase:{type:'string'},improvement:{type:'string'},code:{type:'string'}},required:['explanation','edgeCase','improvement','code'],additionalProperties:false};
 const prompt='Review function add(a, b) { return a + b; } Explain it, identify one invalid-input edge case, suggest an improvement, and return a corrected add function that accepts only finite numbers. Return JSON with explanation, edgeCase, improvement, and code. Keep the response short. Do not use tools, inspect or change files, access websites, delegate work, or claim tests ran.';
 const args=['--sandbox','--model',model,'--settings',JSON.stringify(settings),'--output-format','json','--json-schema',JSON.stringify(schema),'--print-timeout','60s','--print',prompt];
 fs.writeFileSync(out+'/attempt.json',JSON.stringify({approvedAtRecorded:new Date().toISOString(),authorization:'One invocation; native built-in retries permitted within 60 seconds; no relaunch/fallback/paid use',model,timeoutMs:60000,captureBytes:limit,hardTokenCap:null,promptHash:hash(prompt),settings,cwd},null,2),{flag:'wx'});
 const r=await bounded(exe,args,cwd);let envelope=null;try{envelope=JSON.parse(r.stdout);}catch{}
 const review=envelope?.structured_output||(()=>{try{return JSON.parse(envelope?.response);}catch{return null;}})();
 const valid=review&&Object.keys(review).sort().join(',')==='code,edgeCase,explanation,improvement'&&Object.values(review).every(v=>typeof v==='string'&&v.trim());
 const complete=!!(r.lifecycle.exit===0&&r.lifecycle.terminationVerified&&!r.lifecycle.timedOut&&!r.overflow&&envelope?.status==='SUCCESS'&&valid);
 const sanitize=s=>String(s).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'[EMAIL REDACTED]').replace(/https?:\/\/\S+/g,'[LINK REDACTED]').replace(/(?:ya29\.|AIza)[\w.-]+/g,'[REDACTED]').slice(0,4096);
 const result={verdict:complete?'PASS':'FAIL',model,modelEvidence:'Pinned CLI model argument; response model separately reported below if supplied',reportedModel:envelope?.model??null,exit:r.lifecycle.exit,httpStatus:null,httpStatusEvidence:'Native CLI does not expose a provider HTTP status here',elapsedMs:r.elapsedMs,providerDurationSeconds:envelope?.duration_seconds??null,timeoutMs:60000,capturedBytes:r.capturedBytes,overflow:r.overflow,complete,status:envelope?.status??null,finishReason:envelope?.finish_reason??null,usage:envelope?.usage??null,costUSD:null,invocations:1,internalAttemptCount:'Not exposed; native retries authorized inside this invocation',review:complete?review:null,error:complete?null:sanitize(envelope?.error||r.stderr||'No complete valid JSON response'),lifecycle:r.lifecycle,databaseTablesCompared:Object.keys(before).length,databaseUnchanged:JSON.stringify(before)===JSON.stringify(snapshot())};
 fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,review:undefined,lifecycle:undefined},null,2));if(!complete)process.exitCode=1;
}else throw Error('Choose --self-test or the single authorized --live invocation');
