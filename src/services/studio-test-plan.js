import fs from 'node:fs';
// A package script is a declaration, never permission to launch a shell.
// Only the installed Node runner has an approved isolated adapter today.
export function testPlan(repo){
 const files=repo.list(),tests=files.filter(p=>/\.test\.[cm]?js$/.test(p));let pkg={};
 if(files.includes('package.json')){try{if(fs.statSync(repo.resolve('package.json')).size>64000)throw Error();pkg=JSON.parse(fs.readFileSync(repo.resolve('package.json'),'utf8'));if(!pkg||Array.isArray(pkg)||typeof pkg!=='object')throw Error();}catch{return {blocked:'package.json is invalid; no test command was executed.'};}}
 const script=pkg.scripts?.test;
 if(script!==undefined){
  if(typeof script!=='string'||script.length>2000)return {blocked:'The test script is invalid; no command was executed.'};
  const words=script.trim().split(/\s+/);
  if(words[0]!=='node'||words[1]!=='--test')return {blocked:'This project requests a test framework or shell command without an approved isolated adapter. Jest/jsdom and dependencies are not installed automatically. Use compatible node:test tests or explicitly authorize a framework adapter.'};
  const flags=new Set(['--test-reporter=tap','--test-concurrency=1','--test-isolation=none']);
  const paths=words.slice(2).filter(w=>!flags.has(w));
  if(paths.some(p=>!tests.includes(p)))return {blocked:'The npm test script contains unsupported flags, patterns or paths; no shell or dependency installation was attempted.'};
  if(paths.length)tests.splice(0,tests.length,...new Set(paths));
 }
 if(!tests.length)return {blocked:'No supported JavaScript test files were supplied. No independent tests ran.'};
 return {framework:'node:test',source:script?'validated npm test script (direct Node, no npm lifecycle hooks)':'detected Node test files',tests,command:['--preserve-symlinks','--preserve-symlinks-main','--test','--test-reporter=tap','--test-isolation=none','--test-concurrency=1',...tests]};
}
