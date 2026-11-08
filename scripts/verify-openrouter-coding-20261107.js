// Exactly one approved HTTP generation request. No SDK, retry or fallback loop.
import fs from 'node:fs';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
import {ProviderAdapter} from '../src/providers/adapter.js';import {loadConfig} from '../src/config/index.js';
const out='docs/verification/openrouter-coding-live-20261107',source='docs/verification/openrouter-coding-preparation-20261107';
const proposal=JSON.parse(fs.readFileSync(source+'/inactive-proposed-request.json','utf8')),evidence=JSON.parse(fs.readFileSync(source+'/catalog-account-check.json','utf8'));
const live=process.argv[2]==='--live';if(!live&&process.argv[2]!=='--validate')throw Error('Select --validate or the one authorized --live request');
const model='cohere/north-mini-code:free',eligible=evidence.candidates.find(c=>c.id===model);
if(!eligible?.eligible||!eligible.public.allReportedPricesZero||!eligible.account.allReportedPricesZero||proposal.body.model!==model||proposal.body.max_tokens!==500||proposal.timeoutMs!==60000)throw Error('STOP: prepared zero-price/model/limit evidence mismatch');
let config,p;if(live){process.loadEnvFile('.env');config=loadConfig();p=config.ai.providers.find(p=>p.id==='openrouter');if(!p?.key||!p.free||p.base!=='https://openrouter.ai/api/v1')throw Error('STOP: saved free account configuration mismatch');}else p={id:'openrouter',key:'FAKE_TEST_ONLY',free:true,base:'https://openrouter.ai/api/v1'};
const hash=s=>createHash('sha256').update(s).digest('hex');
function snapshot(){const db=new DatabaseSync(config.database,{readOnly:true});try{return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,hash(JSON.stringify(db.prepare('SELECT * FROM "'+name+'"').all()))]));}finally{db.close();}}
let calls=0,metadata=null,error=null;
const clean=v=>String(v).replaceAll(p.key,'[REDACTED]').replace(/https?:\/\/\S+/g,'[LINK REDACTED]').replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]').slice(0,4000);
const adapter=new ProviderAdapter({...p,model,structured:false,inputPrice:0,outputPrice:0},{timeout:60000,tokenLimit:500,fetchImpl:async(url,options)=>{
 if(++calls!==1||url!==proposal.endpoint||options.method!=='POST'||options.redirect!=='error'||JSON.stringify(JSON.parse(options.body))!==JSON.stringify(proposal.body))throw Error('STOP: approved request contract changed');
 const response=live?await fetch(url,options):new Response(JSON.stringify({model,choices:[{finish_reason:'stop',message:{content:JSON.stringify({explanation:'Sums array values.',edgeCase:'Strings can concatenate.',code:'function calculateTotal(prices) { if (!Array.isArray(prices) || prices.some(p => !Number.isFinite(p))) throw new TypeError(); return prices.reduce((s,p) => s+p, 0); }',tests:['[1,2] returns 3','[1,"2"] throws']})}}],usage:{prompt_tokens:10,completion_tokens:20,total_tokens:30,cost:0}}),{status:200});
 const reader=response.clone().body.getReader(),chunks=[];let bytes=0;while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>512000){await reader.cancel();throw Error('Response exceeds safe diagnostic bound');}chunks.push(value);}
 let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{data={};}
 metadata={httpStatus:response.status,reportedModel:typeof data.model==='string'&&/^[\w/.: -]{1,200}$/.test(data.model)?data.model:null,reportedCostUSD:typeof data.usage?.cost==='number'&&Number.isFinite(data.usage.cost)?data.usage.cost:null,retryAfter:response.headers.get('retry-after')};
 if(data.error)error={code:typeof data.error.code==='number'?data.error.code:null,message:clean(data.error.message||'Provider returned an error')};
 return response;
}});
let before;if(live){fs.mkdirSync(out,{recursive:true});before=snapshot();fs.writeFileSync(out+'/attempt.json',JSON.stringify({authorizedBy:'Owner: ONE live OpenRouter calculateTotal test',startedAt:new Date().toISOString(),model,requestHash:hash(JSON.stringify(proposal.body)),timeoutMs:60000,maxOutputTokens:500,noRetries:true,noFallback:true,maxHTTPGenerationRequests:1},null,2),{flag:'wx'});}
const start=Date.now();let record;
try{const result=await adapter.generate(proposal.body.messages[0].content,proposal.body.messages[1].content);let review=null;try{review=JSON.parse(result.text);}catch{}
 const structured=review&&Object.keys(review).sort().join(',')==='code,edgeCase,explanation,tests'&&['explanation','edgeCase','code'].every(k=>typeof review[k]==='string'&&review[k].trim())&&Array.isArray(review.tests)&&review.tests.length===2&&review.tests.every(t=>typeof t==='string'&&t.trim());
 record={verdict:structured?'PASS':'FAIL',model,...metadata,elapsedMs:Date.now()-start,timeoutMs:60000,finishReason:result.finishReason,usage:result.usage,complete:true,structuredValid:!!structured,response:result.text,review:structured?review:null};
}catch(e){record={verdict:'FAIL',model,...metadata,httpStatus:metadata?.httpStatus||e.httpStatus||null,elapsedMs:Date.now()-start,timeoutMs:60000,finishReason:e.finishReason||null,usage:e.usage||null,complete:false,structuredValid:false,error:error||{code:e.code||'local_or_transport_failure',message:clean(e.message)},partialFinalText:e.partialFinalText||null,diagnostics:adapter.lastDiagnostics||null};}
record.generationRequests=calls;if(live){record.databaseTablesCompared=Object.keys(before).length;record.databaseUnchanged=JSON.stringify(before)===JSON.stringify(snapshot());fs.writeFileSync(out+'/result.json',JSON.stringify(record,null,2));}
console.log(JSON.stringify({...record,response:undefined,review:undefined,partialFinalText:undefined,liveGenerationRequests:live?calls:0,mockedRequests:live?0:calls},null,2));if(record.verdict!=='PASS')process.exitCode=1;
