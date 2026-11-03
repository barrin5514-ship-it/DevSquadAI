import fs from 'node:fs';
import { loadConfig } from './config/index.js';
import { createApp } from './app.js';
try {
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  const options={},supported={'--task-grant=':'taskGrantFile','--paid-review-grant=':'paidReviewGrantFile','--hello-grant=':'helloGrantFile'};
  for(const arg of process.argv.slice(2)){const prefix=Object.keys(supported).find(p=>arg.startsWith(p));if(!prefix||options[supported[prefix]]||!arg.slice(prefix.length))throw new Error('Unsupported startup option');options[supported[prefix]]=arg.slice(prefix.length);}
  const config = loadConfig(), { app, db } = createApp(config,options);
  const server = app.listen(config.port, config.host, () => { if(config.logLevel==='info') console.log(`Dev Squad AI listening on port ${config.port}`); });
  server.requestTimeout = config.timeout;
  server.on('error', () => { console.error('Server could not start'); db.close(); process.exitCode=1; });
  for(const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>server.close(()=>db.close()));
} catch { console.error('Startup failed. Check configuration and storage permissions.'); process.exitCode=1; }
