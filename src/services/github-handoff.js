import {createHash} from 'node:crypto';
import {ApiError} from '../middleware/errors.js';
export const handoffLocation=Object.freeze({owner:'barrin5514-ship-it',repo:'DevSquadAI',branch:'handoffs',path:'handoffs/next-prompt.json'});

// This reader has one fixed GET destination. It never uses GitHub CLI credentials,
// downloads arbitrary URLs, writes a file, changes branches or exposes the token.
export class GitHubHandoff {
 #token;
 constructor({token='',readOnlyConfirmed=false}={}, {fetchImpl=fetch,timeoutMs=10000}={}){this.#token=token;this.readOnlyConfirmed=readOnlyConfirmed;this.fetch=fetchImpl;this.timeoutMs=timeoutMs;}
 status(){return {...handoffLocation,configured:Boolean(this.#token),ready:this.#token.startsWith('github_pat_')&&this.readOnlyConfirmed,permissionEvidence:'Owner-confirmed Contents read-only; token permission is not independently proven by catalog visibility.'};}
 async read(signal){
  if(!this.status().ready)throw new ApiError(409,'Configure a fine-grained GitHub handoff token and confirm Contents read-only locally');
  const c=new AbortController(),abort=()=>c.abort();if(signal?.aborted)c.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,this.timeoutMs);
  try{
   const p=handoffLocation,url=`https://api.github.com/repos/${p.owner}/${p.repo}/contents/${p.path}?ref=${p.branch}`;
   const response=await this.fetch(url,{method:'GET',headers:{Authorization:'Bearer '+this.#token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'DevSquadAI-handoff-reader'},redirect:'error',signal:c.signal});
   if(response.status===404){await response.body?.cancel();return {missing:true};}
   if(!response.ok){await response.body?.cancel();throw new ApiError(409,'GitHub handoff read failed (HTTP '+response.status+'); check token expiry, repository access and rate limits');}
   const reader=response.body.getReader(),chunks=[];let size=0;while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>32000){await reader.cancel();throw new ApiError(409,'GitHub handoff response is too large');}chunks.push(r.value);}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(data.type!=='file'||data.path!==p.path||data.encoding!=='base64'||typeof data.content!=='string'||!Number.isInteger(data.size)||data.size<1||data.size>12000||!/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(data.sha))throw new ApiError(409,'GitHub returned an invalid handoff file');
   const encoded=data.content.replace(/\s/g,'');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw new ApiError(409,'GitHub handoff encoding is invalid');const bytes=Buffer.from(encoded,'base64');
   if(bytes.length!==data.size||bytes.toString('base64')!==encoded)throw new ApiError(409,'GitHub handoff size does not match');
   const hash=createHash(data.sha.length===40?'sha1':'sha256').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');if(hash!==data.sha)throw new ApiError(409,'GitHub handoff hash does not match');
   return {sha:data.sha,prompt:JSON.parse(bytes.toString('utf8'))};
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(409,c.signal.aborted?'GitHub handoff read timed out or was stopped':'GitHub handoff was unreadable; no prompt was executed');}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
}
