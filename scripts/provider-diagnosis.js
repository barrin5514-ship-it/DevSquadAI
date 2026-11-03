// Explicit owner-authorized evaluation runner. No persistent provider activation.
import fs from 'node:fs';import path from 'node:path';import {parseEnv} from 'node:util';import {loadConfig} from '../src/config/index.js';import {ProviderAdapter} from '../src/providers/adapter.js';import {EvaluationGrant} from '../src/services/evaluation-grant.js';
const env=parseEnv(fs.readFileSync('.env','utf8')),base=loadConfig(env),dir=path.resolve('data/provider-diagnosis-20261022');
const config={...base,evaluationOnly:true,database:path.join(dir,'evaluation.sqlite'),workspace:path.join(dir,'evaluation-workspaces'),backups:path.join(dir,'backups'),teamLiveEnabled:false,tokenLimit:1024};
const models=[['mistral','codestral-2508'],['gemini','gemini-3.8-flash'],['nvidia','nvidia/nemotron-3.5-super-vl-120b-a12b'],['groq','openai/gpt-oss-120b'],['openrouter','poolside/laguna-s-2.1:free']].map(([provider,model])=>({provider,model,confirmIncluded:true}));
const grant=new EvaluationGrant(config,{approvedBy:'owner',expiresAt:new Date(Date.now()+3600000).toISOString(),models});
if(fs.existsSync(path.join(dir,'scope-closed.json')))grant.models=[];
const ledgerFile=path.join(dir,'requests.json');const ledger=fs.existsSync(ledgerFile)?JSON.parse(fs.readFileSync(ledgerFile,'utf8')):[];
const secrets=base.ai.providers.map(p=>p.key).filter(Boolean);function save(){const s=JSON.stringify(ledger,null,2);if(secrets.some(k=>s.includes(k)))throw Error('Credential content blocked');fs.writeFileSync(ledgerFile,s+'\n');}
const definitions=new Map(base.ai.providers.map(p=>[p.id,p]));
const providerFor=url=>[...definitions.values()].find(p=>url.startsWith(p.base+'/'));
async function transport(url,options){const p=providerFor(url);if(!p)throw Error('Unrecognized provider endpoint');let row;
 if(options.method==='POST'){
  if(['deepseek','cerebras','cloudflare','huggingface'].includes(p.id))throw Error('Provider excluded from evaluation');
  const body=JSON.parse(options.body),model=body.model||(p.id==='gemini'?p.model:null),cap=body.max_tokens||body.max_completion_tokens||body.generationConfig?.maxOutputTokens;
  if(!models.some(m=>m.provider===p.id&&m.model===model)||!Number.isInteger(cap)||cap>1024||cap<1||ledger.length>=12||ledger.filter(x=>x.provider===p.id).length>=3)throw Error('Evaluation budget or model constraint');
  if(ledger.some(x=>x.provider===p.id&&[401,402,403,404].includes(x.httpStatus)))throw Error('Provider requires account action; further inference blocked');
  if(p.id==='openrouter'&&(!model.endsWith(':free')||body.provider?.allow_fallbacks!==false||Object.values(body.provider?.max_price||{}).some(x=>x!==0)))throw Error('Free route constraints missing');
  if(secrets.some(k=>options.body.includes(k)))throw Error('Credential-bearing prompt blocked');
  row={id:ledger.length+1,provider:p.id,model,requestedOutputCap:cap,startedAt:new Date().toISOString(),httpStatus:null,outcome:'started',headersMs:null,elapsedMs:null,usage:null};ledger.push(row);save();
 }
 const start=Date.now();try{const response=await fetch(url,options);if(row){row.httpStatus=response.status;row.headersMs=Date.now()-start;save();}return response;}catch(e){if(row){row.elapsedMs=Date.now()-start;row.outcome='transport_error';save();}throw e;}
}
export {base,config,grant,dir,ledger,save,transport,models};
export async function probe(id){const p=definitions.get(id),model=models.find(m=>m.provider===id)?.model;if(!p?.key||!model)throw Error('Provider not configured');const previousCount=ledger.length;const adapter=new ProviderAdapter({...p,model,evaluationAccess:()=>grant.allows(id,model),requiresVerification:true,verificationReason:()=>grant.allows(id,model)?null:'Evaluation scope exhausted',verifyBeforeGenerate:()=>{},reasoningEffort:id==='nvidia'?'none':undefined},{timeout:60000,tokenLimit:id==='groq'?128:128,fetchImpl:transport});let result=null,error=null;
 try{result=await adapter.generate('This is a disposable connection evaluation. Return a minimal response, no tools.',id==='gemini'?'Return JSON {"ready":"READY"}.':'Reply with the word READY.');}catch(e){error=e;}
 const row=ledger.length>previousCount?ledger.at(-1):null;if(row){row.elapsedMs=adapter.lastDiagnostics?.elapsedMs??row.elapsedMs;row.headersMs=adapter.lastDiagnostics?.headersMs??row.headersMs;row.httpStatus=adapter.lastDiagnostics?.httpStatus??row.httpStatus;row.outcome=result?'complete':error?.code||'failed';row.diagnostics=adapter.lastDiagnostics;row.finishReason=result?.finishReason||error?.finishReason||null;row.usage=result?.usage||error?.usage||null;row.complete=!!result;row.response=result?.text||null;save();}console.log(JSON.stringify(row||{provider:id,model,outcome:error?.code||'blocked',requestsSent:0},null,2));return result;}
if(process.argv[2]==='--authorized-probe')await probe(process.argv[3]);
