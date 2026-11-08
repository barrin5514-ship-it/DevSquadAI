import fs from 'node:fs';
import path from 'node:path';
import {DemoCliTransport} from '../src/services/demo-cli-transport.js';
import {CodexProfiles} from '../src/services/codex-profiles.js';
import {isolationArgs} from '../src/services/demo-isolation.js';
import {safeNativeDiagnostics} from '../src/services/native-diagnostics.js';

// One owner-approved diagnostic, never a reusable run button. An existing
// dispatch marker stops a second launch even after a crash or unknown outcome.
const folder=path.resolve('workspaces/codex-diagnostic-20261106');
const output=path.resolve('docs/verification/p0-native-diagnostic-20261106.json');
const marker=path.resolve('docs/verification/p0-native-diagnostic-dispatch-20261106.json');
const observed=new Date().toISOString();
const fd=fs.openSync(marker,'wx');fs.writeFileSync(fd,JSON.stringify({approvalObservedAt:observed,ownerConfirmedIncludedAllowance:true,profile:'Personal',maximumInvocations:1,timeoutMs:60000,maxCapturedBytes:8192,retry:false,fallback:false}));fs.closeSync(fd);
fs.mkdirSync(folder);
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const secrets=Object.entries(process.env).filter(([k,v])=>/KEY|TOKEN|PASSWORD|SECRET|WEBHOOK/i.test(k)&&v.length>=8).map(([,v])=>v);
const profile=new CodexProfiles().selection('codex-personal'),events=[],start=Date.now();
let result=null,error=null;
try{
 result=await new DemoCliTransport().run('codex',{goal:'Reply READY as the requested JSON. No files or tools.'},folder,{profile,timeoutMs:60000,maxOutputBytes:8192,codexIsolation:isolationArgs(folder),outputSchema:path.resolve('src/services/studio-worker.schema.json'),streamProgress:true,redactionSecrets:secrets,instruction:'Return only JSON {"report":"READY","files":[],"review":null}. Do not inspect files, run commands or use tools.',onEvent:e=>events.push(e)});
}catch(e){error={code:/^[a-z_]+$/.test(e?.code||'')?e.code:'worker_error',stopped:e?.stopped===true,diagnostics:safeNativeDiagnostics(e?.diagnostics,secrets)};}
const evidence={kind:'ONE REAL OWNER-APPROVED CODEX PERSONAL DIAGNOSTIC; NOT COUNTER TEST 2',approvalObservedAt:observed,profile:'Personal',folder,timeoutMs:60000,maxCapturedBytes:8192,retries:0,fallback:false,spawnAcknowledged:events.some(e=>e.launchAcknowledged),elapsedMs:Date.now()-start,complete:!!result&&result.report==='READY'&&Array.isArray(result.files)&&result.files.length===0,result,error,events,filesPresent:fs.readdirSync(folder),productionDatabaseModified:false};
fs.writeFileSync(output,JSON.stringify(evidence,null,2));
console.log(JSON.stringify({complete:evidence.complete,spawnAcknowledged:evidence.spawnAcknowledged,elapsedMs:evidence.elapsedMs,error,usage:result?.usage||null,evidence:output}));
if(!evidence.complete)process.exitCode=1;
