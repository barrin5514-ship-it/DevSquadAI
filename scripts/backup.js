import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { loadConfig } from '../src/config/index.js';
import { backupDatabase } from '../src/database/index.js';
let db;
try { if(fs.existsSync('.env')) process.loadEnvFile('.env'); const c=loadConfig(); db=new DatabaseSync(c.database,{readOnly:true}); const target=await backupDatabase(db,c.backups); console.log(`Backup verified: ${target}`); }
catch { console.error('Backup failed. Check configuration and storage permissions.'); process.exitCode=1; }
finally { db?.close(); }
