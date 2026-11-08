import fs from 'node:fs';
import path from 'node:path';
import {observedDiagnostic} from '../src/services/diagnostic-lifecycle.js';

import {cliEnvironment} from '../src/services/cli-hello.js';
import {CodexProfiles,profileAuthArgs} from '../src/services/codex-profiles.js';
import {demoCliArguments} from '../src/services/demo-workers.js';
import {isolationArgs} from '../src/services/demo-isolation.js';

import {nativeDiagnosticText} from '../src/services/native-diagnostics.js';

// Diagnostic only, not a second worker transport. Thread creation loads local
// instructions; a model turn is a separate RPC and is deliberately forbidden.
const root=fs.realpathSync(process.argv[2]);
const exe=path.join(process.env.USERPROFILE,'AppData/Local/Programs/OpenAI/Codex/bin/codex.exe');
const profile=new CodexProfiles().selection(process.argv[4]||'codex-personal');
const args=['app-server','--listen','stdio://'];
for(const source of [demoCliArguments('codex').slice(0,-1),isolationArgs(root),profileAuthArgs])for(let i=0;i<source.length;i++)if(['-c','--disable'].includes(source[i]))args.push(source[i],source[++i]);
args.push('-c','default_permissions="devsquad_demo"');
const methods=[];let reply=null,line='',err='',threadId=null;
const lifecycle=await observedDiagnostic(exe,args,{cwd:root,env:{...cliEnvironment(),CODEX_HOME:profile.home},
 onSpawn(child){send(child,'initialize',{clientInfo:{name:'devsquad_local_startup_inspection',version:'1.1'},capabilities:{experimentalApi:true}},0);},
 onData(chunk,stderr,child,end){if(stderr){err+=chunk.toString('utf8');return;}line+=chunk.toString('utf8');const rows=line.split('\n');line=rows.pop();for(const row of rows){let msg;try{msg=JSON.parse(row);}catch{continue;}
 if(msg.id===0){if(msg.error){reply={phase:'initialize',error:nativeDiagnosticText(msg.error.message)};end();}else{send(child,'initialized',{});send(child,'thread/start',{cwd:root,permissions:'devsquad_demo',approvalPolicy:'never',ephemeral:true},1);}}
 if(msg.id===1){reply=msg.error?{phase:'thread/start',error:nativeDiagnosticText(msg.error.message),code:msg.error.code}:{phase:'thread/start',ok:true,instructionSources:msg.result?.instructionSources,cwd:msg.result?.cwd,runtimeWorkspaceRoots:msg.result?.runtimeWorkspaceRoots,permissions:msg.result?.activePermissionProfile,turns:msg.result?.thread?.turns?.length};threadId=msg.result?.thread?.id;if(threadId)send(child,'thread/unsubscribe',{threadId},2);else end();}
 if(msg.id===2){reply.unsubscribe=msg.error?{error:nativeDiagnosticText(msg.error.message)}:msg.result;end();}
 }} });
function send(child,method,params,id){if(!['initialize','initialized','thread/start','thread/unsubscribe'].includes(method))throw Error('Generating/other RPC forbidden');methods.push(method);child.stdin.write(JSON.stringify({method,params,...(id===undefined?{}:{id})})+'\n');}
const evidence={kind:'NON-GENERATING LOCAL STARTUP CHECK',root,profile:profile.label,methods,modelTurnsSent:0,...lifecycle,reply,stderr:nativeDiagnosticText(err)};
const out=path.resolve(process.argv[3]||'docs/verification/startup-thread-check-20261106.json');fs.writeFileSync(out,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
