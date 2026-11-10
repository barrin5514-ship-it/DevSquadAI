import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const samePath=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
const sameFile=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs;
const privateConfig=name=>/^(?:\.env(?:\.|$)|\.npmrc$|\.yarnrc(?:\.|$)|\.netrc$)|\.(?:pem|pfx|p12|key)$/i.test(name);

function checkedEntry(file){
 const stat=fs.lstatSync(file);
 if(stat.isSymbolicLink()||stat.nlink>1&&!stat.isDirectory()||!samePath(fs.realpathSync(file),file))throw Error('Installed dependency links and junctions cannot be copied into the test boundary.');
 return stat;
}

export function installedDependencyHash(root,destination=null,manifest={},exact=false){
 const modules=path.join(root,'node_modules'),target=destination&&path.join(destination,'node_modules');
 const digest=createHash('sha256');
 let bytes=0,entries=0,exists=true;
 try{if(!checkedEntry(modules).isDirectory())throw Error('Expected node_modules to be a directory.');}catch(error){if(error.code!=='ENOENT')throw error;exists=false;}
 const visited=new Set();
 const visit=(directory,relative='')=>{
  for(const name of fs.readdirSync(directory).sort()){
   if(++entries>15000)throw Error('Installed dependencies exceed the 15,000-entry limit for this runner.');
   const file=path.join(directory,name),rel=relative+name;
   const stat=checkedEntry(file);
   if(privateConfig(name)){
    if(exact)throw Error('Private configuration appeared in the test dependency copy.');
    continue;
   }
   if(stat.isDirectory()){
    digest.update(JSON.stringify(['directory',rel]));
    if(target)fs.mkdirSync(path.join(target,rel));
    visit(file,rel+'/');
    continue;
   }
   if(!stat.isFile()||stat.size>24000000||(bytes+=stat.size)>160000000)throw Error('Installed dependencies exceed the file or byte limits for this runner.');
   const fd=fs.openSync(file,'r');
   let content;
   try{
    const current=fs.fstatSync(fd);
    if(!sameFile(stat,current)||current.nlink>1)throw Error('Installed dependencies changed while being copied.');
    content=Buffer.alloc(stat.size);
    let offset=0;
    while(offset<content.length){
     const length=fs.readSync(fd,content,offset,content.length-offset,offset);
     if(!length)throw Error('Installed dependencies changed while being copied.');
     offset+=length;
    }
    if(!sameFile(current,checkedEntry(file)))throw Error('Installed dependencies changed while being copied.');
   }finally{fs.closeSync(fd);}
   digest.update(JSON.stringify(['file',rel,createHash('sha256').update(content).digest('hex')]));
   if(target)fs.writeFileSync(path.join(target,rel),content,{flag:'wx'});
   if(/^(?:@[^/]+\/)?[^/]+\/package\.json$/.test(rel))visited.add(rel.slice(0,-'/package.json'.length));
  }
 };
 if(exists){
  if(target)fs.mkdirSync(target);
  visit(modules);
 }
 const required=Object.keys({...manifest.dependencies,...manifest.devDependencies,...manifest.peerDependencies});
 for(const name of required){
  if(Object.hasOwn(manifest.optionalDependencies||{},name)||manifest.peerDependenciesMeta?.[name]?.optional===true)continue;
  if(!/^(?:@[a-z\d._-]+\/)?[a-z\d._-]+$/i.test(name))throw Error('package.json contains an invalid dependency name.');
  if(!visited.has(name))throw Error('Missing installed dependency '+JSON.stringify(name)+'. Install project dependencies before running npm test.');
 }
 return digest.digest('hex');
}

export function ownerTestCopyMatches(copy,files){
 const expected=new Set(files);
 for(const file of files){
  for(let dir=path.posix.dirname(file);dir!=='.';dir=path.posix.dirname(dir))expected.add(dir+'/');
 }
 const visit=(directory,relative='')=>{
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
   if(!relative&&entry.name==='node_modules')continue;
   const rel=relative+entry.name,absolute=path.join(directory,entry.name);
   if(entry.isDirectory()){
    if(!expected.delete(rel+'/')||!checkedEntry(absolute).isDirectory()||!visit(absolute,rel+'/'))return false;
   }else if(!entry.isFile()||!expected.delete(rel)||!checkedEntry(absolute).isFile())return false;
  }
  return true;
 };
 return visit(copy)&&expected.size===0;
}

export function npmRuntime(){
 if(process.platform!=='win32')throw Error('The isolated npm test runner requires Windows MXC.');
 const runtime=path.dirname(fs.realpathSync(process.execPath)),npm=path.join(runtime,'node_modules','npm','bin','npm-cli.js');
 if(!fs.existsSync(npm)||!samePath(fs.realpathSync(npm),npm))throw Error('The Windows Node installation does not provide a trusted npm CLI.');
 return npm;
}

// Codex needs the local Windows account to initialize MXC. Only this trusted
// launcher sees that environment; its project subprocess gets a new one.
const launch=`
 const {spawn}=require('node:child_process');
 const [nonce,environment,...args]=process.argv.slice(1);
 const receipt=(kind,value)=>process.stderr.write('\\n'+nonce+' '+kind+' '+value+'\\n');
 const child=spawn(process.execPath,args,{env:JSON.parse(environment),shell:false,stdio:'inherit',windowsHide:true});
 child.once('error',()=>{receipt('unavailable',1);process.exitCode=1;});
 child.once('close',(code)=>{if(Number.isInteger(code)){receipt('exit',code);process.exitCode=code;}else process.exitCode=1;});
`;

export function isolatedTestLaunch(copy,args){
 const system=process.env.SystemRoot||'C:\\Windows',system32=path.join(system,'System32'),scratch=path.join(copy,'.runner');
 fs.mkdirSync(scratch);
 const env={
  SystemRoot:system,WINDIR:system,ComSpec:path.join(system32,'cmd.exe'),Path:[path.dirname(process.execPath),system32].join(path.delimiter),PATHEXT:'.COM;.EXE;.BAT;.CMD',
  USERPROFILE:copy,HOME:copy,LOCALAPPDATA:scratch,APPDATA:scratch,TEMP:scratch,TMP:scratch,
  NODE_OPTIONS:'--preserve-symlinks --preserve-symlinks-main',
  npm_config_cache:path.join(scratch,'npm-cache'),npm_config_userconfig:path.join(scratch,'empty-user.npmrc'),npm_config_globalconfig:path.join(scratch,'empty-global.npmrc'),
  npm_config_script_shell:path.join(system32,'cmd.exe'),npm_config_offline:'true',npm_config_ignore_scripts:'true',npm_config_update_notifier:'false'
 };
 const nonce='devsquad-test-'+randomUUID();
 return {
  command:[process.execPath,'-e',launch,'--',nonce,JSON.stringify(env),...args],
  result(result){
   const marker=new RegExp('(?:^|\\r?\\n)'+nonce+' exit (-?\\d+)\\r?\\n');
   const match=marker.exec(result.stderr);
   return {...result,stderr:result.stderr.replace(marker,'\n'),observed:match!==null&&Number(match[1])===result.exit};
  },
  clearScratch(){
   try{if(checkedEntry(scratch).isDirectory())fs.rmSync(scratch,{recursive:true,force:true});}catch{}
  }
 };
}
