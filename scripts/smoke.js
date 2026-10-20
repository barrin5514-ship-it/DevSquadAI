import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config/index.js';
import { ProviderAdapter } from '../src/providers/adapter.js';
import { createApp } from '../src/app.js';
let runtime, root;
try {
  if (!process.argv.includes('--authorize-free')) throw new Error('Authorization flag required');
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  const config = loadConfig();
  const id = process.argv[2];
  const settings = config.ai.providers.find(p => p.id === id);
  if (!settings) throw new Error('Unknown provider');
  new ProviderAdapter(settings).ensureAvailable();
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-squad-smoke-'));
  runtime = createApp({ ...config, database:path.join(root,'data','smoke.sqlite'), workspace:path.join(root,'workspace'), backups:path.join(root,'backup'), tokenLimit:512, ai:{...config.ai, providers:[settings],attempts:1,requestBudget:1} });
  const project = runtime.service.create({name:'Isolated live smoke test'});
  const result = await runtime.ai.generate(project.id,{request:'Create one tiny JavaScript file exporting add(a,b). Return only the requested files JSON.'});
  console.log(JSON.stringify({provider:id,liveGeneration:'passed',draftId:result.draft.id,checks:result.draft.checks,usage:runtime.ai.usage.list({task:result.taskId}),storage:root},null,2));
} catch {
  console.error('Live smoke test did not pass. Confirm authorization, free account/model access, credentials, and configuration. No live success is claimed.');
  process.exitCode=1;
} finally { runtime?.db.close(); }
// Retain the isolated smoke database for inspection; never delete user data automatically.
