import { ApiError } from '../middleware/errors.js';
export const providerDefinitions = {
  cerebras: { base: 'https://api.cerebras.ai/v1', keyEnv: 'CEREBRAS_API_KEY' },
  groq: { base: 'https://api.groq.com/openai/v1', keyEnv: 'GROQ_API_KEY' },
  gemini: { base: 'https://generativelanguage.googleapis.com/v1beta', keyEnv: 'GEMINI_API_KEY' },
  openrouter: { base: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY' },
  mistral:{base:'https://api.mistral.ai/v1',keyEnv:'MISTRAL_API_KEY'},
  nvidia:{base:'https://integrate.api.nvidia.com/v1',keyEnv:'NVIDIA_API_KEY'},
  cloudflare:{base:'https://api.cloudflare.com/client/v4',keyEnv:'CLOUDFLARE_API_TOKEN'},
  huggingface: { base: 'https://router.huggingface.co/v1', keyEnv: 'HF_TOKEN' }
  ,deepseek: { base: 'https://api.deepseek.com', keyEnv: 'DEEPSEEK_API_KEY' }
};
export function aiConfig(env) {
  const price = key => {
    if (env[key] === undefined || env[key] === '') return null;
    const value = Number(env[key]);
    if (!Number.isFinite(value) || value < 0 || value > 100000) throw new Error(`Invalid configuration: ${key}`);
    return value;
  };
  const positive = (key, fallback, max) => {
    const n = Number(env[key] ?? fallback);
    if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`Invalid configuration: ${key}`);
    return n;
  };
  const providers = Object.entries(providerDefinitions).map(([id, definition]) => {
    const prefix = id.toUpperCase();
    const model = env[`${prefix}_MODEL`] || '';
    if (model && !/^[a-zA-Z0-9@._:/-]{1,200}$/.test(model)) throw new Error(`Invalid model configuration: ${id}`);
    const accountId=id==='cloudflare'?env.CLOUDFLARE_ACCOUNT_ID||'':null;if(accountId&&!/^[a-fA-F0-9]{32}$/.test(accountId))throw new Error('Invalid Cloudflare account configuration');
    const free = env[`${prefix}_FREE_CONFIRMED`] === 'true';
    // A free confirmation represents the operator's verified account/model choice, not a catalog claim.
    return { id, ...definition, accountId,requiresVerification:['gemini','mistral','nvidia','cloudflare'].includes(id),timeout:env[prefix+'_TIMEOUT_MS']?positive(prefix+'_TIMEOUT_MS',30000,300000):null, model, free, structured: env[`${prefix}_JSON_MODE`] === 'true',
      capabilities: (env[`${prefix}_CAPABILITIES`] || 'coding').split(','),
      quality: positive(`${prefix}_QUALITY`, 1, 5),
      maxInputBytes: positive(`${prefix}_MAX_INPUT_BYTES`, 12000, 24000),
      inputPrice: price(`${prefix}_INPUT_USD_PER_MILLION`),
      outputPrice: price(`${prefix}_OUTPUT_USD_PER_MILLION`),
      disabledReason:id==='cerebras'?'Cerebras has no renewing free API tier; trial/paid access disabled':id==='deepseek'?'Paid provider disabled; explicit per-request owner authorization required':null,
      key: env[definition.keyEnv] || '' };
  });
  return {
    paid:{enabled:env.DEEPSEEK_PAID_ENABLED==='true',requestLimit:price('DEEPSEEK_REQUEST_LIMIT_USD'),dailyLimit:price('DEEPSEEK_DAILY_LIMIT_USD'),totalLimit:price('DEEPSEEK_TOTAL_LIMIT_USD'),pricesVerifiedUntil:env.DEEPSEEK_PRICES_VERIFIED_UNTIL||''},
    providers, attempts: positive('AI_MAX_ATTEMPTS', 3, 5),
    requestBudget: positive('AI_REQUEST_BUDGET', 100, 100000),
    tokenBudget: positive('AI_TOKEN_RESERVATION_BUDGET', 1000000, 1000000000),
    lessonChars: positive('AI_LESSON_CHARS', 2000, 4000),
    reviewProvider:'deepseek'
  };
}
export class ProviderError extends ApiError {
  constructor(code) {
    const messages = { unavailable:'Provider is unavailable. Configure its API key and model locally.', paid_blocked:'Paid or unconfirmed access is disabled. Configure a verified free model and account.', rate_limit:'Provider rate limit reached. Try again later.', timeout:'Provider request timed out.', invalid_response:'Provider returned an invalid or incomplete response.', provider_error:'Provider request failed. Check account access and model configuration.' };
    super(code === 'paid_blocked' ? 403 : 503, messages[code] || messages.provider_error);
    this.code = code;
  }
}
