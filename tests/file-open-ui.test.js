import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('file Open selects the project chat before redraw so the file request is not discarded', async () => {
 const state = {studioProject:'p1', studioChat:null, view:'projects', data:{studio:{chats:[{id:'chat1', project_id:'p1', version:2}], projects:[{id:'p1'}]}}};
 let selected = null, calls = [];
 const context = vm.createContext({
  window:{},
  document:{getElementById:()=>null},
  state,
  api:async route => { calls.push(route); return {path:'index.html', content:'<h1>fixture</h1>', summary:null}; },
  setTimeout,
  clearTimeout,
  console
 });
 context.window.workspaceFileExplorer = {select:(project,path) => { selected = [project,path]; }};
 context.window.workspaceShell = {showDevelopment(){}};
 context.go = () => { setTimeout(() => { state.studioChat = 'chat1'; }, 0); };
 vm.runInContext(fs.readFileSync(new URL('../src/dashboard/development.js', import.meta.url), 'utf8'), context);
 await context.window.workspaceDevelopment.openFile('p1', 'index.html');
 assert.deepEqual(selected, ['p1', 'index.html']);
 assert.ok(calls.some(route => route.includes('/file?path=index.html')));
});
