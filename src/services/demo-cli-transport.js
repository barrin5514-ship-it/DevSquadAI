import path from 'node:path';
import fs from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {cliEnvironment} from './cli-hello.js';
import {demoCliArguments,parseDemoCli} from './demo-workers.js';

// This is a transport, NOT a security sandbox. A verified isolated boundary
// must call it. Production DemoBoundary refuses launch until that exists.
export class DemoCliTransport {
 constructor({executables,spawnImpl=spawn,killTree=null}={}){
  const home=process.env.USERPROFILE||'';this.executables=executables||{codex:path.join(home,'AppData/Local/Programs/OpenAI/Codex/bin/codex.exe'),claude:path.join(home,'.local/bin/claude.exe')};this.spawn=spawnImpl;
  this.killTree=killTree||((child)=>{if(process.platform==='win32')return spawnSync(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,timeout:5000,stdio:'ignore'}).status===0;child.kill('SIGKILL');return true;});
 }
 async run(agent,packet,cwd,{signal,timeoutMs=90000,maxOutputBytes=32768}={}){
  const exe=this.executables[agent];if(!['codex','claude'].includes(agent)||!exe||!path.isAbsolute(exe)||!exe.endsWith('.exe')||!fs.existsSync(exe)||Buffer.byteLength(JSON.stringify(packet))>24000)throw Error('Native worker configuration is invalid');
  if(signal?.aborted)throw {code:'owner_stop',stopped:true};
  return new Promise((resolve,reject)=>{
   let child,timer,raw='',stderr='',done=false,termination=null;
   const finish=code=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',stop);
    if(termination)return reject({code:termination,stopped:false});
    if(code!==0){const diagnostic=raw+stderr,kind=/quota|usage.limit|rate.limit/i.test(diagnostic)?'usage_limit':/unauthorized|login|expired|authentication/i.test(diagnostic)?'auth_expired':'worker_error';return reject({code:kind,stopped:true});}
    try{resolve(parseDemoCli(agent,raw));}catch{return reject({code:'incomplete',stopped:true});}
   };
   // A kill request alone is not proof that all descendants stopped. Unknown
   // timeout/cancellation outcomes pause the job instead of triggering failover.
   const terminate=reason=>{termination=reason;try{this.killTree(child);}catch{}finish(null);};
   const stop=()=>terminate('owner_stop');
   try{child=this.spawn(exe,demoCliArguments(agent),{cwd,env:cliEnvironment(),shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    timer=setTimeout(()=>terminate('timeout'),Math.min(90000,Math.max(1,timeoutMs)));signal?.addEventListener('abort',stop,{once:true});
    const consume=(chunk,isError)=>{if(done)return;if(isError)stderr+=chunk.toString();else raw+=chunk.toString();if(Buffer.byteLength(raw)+Buffer.byteLength(stderr)>Math.min(32768,maxOutputBytes))terminate('output_limit');};
    child.stdout.on('data',c=>consume(c,false));child.stderr.on('data',c=>consume(c,true));child.once('error',()=>{termination='worker_error';finish(null);});child.once('close',finish);child.stdin.on('error',()=>{termination='worker_error';finish(null);});child.stdin.end(JSON.stringify(packet));
   }catch{termination='worker_error';finish(null);}
  });
 }
}
