import path from 'node:path';
import { aiConfig } from '../providers/config.js';
export function loadConfig(env = process.env) {
  const required = key => { if (!env[key]?.trim()) throw new Error(`Missing configuration: ${key}`); return env[key].trim(); };
  const integer = (key, fallback, max) => { const n = Number(env[key] ?? fallback); if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`Invalid configuration: ${key}`); return n; };
  const config = { port: integer('PORT', 3000, 65535), host: env.HOST || '127.0.0.1', database: path.resolve(required('DATABASE_PATH')), workspace: path.resolve(required('WORKSPACE_DIR')), backups: path.resolve(required('BACKUP_DIR')), provider: env.AI_PROVIDER || 'none', model: env.AI_MODEL || 'none', apiKeyEnv: env.AI_API_KEY_ENV || 'DEV_SQUAD_AI_KEY', timeout: integer('REQUEST_TIMEOUT_MS', 30000, 300000), tokenLimit: integer('TOKEN_LIMIT', 4096, 1000000), logLevel: env.LOG_LEVEL || 'info' };
  if (!/^[A-Z_][A-Z0-9_]*$/.test(config.apiKeyEnv) || !['silent','error','info'].includes(config.logLevel)) throw new Error('Invalid configuration');
  const inside = (root, item) => { const r = path.relative(root, item); return !r || (!r.startsWith('..') && !path.isAbsolute(r)); };
  if (inside(config.workspace, config.database) || inside(config.workspace, config.backups) || inside(config.backups, config.database)) throw new Error('Database, workspace and backup storage must be separate');
  config.ai = aiConfig(env);
  return Object.freeze(config);
}
