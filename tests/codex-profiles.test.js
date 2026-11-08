import {test} from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
import {CodexProfiles} from '../src/services/codex-profiles.js';
import {nativeFailure} from '../src/services/native-diagnostics.js';
test('dedicated profiles use distinct fresh homes and reject arbitrary paths; no inherited API credential',async()=>{
 const seen=[],profiles=new CodexProfiles({root:path.resolve('fake-private-home'),executeImpl:async(exe,args,options)=>{seen.push({exe,args,options});return {stdout:'Logged in using ChatGPT'};}});
 for(const id of ['codex-personal','codex-school'])assert.equal((await profiles.check(id,'fixed.exe',process.cwd())).ok,true);
 assert.notEqual(seen[0].options.env.CODEX_HOME,seen[1].options.env.CODEX_HOME);assert.equal(seen[0].options.env.OPENAI_API_KEY,undefined);assert.equal(seen[0].options.env.DEEPSEEK_API_KEY,undefined);assert.ok(seen[0].args.includes('cli_auth_credentials_store="file"'));assert.throws(()=>profiles.home('../personal'));assert.notEqual(profiles.selection('codex-personal'),profiles.selection('codex-personal'));
});
test('profile check rejects API-key authentication and hides private CLI failure text',async()=>{
 const p=new CodexProfiles({executeImpl:async()=>({stdout:'Logged in using an API key'})});assert.equal((await p.check('codex-personal','fixed.exe',process.cwd())).ok,false);
 p.execute=async()=>{throw Error('PRIVATE_TOKEN_OR_EMAIL');};assert.ok(!JSON.stringify(await p.check('codex-school','fixed.exe',process.cwd())).includes('PRIVATE'));
});
test('native errors become safe actionable categories, never raw credential/path text',()=>{
 for(const [text,code]of [['usage_limit_reached PRIVATE','usage_limit'],['authentication expired PRIVATE','auth_expired'],['certificate error PRIVATE','connection_error'],['setup refresh had errors PRIVATE','sandbox_error'],['invalid schema PRIVATE','schema_error'],['PRIVATE unknown exit','worker_error']]){const r=nativeFailure(text);assert.equal(r.code,code);assert.ok(!JSON.stringify(r).includes('PRIVATE'));}
});

test('DeepSeek silent output records unknown usage but is locally terminated and handoff-eligible',async()=>{const {StudioWorkers}=await import('../src/services/studio-workers.js');let calls=0,record;const adapter={fetch:(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true})),async generateStudio(){calls++;return this.fetch('FIXTURE ONLY',{signal:new AbortController().signal});}};const team={safe(){},config:{},paid:{settings:{key:'FAKE_LOCAL_FIXTURE',base:'https://api.deepseek.com',model:'fixture-model'},adapter:()=>adapter}};const workers=new StudioWorkers(team,{idleMs:15});await assert.rejects(()=>workers.call('deepseek',{},process.cwd(),new AbortController().signal,{usage:{start(){},record(...args){record=args;}}}),e=>e.code==='inactivity_timeout'&&e.unknownOutcome===false&&e.stopped===true);assert.equal(calls,1);assert.equal(record.at(-1),'unknown');});
