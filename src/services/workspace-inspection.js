import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {ApiError} from '../middleware/errors.js';
import {hashText} from './project-files.js';

const gitExecutable=process.platform==='win32'?'C:/Program Files/Git/cmd/git.exe':'/usr/bin/git';
const supported={test:value=>/\.(?:[cm]?js|jsx|tsx?|json|md|txt|html|css|py|go|rs|ya?ml)$/i.test(value)||/^(?:readme|license|dockerfile|makefile)$/i.test(path.basename(value))};
const limit=128*1024;
// Read only. Git cannot ask for credentials, run a diff helper, or refresh an index.
function git(root,args){return execFileSync(gitExecutable,['--no-pager','-c','safe.directory='+root,'-c','core.fsmonitor=false','-c','core.hooksPath='+ (process.platform==='win32'?'NUL':os.devNull),'-c','status.renames=false','-c','core.excludesFile='+(process.platform==='win32'?'NUL':os.devNull),'-c','core.attributesFile='+(process.platform==='win32'?'NUL':os.devNull),...args],{cwd:root,encoding:'utf8',timeout:3000,maxBuffer:512*1024,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{SystemRoot:process.env.SystemRoot||'',PATH:process.env.PATH||'',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':os.devNull,GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_NO_REPLACE_OBJECTS:'1'}});}
function safe(studio,value){
 const raw=JSON.stringify(value).replaceAll('\\"','"');studio.team.safe(value);
 if(studio.team.coordinator.configuredSecrets().some(s=>s&&raw.includes(s))||/\b(?:sk-|gsk_|github_pat_|ghp_|hf_|AIza)[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(raw)||/\b(?:password|api[_-]?key|access[_-]?token)\s*["']?\s*[:=]\s*["'][^"']{8,}["']/i.test(raw))throw new ApiError(403,'This content may contain a credential. It was not sent to the dashboard.');
 return value;
}
function readable(studio,projectId,relative){
 const repo=studio.root(projectId),target=repo.resolve(relative);
 if(!supported.test(relative))throw new ApiError(415,'Only supported text and code files can be opened');
 if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new ApiError(404,'Project file not found');
 if(fs.statSync(target).size>limit)throw new ApiError(413,'This file is larger than the 128 KB viewer limit');
 const content=fs.readFileSync(target,'utf8');if(content.includes('\0'))throw new ApiError(415,'Binary files cannot be displayed as code');
 return safe(studio,{path:relative,content,hash:hashText(content),summary:explain(relative,content)});
}
export function explain(relative,content){
 const tests=/(?:test|spec)\.[cm]?[jt]sx?$/i.test(relative),parts=[],functions=[...content.matchAll(/\b(?:function\s+|(?:const|let)\s+)([a-zA-Z_$][\w$]*)\s*(?:\(|=\s*(?:async\s*)?\([^)]*\)\s*=>)/g)].map(m=>m[1]).slice(0,6);
 if(/\bimport\b|\brequire\(/.test(content))parts.push('Imports bring in code from other files.');
 if(functions.length)parts.push('Named functions group reusable steps: '+functions.join(', ')+'.');
 if(/\bexport\b|module\.exports/.test(content))parts.push('Exports make parts of this file available to other files.');
 if(tests)parts.push('Assertions check whether actual results match the expected results.');
 if(!parts.length)parts.push('The exact saved text is shown below; no code is executed by this viewer.');
 const type=/\.html$/i.test(relative)?'describes the content and structure of a web page':/\.css$/i.test(relative)?'defines how a page looks':/\.json$/i.test(relative)?'stores structured data or settings':/\.(md|txt)$/i.test(relative)?'contains project notes or instructions':'contains project code';
 return {overview:tests?'This file checks project behavior. Viewing it does not run its tests.':'This file '+type+'. This local outline is not a correctness review.',parts,testMeaning:tests?'Pass means the checks actually ran and reported no failures. A saved test file alone is not proof of a pass.':null};
}
export function repository(studio,projectId){
 const repo=studio.root(projectId),base={name:path.basename(repo.root),available:false,branch:null,changes:[]};
 try{if(!fs.lstatSync(path.join(repo.root,'.git')).isDirectory())return {...base,reason:'Linked Git worktrees are not inspected by this bounded viewer.'};}catch{return {...base,reason:'No Git repository exists in this project folder.'};}
 // Never follow a Git include or allow a configured clean/process filter to
 // turn a file-status read into execution. Configuration stays untouched.
 try{
  // Git metadata is private to this selected repository too. Do not follow an
  // object/ref junction or use a shared Git directory outside the chosen folder.
  let visited=0;const inspectMetadata=(directory,depth=0)=>{if(depth>64)throw Error('Metadata too deep');for(const entry of fs.readdirSync(directory,{withFileTypes:true})){if(++visited>10000)throw Error('Metadata too large');const target=path.join(directory,entry.name),stat=fs.lstatSync(target);if(stat.isSymbolicLink()||stat.isFile()&&stat.nlink>1)throw Error('Linked Git metadata');if(stat.isDirectory())inspectMetadata(target,depth+1);}};
  if(fs.existsSync(path.join(repo.root,'.git/commondir')))return {...base,reason:'Shared Git directories are not inspected.'};
  try{inspectMetadata(path.join(repo.root,'.git'));}catch{return {...base,reason:'Git metadata contains links or exceeds the bounded inspection limit.'};}
  for(const name of ['config','config.worktree']){const target=path.join(repo.root,'.git',name);if(!fs.existsSync(target))continue;const stat=fs.lstatSync(target);if(!stat.isFile()||stat.nlink>1||stat.size>64000)return {...base,reason:'Git configuration is linked or too large for bounded inspection.'};const text=fs.readFileSync(target,'utf8');if(/^\s*\[\s*(?:filter|include|includeif)(?:[\s.\"]|\])/mi.test(text))return {...base,reason:'Git inspection is disabled for custom filters or included configuration. No helper is run and no setting is changed.'};}
  if(fs.existsSync(path.join(repo.root,'.git/objects/info/alternates')))return {...base,reason:'External Git object stores are not inspected.'};
 }catch{return {...base,reason:'Git configuration cannot be inspected safely.'};}
 try{
  if(fs.realpathSync(git(repo.root,['rev-parse','--show-toplevel']).trim())!==repo.root)return {...base,reason:'Git points outside the selected project; inspection stopped.'};
  let branch;try{branch=git(repo.root,['symbolic-ref','--short','HEAD']).trim();}catch{branch='Detached HEAD';}
  const changes=[];for(const record of git(repo.root,['status','--porcelain=v1','-z','--untracked-files=all','--ignore-submodules=all']).split('\0').filter(Boolean)){const relative=record.slice(3),status=record.slice(0,2);try{repo.resolve(relative);}catch{continue;}changes.push({path:relative,untracked:status==='??',status:status.includes('D')?'deleted':status.includes('A')||status==='??'?'added':'modified'});if(changes.length>=500)break;}
  let latestCommit=null;try{const [hash,subject,date]=git(repo.root,['log','-1','--format=%h%x00%s%x00%cI']).trim().split('\0');if(hash)latestCommit={hash,subject,date};}catch{/* An initialized repository may not have a commit yet. */}
  return safe(studio,{...base,available:true,branch,changes,latestCommit,reason:null,changeLimit:500});
 }catch(error){if(error instanceof ApiError)throw error;return {...base,reason:'Git information is unavailable or exceeded the bounded read timeout.'};}
}
export function fileTree(studio,projectId){
 const repo=studio.root(projectId),entries=[];let truncated=false;
 const visit=(relative='')=>{for(const entry of fs.readdirSync(relative?repo.resolve(relative):repo.root,{withFileTypes:true})){if(entries.length>=2000){truncated=true;return;}const file=relative?relative+'/'+entry.name:entry.name;try{repo.resolve(file);}catch{continue;}if(entry.isDirectory()){entries.push({path:file,type:'directory'});visit(file);}else if(entry.isFile())entries.push({path:file,type:'file',supported:supported.test(file)});}};
 visit();return safe(studio,{entries,truncated,repository:repository(studio,projectId)});
}
export function projectFile(studio,projectId,relative){return readable(studio,projectId,relative);}
export function revision(studio,chatId,id){
 const chat=studio.get(chatId),row=studio.db.prepare('SELECT * FROM studio_revisions WHERE id=? AND chat_id=?').get(id,chat.id);if(!row)throw new ApiError(404,'Revision does not belong to this session');studio.root(chat.project_id).resolve(row.relative_path);
 if(Buffer.byteLength(row.next_content)>limit||row.previous_content!==null&&Buffer.byteLength(row.previous_content)>limit)throw new ApiError(413,'This revision exceeds the 128 KB comparison limit');
 if(hashText(row.next_content)!==row.next_hash||row.previous_content!==null&&hashText(row.previous_content)!==row.previous_hash)throw new ApiError(409,'Revision integrity check failed');
 return safe(studio,{id:row.id,chatId:chat.id,projectId:chat.project_id,path:row.relative_path,before:row.previous_content,after:row.next_content,beforeHash:row.previous_hash,afterHash:row.next_hash,createdAt:row.created_at,status:row.previous_hash===row.next_hash?'unchanged':row.previous_content===null?'added':'modified',summary:explain(row.relative_path,row.next_content)});
}
export function gitChange(studio,projectId,relative){
 const repo=studio.root(projectId);repo.resolve(relative);const info=repository(studio,projectId),change=info.changes.find(c=>c.path===relative);if(!info.available||!change)throw new ApiError(404,'No current Git change was found for this project file');if(!supported.test(relative))throw new ApiError(415,'Only text/code changes can be compared');
 let before=null;try{before=git(repo.root,['show','HEAD:'+relative]);}catch{if(change.status!=='added')throw new ApiError(409,'The committed file cannot be read safely');}
 const after=change.status==='deleted'?null:readable(studio,projectId,relative).content;if(before!==null&&Buffer.byteLength(before)>limit)throw new ApiError(413,'Committed file exceeds the comparison limit');
 return safe(studio,{projectId,path:relative,status:change.status,before,after,beforeHash:before===null?null:hashText(before),afterHash:after===null?null:hashText(after),summary:explain(relative,after??before??''),source:'Current project files compared with Git HEAD'});
}
export function inspection(studio,projectId,chatId){
 const project=studio.team.store.project(projectId),chat=chatId?studio.get(chatId):null;if(chat&&chat.project_id!==project.id)throw new ApiError(409,'Session does not belong to this project');
 const savedConnections=studio.team.hubConnections.status();
 const registry=studio.db.prepare('SELECT id,name,role,status,provider_id FROM agents').all();
 const workers=Object.entries(chat?.state.roles||{}).map(([role,id])=>({id,role,name:id.startsWith('codex')?'Codex':id==='claude-code'?'Claude Code':id==='deepseek'?'DeepSeek':id,provider:id==='deepseek'?'DeepSeek official API':'Native CLI login',model:id==='deepseek'?studio.team.paid.settings.model:null,status:chat.state.currentAgent===id&&chat.status==='running'?'RUNNING':chat.status==='paused'&&chat.state.roles[chat.state.phase]===id?'BLOCKED':studio.detail(chat.id).events.some(e=>e.agent===id&&e.kind==='worker_report')?'COMPLETED':'WAITING',connection:'Current account access not checked by this panel',configured:id==='deepseek'?savedConnections.deepseekConfigured:id.startsWith('codex')?savedConnections.codexInstalled:id==='claude-code'?savedConnections.claudeInstalled:false,lastReply:savedConnections.last?.result?.find(r=>r.agent===(id.startsWith('codex')?'codex':id==='claude-code'?'claude':id))?.ok===true,lastCheckAt:savedConnections.last?.created_at||null,taskId:chat.id}));
 let currentEligibility=false,eligibilityReason='No review is ready for owner acceptance.';
 if(chat?.status==='awaiting_owner'){const review=chat.state.review;currentEligibility=review?.decision==='approved'&&chat.state.tests?.executed===true&&chat.state.tests?.passed===true&&!chat.state.authors.some(a=>(a.startsWith('codex')?'codex':a)===(chat.state.roles.reviewer.startsWith('codex')?'codex':chat.state.roles.reviewer))&&studio.root(projectId).fingerprint()===review.artifactHash&&hashText(JSON.stringify(chat.state.tests))===review.testEvidenceHash;eligibilityReason=currentEligibility?'Current independent review and passing tests are bound to these files.':'Files, test evidence or independent reviewer eligibility changed; owner acceptance is unavailable.';}
 return safe(studio,{project:{id:project.id,name:project.name,status:project.status},chat:chat?studio.detail(chat.id):null,registry,workers,acceptance:{eligible:currentEligibility,reason:eligibilityReason},capabilities:{accept:true,reject:false,requestChanges:false},projectMemory:studio.db.prepare('SELECT context_summary,important_decisions,updated_at FROM project_context WHERE project_id=?').get(projectId)||null,memory:chat?{goal:chat.state.goal,problems:chat.state.problems,tests:chat.state.tests,review:chat.state.review} :null});
}
