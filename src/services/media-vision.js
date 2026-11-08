import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {StringDecoder} from 'node:string_decoder';
import {ProviderAdapter} from '../providers/adapter.js';
import {NemotronWorker,nemotronModel} from './nemotron-worker.js';
import {DemoCliTransport} from './demo-cli-transport.js';
import {CodexProfiles,profileAuthArgs} from './codex-profiles.js';
import {demoCliArguments} from './demo-workers.js';
import {cliEnvironment} from './cli-hello.js';

const apiBase='https://openrouter.ai/api/v1';
const zeroPrice=model=>Boolean(model?.pricing&&['prompt','completion'].every(k=>Object.hasOwn(model.pricing,k))&&Object.values(model.pricing).every(v=>['number','string'].includes(typeof v)&&String(v).trim()!==''&&Number(v)===0));
function allowance(data){
 const q=data?.data?.free_model_daily_requests;
 return q&&['used','limit','remaining'].every(k=>Number.isSafeInteger(q[k])&&q[k]>=0)?{used:q.used,limit:q.limit,remaining:q.remaining}:null;
}
export function visionUsage(usage){
 const keys=['prompt_tokens','completion_tokens','total_tokens','input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens','cost'];
 return Object.fromEntries(keys.filter(k=>Number.isFinite(usage?.[k])&&usage[k]>=0).map(k=>[k,usage[k]]));
}

// This separate request preserves the text-only Nemotron worker contract.
export async function readWithNemotron(team,{frames,prompt,schema,signal,call}){
 const settings=new NemotronWorker(team).settings();
 if(settings.base!==apiBase||!settings.key||!settings.free)throw Error('free_route_unavailable');
 const adapter=new ProviderAdapter(settings,{fetchImpl:(url,options)=>team.fetch(url,{...options,signal:AbortSignal.any([signal,options.signal])}),timeout:15000});
 const [catalog,accountModels,key]=await Promise.all(['/models','/models/user','/key'].map(route=>adapter.request(apiBase+route)));
 const publicModel=catalog.data?.find(m=>m.id===nemotronModel),accountModel=accountModels.data?.find(m=>m.id===nemotronModel),quotaBefore=allowance(key);
 if(!zeroPrice(publicModel)||!zeroPrice(accountModel)||!publicModel.architecture?.input_modalities?.includes('image')||!accountModel.architecture?.input_modalities?.includes('image')||!accountModel.supported_parameters?.includes('structured_outputs')||key.data?.is_free_tier!==true||!quotaBefore?.remaining){
  throw Object.assign(Error('free_vision_unavailable'),{quotaBefore});
 }
 const content=[{type:'text',text:prompt}];
 for(const frame of frames){
  const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'}[path.extname(frame).toLowerCase()];
  if(!mime)throw Error('unsupported_frame');
  content.push({type:'image_url',image_url:{url:'data:'+mime+';base64,'+fs.readFileSync(frame).toString('base64')}});
 }
 const body={model:nemotronModel,messages:[{role:'user',content}],stream:false,max_tokens:1024,reasoning:{enabled:false},response_format:{type:'json_schema',json_schema:{name:'mediaSpec',strict:true,schema}},provider:{allow_fallbacks:false,require_parameters:true,max_price:{prompt:0,completion:0,request:0}}};
 signal.throwIfAborted();adapter.timeout=60000;
 return call({quotaBefore},async()=>{
  let response,failure;
  try{response=await adapter.request(apiBase+'/chat/completions',body);}catch(error){failure=error;}
  let quotaAfter=null;
  if(!signal.aborted){
   adapter.timeout=15000;adapter.cooldownUntil=0;
   try{quotaAfter=allowance(await adapter.request(apiBase+'/key'));}catch{}
  }
  if(failure){failure.quotaAfter=quotaAfter;throw failure;}
  const choice=response.choices?.[0],usage=visionUsage(response.usage);
  if(response.model!==nemotronModel||choice?.finish_reason!=='stop'||typeof choice.message?.content!=='string'||(usage.cost!==undefined&&usage.cost!==0)){
   throw Object.assign(Error('invalid_vision_response'),{usage,quotaAfter,httpStatus:200});
  }
  return {reply:choice.message.content,usage,quotaAfter,httpStatus:200};
 });
}

export async function readWithCodex({frames,prompt,signal,call}){
 const profiles=new CodexProfiles(),profile=profiles.selection('codex-personal'),exe=new DemoCliTransport().executables.codex;
 const cwd=path.dirname(frames[0]);
 signal.throwIfAborted();
 if(!(await profiles.check(profile.id,exe,cwd)).ok)throw Error('personal_login_unavailable');
 const args=[...demoCliArguments('codex').slice(0,-1),...profileAuthArgs,'-c','windows.sandbox="mxc"',...frames.flatMap(f=>['--image',path.basename(f)]),'--',prompt];
 const env={...cliEnvironment(),CODEX_HOME:profile.home};
 signal.throwIfAborted();
 return call({},()=>captureCodexVision(exe,args,{cwd,env,signal}));
}

// Drain progress without collecting a transcript. Only one final message and
// its terminal usage receipt can become a saved spec.
export function captureCodexVision(exe,args,{cwd,env,signal}){
 return new Promise((resolve,reject)=>{
  const child=spawn(exe,args,{cwd,env,signal,timeout:90000,windowsHide:true,stdio:['ignore','pipe','ignore']});
  const decoder=new StringDecoder('utf8');
  let line='',oversize=false,invalid=false,reply,complete;
  const record=()=>{
   if(oversize){invalid=true;return;}
   if(!line.trim())return;
   try{
    const e=JSON.parse(line);
    if(e.type==='error'||e.type==='turn.failed'||e.item&&!['agent_message','reasoning'].includes(e.item.type))invalid=true;
    if(e.type==='item.completed'&&e.item?.type==='agent_message'){
     if(reply!==undefined||complete||typeof e.item.text!=='string'||Buffer.byteLength(e.item.text)>16384)invalid=true;
     else reply=e.item.text;
    }
    if(e.type==='turn.completed'){
     if(complete||reply===undefined)invalid=true;
     complete=e;
    }
   }catch{invalid=true;}
  };
  const consume=text=>{
   const parts=text.split('\n');
   for(let i=0;i<parts.length;i++){
    if(!oversize&&line.length+parts[i].length<=65536)line+=parts[i];
    else oversize=true;
    if(i<parts.length-1){record();line='';oversize=false;}
   }
  };
  child.stdout.on('data',chunk=>consume(decoder.write(chunk)));
  child.once('error',()=>{invalid=true;});
  child.once('close',code=>{
   consume(decoder.end());record();
   const usage=visionUsage(complete?.usage);
   if(code!==0||signal.aborted||invalid||!complete||typeof reply!=='string')reject(Object.assign(Error('invalid_vision_response'),{usage}));
   else resolve({reply,usage});
  });
 });
}
