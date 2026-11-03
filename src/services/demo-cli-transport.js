import path from 'node:path';
import fs from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {cliEnvironment} from './cli-hello.js';
import {demoCliArguments,parseDemoCli} from './demo-workers.js';

// This is a transport, NOT a security sandbox. A verified isolated boundary
// must call it. Production DemoBoundary refuses launch until that exists.
export class DemoCliTransport {
 constructor({executables,spawnImpl=spawn,killTree=null,authCheck=null}={}){
  const home=process.env.USERPROFILE||'';this.executables=executables||{codex:path.join(home,'AppData/Local/Programs/OpenAI/Codex/bin/codex.exe'),claude:path.join(home,'.local/bin/claude.exe')};this.spawn=spawnImpl;
  this.authCheck=authCheck||((agent,exe,cwd)=>{const r=spawnSync(exe,agent==='codex'?['login','status']:['auth','status','--json'],{cwd,env:cliEnvironment(),encoding:'utf8',timeout:10000,maxBuffer:64000,windowsHide:true});if(r.status!==0)return false;if(agent==='codex')return /logged in using chatgpt/i.test(String(r.stdout||'')+String(r.stderr||''));try{const a=JSON.parse(r.stdout);return a.loggedIn===true&&a.authMethod==='claude.ai'&&['pro','max','team','enterprise'].includes(a.subscriptionType);}catch{return false;}});
  this.killTree=killTree||((child)=>{if(process.platform==='win32')return spawnSync(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,timeout:5000,stdio:'ignore'}).status===0;child.kill('SIGKILL');return true;});
 }
 async run(agent,packet,cwd,{signal,timeoutMs=90000,maxOutputBytes=32768,codexIsolation=null,instruction=null}={}){
  const exe=this.executables[agent];if(!['codex','claude'].includes(agent)||!exe||!path.isAbsolute(exe)||!exe.endsWith('.exe')||!fs.existsSync(exe)||Buffer.byteLength(JSON.stringify(packet))>24000)throw Error('Native worker configuration is invalid');
  if(signal?.aborted)throw {code:'owner_stop',stopped:true};
  if(!this.authCheck(agent,exe,cwd))throw {code:'auth_expired',stopped:true};
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
   try{let args=demoCliArguments(agent);if(instruction)args[args.length-1]=instruction;if(agent==='codex'&&codexIsolation){const i=args.indexOf('--sandbox');if(i>=0)args.splice(i,2);const config=[];for(let j=0;j<codexIsolation.length;j++)if(codexIsolation[j]==='-c')config.push('-c',codexIsolation[++j]);args.splice(args.length-1,0,...config,'-c','default_permissions="devsquad_demo"');}child=this.spawn(exe,args,{cwd,env:cliEnvironment(),shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    timer=setTimeout(()=>terminate('timeout'),Math.min(90000,Math.max(1,timeoutMs)));signal?.addEventListener('abort',stop,{once:true});
    const consume=(chunk,isError)=>{if(done)return;if(isError)stderr+=chunk.toString();else raw+=chunk.toString();if(Buffer.byteLength(raw)+Buffer.byteLength(stderr)>Math.min(32768,maxOutputBytes))terminate('output_limit');};
    child.stdout.on('data',c=>consume(c,false));child.stderr.on('data',c=>consume(c,true));child.once('error',()=>{termination='worker_error';finish(null);});child.once('close',finish);child.stdin.on('error',()=>{termination='worker_error';finish(null);});child.stdin.end(JSON.stringify(packet));
   }catch{termination='worker_error';finish(null);}
  });
 }
}
