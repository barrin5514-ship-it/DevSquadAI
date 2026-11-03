import path from 'node:path';
import {ApiError} from '../middleware/errors.js';

// Internal, memory-only consent for a disposable evaluation server. No HTTP route
// creates grants. This never changes free flags, account receipts or paid policy.
export class EvaluationGrant {
 constructor(config,{approvedBy,expiresAt,models,maxRequests=12,maxPerProvider=3,maxOutput=1024}){
  if(config.evaluationOnly!==true||path.basename(config.database)!=='evaluation.sqlite'||approvedBy!=='owner'||!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=Date.now()||Date.parse(expiresAt)>Date.now()+3600000)throw new ApiError(403,'Disposable owner evaluation scope required');
  const allowed={groq:['openai/gpt-oss-120b'],mistral:['codestral-2508'],gemini:['gemini-3.8-flash'],nvidia:['nvidia/nemotron-3.5-super-vl-120b-a12b'],openrouter:['poolside/laguna-s-2.1:free']};
  if(!Array.isArray(models)||!models.length||models.some(m=>!allowed[m.provider]?.includes(m.model)||m.confirmIncluded!==true)||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>12||!Number.isInteger(maxPerProvider)||maxPerProvider<1||maxPerProvider>3||!Number.isInteger(maxOutput)||maxOutput<1||maxOutput>1024)throw new ApiError(403,'Invalid bounded free evaluation consent');
  this.models=models.map(m=>({...m}));this.expiresAt=expiresAt;this.maxRequests=maxRequests;this.maxPerProvider=maxPerProvider;this.maxOutput=maxOutput;this.requests=0;this.counts={};
 }
 allows(provider,model){return Date.now()<Date.parse(this.expiresAt)&&this.models.some(m=>m.provider===provider&&m.model===model)&&this.requests<this.maxRequests&&(this.counts[provider]||0)<this.maxPerProvider&&!(provider==='openrouter'&&Date.now()>=Date.parse('2026-10-31'));}
 claim(provider,model,tokens){if(!this.allows(provider,model)||!Number.isInteger(tokens)||tokens<1||tokens>this.maxOutput)throw new ApiError(403,'Evaluation consent expired, exhausted or outside scope');this.requests++;this.counts[provider]=(this.counts[provider]||0)+1;}
}
