import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {artifactSummaries} from '../src/services/artifact-summaries.js';
const hash=v=>createHash('sha256').update(v).digest('hex');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'devsquad-summary-')),database=path.join(dir,'db.sqlite'),db=new DatabaseSync(database),files=JSON.stringify([{path:'test/add.test.js',content:'export function check(){ return 1; }'}]);
 db.exec('CREATE TABLE generated_drafts(id TEXT,task_id TEXT,files TEXT,content_hash TEXT)');db.prepare('INSERT INTO generated_drafts VALUES (?,?,?,?)').run('revision','task',files,hash(files));fs.mkdirSync(path.join(dir,'artifact-summaries'));
 const file=path.join(dir,'artifact-summaries/revision.json'),doc={version:1,databasePath:fs.realpathSync(database),draftId:'revision',taskId:'task',draftHash:hash(files),files:[{path:'test/add.test.js',fileHash:hash(JSON.parse(files)[0].content),overview:'Checks one example.',parts:['check — contains the example.'],testMeaning:'Pass means the recorded checks finish without a failure.'}]};
 const save=()=>fs.writeFileSync(file,JSON.stringify(doc));save();t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});return {db,doc,file,save,read:task=>artifactSummaries({database},db,task||'task')};
}
test('local summary is linked to exact database/task/revision/content and reads without mutating artifacts',t=>{const f=fixture(t),before=f.db.prepare('SELECT * FROM generated_drafts').all();assert.equal(f.read().revision[0].overview,'Checks one example.');assert.deepEqual(f.read('other-task'),{});assert.deepEqual(f.db.prepare('SELECT * FROM generated_drafts').all(),before);});
test('wrong database, task, revision and stale file/draft hashes cannot explain another artifact',t=>{for(const change of [{databasePath:'different-db'},{taskId:'wrong'},{draftId:'old'},{draftHash:'changed'},{files:[{path:'test/add.test.js',fileHash:'old',overview:'Stale explanation',parts:['Old'],testMeaning:null}]}]){const f=fixture(t);Object.assign(f.doc,change);f.save();assert.deepEqual(f.read(),{});}});
test('missing, malformed and oversized sidecars never hide code or make a network request',t=>{const f=fixture(t);fs.writeFileSync(f.file,'not JSON');assert.deepEqual(f.read(),{});fs.writeFileSync(f.file,'x'.repeat(33000));assert.deepEqual(f.read(),{});fs.unlinkSync(f.file);assert.deepEqual(f.read(),{});assert.equal(f.db.prepare('SELECT count(*) n FROM generated_drafts').get().n,1);});
test('malformed summary structure is rejected while a test explanation remains separate from test evidence',t=>{const f=fixture(t);f.doc.files[0].parts=[];f.save();assert.deepEqual(f.read(),{});f.doc.files[0].parts=['A short explanation'];f.doc.files[0].testMeaning={passed:true};f.save();assert.deepEqual(f.read(),{});});
