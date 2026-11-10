import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {ProjectFiles} from '../src/services/project-files.js';
import {StudioWorkers} from '../src/services/studio-workers.js';

function fixture(t){
 const data=fileURLToPath(new URL('../data/',import.meta.url));
 fs.mkdirSync(data,{recursive:true});
 const root=fs.realpathSync(fs.mkdtempSync(path.join(data,'owner-test-command-')));
 t.after(()=>{
  assert.equal(path.dirname(fs.realpathSync(root)),fs.realpathSync(data));
  fs.rmSync(root,{recursive:true,force:true});
 });
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({
  scripts:{pretest:'node should-not-run.cjs',test:'node suite.cjs',posttest:'node should-not-run.cjs'},
  dependencies:{'installed-fixture':'1.0.0'}
 }));
 fs.writeFileSync(path.join(root,'should-not-run.cjs'),"console.error('UNAUTHORIZED LIFECYCLE HOOK'); process.exit(99);");
 fs.writeFileSync(path.join(root,'independent.test.cjs'),"require('node:test')('independent check',()=>require('node:assert/strict').equal(require('installed-fixture'),42));");
 const dependency=path.join(root,'node_modules','installed-fixture');
 const install=()=>{
  fs.mkdirSync(dependency,{recursive:true});
  fs.writeFileSync(path.join(dependency,'package.json'),'{"name":"installed-fixture","version":"1.0.0","main":"index.cjs"}');
  fs.writeFileSync(path.join(dependency,'index.cjs'),'module.exports=42;');
 };
 const workers=new StudioWorkers({config:{studioTimeouts:{tests:20000}}});
 const events=[];
 return {root,dependency,install,events,run:(testCommand='npm test')=>workers.tests(root,new AbortController().signal,e=>events.push(e),{testCommand,testFiles:['independent.test.cjs']})};
}

test('owner command rejects added shell syntax before any runner launch',async t=>{
 const f=fixture(t);
 const result=await f.run('npm test && echo unapproved');
 assert.equal(result.status,'blocked');
 assert.match(result.summary,/unsupported owner test command/i);
 assert.deepEqual(f.events,[]);
});

test('owner npm command blocks missing dependencies and directory links without launching',async t=>{
 const f=fixture(t);
 const missing=await f.run();
 assert.equal(missing.status,'blocked');
 assert.match(missing.summary,/installed dependency.*installed-fixture/i);
 assert.deepEqual(f.events,[]);
 fs.mkdirSync(path.dirname(f.dependency));
 fs.symlinkSync(f.root,f.dependency,process.platform==='win32'?'junction':'dir');
 const link=await f.run();
 assert.equal(link.status,'blocked');
 assert.match(link.summary,/links/i);
 assert.deepEqual(f.events,[]);
});

test('real Windows MXC executes npm test with installed dependencies, then requires the independent tests', {skip:process.platform!=='win32',timeout:90000},async t=>{
 const f=fixture(t);
 f.install();
 fs.writeFileSync(path.join(f.root,'suite.cjs'),"require('node:assert/strict').equal(require('installed-fixture'), 99, 'deliberately failing fixture assertion');");
 const failed=await f.run();
 assert.equal(failed.passed,false);
 assert.equal(failed.status,'failed',failed.summary);
 assert.equal(failed.projectSuite.exitCode,1,JSON.stringify(failed.projectSuite,null,2));
 assert.match(failed.projectSuite.stderr,/deliberately failing fixture assertion/);
 assert.equal(f.events.filter(e=>e.kind==='execution_started').length,1);

 f.events.length=0;
 const server=net.createServer(socket=>socket.end());
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 t.after(()=>server.close());
 process.env.DEVSQUAD_TEST_PRIVATE_CANARY='fixture value';
 t.after(()=>delete process.env.DEVSQUAD_TEST_PRIVATE_CANARY);
 fs.writeFileSync(path.join(f.root,'suite.cjs'),`
  const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
  assert.equal(require('installed-fixture'),42);
  assert.throws(()=>fs.readFileSync(path.resolve('../..','package.json')),e=>['EACCES','EPERM'].includes(e.code));
  assert.equal(process.env.DEVSQUAD_TEST_PRIVATE_CANARY,undefined);
  assert.equal(process.env.USERPROFILE,process.cwd());
  const socket=require('node:net').connect({host:'127.0.0.1',port:${server.address().port}});
  socket.on('connect',()=>{socket.destroy();throw Error('MXC allowed a network connection');});
  socket.on('error',error=>{assert.equal(error.code,'EACCES');console.log('suite passed');});
  socket.setTimeout(3000,()=>{socket.destroy();throw Error('Expected an explicit denial');});
 `);
 const passed=await f.run();
 assert.equal(passed.passed,true,JSON.stringify({result:passed,events:f.events},null,2));
 assert.equal(passed.projectSuite.exitCode,0);
 assert.match(passed.projectSuite.stdout,/suite passed/);
 assert.doesNotMatch(passed.projectSuite.stdout+passed.projectSuite.stderr,/UNAUTHORIZED LIFECYCLE HOOK/);
 assert.equal(passed.count,1);
 assert.equal(passed.names[0].name,'independent check');
 assert.equal(passed.revisionHash,new ProjectFiles(f.root).fingerprint());
 assert.match(passed.dependencyHash,/^[a-f\d]{64}$/);
 assert.equal(passed.dependencyHash,failed.dependencyHash);
 assert.equal(f.events.filter(e=>e.kind==='execution_started').length,2);

 f.events.length=0;
 fs.writeFileSync(path.join(f.root,'suite.cjs'),"require('node:fs').writeFileSync('.new-hidden-input','');");
 const changed=await f.run();
 assert.equal(changed.passed,false);
 assert.equal(changed.status,'blocked');
 assert.match(changed.summary,/copy.*changed/i);
 assert.equal(f.events.filter(e=>e.kind==='execution_started').length,1);

 f.events.length=0;
 fs.writeFileSync(path.join(f.root,'package.json'),JSON.stringify({scripts:{test:'devsquad-fixture-command-does-not-exist'}}));
 const unavailable=await f.run();
 assert.equal(unavailable.status,'blocked');
 assert.equal(unavailable.passed,false);
 assert.match(unavailable.summary,/could not start a required executable/);
 assert.equal(f.events.filter(e=>e.kind==='execution_started').length,1);
});
