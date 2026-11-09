import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import vm from 'node:vm';
test('the main navigation has one Workspace and no separate Projects entry',()=>{const html=fs.readFileSync(new URL('../src/dashboard/index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/data-view="projects"/);assert.match(html,/data-view="demo"[^>]*>.*?Workspace/);assert.match(html,/<body class="studio-app workspace-secondary">/);assert.match(html,/Earlier work/);assert.equal((html.match(/data-view="demo"/g)||[]).length,1);assert.match(html,/src="\/team-projects.js" defer/);});
test('active project renderer has no spending-scope, call-count, round-cap or consent action',()=>{const source=fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8'),active=source.slice(source.indexOf('function studioView(root)'));assert.ok(!active.includes('approve-scopes'));assert.ok(!active.includes('check('));assert.match(active,/\/studio\/projects\//);assert.match(active,/\/studio\/chats\//);});
test('legacy #projects navigation opens the Workspace and expands the Projects dropdown',()=>{
 const source=fs.readFileSync(new URL('../src/dashboard/dashboard.js',import.meta.url),'utf8'),actions=[];
 const state={view:'settings',studioProject:'current-project',studioChat:'current-chat'};
 const window={location:{hash:'#projects'},history:{replaceState(_a,_b,url){actions.push(url);}},workspaceNavigation:{expand(){actions.push('expand');}},workspaceShell:{showProjectSidebar(){actions.push('sidebar');}},scrollTo(){}};
 const route=source.split('\n').filter(line=>/^function (openDashboardLink|showProjects|go)\(/.test(line)).join('\n');
 assert.equal(vm.runInNewContext(route+'\nopenDashboardLink()',{$:id=>({focus:()=>actions.push(id)}),state,window,draw:()=>actions.push('draw')}),true);
 assert.equal(state.view,'demo');assert.equal(state.studioProject,'current-project');assert.equal(state.studioChat,'current-chat');
 assert.deepEqual(actions,['expand','/team#big-three','draw','sidebar','projects-toggle']);
});
