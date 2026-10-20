import { ApiError } from '../middleware/errors.js';
export const providerDefinitions = {
  cerebras: { base: 'https://api.cerebras.ai/v1', keyEnv: 'CEREBRAS_API_KEY' },
  groq: { base: 'https://api.groq.com/openai/v1', keyEnv: 'GROQ_API_KEY' },
  gemini: { base: 'https://generativelanguage.googleapis.com/v1beta', keyEnv: 'GEMINI_API_KEY' },
  openrouter: { base: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY' },
  huggingface: { base: 'https://router.huggingface.co/v1', keyEnv: 'HF_TOKEN' }
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
    if (model && !/^[a-zA-Z0-9._:/-]{1,200}$/.test(model)) throw new Error(`Invalid model configuration: ${id}`);
    const free = env[`${prefix}_FREE_CONFIRMED`] === 'true';
    // A free confirmation represents the operator's verified account/model choice, not a catalog claim.
    return { id, ...definition, model, free, structured: env[`${prefix}_JSON_MODE`] === 'true',
      capabilities: (env[`${prefix}_CAPABILITIES`] || 'coding').split(','),
      quality: positive(`${prefix}_QUALITY`, 1, 5),
      maxInputBytes: positive(`${prefix}_MAX_INPUT_BYTES`, 12000, 24000),
      inputPrice: price(`${prefix}_INPUT_USD_PER_MILLION`),
      outputPrice: price(`${prefix}_OUTPUT_USD_PER_MILLION`),
      key: env[definition.keyEnv] || '' };
  });
  return {
    providers, attempts: positive('AI_MAX_ATTEMPTS', 3, 5),
    requestBudget: positive('AI_REQUEST_BUDGET', 100, 100000),
    tokenBudget: positive('AI_TOKEN_RESERVATION_BUDGET', 1000000, 1000000000),
    lessonChars: positive('AI_LESSON_CHARS', 2000, 4000),
    allowCodexReview: env.ALLOW_CODEX_MANUAL_REVIEW === 'true'
  };
}
export class ProviderError extends ApiError {
  constructor(code) {
    const messages = { unavailable:'Provider is unavailable. Configure its API key and model locally.', paid_blocked:'Paid or unconfirmed access is disabled. Configure a verified free model and account.', rate_limit:'Provider rate limit reached. Try again later.', timeout:'Provider request timed out.', invalid_response:'Provider returned an invalid or incomplete response.', provider_error:'Provider request failed. Check account access and model configuration.' };
    super(code === 'paid_blocked' ? 403 : 503, messages[code] || messages.provider_error);
    this.code = code;
  }
}
