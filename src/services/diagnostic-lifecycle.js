import {spawn} from 'node:child_process';
import {stopDiagnosticIdentity} from './diagnostic-process-stop.js';
import {observeProcessTree} from './native-process-observer.js';

// A diagnostic owns only processes whose Windows creation identity it observed.
// Exit of the parent alone never proves that its children also stopped.
export async function observedDiagnostic(exe,args,{cwd,env,timeoutMs=30000,settleMs=5000,spawnImpl=spawn,inspect=observeProcessTree,kill=stopDiagnosticIdentity,onSpawn=()=>{},onData=()=>{}}={}){
 const started=Date.now(),owned=new Map(),terminationResults=[];let identity=null,closed=false,exit=null,signal=null,inspectionFailed=false,forced=false,timedOut=false,gracefulRequested=false,spawnFailed=false,callbackError=false,child;
 // A stale parent PID can describe an unrelated, older child. Require a
 // complete creation-time-consistent chain back to our observed root.
 const capture=tree=>{const accepted=new Map([[identity.pid,identity]]);for(let i=0;i<tree.processes.length;i++){let added=false;for(const p of tree.processes){const parent=accepted.get(p.parent);if(p.pid!==identity.pid&&!accepted.has(p.pid)&&parent&&p.birth>=parent.birth){accepted.set(p.pid,p);added=true;}}if(!added)break;}for(const p of accepted.values())owned.set(p.pid,p);};
 const remember=()=>{if(!child?.pid)return;const tree=inspect(child.pid);if(!tree.verified){inspectionFailed=true;return;}const root=tree.processes.find(p=>p.pid===child.pid);if(!identity){if(root){identity=root;capture(tree);}return;}if(root?.birth!==identity.birth)return;capture(tree);};
 const depth=p=>{let n=0;const seen=new Set();while(owned.has(p.parent)&&!seen.has(p.pid)){seen.add(p.pid);n++;p=owned.get(p.parent);}return n;};
 const stopOwned=()=>{remember();for(const p of [...owned.values()].sort((a,b)=>depth(b)-depth(a))){if(terminationResults.some(r=>r.pid===p.pid&&r.birth===p.birth))continue;const tree=inspect(p.pid);if(!tree.verified){inspectionFailed=true;continue;}if(!tree.processes.some(x=>x.pid===p.pid&&x.birth===p.birth))continue;
   // Check again immediately before signalling: PID reuse must fail closed.
   const check=inspect(p.pid);if(!check.verified){inspectionFailed=true;continue;}if(!check.processes.some(x=>x.pid===p.pid&&x.birth===p.birth))continue;
   forced=true;let result;try{result=kill(p.pid,p.birth);}catch{result={status:null,error:{code:'TERMINATION_FAILED'}};}terminationResults.push({pid:p.pid,birth:p.birth,status:Number.isInteger(result?.status)?result.status:null,errorCode:/^[A-Z_]+$/.test(result?.error?.code||'')?result.error.code:null});
  }};
 let bytes=0,outputLimit=false;const requestGraceful=()=>{if(gracefulRequested)return;gracefulRequested=true;remember();child.stdin.end();};
 await new Promise(resolve=>{let finished=false;const done=()=>{if(finished)return;finished=true;clearTimeout(timer);clearTimeout(settle);resolve();};let settle;const timer=setTimeout(()=>{timedOut=true;requestGraceful();stopOwned();settle=setTimeout(done,settleMs);},timeoutMs);
  try{child=spawnImpl(exe,args,{cwd,env,windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});child.once('spawn',()=>{remember();try{onSpawn(child,requestGraceful);}catch{callbackError=true;requestGraceful();}});child.once('error',()=>{spawnFailed=true;requestGraceful();done();});child.once('close',(code,sig)=>{closed=true;exit=code;signal=sig;done();});child.stdin.on('error',()=>{});
   const consume=(chunk,stderr)=>{bytes+=chunk.length;if(bytes>65536){outputLimit=true;requestGraceful();stopOwned();if(!settle)settle=setTimeout(done,settleMs);return;}remember();try{onData(chunk,stderr,child,requestGraceful);}catch{callbackError=true;requestGraceful();}};child.stdout.on('data',c=>consume(c,false));child.stderr.on('data',c=>consume(c,true));
  }catch{spawnFailed=true;done();}
 });
 // The root may have exited normally while a previously observed child survived.
 let checks=[];const verify=()=>{checks=[...owned.values()].map(p=>{const t=inspect(p.pid);return {pid:p.pid,birth:p.birth,verified:t.verified,exited:t.verified&&!t.processes.some(x=>x.pid===p.pid&&x.birth===p.birth)};});return !!identity&&checks.every(p=>p.verified&&p.exited);};
 if((!verify()||!closed)&&identity){stopOwned();const until=Date.now()+settleMs;while((!verify()||!closed)&&Date.now()<until)await new Promise(r=>setTimeout(r,50));}
 const terminationVerified=closed&&!inspectionFailed&&verify();
 return {rootIdentity:identity,descendants:[...owned.values()].filter(p=>p.pid!==identity?.pid),exit,signal,closeObserved:closed,spawnFailed,callbackError,elapsedMs:Date.now()-started,timeoutMs,timedOut,outputLimit,gracefulRequested,forcedTermination:forced,terminationResults,processChecks:checks,terminationVerified,cleanup:terminationVerified?(forced?'forced-verified':'graceful-verified'):'uncertain'};
}
