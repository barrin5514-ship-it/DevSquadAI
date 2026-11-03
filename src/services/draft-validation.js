import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ApiError } from '../middleware/errors.js';
export function validateDraft(raw, workspace, projectPath,{syntaxCheck=spawnSync}={}) {
  let result;
  try{result=JSON.parse(raw);}catch{throw new ApiError(422,'Generated response must be a JSON object');}
  if(!result || Object.keys(result).some(k=>k!=='files') || !Array.isArray(result.files) || result.files.length<1 || result.files.length>10)throw new ApiError(422,'Generated response requires 1 to 10 files');
  const seen=new Set();let bytes=0,parsed=0;
  for(const file of result.files) {
    if(!file || Object.keys(file).some(k=>!['path','content'].includes(k)) || typeof file.path!=='string' || file.path.length>200 || typeof file.content!=='string' || !file.content.trim() || file.content.includes('\0'))throw new ApiError(422,'Invalid generated file');
    workspace.resolve(`${projectPath}/${file.path}`);
    const extension=path.extname(file.path).toLowerCase();
    if(!['.js','.mjs','.cjs','.json','.md','.txt'].includes(extension) || file.path.split('/').some(p=>p.startsWith('.')) || seen.has(file.path.toLowerCase()))throw new ApiError(422,'Unsupported or duplicate generated file path');
    seen.add(file.path.toLowerCase());bytes+=Buffer.byteLength(file.content);
    if(bytes>100000)throw new ApiError(422,'Generated content is too large');
    if(extension==='.json'){try{JSON.parse(file.content);}catch{throw new ApiError(422,'Generated JSON is malformed');}parsed++;}
    if(['.js','.mjs','.cjs'].includes(extension)) {
      // --check parses stdin; it never evaluates the submitted code or imports.
      const check=syntaxCheck(process.execPath,[`--input-type=${extension==='.cjs'?'commonjs':'module'}`,'--check'],{input:file.content,timeout:10000,maxBuffer:100000,windowsHide:true,env:{SystemRoot:process.env.SystemRoot||'',PATH:process.env.PATH||''}});
      if(check.error){const error=new ApiError(503,'JavaScript syntax checker was unavailable or timed out; this is a local runtime problem, not invalid code');error.code='syntax_check_unavailable';throw error;}
      if(check.status!==0)throw new ApiError(422,'Generated JavaScript failed syntax checks');
      parsed++;
    }
  }
  if(!result.files.some(f=>/\.(m?js|cjs)$/.test(f.path)))throw new ApiError(422,'A coding draft must contain JavaScript');
  return { files:result.files, checks:{schema:true,paths:true,syntax:true,parsedFiles:parsed,behavioralTests:'not_run'}, hash:createHash('sha256').update(JSON.stringify(result.files)).digest('hex'), score:parsed };
}
