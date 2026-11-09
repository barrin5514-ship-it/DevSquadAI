import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {StudioWorkers} from '../src/services/studio-workers.js';
import {workflowFixture} from './helpers/workflow-debug-fixture.js';

function nestedProject(t){
 const data=fileURLToPath(new URL('../data/',import.meta.url));
 fs.mkdirSync(data,{recursive:true});
 const root=fs.realpathSync(fs.mkdtempSync(path.join(data,'package-scope-test-')));
 t.after(()=>{
  assert.equal(path.dirname(fs.realpathSync(root)),fs.realpathSync(data));
  fs.rmSync(root,{recursive:true,force:true});
 });
 return root;
}

test('real Windows MXC loads a manifest-free CommonJS test without reading the hub package', {skip:process.platform!=='win32',timeout:40000},async t=>{
 const root=nestedProject(t);
 fs.writeFileSync(path.join(root,'index.html'),'<h1>Purple mug</h1>');
 fs.writeFileSync(path.join(root,'index.test.js'),"const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');test('saved page',()=>assert.match(fs.readFileSync('index.html','utf8'),/Purple mug/));");
 const w=new StudioWorkers({config:{studioTimeouts:{tests:30000}}}),events=[];
 const result=await w.tests(root,new AbortController().signal,e=>events.push(e),{testFiles:['index.test.js']});
 const finish=events.find(e=>e.kind==='execution_finished');
 assert.equal(result.passed,true,finish?.content.stdout);
 assert.equal(result.count,1);
 assert.equal(result.names[0].name,'saved page');
 assert.equal(fs.existsSync(path.join(root,'package.json')),false);
 assert.equal(result.revisionHash,finish.content.revisionHash);
});

test('invalid nested package config records a project-relative path and does not count a loader error as an assertion', {skip:process.platform!=='win32',timeout:40000},async t=>{
 const root=nestedProject(t);
 fs.writeFileSync(path.join(root,'package.json'),'{"type":"commonjs"}');
 fs.mkdirSync(path.join(root,'tests'));
 fs.writeFileSync(path.join(root,'tests','package.json'),'{broken');
 fs.writeFileSync(path.join(root,'tests','scope.test.js'),"require('node:test')('must not execute',()=>{});");
 const w=new StudioWorkers({config:{studioTimeouts:{tests:30000}}}),events=[];
 const result=await w.tests(root,new AbortController().signal,e=>events.push(e),{testFiles:['tests/scope.test.js']});
 assert.equal(result.passed,false);
 assert.equal(result.executed,false);
 assert.equal(result.count,0);
 assert.equal(result.packageConfigFailure.code,'ERR_INVALID_PACKAGE_CONFIG');
 assert.equal(result.packageConfigFailure.path,'tests/package.json');
 assert.match(result.packageConfigFailure.detail,/invalid/i);
 const saved=events.find(e=>e.kind==='execution_finished').content;
 assert.deepEqual(saved.packageConfigFailure,result.packageConfigFailure);
});

test('retrying a saved package loader failure runs the same independent files and dispatches only the Reviewer',async t=>{
 const f=await workflowFixture(t,{fallback:false});
 const runTests=f.s.workers.tests.bind(f.s.workers),repo=f.s.root(f.project.id);
 let runs=0;
 f.s.workers.tests=async(folder,signal,emit,options)=>{
  runs++;
  if(runs!==1)return runTests(folder,signal,emit,options);
  const revisionHash=repo.fingerprint();
  emit({kind:'execution_finished',content:{revisionHash,exit:1,stdout:"not ok 1 - test/add.test.mjs\n  code: 'ERR_INVALID_PACKAGE_CONFIG'\n"}});
  return {executed:false,passed:false,count:0,failed:0,summary:'Failed to load package config',failures:['test/add.test.mjs'],revisionHash};
 };
 const first=await f.run();
 assert.equal(first.status,'paused');
 assert.equal(first.state.phase,'tester');
 const checkpoint=repo.fingerprint(),testAuthor=first.state.testProvenance.executionId;
 const response=await f.post('/studio/chats/'+f.chat.id+'/retry',{requestId:randomUUID(),expectedVersion:first.version,mode:'resume'});
 assert.equal(response.status,202);
 await f.s.wait(f.chat.id);
 const done=f.s.detail(f.chat.id);
 assert.deepEqual(f.calls.map(c=>c.phase),['builder','tester','reviewer']);
 assert.equal(f.providerBodies.length,1);
 assert.equal(runs,2);
 assert.equal(done.status,'awaiting_owner');
 assert.equal(done.state.tests.passedCount??done.state.tests.count,2);
 assert.equal(done.state.tests.testExecutionId,testAuthor);
 assert.equal(repo.fingerprint(),checkpoint);
 assert.ok(done.events.some(e=>e.kind==='saved_tests_reused'));
});
