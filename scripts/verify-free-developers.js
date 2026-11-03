import {recordHealth} from '../src/services/provider-health.js';
import {classifyProviderFailure} from '../src/providers/diagnostics.js';
// Explicit read-only verification. Never called by dashboard GETs or application startup.
import fs from 'node:fs';
import path from 'node:path';
import {loadConfig} from '../src/config/index.js';
import {teamModels} from '../src/orchestrator/team-models.js';
import {connectionFile,keyFingerprint,savedVerification} from '../src/services/provider-verification.js';
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const config=loadConfig();let evidence={};try{const file=connectionFile(config);if(fs.statSync(file).size<=64000)evidence=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}delete evidence.openrouter;delete evidence.groq;
async function read(url,key){
 try{const response=await fetch(url,{method:'GET',headers:key?{Authorization:'Bearer '+key}:{},redirect:'error',signal:AbortSignal.timeout(15000)});const result={httpStatus:response.status,retryAfter:response.headers.get('retry-after')};const reader=response.body.getReader();let bytes=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8000000){await reader.cancel();return {...result,error:'catalog_too_large'};}chunks.push(value);}const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));return response.ok?{...result,body}:{...result,errorKind:classifyProviderFailure(response.status,body)};}catch{return {httpStatus:null,error:'connection_or_tls_unavailable'};}
}
const router=config.ai.providers.find(p=>p.id==='openrouter');
if(router.key){
 const catalog=await read(router.base+'/models',null),models=await read(router.base+'/models/user',router.key),account=await read(router.base+'/key',router.key);
 const safeModels=teamModels.filter(m=>m.provider==='openrouter').map(m=>{const a=models.body?.data?.find(x=>x.id===m.model),b=catalog.body?.data?.find(x=>x.id===m.model);const zero=x=>x?.pricing&&x.pricing.prompt!==undefined&&x.pricing.completion!==undefined&&Object.values(x.pricing).every(v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number(v)===0);return {id:m.model,accountListed:!!a,publicListed:!!b,zeroPrice:!!(zero(a)&&zero(b)),contextLength:a?.context_length||null,maxOutputTokens:a?.top_provider?.max_completion_tokens||null,expiration:a?.expiration_date||m.expires,supportsMaxTokens:a?.supported_parameters?.includes('max_tokens')===true};});
 const q=account.body?.data?.free_model_daily_requests;const count=v=>Number.isSafeInteger(v)&&v>=0?v:null;
 evidence.openrouter={keyFingerprint:keyFingerprint(router.key),checkedAt:new Date().toISOString(),catalogStatus:catalog.httpStatus,httpStatus:models.httpStatus,accountStatus:account.httpStatus,accountAuthenticated:account.httpStatus===200&&typeof account.body?.data?.is_free_tier==='boolean',freeTier:account.body?.data?.is_free_tier===true,quota:q?{used:count(q.used),limit:count(q.limit),remaining:count(q.remaining)}:null,generations:savedVerification(config,router)?.generations||{},models:safeModels};
}
const groq=config.ai.providers.find(p=>p.id==='groq');if(groq.key){const r=await read(groq.base+'/models',groq.key);if(r.httpStatus===200&&r.body?.data?.some(x=>x.id===groq.model))recordHealth(config,groq,groq.model,{requiresOwnerAction:false,errorKind:null});evidence.groq={keyFingerprint:keyFingerprint(groq.key),checkedAt:new Date().toISOString(),httpStatus:r.httpStatus,errorKind:r.errorKind||null,modelListed:r.body?.data?.some(x=>x.id===groq.model)===true};}
const file=connectionFile(config);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(evidence,null,2));fs.renameSync(file+'.tmp',file);
// Never print credentials, fingerprints, key labels, raw provider bodies or error messages.
console.log(JSON.stringify(Object.fromEntries(Object.entries(evidence).filter(([k])=>['groq','openrouter'].includes(k)).map(([k,{keyFingerprint,...safe}])=>[k,safe])),null,2));
