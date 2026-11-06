import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
const source=fileURLToPath(new URL('./windows-process-observer.cs',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function observerEnvironment(){const win=process.env.SystemRoot||'C:\\Windows';return {SystemRoot:win,WINDIR:win,PATH:path.join(win,'System32'),TEMP:os.tmpdir(),TMP:os.tmpdir()};}
// Reuse the project's installed-compiler pattern. Cache only first-party helper
// code; never install a package or weaken the worker's existing sandbox.
export function prepareProcessObserver(cache=path.join(os.tmpdir(),'devsquad-process-observer')){
 const compiler=path.join(process.env.SystemRoot||'C:\\Windows','Microsoft.NET/Framework64/v4.0.30319/csc.exe');
 if(!fs.existsSync(compiler))throw Error('Installed Windows compiler unavailable');
 if(!path.isAbsolute(cache))throw Error('Observer cache must be absolute');
 const digest=hash(fs.readFileSync(source)),folder=path.join(cache,digest),exe=path.join(folder,'observer.exe');
 fs.mkdirSync(cache,{recursive:true});if(fs.lstatSync(cache).isSymbolicLink())throw Error('Observer storage is a link');
 const validate=()=>{if(fs.lstatSync(folder).isSymbolicLink()||fs.lstatSync(exe).isSymbolicLink()||fs.statSync(exe).nlink!==1)throw Error('Observer cache changed');const m=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));if(m.source!==digest||m.binary!==hash(fs.readFileSync(exe)))throw Error('Observer integrity check failed');return exe;};
 if(fs.existsSync(folder))return validate();
 const build=fs.mkdtempSync(path.join(cache,'build-'));
 try {const target=path.join(build,'observer.exe'),r=spawnSync(compiler,['/nologo','/noconfig','/target:exe','/reference:System.dll','/reference:System.Core.dll','/reference:System.Web.Extensions.dll','/out:'+target,source],{env:observerEnvironment(),shell:false,windowsHide:true,timeout:15000,stdio:'ignore'});if(r.status!==0)throw Error('Observer preparation failed');fs.writeFileSync(path.join(build,'manifest.json'),JSON.stringify({source:digest,binary:hash(fs.readFileSync(target))}),{flag:'wx'});try{fs.renameSync(build,folder);}catch(e){if(!fs.existsSync(folder))throw e;}return validate();
 }finally{if(fs.existsSync(build)&&path.dirname(build)===fs.realpathSync(cache)&&fs.realpathSync(build)===build)fs.rmSync(build,{recursive:true,force:true});}
}
export function observeProcessTree(pid){
 if(!Number.isSafeInteger(pid)||pid<1||pid>0xffffffff)return {verified:false,reason:'No valid process identity.'};
 if(process.platform!=='win32')return {verified:false,reason:'Windows process inspection is unavailable.'};
 try {const exe=prepareProcessObserver(),r=spawnSync(exe,[String(pid)],{env:observerEnvironment(),shell:false,windowsHide:true,timeout:10000,maxBuffer:128000,encoding:'utf8'});if(r.status!==0)throw Error();const value=JSON.parse(r.stdout);if(value.verified!==true||!Array.isArray(value.processes)||value.processes.some(p=>!Number.isSafeInteger(p.pid)||!Number.isSafeInteger(p.parent)||typeof p.birth!=='string'||!Number.isFinite(Date.parse(p.birth))))throw Error();return {verified:true,processes:value.processes};}catch{return {verified:false,reason:'Windows process inspection failed; no lock may be released.'};}
}
