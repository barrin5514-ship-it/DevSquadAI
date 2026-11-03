import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const messages={login:'Please sign in again using this agent’s own terminal login.',limit:'This account has reached a usage or rate limit. No retry was made.',timeout:'The hello check took too long and was stopped. No retry was made.',missing:'The configured CLI executable was not found.',failed:'The agent did not return a complete hello. Check its account in its own terminal.',overflow:'The agent returned too much output; the check was stopped.'};
export const cliFailure=code=>({ok:false,kind:'live',code,message:messages[code]||messages.failed});

// Only ordinary Windows account/location variables are inherited. In particular,
// Dev Squad API keys and API-billing overrides never reach either child process.
export function cliEnvironment(env=process.env){
 const result={};for(const key of ['SystemRoot','WINDIR','COMSPEC','PATH','PATHEXT','TEMP','TMP','USERPROFILE','HOME','LOCALAPPDATA','APPDATA','PROGRAMFILES','ProgramFiles'])if(env[key])result[key]=env[key];
 return {...result,DISABLE_AUTOUPDATER:'1',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1'};
}
export function helloArguments(agent){
 if(agent==='codex')return ['exec','--ignore-user-config','--ephemeral','--json','--skip-git-repo-check','--sandbox','read-only','--disable','shell_tool','--disable','multi_agent','--disable','apps','--disable','plugins','-c','model_providers.openai.request_max_retries=0','-c','model_providers.openai.stream_max_retries=0','Reply with exactly the word hello. Do not use tools.'];
 if(agent==='claude')return ['--print','--restricted','--tools','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--setting-sources','','--settings','{"disableAllHooks":true}','--no-session-persistence','--output-format','json','--max-budget-usd','0.001','Reply with exactly the word hello. Do not use tools.'];
 throw Error('Unknown CLI agent');
}
function usage(value){const out={};for(const key of ['input_tokens','output_tokens','cached_input_tokens','cache_read_input_tokens','cache_creation_input_tokens'])if(Number.isSafeInteger(value?.[key])&&value[key]>=0)out[key]=value[key];return out;}
export function parseHello(agent,raw){
 if(agent==='codex'){
  const events=raw.trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  if(events.some(e=>e.type==='error'||e.type==='turn.failed'))return cliFailure('failed');
  const final=events.findLast(e=>e.type==='turn.completed'),answer=events.findLast(e=>e.type==='item.completed'&&e.item?.type==='agent_message')?.item?.text;
  if(!final||!/^hello[.!]?$/i.test(answer?.trim()||''))return cliFailure('failed');
  return {ok:true,kind:'live',text:answer.trim(),finishReason:'turn.completed',usage:usage(final.usage)};
 }
 const data=JSON.parse(raw);
 if(data.type!=='result'||data.subtype!=='success'||data.is_error!==false||!/^hello[.!]?$/i.test(data.result?.trim()||''))return cliFailure('failed');
 return {ok:true,kind:'live',text:data.result.trim(),finishReason:'success',usage:usage(data.usage)};
}
export class CliHello {
 constructor(executables,{spawnImpl=spawn,timeoutMs=90000}={}){this.executables=executables;this.spawn=spawnImpl;this.timeoutMs=Math.min(90000,timeoutMs);}
 installed(agent){const exe=this.executables[agent];return Boolean(exe&&path.isAbsolute(exe)&&exe.toLowerCase().endsWith('.exe')&&fs.existsSync(exe));}
 async call(agent,args,cwd){return new Promise(resolve=>{
  let child,timer,raw='',err='',done=false,forced=null;
  const stop=code=>{forced=code;if(child?.pid){if(process.platform==='win32')spawnSync(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,timeout:5000,stdio:'ignore'});else child.kill('SIGKILL');}finish();};
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);resolve({code:forced,stdout:raw,stderr:err,exit:child?.exitCode});};
  try{
   child=this.spawn(this.executables[agent],args,{cwd,env:cliEnvironment(),shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
   timer=setTimeout(()=>stop('timeout'),this.timeoutMs);
   child.stdout.on('data',chunk=>{raw+=chunk.toString();if(Buffer.byteLength(raw)>65536)stop('overflow');});child.stderr.on('data',chunk=>{err+=chunk.toString();if(Buffer.byteLength(err)>65536)stop('overflow');});
   child.once('error',()=>{forced='failed';finish();});child.once('close',finish);
  }catch{forced='failed';finish();}
 });}
 async hello(agent){
  if(!this.installed(agent))return cliFailure('missing');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'devsquad-hello-')),start=Date.now();
  try{
   // Check native login category first. Never extract or copy its tokens.
   const auth=await this.call(agent,agent==='codex'?['login','status']:['auth','status','--json'],root);
   let allowed=false;
   if(!auth.code&&auth.exit===0){if(agent==='codex')allowed=/logged in using chatgpt/i.test(auth.stdout+auth.stderr);else try{const s=JSON.parse(auth.stdout);allowed=s.loggedIn===true&&s.authMethod==='claude.ai'&&['pro','max','team','enterprise'].includes(s.subscriptionType);}catch{}}
   if(!allowed)return {...cliFailure(auth.code||'login'),elapsedMs:Date.now()-start};
   const result=await this.call(agent,helloArguments(agent),root);
   if(result.code)return {...cliFailure(result.code),elapsedMs:Date.now()-start};
   if(result.exit!==0){const diagnostic=result.stdout+result.stderr,code=/quota|rate.limit|usage.limit|capacity/i.test(diagnostic)?'limit':/login|auth|unauthorized/i.test(diagnostic)?'login':'failed';return {...cliFailure(code),elapsedMs:Date.now()-start};}
   try{return {...parseHello(agent,result.stdout),elapsedMs:Date.now()-start,timeoutMs:this.timeoutMs};}catch{return {...cliFailure('failed'),elapsedMs:Date.now()-start};}
  }finally{
   // The only removable directory is the exact temporary directory created above.
   if(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('devsquad-hello-'))try{fs.rmSync(root,{recursive:true,force:true});}catch{}
  }
 }
}
