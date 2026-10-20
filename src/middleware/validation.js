import { ApiError } from './errors.js';
export function validate(body, fields, required = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !fields.includes(k))) throw new ApiError(400, 'Invalid request fields');
  for (const key of required) if (!(key in body)) throw new ApiError(400, `Missing ${key}`);
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string' || !value.trim() || value.length > (key === 'name' ? 200 : 10000)) throw new ApiError(400, `Invalid ${key}`);
    if (key === 'status' && !['active','paused','completed','archived'].includes(value)) throw new ApiError(400, 'Invalid status');
  }
  return body;
}
