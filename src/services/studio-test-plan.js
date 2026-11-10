import fs from 'node:fs';
import path from 'node:path';

export const packageConfigError='ERR_INVALID_PACKAGE_CONFIG';
export const ownerTestCommand='npm test';
export const isPackageConfigError=text=>/(?:\bcode:\s*['"]ERR_INVALID_PACKAGE_CONFIG['"]|Error \[ERR_INVALID_PACKAGE_CONFIG\])/.test(text);

// Keep a project-relative filename separate from the raw, path-redacted TAP output.
export function packageConfigFailure(repo,stdout,stderr){
 const output=stdout+'\n'+stderr;
 if(!isPackageConfigError(output))return null;
 const match=/(Cannot read|Invalid) package config ([^\r\n]*?package\.json)(?:: ([^'\r\n]+))?/i.exec(output);
 const file=match?.[2].replace(/\\\\/g,'\\').replace(/^\\\\\?\\/,'');
 const relative=file&&path.isAbsolute(file)?path.relative(repo.root,file).split(path.sep).join('/'):null;
 const inside=relative&&repo.list().includes(relative)?relative:null;
 const detail=match?.[3]?.trim()||(match?.[1]==='Invalid'?'Node reported an invalid package configuration.':'Node could not read the package configuration.');
 return {code:packageConfigError,path:inside,detail:detail.slice(0,180)};
}
// Only a saved owner setting selects npm. Discovery uses the direct Node adapter.
export function configuredTestScript(repo){
 try{
  const script=JSON.parse(repo.read('package.json',64000).toString('utf8')).scripts?.test;
  return typeof script==='string'&&script.trim()&&script.length<=2000?script:null;
 }catch{return null;}
}
export function testPlan(repo,{testFiles=null,testCommand=null}={}){
 if(testCommand!==null&&testCommand!==ownerTestCommand)return {blocked:'Unsupported owner test command. Select npm test or use Node test discovery.'};
 const files=repo.list(),tests=files.filter(p=>/\.test\.[cm]?js$/.test(p));let pkg={};
 if(files.includes('package.json')){try{if(fs.statSync(repo.resolve('package.json')).size>64000)throw Error();pkg=JSON.parse(fs.readFileSync(repo.resolve('package.json'),'utf8'));if(!pkg||Array.isArray(pkg)||typeof pkg!=='object')throw Error();}catch{const detail='Expected a valid JSON object no larger than 64 KB.';return {blocked:'package.json is invalid. '+detail,packageConfigFailure:{code:packageConfigError,path:'package.json',detail}};}}
 const script=pkg.scripts?.test;
 const npm=testCommand===ownerTestCommand;
 if(npm&&(typeof script!=='string'||!script.trim()||script.length>2000))return {blocked:'The owner selected npm test, but package.json has no valid test script.'};
 if(!npm&&script!==undefined){
  if(typeof script!=='string'||script.length>2000)return {blocked:'The test script is invalid; no command was executed.'};
  const words=script.trim().split(/\s+/);
  if(words[0]!=='node'||words[1]!=='--test')return {blocked:'This project requests a test framework or shell command without an approved isolated adapter. Jest/jsdom and dependencies are not installed automatically. Use compatible node:test tests or explicitly authorize a framework adapter.'};
  const flags=new Set(['--test-reporter=tap','--test-concurrency=1','--test-isolation=none']);
  const paths=words.slice(2).filter(w=>!flags.has(w));
  if(paths.some(p=>!tests.includes(p)))return {blocked:'The npm test script contains unsupported flags, patterns or paths; no shell or dependency installation was attempted.'};
  if(paths.length)tests.splice(0,tests.length,...new Set(paths));
 }
 if(testFiles){if(!Array.isArray(testFiles)||!testFiles.length||testFiles.some(p=>!tests.includes(p)))return {blocked:'The independent Tester files are missing or excluded by the declared test command.'};tests.splice(0,tests.length,...new Set(testFiles));}
 if(npm&&!testFiles)return {npm:{manifest:pkg},source:'owner-configured npm test',tests:[]};
 if(!tests.length)return {blocked:'No supported JavaScript test files were supplied. No independent tests ran.'};
 return {framework:'node:test',source:npm?'independent Tester files':script?'validated npm test script (direct Node, no npm lifecycle hooks)':'detected Node test files',...(npm?{npm:{manifest:pkg}}:{}),tests,command:['--preserve-symlinks','--preserve-symlinks-main','--test','--test-reporter=tap','--test-isolation=none','--test-concurrency=1',...tests]};
}
