// This is a separate, one-attempt authorization. The earlier journal is retained.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {loadConfig} from '../src/config/index.js';
import {ProviderAdapter} from '../src/providers/adapter.js';
import {requestCapabilityReview} from '../src/services/capability-review.js';
const out='docs/verification/gemini-final-generation-20261107';
const prompt={system:'Return concise JSON only, matching the supplied schema. Explain code, identify a real invalid-input edge case, suggest a small improvement, return a corrected JavaScript calculateTotal function and exactly two meaningful test suggestions. Do not claim tests ran. Keep the answer short. Do not use tools or external services.',user:'Review this disposable example:\nfunction calculateTotal(prices) {\n  let total = 0;\n  for (let i = 0; i < prices.length; i++) { total += prices[i]; }\n  return total;\n}\nRequire an array of finite numbers and reject invalid inputs; return the corrected function in code, and two test suggestions.'};
const schema={type:'object',properties:{explanation:{type:'string'},edgeCase:{type:'string'},improvement:{type:'string'},code:{type:'string'},tests:{type:'array',items:{type:'string'},minItems:2,maxItems:2}},required:['explanation','edgeCase','improvement','code','tests'],additionalProperties:false};
const digest=value=>createHash('sha256').update(value).digest('hex');
function databaseSnapshot(file){const db=new DatabaseSync(file,{readOnly:true});try{return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,digest(JSON.stringify(db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all()))]));}finally{db.close();}}
if(!['--validate','--live'].includes(process.argv[2]))throw Error('Select local validation or the single explicitly authorized live attempt');
const live=process.argv[2]==='--live';let config,p,before;
if(live){process.loadEnvFile();config=loadConfig();p=config.ai.providers.find(p=>p.id==='gemini');if(!p?.key||p.model!=='gemini-3.8-flash'||p.base!=='https://generativelanguage.googleapis.com/v1beta'||!p.free||p.disabledReason)throw Error('STOP: model, official endpoint or existing owner-confirmed free configuration does not match');}
else p={id:'gemini',key:'FAKE_LOCAL_ONLY',model:'gemini-3.8-flash',base:'https://generativelanguage.googleapis.com/v1beta',free:true};
let attempts=0,remoteError=null,generated=null;
const sanitize=value=>String(value).replaceAll(p.key,'[REDACTED]').replace(/AIza[\w-]+/g,'[REDACTED]').replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]').slice(0,4000);
const adapter=new ProviderAdapter(p,{timeout:60000,tokenLimit:500,fetchImpl:async(url,options)=>{
 const body=JSON.parse(options.body);
 if(++attempts!==1||options.method!=='POST'||url!==p.base+'/models/gemini-3.8-flash:generateContent'||body.generationConfig.maxOutputTokens!==500||typeof body.systemInstruction.parts[0].text!=='string'||typeof body.contents[0].parts[0].text!=='string'||body.generationConfig.thinkingConfig.thinkingLevel!=='low'||options.redirect!=='error')throw Error('STOP: one-request contract violated');
 if(!live)return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({explanation:'Sums prices.',edgeCase:'Reject strings.',improvement:'Check finite numbers.',code:'function calculateTotal(prices) { return 0; }',tests:['valid array','invalid input']})}]}}],usageMetadata:{promptTokenCount:1,candidatesTokenCount:1,totalTokenCount:2}}),{status:200});
 const response=await fetch(url,options);
 if(!response.ok){const clone=response.clone(),reader=clone.body.getReader(),chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512000){await reader.cancel();break;}chunks.push(value);}try{const e=JSON.parse(Buffer.concat(chunks).toString('utf8')).error;remoteError=e?{code:e.code??null,status:sanitize(e.status||''),message:sanitize(e.message||'')}:null;}catch{remoteError={message:'Non-JSON error body; not retained'};}}
 return response;
}});
adapter.responseJsonSchema=schema;
adapter.verifyBeforeGenerate=async()=>{if(!p.free)throw Error('Free access confirmation absent');};
if(live){fs.mkdirSync(out,{recursive:true});before=databaseSnapshot(config.database);fs.writeFileSync(out+'/attempt.json',JSON.stringify({authorization:'FINAL GEMINI GENERATION VERIFICATION — exactly one additional request',attemptedAt:new Date().toISOString(),model:p.model,endpointHost:'generativelanguage.googleapis.com',maxOutputTokens:500,thinkingLevel:'low',timeoutMs:60000,retry:false,fallback:false,promptHash:digest(JSON.stringify(prompt)),accountFreeEvidence:'Existing owner confirmation and GEMINI_FREE_CONFIRMED; current numeric quota unavailable'},null,2),{flag:'wx'});}
const started=Date.now();let record;
try{const result=await requestCapabilityReview({generate:async(system,user)=>{generated=await adapter.generate(system,user);return generated;}},prompt);record={verdict:'PASS',model:p.model,httpStatus:result.diagnostics.httpStatus,elapsedMs:Date.now()-started,timeoutMs:60000,finishReason:result.finishReason,usage:result.usage,complete:true,structuredValid:true,review:result.review,costUSD:null,costEvidence:'Owner-confirmed free access; response is not a billing statement'};}
catch(e){record={verdict:'FAIL',model:p.model,httpStatus:e.httpStatus||adapter.lastDiagnostics?.httpStatus||null,elapsedMs:Date.now()-started,timeoutMs:60000,finishReason:e.finishReason||generated?.finishReason||null,usage:e.usage||generated?.usage||null,complete:!!generated,structuredValid:false,error:remoteError||{code:e.code||'local_validation',message:sanitize(e.message)},diagnostics:adapter.lastDiagnostics||null,partialFinalText:e.partialFinalText?sanitize(e.partialFinalText):generated?.text?sanitize(generated.text):null,costUSD:null};}
record.generationRequests=attempts;
if(live){const after=databaseSnapshot(config.database);record.databaseTablesCompared=Object.keys(before).length;record.databaseUnchanged=JSON.stringify(before)===JSON.stringify(after);fs.writeFileSync(out+'/result.json',JSON.stringify(record,null,2));}
console.log(JSON.stringify(live?{...record,review:undefined,partialFinalText:undefined}:{localValidation:record.verdict,mockedRequests:attempts,liveRequests:0,exactModel:p.model},null,2));
if(record.verdict!=='PASS')process.exitCode=1;
