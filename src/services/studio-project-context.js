import {createHash} from 'node:crypto';
import {safeWorkspaceContent} from './workspace-inspection.js';

export const projectContextRounds=2;
const mapBytes=3200, initialBytes=6200, resultBytes=5600;
const readLimit=128*1024, searchBytes=512*1024, searchFiles=80;
const supported=name=>/\.(?:[cm]?js|jsx|tsx?|json|md|txt|html|css|scss|py|go|rs|ya?ml|toml|xml|sql|vue|svelte)$/i.test(name)||/(?:^|\/)(?:readme|license|dockerfile|makefile)$/i.test(name);
const privatePath=name=>/^references(?:\/|$)|(?:^|\/)AGENTS(?:\.override)?\.md$/i.test(name);
const fail=message=>Object.assign(Error(message),{code:'project_context_limit',stopped:true});
const bytes=value=>Buffer.byteLength(JSON.stringify(value));
const offsetOf=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;

// Keep every provider packet inside the native transport's existing byte
// limit. The full test log remains in the durable execution evidence.
export function boundedProjectPacket(packet){
 if(!packet.projectContext)return packet;
 if(bytes(packet)<=24000)return packet;
 const test=packet.testResults;
 const log=value=>typeof value==='string'?value.slice(0,1100):value;
 const result={...packet,files:[],contextTruncated:true};
 if(test)result.testResults={...test,stdout:log(test.stdout),stderr:log(test.stderr),output:log(test.output),failures:test.failures?.slice(0,6).map(log),names:test.names?.slice(0,8),...(test.projectSuite?{projectSuite:{...test.projectSuite,stdout:log(test.projectSuite.stdout),stderr:log(test.projectSuite.stderr)}}:{})};
 if(bytes(result)>24000)throw fail('The requested project excerpts and saved evidence exceed the worker packet limit. Narrow the task or request fewer excerpts.');
 return result;
}

export function contextRequests(value){
 if(value==null||Array.isArray(value)&&!value.length)return null;
 if(!Array.isArray(value)||value.length>3)throw fail('A worker may request at most three project searches or reads at a time.');
 for(const request of value){
  if(!request||typeof request!=='object'||Object.keys(request).some(key=>!['operation','path','query','offset'].includes(key))||
   !offsetOf(request.offset??0,readLimit)||
   !(request.operation==='read'&&typeof request.path==='string'&&request.path.length<=240&&request.query==null||
    request.operation==='search'&&typeof request.query==='string'&&request.query.trim()&&request.query.length<=120&&request.path==null))
    throw fail('The worker returned an invalid project search or file read request.');
 }
 return value;
}

export class StudioProjectContext {
 constructor(studio,repo,checkpointFiles){
  this.studio=studio;
  this.repo=repo;
  this.hashes=new Map(checkpointFiles);
  this.paths=[...this.hashes.keys()].filter(name=>{
   if(!supported(name)||privatePath(name))return false;
   try{safeWorkspaceContent(studio,name);return true;}catch{return false;}
  });
 }
 text(name){
  if(!this.paths.includes(name))throw fail('File is outside the searchable project map, private, or unsupported.');
  const body=this.repo.read(name,readLimit);
  if(createHash('sha256').update(body).digest('hex')!==this.hashes.get(name))throw fail('The file changed after this stage started.');
  const content=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(body);
  if(content.includes('\0'))throw fail('Binary files cannot be sent to a worker.');
  safeWorkspaceContent(this.studio,{path:name,content});
  return {content,length:body.length};
 }
 initial(roundsRemaining){
  const paths=[],files=[];
  let pathBytes=0,fileBytes=0;
  for(const name of this.paths){
   pathBytes+=bytes(name)+1;
   if(pathBytes>mapBytes)break;
   paths.push(name);
  }
  for(const name of this.paths.slice(0,32)){
   let file;
   try{file={path:name,content:this.text(name).content};}catch{continue;}
   fileBytes+=bytes(file)+1;
   if(fileBytes>initialBytes)break;
   files.push(file);
  }
  return {files,contextTruncated:files.length<this.paths.length,projectContext:{paths,totalFiles:this.paths.length,roundsRemaining,readLimitBytes:readLimit}};
 }
 search(query,offset){
  const matches=[],needle=query.toLowerCase();
  let index=offset,scanned=0,attempts=0,unavailable=0;
  for(;index<this.paths.length&&attempts<searchFiles&&scanned<searchBytes&&matches.length<8;index++,attempts++){
   const name=this.paths[index];
   if(name.toLowerCase().includes(needle)){matches.push({path:name});continue;}
   let file;
   try{file=this.text(name);}catch{unavailable++;continue;}
   scanned+=file.length;
   if(file.content.toLowerCase().includes(needle))matches.push({path:name});
  }
  return {matches,nextOffset:index<this.paths.length?index:null,unavailable};
 }
 read(name,offset,allowance){
  const {content}=this.text(name);
  if(offset>content.length)throw fail('Read offset is beyond the end of this file.');
  const start=offset;
  let end=Math.min(content.length,offset+allowance);
  while(end>start&&bytes({content:content.slice(start,end)})>allowance)end=start+Math.floor((end-start)*0.8);
  return {path:name,content:content.slice(start,end),nextOffset:end<content.length?end:null};
 }
 respond(requests){
  const allowance=Math.floor(resultBytes/requests.length);
  return requests.map(request=>{
   try{
    const value=request.operation==='search'?this.search(request.query.trim(),request.offset??0):this.read(request.path,request.offset??0,allowance-420);
    return bytes(value)<=allowance?value:{error:'The search result exceeds its response budget. Try a narrower query.'};
   }catch(error){
    const reason=error.status===413?'File exceeds the 128 KiB safe read limit.':error.code==='project_context_limit'?error.message:'File could not be read safely as project text.';
    return {error:reason};
   }
  });
 }
}
