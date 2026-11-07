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
  config.studioTimeouts={tests:integer('STUDIO_TEST_TIMEOUT_MS',60000,1200000),deepseek:integer('STUDIO_DEEPSEEK_TIMEOUT_MS',90000,1200000),'codex-personal':integer('STUDIO_CODEX_TIMEOUT_MS',300000,1200000),'codex-school':integer('STUDIO_CODEX_TIMEOUT_MS',300000,1200000),'claude-code':integer('STUDIO_CLAUDE_TIMEOUT_MS',300000,1200000)};
  const thresholds=['MODEL_USAGE_NOTICE_PERCENT','MODEL_USAGE_WARNING_PERCENT','MODEL_USAGE_CRITICAL_PERCENT'].map((key,i)=>integer(key,[70,85,95][i],99));if(!(thresholds[0]<thresholds[1]&&thresholds[1]<thresholds[2]))throw Error('Model usage warning thresholds must increase below 100');
  config.modelHealth={thresholds,maxAge:integer('MODEL_HEALTH_MAX_AGE_MS',300000,86400000)};
  config.teamLiveEnabled = env.TEAM_LIVE_ENABLED === 'true';
  config.teamFocus = env.TEAM_FOCUS === 'big_three' ? 'big_three' : 'legacy';
  // This token is for one fixed read-only handoff endpoint, not code pushes.
  config.handoff = {token:env.GITHUB_HANDOFF_TOKEN||'',readOnlyConfirmed:env.GITHUB_HANDOFF_READONLY_CONFIRMED==='true'};
  return Object.freeze(config);
}
