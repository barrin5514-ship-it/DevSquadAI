// Read-only discovery. No generation, receipt, routing or configuration writes.
import fs from 'node:fs';
import {loadConfig} from '../src/config/index.js';
const out='docs/verification/antigravity-qwen-20261107';
fs.mkdirSync(out,{recursive:true});process.loadEnvFile('.env');
const p=loadConfig().ai.providers.find(p=>p.id==='openrouter'),id='qwen/qwen3-coder:free';
if(p.base!=='https://openrouter.ai/api/v1')throw Error('Unexpected endpoint; stop');
const calls=[];
async function read(route,key){
 const stamp=Date.now();
 try{const r=await fetch(p.base+route,{method:'GET',headers:key?{Authorization:'Bearer '+key}:{},redirect:'error',signal:AbortSignal.timeout(15000)});const reader=r.body.getReader(),chunks=[];let bytes=0;
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8000000){await reader.cancel();throw Error('Catalog exceeds safe bound');}chunks.push(value);}
  const b=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  calls.push({route,httpStatus:r.status,elapsedMs:Date.now()-stamp,retryAfter:r.headers.get('retry-after'),rateLimit:r.headers.get('x-ratelimit-limit'),rateRemaining:r.headers.get('x-ratelimit-remaining'),rateReset:r.headers.get('x-ratelimit-reset')});
  return r.ok?b:null;
 }catch{calls.push({route,httpStatus:null,error:'Bounded read failed; no retry',elapsedMs:Date.now()-stamp});return null;}
}
const zero=m=>!!m?.pricing&&m.pricing.prompt!==undefined&&m.pricing.completion!==undefined&&Object.values(m.pricing).every(v=>['number','string'].includes(typeof v)&&String(v).trim()!==''&&Number(v)===0);
const safe=m=>m?{id:m.id,name:m.name,pricing:m.pricing,allReportedPricesZero:zero(m),contextLength:m.context_length,maxOutputTokens:m.top_provider?.max_completion_tokens??null,supportedParameters:m.supported_parameters||[],expirationDate:m.expiration_date??null}:null;
const catalog=await read('/models'),accountModels=p.key?await read('/models/user',p.key):null,account=p.key?await read('/key',p.key):null;
const publicModel=catalog?.data?.find(m=>m.id===id),accountModel=accountModels?.data?.find(m=>m.id===id),data=account?.data;
const result={checkedAt:new Date().toISOString(),keyConfigured:!!p.key,model:id,calls,publicModel:safe(publicModel),accountModel:safe(accountModel),accountAuthenticated:!!data,accountFreeTier:typeof data?.is_free_tier==='boolean'?data.is_free_tier:null,freeDailyRequests:data?.free_model_daily_requests??null,reportedRateLimit:data?.rate_limit??null,access:'Catalog visibility only; inference and remaining free quota not proven',alternatives:(catalog?.data||[]).filter(m=>m.id!==id&&m.id.endsWith(':free')&&zero(m)&&/qwen|coder|devstral|deepseek|glm/i.test(m.id)).slice(0,3).map(safe),generationRequests:0,settingsChanged:false};
fs.writeFileSync(out+'/openrouter-readonly.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
