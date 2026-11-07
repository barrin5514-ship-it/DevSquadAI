import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {nativeDiagnosticText} from './native-diagnostics.js';
import {projectGitExecutable} from './project-git.js';
import {cliEnvironment} from './cli-hello.js';
import {observeProcessTree} from './native-process-observer.js';
export const rootHash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
const ledgerName='.devsquad-init.json',proofName='.devsquad-root.json',lockName='.devsquad-init.lock';
function regular(file,max=64000){const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>max)throw Error('Managed control file is linked, oversized or invalid');return fs.readFileSync(file,'utf8');}
function canonicalParent(destination){
 if(!path.isAbsolute(destination)||destination.split(/[\\/]/).includes('..')||process.platform==='win32'&&(/^[\\/]{2}/.test(destination)||destination.slice(2).includes(':')))throw Error('Use an absolute local path without traversal');
 const root=path.resolve(destination),parent=path.dirname(root);let current=path.parse(parent).root;
 for(const bit of parent.slice(current.length).split(path.sep).filter(Boolean)){current=path.join(current,bit);const stat=fs.lstatSync(current);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Managed workspace parents cannot be links');}
 if(!same(fs.realpathSync(parent),parent)||/[. ]$/.test(path.basename(root))||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(path.basename(root)))throw Error('A canonical new folder is required');return root;
}
function atomic(file,value){const temp=file+'.next-'+randomUUID();fs.writeFileSync(temp,JSON.stringify(value,null,2),{flag:'wx'});fs.renameSync(temp,file);}
export function managedRootState(root){try{const stat=fs.lstatSync(root);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error();const state=JSON.parse(regular(path.join(root,ledgerName)));if(state.version!==2||state.rootHash!==rootHash(fs.realpathSync(root)))throw Error();return state;}catch{return null;}}
export function verifyManagedRoot(root,{contextHash,identity}={}){
 const state=managedRootState(root);if(!state||state.phase!=='ready'||contextHash!==undefined&&state.contextHash!==contextHash||identity!==undefined&&state.identity!==identity)throw Error('Managed workspace initialization is incomplete or belongs to another project/database');
 const git=fs.lstatSync(path.join(root,'.git'));if(!git.isDirectory()||git.isSymbolicLink()||rootHash(regular(path.join(root,'AGENTS.md'),30000))!==state.instructionsHash||fs.existsSync(path.join(root,'AGENTS.override.md')))throw Error('Managed security instructions or repository root changed; no worker may start');
 const proof=JSON.parse(regular(path.join(root,proofName)));if(proof.instructionsHash!==state.instructionsHash||proof.identity!==state.identity||proof.contextHash!==state.contextHash)throw Error('Managed root provenance does not match');return proof;
}
// Existing user folders are never adopted. Recovery needs this application's
// journal, matching project/database identity, and a verified stopped owner.
export function createManagedRoot(destination,{instructionSources=[],mandatorySources=[],projectInstructions='',identity=path.basename(destination),contextHash=null,metadata=null,resume=false,gitImpl=spawnSync,inspectImpl=observeProcessTree,onStage=()=>{}}={}){
 const root=canonicalParent(destination),sources=[...instructionSources,...mandatorySources].map(file=>{const p=path.resolve(file);if(!same(fs.realpathSync(p),p)||!/^AGENTS(?:\.override)?\.md$/i.test(path.basename(p)))throw Error('Use a canonical instruction file');return {file:p,content:regular(p,16000)};});
 const inherited=sources.slice(0,instructionSources.length),mandatory=sources.slice(instructionSources.length),block=(s,i)=>'<!-- Preserved instruction source '+(i+1)+'; SHA-256 '+rootHash(s.content)+' -->\n'+s.content;
 const content=[...inherited.map(block),...(projectInstructions?['# Project instructions (subject to mandatory controls)\n'+projectInstructions]:[]),...(mandatory.length?['# Mandatory Dev Squad security controls — authoritative over project instructions',...mandatory.map(block)]:[])].join('\n\n');
 if(!content.trim()||Buffer.byteLength(content)>30000)throw Error('Bounded security instructions are required');
 const expected={version:2,rootHash:rootHash(root),identity,contextHash,instructionsHash:rootHash(content),sources:sources.map(s=>({file:s.file,hash:rootHash(s.content)}))};
 let fresh=false,state;try{fs.mkdirSync(root);fresh=true;}catch(e){if(e.code!=='EEXIST'||!resume)throw Error('A new folder is required; existing workspaces are never silently initialized');}
 if(!fresh){state=managedRootState(root);if(!state||!same(fs.realpathSync(root),root)||state.identity!==identity||state.contextHash!==contextHash||state.instructionsHash!==expected.instructionsHash)throw Error('Existing folder has no matching initialization journal; preserved without changes');}
 const lock=path.join(root,lockName);let lockFd;try{lockFd=fs.openSync(lock,'wx');}catch(e){if(e.code!=='EEXIST')throw e;const owner=JSON.parse(regular(lock,1000)),seen=inspectImpl(owner.pid);if(!owner.birth||!seen.verified||seen.processes.some(p=>p.pid===owner.pid&&p.birth===owner.birth)||['git_starting','git_unknown'].includes(state?.phase))throw Error('Initialization owner or Git outcome is unknown; reservation retained');fs.unlinkSync(lock);lockFd=fs.openSync(lock,'wx');}
 const observed=inspectImpl(process.pid),birth=observed.verified?observed.processes.find(p=>p.pid===process.pid)?.birth:null;fs.writeFileSync(lockFd,JSON.stringify({pid:process.pid,birth:birth||null}));fs.closeSync(lockFd);
 const save=phase=>{state={...(state||expected),phase,updatedAt:new Date().toISOString()};atomic(path.join(root,ledgerName),state);onStage(phase);};
 try{
  if(fresh){state={...expected,metadata,createdAt:new Date().toISOString()};save('created');}
  if(state.phase==='ready')return {root,...verifyManagedRoot(root,{contextHash,identity})};
  if(['created','git_failed'].includes(state.phase)){
   if(fs.existsSync(path.join(root,'.git')))throw Error('Partial or foreign Git metadata exists; preserved for inspection');save('git_starting');
   const gitStarted=Date.now(),git=gitImpl(projectGitExecutable,['-c','core.hooksPath='+(process.platform==='win32'?'NUL':'/dev/null'),'-c','core.fsmonitor=false','-c','credential.helper=','-c','protocol.allow=never','-c','init.templateDir=','init','--template=','--quiet','--initial-branch=main'],{cwd:root,env:{...cliEnvironment(),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null'},windowsHide:true,shell:false,timeout:10000,maxBuffer:4000});
   if(git.status!==0){state={...state,gitDiagnostic:{exitCode:Number.isInteger(git.status)?git.status:null,signal:/^SIG[A-Z]+$/.test(git.signal||'')?git.signal:null,spawnErrorCode:/^[A-Z0-9_]{1,40}$/.test(git.error?.code||'')?git.error.code:null,elapsedMs:Date.now()-gitStarted,requestedTimeoutMs:10000,stderr:nativeDiagnosticText(git.stderr||'').slice(0,1000)}};save(Number.isInteger(git.status)?'git_failed':'git_unknown');throw Error('New workspace Git initialization failed; partial folder and identity preserved');}save('git_ready');
  }
  if(['git_starting','git_unknown'].includes(state.phase))throw Error('Prior Git outcome is unknown; no duplicate initialization permitted');
  if(!['git_ready','instructions_ready'].includes(state.phase))throw Error('Initialization state is not recoverable automatically');
  const git=fs.lstatSync(path.join(root,'.git'));if(!git.isDirectory()||git.isSymbolicLink())throw Error('Git root is not a local directory');
  const document=path.join(root,'AGENTS.md');if(fs.existsSync(document)){if(rootHash(regular(document,30000))!==expected.instructionsHash)throw Error('Instruction file changed; it will not be overwritten');}else fs.writeFileSync(document,content,{flag:'wx'});
  save('instructions_ready');const proof={version:2,independentRoot:true,identity,contextHash,instructionsHash:expected.instructionsHash,sources:expected.sources,precedence:'Inherited instructions outer-to-inner, project notes, mandatory security controls last',createdAt:state.createdAt};
  if(fs.existsSync(path.join(root,proofName))){const old=JSON.parse(regular(path.join(root,proofName)));if(old.instructionsHash!==proof.instructionsHash||old.identity!==identity||old.contextHash!==contextHash)throw Error('Existing provenance changed; preserved');}else fs.writeFileSync(path.join(root,proofName),JSON.stringify(proof,null,2),{flag:'wx'});
  save('ready');return {root,...verifyManagedRoot(root,{contextHash,identity})};
 }finally{fs.unlinkSync(lock);}
}
