import {test} from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {StudioWorkers} from '../src/services/studio-workers.js';
// Reproduce an overloaded event loop deterministically. The real clock timer
// may not fire before a late close event, but late work must never become PASS.
test('late natural completion cannot evade the isolated-worker deadline',async()=>{
 const w=new StudioWorkers({config:{studioTimeouts:{tests:1000}}}),child=new EventEmitter(),events=[];child.pid=987;child.stdout=new EventEmitter();child.stderr=new EventEmitter();let now=0,alive=true;
 w.clock=()=>now;w.inspectProcess=()=>({verified:true,processes:alive?[{pid:987,birth:'2026-11-07T00:00:00Z'}]:[]});
 w.spawnProcess=()=>{queueMicrotask(()=>{child.emit('spawn');now=1001;alive=false;child.emit('close',0);});return child;};
 await assert.rejects(()=>w.command('fixture','.',[],new AbortController().signal,e=>events.push(e)),e=>e.code==='timeout'&&e.stopped===true);
 assert.ok(events.some(e=>e.deadlineExceeded));assert.ok(events.some(e=>e.terminationVerified));assert.ok(!events.some(e=>e.status==='completed'));
});
test('successful tree-kill return is not proof when a recorded child survives',async()=>{
 const w=new StudioWorkers({config:{studioTimeouts:{tests:1}}}),child=new EventEmitter();child.pid=987;child.stdout=new EventEmitter();child.stderr=new EventEmitter();let root=true;
 w.inspectProcess=pid=>({verified:true,processes:pid===988?[{pid:988,birth:'child'}]:root?[{pid:987,birth:'root'},{pid:988,parent:987,birth:'child'}]:[]});
 w.terminateTree=()=>{root=false;queueMicrotask(()=>child.emit('close',1));return {status:0};};
 w.spawnProcess=()=>{queueMicrotask(()=>child.emit('spawn'));return child;};
 await assert.rejects(()=>w.command('fixture','.',[],new AbortController().signal),e=>e.stopped===false);
});
