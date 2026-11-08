import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';

const hub = 'http://127.0.0.1:3000';
function get(session, route = '/') {
 return new Promise((ok, no) => {
  const req = http.get({hostname:'127.0.0.1', port:session.server.address().port, path:route, headers:{Host:new URL(session.origin).host, Referer:hub + '/api/console/frame'}}, res => {
   const parts = [];
   res.on('data', part => parts.push(part));
   res.on('end', () => ok({status:res.statusCode, headers:res.headers, text:Buffer.concat(parts).toString()}));
  });
  req.on('error', no);
 });
}
function fixture(t) {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'static-preview-'));
 const app = createApp(loadConfig({DATABASE_PATH:path.join(root,'data.sqlite'), WORKSPACE_DIR:path.join(root,'projects'), BACKUP_DIR:path.join(root,'backups')}), {studioOptions:{schedule:()=>{}}});
 const studio = app.team.studio, project = studio.project({name:'Static preview fixture'}), repo = studio.root(project.id);
 fs.writeFileSync(path.join(repo.root, 'index.html'), '<!doctype html><title>Test Handoff</title><button id="testButton">Test Handoff</button><script>document.getElementById("testButton").onclick=()=>{document.body.style.background="green";document.getElementById("testButton").textContent="It works"}</script>');
 fs.writeFileSync(path.join(repo.root, 'app.js'), 'globalThis.fixtureLoaded = true;');
 t.after(async () => { await studio.close(); app.team.messenger.close(); app.team.preview.close(); app.team.fileActions.close(); app.db.close(); fs.rmSync(root, {recursive:true, force:true}); });
 return {app, studio, project, preview:app.team.preview};
}
test('a completed static project opens index.html through the preview without an external app server', async t => {
 const f = fixture(t), value = await f.preview.authorizeStatic(f.project.id, hub), session = f.preview.current(f.project.id, value.generation);
 assert.equal(value.state, 'ready');
 assert.equal((await get(session)).status, 200);
 assert.match((await get(session)).text, /Test Handoff/);
 const script = await get(session, '/app.js');
 assert.equal(script.status, 200);
 assert.match(script.headers['content-security-policy'], /frame-ancestors http:\/\/127\.0\.0\.1:3000/);
 assert.match(script.text, /fixtureLoaded/);
 assert.equal((await get(session, '/../AGENTS.md')).status, 403);
 f.preview.revoke(f.project.id);
 assert.equal(f.preview.status(f.project.id).state, 'authorization_required');
});
test('a project without index.html reports a clear static-preview error', async t => {
 const f = fixture(t), other = f.studio.project({name:'No static entry'});
 await assert.rejects(() => f.preview.authorizeStatic(other.id, hub), /no index\.html/i);
});
