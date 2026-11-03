import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';import {spawn,spawnSync} from 'node:child_process';
import {ProjectFiles,hashText} from './project-files.js';import {NativeDemoBoundary,isolationArgs} from './demo-isolation.js';import {DemoCliTransport} from './demo-cli-transport.js';import {cliEnvironment} from './cli-hello.js';
const instructions='Read the JSON packet. Return only JSON with report and files. In builder phase write the requested implementation and tests. In tester phase write independent *.test.js, *.test.mjs or *.test.cjs files only; the application runs them separately. In reviewer phase return files:[] and review:{...reviewBinding,decision:"approved" or "changes_requested",summary:"...",findings:[]}; reviewerExecutedTests stays false. Never claim to have executed tests. No tools, credentials, commands or unrelated files. Use plain-English comments.';
// The native login broker is trusted, but model tools are off. All model file
// access is mediated by ProjectFiles. Generated tests run separately in MXC.
export class StudioWorkers {
 constructor(team,{transport=new DemoCliTransport()}={}){this.team=team;this.transport=transport;}
 async call(agent,packet,root,signal){this.team.safe(packet);
  if(agent!=='deepseek')return this.transport.run(agent==='codex-personal'?'codex':'claude',packet,root,{signal,codexIsolation:agent==='codex-personal'?isolationArgs(root):null,instruction:instructions});
  const settings=this.team.paid.settings;if(!settings?.key||settings.base!=='https://api.deepseek.com'||!settings.model)throw Error('DeepSeek key or official model configuration is missing');
  // Run is the owner's dispatch action. No quote, balance reservation, grant,
  // dollar cap or per-run request counter exists in this project workflow.
  const adapter=this.team.paid.adapter(8192);const original=adapter.fetch;adapter.fetch=(url,o)=>original(url,{...o,signal:AbortSignal.any([o.signal,signal])});
  const body={model:settings.model,messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(packet)}],thinking:{type:'disabled'},response_format:{type:'json_object'},max_tokens:8192,stream:false};
  const r=await adapter.generateBound(body,hashText(JSON.stringify(body)));const value=JSON.parse(r.text);return {...value,usage:r.usage,model:settings.model,httpStatus:r.diagnostics?.httpStatus};
 }
 async tests(root,signal){
  const source=new ProjectFiles(root),files=source.list(),tests=files.filter(p=>/\.test\.[cm]?js$/.test(p));if(!tests.length)return {executed:false,passed:false,failures:['No supported JavaScript test files were supplied.'],summary:'No independent tests ran.'};
  const parent=path.join(root,'.devsquad-tests');if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink())throw Error('Test storage is a link');fs.mkdirSync(parent,{recursive:true});const copy=path.join(parent,randomUUID());fs.mkdirSync(copy);
  try{let total=0;for(const relative of files){const original=source.resolve(relative),stat=fs.statSync(original);total+=stat.size;if(stat.size>1000000||total>20000000)throw Error('Project is too large for the local test copy; configure a dedicated runner');const destination=path.join(copy,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(original,destination);}
   const boundary=new NativeDemoBoundary(this.team),exe=boundary.exe;if(!fs.existsSync(exe))throw Error('Codex MXC sandbox is unavailable; tests were not executed');
   // A real, non-model OS check runs before untrusted tests. It proves this
   // selected copy cannot read its parent; it never probes a real credential.
   const decoy=path.join(parent,randomUUID()+'.txt');fs.writeFileSync(decoy,'FAKE_SANDBOX_DECOY',{flag:'wx'});
   const probe='try{require("node:fs").readFileSync(process.argv[1]);process.exit(2)}catch(e){process.exit(["EACCES","EPERM"].includes(e.code)?0:3)}';
   try{const proof=await this.command(exe,copy,[process.execPath,'-e',probe,decoy],signal);if(proof.exit!==0)throw Error('Selected project sandbox check failed; tests were not executed');}finally{fs.unlinkSync(decoy);}
   const r=await this.command(exe,copy,[process.execPath,'--preserve-symlinks','--preserve-symlinks-main','--test','--test-isolation=none','--test-concurrency=1',...tests],signal);
   const count=Number(/(?:#|ℹ)\s*tests\s+(\d+)/.exec(r.stdout)?.[1]||0),failed=Number(/(?:#|ℹ)\s*fail\s+(\d+)/.exec(r.stdout)?.[1]||0);const failures=r.stdout.split(/\r?\n/).filter(x=>/^not ok|^✖/.test(x)).map(x=>x.replace(/^not ok\s+\d+\s*-?\s*/,''));
   return {executed:true,passed:r.exit===0&&count>0&&failed===0,count,failed,failures,summary:count+' tests; '+failed+' failed.',outputHash:hashText(r.stdout),revisionHash:source.fingerprint(),backend:'mxc'};
  }finally{if(fs.existsSync(copy)&&path.dirname(copy)===fs.realpathSync(parent)){if(fs.lstatSync(copy).isSymbolicLink())fs.unlinkSync(copy);else if(fs.realpathSync(copy)===copy)fs.rmSync(copy,{recursive:true,force:true});}}
 }
 command(exe,root,command,signal){return new Promise((resolve,reject)=>{let done=false,child,stdout='',stderr='';const end=(error,code)=>{if(done)return;done=true;signal?.removeEventListener('abort',stop);if(error)reject(error);else resolve({exit:code,stdout});};const stop=()=>{if(child?.pid)spawnSync(path.join(process.env.SystemRoot||'C:\\Windows','System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{timeout:5000,stdio:'ignore',windowsHide:true});end(Error('Test process was stopped; no pass recorded'));};if(signal.aborted)return stop();try{child=spawn(exe,['sandbox',...isolationArgs(root),'--',...command],{cwd:root,env:cliEnvironment(),shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});signal.addEventListener('abort',stop,{once:true});child.stdout.on('data',v=>{stdout+=v;if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>256000)stop();});child.stderr.on('data',v=>{stderr+=v;if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>256000)stop();});child.once('error',()=>end(Error('Isolated test launcher failed')));child.once('close',code=>end(null,code));}catch{end(Error('Isolated test launcher failed'));}});}
}
