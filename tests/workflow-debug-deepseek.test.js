import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config/index.js';

const frame=value=>'data: '+JSON.stringify(value)+'\n\n';
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'workflow-accounting-'));
 const app=createApp(loadConfig({DATABASE_PATH:path.join(root,'db.sqlite'),WORKSPACE_DIR:path.join(root,'projects'),BACKUP_DIR:path.join(root,'backup'),DEEPSEEK_API_KEY:'LOCAL_FIXTURE_ONLY',DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_INPUT_USD_PER_MILLION:'0.3',DEEPSEEK_OUTPUT_USD_PER_MILLION:'1.2'}),{fetchImpl:async()=>{throw Error('No live network permitted');},studioOptions:{schedule:()=>{}}}),s=app.team.studio;
 t.after(async()=>{await s.close();app.team.messenger.close();app.team.preview.close();app.team.fileActions.close();app.db.close();fs.rmSync(root,{recursive:true,force:true});});
 const p=s.project({name:'SIMULATED response accounting'}),chat=s.create(p.id,'Fixture task'),proposal=s.runScope.sendProposal(chat.id),job=s.start(p.id,{chatId:chat.id,requestId:crypto.randomUUID(),expectedVersion:proposal.version,proposalHash:proposal.hash}),repo=s.root(p.id),id=s.runScope.reserve(job,'deepseek','builder',repo.root,repo.fingerprint());
 return {app,s,job,repo,id,execution:{executionId:id,chatId:job.id,nativeLimits:job.state.runApproval,fallbackBudget:s.failover,usage:s.usage,onEvent:e=>s.executions.record(id,e)}};
}

test('completed length response settles reported usage without accepting any partial artifact',async t=>{
 const f=fixture(t);let calls=0,sent;
 f.app.team.fetch=async(_url,o)=>{calls++;sent=JSON.parse(o.body);return new Response(frame({model:'deepseek-flash',choices:[{delta:{content:'{"report":"partial","files":[]}'},finish_reason:'length'}],usage:{prompt_tokens:30,completion_tokens:8192,total_tokens:8222}})+'data: [DONE]\n\n');};
 await assert.rejects(()=>f.s.workers.call('deepseek',{phase:'builder'},f.repo.root,new AbortController().signal,f.execution),e=>e.code==='response_truncated'&&e.unknownOutcome===false);
 assert.equal(sent.max_tokens,8192);assert.equal(calls,1);
 const reservation=f.app.db.prepare('SELECT status,reserved_usd,usage FROM studio_api_reservations WHERE execution_id=?').get(f.id);
 assert.equal(reservation.status,'completed');assert.equal(reservation.reserved_usd,0.0098394);assert.equal(JSON.parse(reservation.usage).output,8192);
 const detail=f.s.detail(f.job.id),usage=detail.events.find(e=>e.kind==='api_usage').content;
 assert.equal(usage.outcome,'incomplete');assert.equal(usage.output,8192);assert.equal(detail.revisions.length,0);assert.equal(f.repo.fingerprint(),f.job.state.runApproval.checkpointHash);
});

test('interrupted stream keeps its unknown reservation even when partial usage was observed',async t=>{
 const f=fixture(t);let calls=0;
 f.app.team.fetch=async()=>{calls++;return new Response(frame({model:'deepseek-flash',choices:[{delta:{content:'{"report":"unfinished"}'},finish_reason:'stop'}],usage:{prompt_tokens:30,completion_tokens:10,total_tokens:40}}));};
 await assert.rejects(()=>f.s.workers.call('deepseek',{phase:'builder'},f.repo.root,new AbortController().signal,f.execution),e=>e.code==='provider_error'&&e.unknownOutcome===true);
 const row=f.app.db.prepare('SELECT status,reserved_usd,usage FROM studio_api_reservations WHERE execution_id=?').get(f.id);
 assert.equal(row.status,'unknown');assert.ok(row.reserved_usd>0.009);assert.equal(row.usage,null);assert.equal(calls,1);
 const detail=f.s.detail(f.job.id);assert.equal(detail.events.find(e=>e.kind==='api_usage').content.outcome,'unknown');assert.equal(detail.revisions.length,0);
});
