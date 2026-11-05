import {deepseekStream} from './deepseek-stream.js';
import { ProviderError } from './config.js';
import { classifyProviderFailure } from './diagnostics.js';
import {createHash} from 'node:crypto';
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const finishReasons=new Set(['stop','length','tool_calls','function_call','content_filter','STOP','MAX_TOKENS','SAFETY','RECITATION','LANGUAGE','OTHER','BLOCKLIST','PROHIBITED_CONTENT','SPII','MALFORMED_FUNCTION_CALL','IMAGE_SAFETY','UNEXPECTED_TOOL_CALL','TOO_MANY_TOOL_CALLS']);
export class ProviderAdapter {
  #key;
  constructor(settings, { fetchImpl = fetch, timeout = 30000, tokenLimit = 4096 } = {}) {
    const { key, ...safe } = settings;
    Object.assign(this, safe);
    this.#key = key;
    this.fetch = fetchImpl;
    this.timeout = timeout;
    this.tokenLimit = tokenLimit;
    this.cooldownUntil = 0;
  }
  availability() {
    const reason = this.disabledReason || (this.requiresVerification?(this.verificationReason?.()||(!this.verifyBeforeGenerate?'Owner/free-account verification required':null)):null) || (!this.#key || !this.model ? 'Missing API key or model' : !this.free&&!this.evaluationAccess?.() ? 'Free access not confirmed; paid calls disabled' : this.id === 'openrouter' && !this.model.endsWith(':free') ? 'OpenRouter requires an explicit :free model' : this.cooldownUntil > Date.now() ? 'Rate-limit cooldown' : null);
    return { id:this.id, model:this.model || null, available:!reason, reason, liveVerified:false };
  }
  ensureAvailable() {
    if(this.requiresVerification&&(this.verificationReason?.()||!this.verifyBeforeGenerate))throw new ProviderError('paid_blocked');
    if(this.disabledReason)throw new ProviderError('paid_blocked');
    if (!this.#key || !this.model) throw new ProviderError('unavailable');
    if ((!this.free&&!this.evaluationAccess?.()) || (this.id==='openrouter' && !this.model.endsWith(':free'))) throw new ProviderError('paid_blocked');
    if (this.cooldownUntil>Date.now()) throw new ProviderError('rate_limit');
  }
  async request(url, body) {
    this.ensureAvailable();
    const started=Date.now(),diagnostic={httpStatus:null,headersMs:null,elapsedMs:null,phase:'awaiting_headers',errorKind:null,retryAfter:null};
    this.lastDiagnostics=diagnostic;
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), this.timeout);
    try {
      const headers = { 'Content-Type':'application/json' };
      if (this.id==='gemini') headers['x-goog-api-key']=this.#key;
      else headers.Authorization=`Bearer ${this.#key}`;
      const response = await this.fetch(url,{method:body ? 'POST':'GET',headers,body:body ? JSON.stringify(body):undefined,signal:controller.signal,redirect:'error'});
      diagnostic.httpStatus=response.status;diagnostic.headersMs=Date.now()-started;diagnostic.phase='reading_body';
      const retryHeader=response.headers.get('retry-after');
      diagnostic.retryAfter=retryHeader&&/^(?:\d{1,8}|[A-Za-z]{3}, [\d A-Za-z:]{10,40} GMT)$/.test(retryHeader)?retryHeader:null;
      if (response.status===429) {
        await response.body?.cancel();
        const retry=response.headers.get('retry-after'),seconds=Number(retry),date=Date.parse(retry);
        const wait=Number.isFinite(seconds)&&seconds>0?seconds*1000:Number.isFinite(date)?Math.max(1000,date-Date.now()):60000;
        this.cooldownUntil=Date.now()+Math.min(Number.MAX_SAFE_INTEGER-Date.now(),Math.max(1000,wait));
        const error=new ProviderError('rate_limit');error.retryAt=this.cooldownUntil;error.httpStatus=429;throw error;
      }
      // Bound the decoded body, including streamed/chunked responses.
      const maxBodyBytes=!body&&this.id==='openrouter'&&[this.base+'/models',this.base+'/models/user'].includes(url)?8000000:512000;
      const reader=response.body.getReader(); let length=0; const chunks=[];const stream=response.ok&&this.id==='deepseek'&&body?.stream===true?deepseekStream(this.onStreamProgress):null;
      while(true) { const {done,value}=await reader.read(); if(done)break; length+=value.length;
        if(length>maxBodyBytes){await reader.cancel();throw new ProviderError('invalid_response');}if(stream)stream.write(value);else chunks.push(value); }
      let data;try{data=stream?stream.end():JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch(error){if(response.ok)throw error;data={};}
      if(!response.ok){diagnostic.errorKind=classifyProviderFailure(response.status,data);const error=new ProviderError('provider_error');error.httpStatus=response.status;const retry=response.headers.get('retry-after');if(response.status===503&&retry){const n=Number(retry),date=Date.parse(retry);const wait=Number.isFinite(n)&&n>0?n*1000:Number.isFinite(date)?Math.max(1000,date-Date.now()):0;if(wait)error.retryAt=Date.now()+Math.min(wait,3600000);}throw error;}
      diagnostic.phase='complete';return data;
    } catch(error) {
      const failure=error instanceof ProviderError?error:new ProviderError(controller.signal.aborted?'timeout':error instanceof SyntaxError?'invalid_response':'provider_error');
      if(diagnostic.httpStatus&&!failure.httpStatus)failure.httpStatus=diagnostic.httpStatus;
      diagnostic.errorKind=diagnostic.errorKind||failure.code;failure.diagnostics=diagnostic;throw failure;
    } finally { diagnostic.elapsedMs=Date.now()-started;clearTimeout(timer); }
  }
  async check() {
    const url=this.id==='cloudflare'?this.base+'/accounts/'+this.accountId+'/ai/models/search?search='+encodeURIComponent(this.model):this.id==='gemini'?`${this.base}/models/${encodeURIComponent(this.model.replace(/^models\//,''))}`: `${this.base}/models`;
    const result=await this.request(url);
    const found=this.id==='cloudflare'?Array.isArray(result.result)&&result.result.some(m=>m.id===this.model||m.name===this.model):this.id==='gemini'?result.name===`models/${this.model.replace(/^models\//,'')}` && result.supportedGenerationMethods?.includes('generateContent'):Array.isArray(result.data)&&result.data.some(m=>m.id===this.model);
    if(!found)throw new ProviderError('invalid_response');
    return {id:this.id,model:this.model,connectivity:'verified',generation:'not_tested'};
  }
  async generate(system, user) {
    this.ensureAvailable();
    if(this.verifyBeforeGenerate)await this.verifyBeforeGenerate();
    let body, url;
    if(this.id==='gemini') {
      url=`${this.base}/models/${encodeURIComponent(this.model.replace(/^models\//,''))}:generateContent`;
      body={systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{maxOutputTokens:this.tokenLimit,responseMimeType:'application/json'}};
      // 3.8 shares its output cap with reasoning. It supports low/medium/high,
      // not thinking-off/minimal or the numeric budget used by 2.5 models.
      if(this.model.replace(/^models\//,'')==='gemini-3.8-flash') {
        const level=this.thinkingLevel??'low';
        if(!['low','medium','high'].includes(level))throw new ProviderError('invalid_response');
        body.generationConfig.thinkingConfig={thinkingLevel:level};
      }
      if(this.responseJsonSchema)body.generationConfig.responseJsonSchema=this.responseJsonSchema;
    } else {
      url=this.id==='cloudflare'?this.base+'/accounts/'+this.accountId+'/ai/v1/chat/completions':this.base+'/chat/completions';
      body={model:this.model,messages:[{role:'system',content:system},{role:'user',content:user}],stream:false};
      body[this.id==='groq'||this.id==='cerebras'?'max_completion_tokens':'max_tokens']=this.tokenLimit;
      if(this.id==='nvidia'&&this.model==='nvidia/nemotron-3.5-super-vl-120b-a12b'&&this.reasoningEffort!==undefined){
        if(!['none','low','high'].includes(this.reasoningEffort))throw new ProviderError('invalid_response');
        body.reasoning_effort=this.reasoningEffort;
      }
      if(this.id==='cloudflare')body.options={rejectIfBusy:true};
      if(this.structured)body.response_format={type:'json_object'};
      if(this.id==='openrouter')body.provider={allow_fallbacks:false,max_price:{prompt:0,completion:0,request:0}};
    }
    const data=await this.request(url,body);
    return this.parseGeneration(data);
  }
  // Only the owner-scoped paid review path supplies an immutable complete body.
  // Hash the same JSON serialization that request() sends; never rebuild messages.
  async generateBound(body,expectedHash) {
    if(this.id!=='deepseek'||this.base!=='https://api.deepseek.com'||body.model!==this.model||body.max_tokens!==this.tokenLimit||!(body.stream===false||body.stream===true&&body.stream_options?.include_usage===true)||body.thinking?.type!=='disabled'||body.response_format?.type!=='json_object'||createHash('sha256').update(JSON.stringify(body)).digest('hex')!==expectedHash)throw new ProviderError('paid_blocked');
    const data=await this.request(this.base+'/chat/completions',body);
    if(data.model!==undefined&&data.model!==this.model)throw new ProviderError('invalid_response');
    return this.parseGeneration(data);
  }
  parseGeneration(data) {
    if(!data||typeof data!=='object'||Array.isArray(data))throw new ProviderError('invalid_response');
    const usage=this.id==='gemini'?{input:count(data.usageMetadata?.promptTokenCount),output:count(data.usageMetadata?.candidatesTokenCount)===null?null:count(data.usageMetadata.candidatesTokenCount)+(count(data.usageMetadata?.thoughtsTokenCount)||0),total:count(data.usageMetadata?.totalTokenCount)}:{input:count(data.usage?.prompt_tokens),output:count(data.usage?.completion_tokens),total:count(data.usage?.total_tokens)};
    usage.source=Object.values(usage).some(v=>v!==null)?'provider_reported':'unknown';
    usage.reasoning=count(data.usage?.completion_tokens_details?.reasoning_tokens)??count(data.usage?.reasoning_tokens)??count(data.usageMetadata?.thoughtsTokenCount);
    usage.estimatedCost = usage.input !== null && usage.output !== null && Number.isFinite(this.inputPrice) && Number.isFinite(this.outputPrice)
      ? (usage.input*this.inputPrice + usage.output*this.outputPrice)/1000000 : null;
    const parts=data.candidates?.[0]?.content?.parts;
    const text=this.id==='gemini'?(Array.isArray(parts)?parts.filter(p=>p&&!p.thought&&typeof p.text==='string').map(p=>p.text).join(''):null):data.choices?.[0]?.message?.content;
    const finish=this.id==='gemini'?data.candidates?.[0]?.finishReason:data.choices?.[0]?.finish_reason;
    let decoded=text;
    try { decoded=JSON.stringify(JSON.parse(text)); } catch { /* Draft validation reports malformed JSON. */ }
    // Inspect escaped JSON strings as well as literal text before retaining any
    // diagnostic preview. Never retain thought parts or raw provider envelopes.
    const unescaped=typeof text==='string'?text.replace(/\\u([0-9a-f]{4})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))):null;
    const unsafe=typeof text==='string'&&(text.includes(this.#key)||decoded?.includes(this.#key)||unescaped.includes(this.#key));
    if(typeof text!=='string'||!text.trim()||unsafe||!['stop','STOP'].includes(finish)) {
      const error=new ProviderError('invalid_response');error.usage=usage;error.finishReason=finishReasons.has(finish)?finish:null;error.diagnostics=this.lastDiagnostics;
      error.httpStatus=this.lastDiagnostics?.httpStatus??null;
      error.complete=false;
      if(error.diagnostics)error.diagnostics.errorKind='invalid_response';
      // Explicitly diagnostic only: no `text` result, and no draft is returned.
      error.partialFinalText=!unsafe&&typeof text==='string'?text.slice(0,4096):null;
      error.partialFinalTextTruncated=!unsafe&&typeof text==='string'&&text.length>4096;
      throw error;
    }
    return {text,usage,finishReason:finish,diagnostics:this.lastDiagnostics};
  }
}
