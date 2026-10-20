import { ProviderError } from './config.js';
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
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
    const reason = !this.#key || !this.model ? 'Missing API key or model' : !this.free ? 'Free access not confirmed; paid calls disabled' : this.id === 'openrouter' && !this.model.endsWith(':free') ? 'OpenRouter requires an explicit :free model' : this.cooldownUntil > Date.now() ? 'Rate-limit cooldown' : null;
    return { id:this.id, model:this.model || null, available:!reason, reason, liveVerified:false };
  }
  ensureAvailable() {
    if (!this.#key || !this.model) throw new ProviderError('unavailable');
    if (!this.free || (this.id==='openrouter' && !this.model.endsWith(':free'))) throw new ProviderError('paid_blocked');
    if (this.cooldownUntil>Date.now()) throw new ProviderError('rate_limit');
  }
  async request(url, body) {
    this.ensureAvailable();
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), this.timeout);
    try {
      const headers = { 'Content-Type':'application/json' };
      if (this.id==='gemini') headers['x-goog-api-key']=this.#key;
      else headers.Authorization=`Bearer ${this.#key}`;
      const response = await this.fetch(url,{method:body ? 'POST':'GET',headers,body:body ? JSON.stringify(body):undefined,signal:controller.signal,redirect:'error'});
      if (response.status===429) {
        await response.body?.cancel();
        const seconds=Number(response.headers.get('retry-after'));
        this.cooldownUntil=Date.now()+Math.min(3600000,Math.max(1000,Number.isFinite(seconds)&&seconds>0?seconds*1000:60000));
        throw new ProviderError('rate_limit');
      }
      if (!response.ok) { await response.body?.cancel(); throw new ProviderError('provider_error'); }
      // Bound the decoded body, including streamed/chunked responses.
      const reader=response.body.getReader(); let length=0; const chunks=[];
      while(true) { const {done,value}=await reader.read(); if(done)break; length+=value.length;
        if(length>512000){await reader.cancel();throw new ProviderError('invalid_response');}chunks.push(value); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch(error) {
      if(error instanceof ProviderError) throw error;
      throw new ProviderError(controller.signal.aborted?'timeout':error instanceof SyntaxError?'invalid_response':'provider_error');
    } finally { clearTimeout(timer); }
  }
  async check() {
    const url=this.id==='gemini'?`${this.base}/models/${encodeURIComponent(this.model.replace(/^models\//,''))}`: `${this.base}/models`;
    const result=await this.request(url);
    const found=this.id==='gemini'?result.name===`models/${this.model.replace(/^models\//,'')}` && result.supportedGenerationMethods?.includes('generateContent'):Array.isArray(result.data)&&result.data.some(m=>m.id===this.model);
    if(!found)throw new ProviderError('invalid_response');
    return {id:this.id,model:this.model,connectivity:'verified',generation:'not_tested'};
  }
  async generate(system, user) {
    this.ensureAvailable();
    let body, url;
    if(this.id==='gemini') {
      url=`${this.base}/models/${encodeURIComponent(this.model.replace(/^models\//,''))}:generateContent`;
      body={systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{maxOutputTokens:this.tokenLimit,responseMimeType:'application/json'}};
    } else {
      url=`${this.base}/chat/completions`;
      body={model:this.model,messages:[{role:'system',content:system},{role:'user',content:user}],stream:false};
      body[this.id==='groq'||this.id==='cerebras'?'max_completion_tokens':'max_tokens']=this.tokenLimit;
      if(this.structured)body.response_format={type:'json_object'};
      if(this.id==='openrouter')body.provider={allow_fallbacks:false};
    }
    const data=await this.request(url,body);
    if(!data||typeof data!=='object'||Array.isArray(data))throw new ProviderError('invalid_response');
    const usage=this.id==='gemini'?{input:count(data.usageMetadata?.promptTokenCount),output:count(data.usageMetadata?.candidatesTokenCount),total:count(data.usageMetadata?.totalTokenCount)}:{input:count(data.usage?.prompt_tokens),output:count(data.usage?.completion_tokens),total:count(data.usage?.total_tokens)};
    usage.source=Object.values(usage).some(v=>v!==null)?'provider_reported':'unknown';
    usage.estimatedCost = usage.input !== null && usage.output !== null && this.inputPrice !== null && this.outputPrice !== null
      ? (usage.input*this.inputPrice + usage.output*this.outputPrice)/1000000 : null;
    const parts=data.candidates?.[0]?.content?.parts;
    const text=this.id==='gemini'?(Array.isArray(parts)?parts.filter(p=>p&&!p.thought&&typeof p.text==='string').map(p=>p.text).join(''):null):data.choices?.[0]?.message?.content;
    const finish=this.id==='gemini'?data.candidates?.[0]?.finishReason:data.choices?.[0]?.finish_reason;
    let decoded=text;
    try { decoded=JSON.stringify(JSON.parse(text)); } catch { /* Draft validation reports malformed JSON. */ }
    if(typeof text!=='string'||!text.trim()||text.includes(this.#key)||decoded?.includes(this.#key)||!['stop','STOP'].includes(finish)) {
      const error=new ProviderError('invalid_response');error.usage=usage;throw error;
    }
    return {text,usage};
  }
}
