import {inspectProcessTree} from './studio-executions.js';
import {StringDecoder} from 'node:string_decoder';
import {createHash} from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {cliEnvironment} from './cli-hello.js';
import {demoCliArguments,parseDemoCli} from './demo-workers.js';

// This is a transport, NOT a security sandbox. A verified isolated boundary
// must call it. Production DemoBoundary refuses launch until that exists.
export class DemoCliTransport {
 constructor({executables,spawnImpl=spawn,killTree=null,authCheck=null,inspect=inspectProcessTree}={}){
  const home=process.env.USERPROFILE||'';this.executables=executables||{codex:path.join(home,'AppData/Local/Programs/OpenAI/Codex/bin/codex.exe'),claude:path.join(home,'.local/bin/claude.exe')};this.spawn=spawnImpl;this.inspect=inspect;
  this.authCheck=authCheck||((agent,exe,cwd)=>{const r=spawnSync(exe,agent==='codex'?['login','status']:['auth','status','--json'],{cwd,env:cliEnvironment(),encoding:'utf8',timeout:10000,maxBuffer:64000,windowsHide:true});if(r.status!==0)return false;if(agent==='codex')return /logged in using chatgpt/i.test(String(r.stdout||'')+String(r.stderr||''));try{const a=JSON.parse(r.stdout);return a.loggedIn===true&&a.authMethod==='claude.ai'&&['pro','max','team','enterprise'].includes(a.subscriptionType);}catch{return false;}});
  this.killTree=killTree||((child)=>{if(process.platform==='win32')return spawnSync(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,timeout:5000,stdio:'ignore'}).status===0;child.kill('SIGKILL');return true;});
 }
 async run(agent,packet,cwd,{signal,timeoutMs=90000,maxOutputBytes=32768,codexIsolation=null,instruction=null,outputSchema=null,onEvent=()=>{},streamProgress=false}={}){
  const exe=this.executables[agent];if(!['codex','claude'].includes(agent)||!exe||!path.isAbsolute(exe)||!exe.endsWith('.exe')||!fs.existsSync(exe)||Buffer.byteLength(JSON.stringify(packet))>24000)throw Error('Native worker configuration is invalid');
  if(signal?.aborted)throw {code:'owner_stop',stopped:true};
  if(!this.authCheck(agent,exe,cwd))throw {code:'auth_expired',stopped:true};
  return new Promise((resolve,reject)=>{
   let child,timer,settleTimer,raw='',stderr='',done=false,termination=null,launchFailure=false,treeKillConfirmed=false,identity=null,descendants=[],progressLine='',eventCount=0,progressChars=0;const emit=value=>onEvent(value);const started=Date.now(),outDecoder=new StringDecoder('utf8'),errDecoder=new StringDecoder('utf8');
   const finish=(code,exitSignal=null,closeObserved=false)=>{if(done)return;done=true;clearTimeout(timer);clearTimeout(settleTimer);signal?.removeEventListener('abort',stop);emit({status:termination?'paused':code===0?'completed':'failed',closeObserved,exitSignal:/^SIG[A-Z]+$/.test(exitSignal||'')?exitSignal:null,exitCode:Number.isInteger(code)?code:null,endedAt:new Date().toISOString(),elapsedMs:Date.now()-started,terminationRequested:termination,treeKillConfirmed,treeCaptured:!!identity,descendants});
    if(launchFailure)return reject({code:'launch_failed',stopped:true});if(termination)return reject({code:termination,stopped:closeObserved&&treeKillConfirmed});
    if(code!==0){const diagnostic=raw+stderr,kind=/quota|usage.limit|rate.limit/i.test(diagnostic)?'usage_limit':/unauthorized|login|expired|authentication/i.test(diagnostic)?'auth_expired':'worker_error';return reject({code:kind,stopped:true});}
    try{let finalRaw=raw;if(agent==='claude'&&streamProgress){const records=raw.trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));finalRaw=JSON.stringify(records.findLast(x=>x.type==='result'));}resolve(parseDemoCli(agent,finalRaw));}catch(error){const reason=error instanceof SyntaxError?'json_syntax':/tool activity/.test(error.message)?'unexpected_tool_activity':/incomplete/.test(error.message)?'missing_terminal_result':'invalid_contract';return reject({code:'incomplete',stopped:true,diagnostics:{reason,exitCode:code,stdoutBytes:Buffer.byteLength(raw),stderrBytes:Buffer.byteLength(stderr),elapsedMs:Date.now()-started,responseHash:createHash('sha256').update(raw).digest('hex')}});}
   };
   // A kill request alone is not proof that all descendants stopped. Unknown
   // timeout/cancellation outcomes pause the job instead of triggering failover.
   const terminate=reason=>{if(done||termination)return;termination=reason;clearTimeout(timer);const tree=this.inspect(child?.pid);if(tree.verified&&identity){descendants=tree.processes.filter(x=>x.pid!==child.pid);emit({terminationRequested:reason,descendants,treeCaptured:true});}else identity=null;try{treeKillConfirmed=this.killTree(child)===true&&!!identity;}catch{}emit({status:'stopping',terminationRequested:reason,treeKillConfirmed});if(!done)settleTimer=setTimeout(()=>finish(null),5000);};
   const stop=()=>terminate('owner_stop');
   try{let args=demoCliArguments(agent);if(instruction)args[args.length-1]=instruction;if(agent==='claude'&&streamProgress){args[args.indexOf('--output-format')+1]='stream-json';args.splice(args.length-1,0,'--verbose','--include-partial-messages');}if(agent==='codex'&&outputSchema)args.splice(args.length-1,0,'--output-schema',outputSchema);if(agent==='codex'&&codexIsolation){const i=args.indexOf('--sandbox');if(i>=0)args.splice(i,2);const config=[];for(let j=0;j<codexIsolation.length;j++)if(codexIsolation[j]==='-c')config.push('-c',codexIsolation[++j]);args.splice(args.length-1,0,...config,'-c','default_permissions="devsquad_demo"');}child=this.spawn(exe,args,{cwd,env:cliEnvironment(),shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    child.once('spawn',()=>{const tree=this.inspect(child.pid);identity=tree.verified?tree.processes.find(x=>x.pid===child.pid):null;descendants=tree.verified?tree.processes.filter(x=>x.pid!==child.pid):[];emit({status:'running',launchAcknowledged:true,pid:child.pid,birth:identity?.birth||null,treeCaptured:!!identity,descendants,startedAt:new Date().toISOString(),timeoutMs});});timer=setTimeout(()=>terminate('timeout'),Math.min(1200000,Math.max(1,timeoutMs)));signal?.addEventListener('abort',stop,{once:true});
    const consume=(chunk,isError)=>{if(done)return;if(isError)stderr+=errDecoder.write(chunk);else{const decoded=outDecoder.write(chunk);raw+=decoded;if(streamProgress){progressLine+=decoded;const lines=progressLine.split('\n');progressLine=lines.pop();for(const line of lines){if(++eventCount>200)continue;try{const e=JSON.parse(line);if(['thread.started','turn.started'].includes(e.type))emit({status:'running',progress:e.type==='thread.started'?'CLI session started.':'CLI reported a turn started.'});if(agent==='claude'&&e.type==='stream_event'&&e.event?.delta?.type==='text_delta'){const text=String(e.event.delta.text||'');if(progressChars+text.length<=8000){progressChars+=text.length;emit({progress:'Received '+progressChars+' visible-answer characters; awaiting a complete response.',receivedCharacters:progressChars});}}}catch{}}}}if(Buffer.byteLength(raw)+Buffer.byteLength(stderr)>Math.min(32768,maxOutputBytes))terminate('output_limit');};
    child.stdout.on('data',c=>consume(c,false));child.stderr.on('data',c=>consume(c,true));child.once('error',()=>{if(!child.pid){launchFailure=true;emit({status:'failed',launchAcknowledged:false,launchFailed:true});finish(null);}else terminate('connection_interrupted');});child.once('close',(code,signal)=>finish(code,signal,true));child.stdin.on('error',()=>terminate('connection_interrupted'));child.stdin.end(JSON.stringify(packet));
   }catch{if(!child?.pid)launchFailure=true;else termination='worker_error';finish(null);}
  });
 }
}
