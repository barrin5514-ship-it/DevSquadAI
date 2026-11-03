import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Run only the hub's own tests. A disposable project's unfinished tests belong
// to that project's separate runner and must never be discovered here.
const folder=new URL('../tests/',import.meta.url);
const files=fs.readdirSync(folder).filter(name=>name.endsWith('.test.js')).sort().map(name=>fileURLToPath(new URL(name,folder)));
// This existing offline pilot has four first-party safety tests. Include it
// explicitly, while still excluding disposable workspaces and generated code.
files.push(fileURLToPath(new URL('../pilot-prep/weekend-time-budget-helper/dry-run.test.mjs',import.meta.url)));
if(process.argv.includes('--list')){console.log(JSON.stringify({testFiles:files.length,scope:'tests/*.test.js plus the existing offline pilot dry-run',serial:true,heapMiB:128}));}
else{const result=spawnSync(process.execPath,['--max-old-space-size=128','--test','--test-concurrency=1',...files],{cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit',shell:false});process.exitCode=result.status??1;}
