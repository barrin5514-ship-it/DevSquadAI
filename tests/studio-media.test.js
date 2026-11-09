import {nemotronModel} from '../src/services/nemotron-worker.js';
import {captureCodexVision,readWithNemotron} from '../src/services/media-vision.js';
import {parseMediaSpec} from '../src/services/studio-media.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {workflowFixture} from './helpers/workflow-debug-fixture.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR6sAAAAASUVORK5CYII=','base64');
const answer=JSON.stringify({subjects:'A purple mug',layout:'Centered',colours:'Purple and yellow',surface:'Yellow table',background:'White',visibleText:'LOCAL-42',details:'One mug',sequence:''});
function mediaSend(f,bytes=png,ext='png',proposalBeforeUpload=false){
 const displayed=proposalBeforeUpload?f.s.runScope.sendProposal(f.chat.id):null;
 const relative='references/'+randomUUID()+'.'+ext,file=f.s.root(f.project.id).resolve(relative);
 fs.mkdirSync(f.s.root(f.project.id).resolve('references'),{recursive:true});fs.writeFileSync(file,bytes);
 const proposal=displayed||f.s.runScope.sendProposal(f.chat.id);
 Object.assign(f.body,{expectedVersion:proposal.version,proposalHash:proposal.hash,message:{text:'Build a page that shows what is in this picture.',submissionId:randomUUID(),attachments:[{name:'control.'+ext,kind:ext==='png'?'image':'video',mime:ext==='png'?'image/png':'video/mp4',path:relative,bytes:bytes.length,hash:createHash('sha256').update(bytes).digest('hex')}]}});
}
const simulatedFrames=async ({file})=>[file];
test('Send reads the selected image before Builder and gives the same bound text spec to all stages',async t=>{
 let reads=0;const f=await workflowFixture(t,{mediaOptions:{frames:simulatedFrames,nemotron:async({call})=>{reads++;return call({quotaBefore:{remaining:2}},async()=>({reply:answer,usage:{prompt_tokens:23,completion_tokens:18,cost:0}}));}}});mediaSend(f,png,'png',true);
 const before=f.s.root(f.project.id).fingerprint(),j=await f.run();assert.equal(reads,1);assert.equal(j.status,'awaiting_owner');assert.equal(j.events.filter(e=>e.kind==='media_spec_saved').length,1);
 assert.equal(f.packets.length,3);for(const p of f.packets){assert.match(p.mediaSpec.text,/LOCAL-42/);assert.equal(p.mediaSpec.attachmentHash,f.body.message.attachments[0].hash);assert.match(p.goal,/Build a page/);assert.equal(p.attachments.length,0);}
 const event=j.events.find(e=>e.kind==='media_spec_saved');assert.equal(event.content.checkpointHash,before);
 assert.ok(f.s.root(f.project.id).list().every(p=>!p.includes('.devsquad-media')));
});

test('both media routes unavailable pause without a Builder request and preserve the checkpoint',async t=>{
 const f=await workflowFixture(t,{mediaOptions:{frames:simulatedFrames,nemotron:async()=>{throw Error('quota exhausted');},codex:async()=>{throw Error('login expired');}}});mediaSend(f);
 const before=f.s.root(f.project.id).fingerprint(),j=await f.run();assert.equal(j.status,'paused');assert.match(j.state.alert,/couldn.t read that image/i);assert.equal(f.calls.length,0);assert.equal(f.providerBodies.length,0);assert.equal(f.s.root(f.project.id).fingerprint(),before);
});

test('quota exhaustion selects Codex Personal and resume after a role change reuses the saved spec',async t=>{
 let reads=0;
 const f=await workflowFixture(t,{mode:'tester-once',mediaOptions:{
  frames:simulatedFrames,nemotron:async()=>{throw Object.assign(Error('quota exhausted'),{quotaBefore:{used:50,limit:50,remaining:0}});},
  codex:async({call})=>{reads++;return call({},async()=>({reply:answer,usage:{input_tokens:17,output_tokens:12}}));}
 }});
 mediaSend(f);
 const first=await f.run(),saved=first.events.find(e=>e.kind==='media_spec_saved');
 assert.equal(first.status,'paused');assert.equal(first.resume.phase,'tester');
 assert.equal(saved.content.route,'codex-personal');assert.equal(saved.content.fallback,true);assert.equal(saved.content.quotaBefore.remaining,0);
 const team=f.s.roleManager.get(f.project.id);
 const changed=await f.post('/studio/projects/'+f.project.id+'/roles',{version:team.version,chatId:f.chat.id,chatVersion:first.version,roles:{builder:'deepseek',tester:'nemotron',reviewer:'codex-personal'}});
 assert.equal(changed.status,200);
 const retry=await f.post('/studio/chats/'+f.chat.id+'/retry',{requestId:randomUUID(),expectedVersion:f.s.get(f.chat.id).version,mode:'resume'});
 assert.equal(retry.status,202);await f.s.wait(f.chat.id);
 const done=f.s.detail(f.chat.id);
 assert.equal(done.status,'awaiting_owner');assert.equal(reads,1);assert.equal(f.providerBodies.length,1);
 assert.equal(f.calls.at(-1).agent,'codex-personal');
 const reuse=done.events.find(e=>e.kind==='media_spec_reused');
 assert.equal(reuse.content.originCheckpointHash,saved.content.checkpointHash);
 assert.equal(f.packets.at(-1).mediaSpec.attachmentHash,saved.content.attachmentHash);
});

test('video batches sampled frames in one request and says audio was not transcribed',async t=>{
 const video=JSON.stringify({...JSON.parse(answer),sequence:'Counter goes from 0 to 3. Background turns blue.'});
 const f=await workflowFixture(t,{mediaOptions:{
  frames:async({file})=>Array.from({length:12},()=>file),
  nemotron:async({call,frames,prompt})=>{assert.equal(frames.length,12);assert.match(prompt,/12 still frames/);return call({},async()=>({reply:video}));}
 }});
 mediaSend(f,Buffer.from('Simulated video; decoder injected'),'mp4');
 const done=await f.run(),saved=done.events.find(e=>e.kind==='media_spec_saved');
 assert.equal(done.status,'awaiting_owner');assert.equal(saved.content.frameCount,12);assert.equal(saved.content.visionCalls,1);
 assert.match(f.packets[0].mediaSpec.text,/Counter goes from 0 to 3/);
 assert.match(f.packets[0].mediaSpec.text,/Audio not transcribed\. Video understood from sampled still frames only\./);
});

test('real local decoder rejects a corrupt PNG before either vision route dispatches',async t=>{
 let reads=0;
 const f=await workflowFixture(t,{mediaOptions:{nemotron:async()=>{reads++;},codex:async()=>{reads++;}}});
 mediaSend(f,Buffer.from('Not a valid PNG'));
 const before=f.s.root(f.project.id).fingerprint(),paused=await f.run();
 assert.equal(paused.status,'paused');assert.match(paused.state.alert,/couldn.t read that image/i);
 assert.equal(reads,0);assert.equal(f.calls.length,0);assert.equal(f.s.root(f.project.id).fingerprint(),before);
});

test('text-only Send completes without creating a media spec or dispatching vision',async t=>{
 let reads=0;const f=await workflowFixture(t,{mediaOptions:{nemotron:async()=>{reads++;},codex:async()=>{reads++;}}});
 const done=await f.run();
 assert.equal(done.status,'awaiting_owner');assert.equal(reads,0);assert.equal(f.packets.length,3);
 assert.ok(f.packets.every(p=>!p.mediaSpec));assert.ok(done.events.every(e=>!e.kind.startsWith('media_')));
});

test('Codex reader drops progress transcript and accepts only one completed final answer',async()=>{
 const run=async (records,progress=false)=>captureCodexVision(process.execPath,['-e',(progress?`for(let i=0;i<8;i++) console.log(JSON.stringify({type:'item.updated',item:{type:'agent_message',text:'progress '.repeat(1400)}}));`:'')+'for(const line of '+JSON.stringify(records)+') console.log(JSON.stringify(line))'],{env:{},signal:new AbortController().signal});
 const final={type:'item.completed',item:{type:'agent_message',text:answer}},usage={input_tokens:28,output_tokens:19};
 const done={type:'turn.completed',usage};
 assert.deepEqual(await run([final,done],true),{reply:answer,usage});
 await assert.rejects(run([final]),/invalid_vision_response/);
 await assert.rejects(run([final,final,done]),/invalid_vision_response/);
});

test('media spec rejects an oversized or incomplete answer',()=>{
 assert.throws(()=>parseMediaSpec(answer.replace('LOCAL-42','x'.repeat(16384)),'image'),/spec_size_or_format/);
 assert.throws(()=>parseMediaSpec(answer,'video'),/incomplete_media_spec/);
});

test('media upload does not authorize unrelated project edits made after the displayed proposal',async t=>{
 const f=await workflowFixture(t,{mediaOptions:{nemotron:async()=>{throw Error('vision must not run');}}});
 mediaSend(f,png,'png',true);
 fs.writeFileSync(f.s.root(f.project.id).resolve('unexpected.txt'),'Changed after the displayed proposal.');
 const response=await f.post(f.route,f.body);
 assert.equal(response.status,409);assert.equal(f.s.get(f.chat.id).status,'ready');
 assert.equal(f.calls.length,0);
 assert.ok(f.s.detail(f.chat.id).events.every(e=>!e.kind.startsWith('media_')));
});


test('free Nemotron vision request uses one image part and the declared strict schema',async t=>{
 const model={id:nemotronModel,pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text','image']},supported_parameters:['structured_outputs']};
 const sent=[];
 const f=await workflowFixture(t,{mediaOptions:{frames:simulatedFrames,nemotron:args=>readWithNemotron(team,args)}});
 const settings={id:'openrouter',key:'OFFLINE_FIXTURE',free:true,base:'https://openrouter.ai/api/v1'};
 const team={config:{ai:{providers:[settings]}},fetch:async(url,options)=>{
  assert.equal(options.redirect,'error');
  if(options.method==='GET')return Response.json({data:url.endsWith('/key')?{is_free_tier:true,free_model_daily_requests:{used:4,limit:50,remaining:46}}:[model]});
  sent.push(JSON.parse(options.body));
  return Response.json({model:nemotronModel,choices:[{finish_reason:'stop',message:{content:answer}}],usage:{prompt_tokens:5,completion_tokens:12,cost:0}});
 }};
 mediaSend(f);
 const done=await f.run();assert.equal(done.status,'awaiting_owner');assert.equal(sent.length,1);
 const [body]=sent;
 assert.equal(body.response_format.type,'json_schema');assert.equal(body.response_format.json_schema.strict,true);
 assert.deepEqual(body.response_format.json_schema.schema.required,Object.keys(JSON.parse(answer)));
 assert.deepEqual(body.provider,{allow_fallbacks:false,require_parameters:true,max_price:{prompt:0,completion:0,request:0}});
 const [prompt,image]=body.messages[0].content;assert.match(prompt.text,/Build a page/);assert.doesNotMatch(prompt.text,/LOCAL-42/);
 assert.equal(image.type,'image_url');assert.equal(image.image_url.url,'data:image/png;base64,'+png.toString('base64'));
 assert.equal(done.events.find(e=>e.kind==='media_spec_saved').content.quotaAfter.remaining,46);
});

test('a media Builder JSON failure keeps write authorization distinct and same-chat Retry reuses the saved spec',async t=>{
 let reads=0;
 const f=await workflowFixture(t,{mode:'builder-json-once',fallback:false,mediaOptions:{
  frames:simulatedFrames,nemotron:async({call})=>{reads++;return call({},async()=>({reply:answer}));}
 }});
 mediaSend(f);
 const before=f.s.root(f.project.id).fingerprint(),paused=await f.run();
 assert.equal(paused.status,'paused');assert.equal(paused.state.phase,'builder');
 assert.equal(paused.state.writeAccess.status,'released');assert.equal(paused.resume.available,true);
 assert.equal(f.s.root(f.project.id).fingerprint(),before);
 assert.ok(paused.events.some(e=>e.kind==='run_requested'&&e.content.writeAccess?.status==='held'));
 const saved=paused.events.find(e=>e.kind==='media_spec_saved');
 const worker=paused.executions.find(e=>e.phase==='builder');
 assert.ok(saved);assert.equal(worker.evidence.deepseekResponse.failedCheck,'answer_json');
 assert.equal(worker.evidence.deepseekResponse.completionObserved,true);
 const retry=await f.post('/studio/chats/'+f.chat.id+'/retry',{requestId:randomUUID(),expectedVersion:paused.version,mode:'resume'});
 assert.equal(retry.status,202);await f.s.wait(f.chat.id);
 const done=f.s.detail(f.chat.id);
 assert.equal(done.status,'awaiting_owner');assert.equal(done.id,paused.id);
 assert.equal(done.state.retryOf,paused.request_id);assert.equal(reads,1);
 assert.equal(f.providerBodies.length,2);assert.equal(f.packets[0].mediaSpec.text,f.packets[1].mediaSpec.text);
 assert.equal(done.events.find(e=>e.kind==='media_spec_reused').content.originCheckpointHash,saved.content.checkpointHash);
 assert.deepEqual(f.calls.map(c=>c.phase),['builder','builder','tester','reviewer']);
});

test('reattaching the same media to a paused Builder preserves Retry without overlooking project edits',async t=>{
 let reads=0;
 const f=await workflowFixture(t,{mode:'builder-json-once',fallback:false,mediaOptions:{
  frames:simulatedFrames,nemotron:async({call})=>{reads++;return call({},async()=>({reply:answer}));}
 }});
 mediaSend(f);
 const paused=await f.run(),repo=f.s.root(f.project.id),original=f.body.message.attachments[0];
 assert.equal(paused.status,'paused');
 mediaSend(f);
 const duplicate=f.body.message.attachments[0];
 assert.notEqual(duplicate.path,original.path);
 assert.equal(duplicate.hash,original.hash);
 const message=await f.post('/studio/chats/'+f.chat.id+'/messages',f.body.message);
 assert.equal(message.status,201);
 const afterEdit=f.s.detail(f.chat.id);
 assert.notEqual(repo.fingerprint(),paused.state.failure.checkpointHash);
 assert.equal(afterEdit.resume.available,true);
 assert.equal(afterEdit.resume.checkpointHash,repo.fingerprint());
 const retry=()=>f.post('/studio/chats/'+f.chat.id+'/retry',{requestId:randomUUID(),expectedVersion:afterEdit.version,mode:'resume'});
 const changed=repo.resolve('owner-edit.html');
 fs.writeFileSync(changed,'<h1>Changed since the checkpoint</h1>');
 const blocked=await retry();
 assert.equal(blocked.status,409);
 assert.match(JSON.stringify(blocked),/project changed after the failed step/i);
 assert.equal(f.providerBodies.length,1);
 fs.unlinkSync(changed);
 assert.equal((await retry()).status,202);await f.s.wait(f.chat.id);
 const done=f.s.detail(f.chat.id);
 assert.equal(done.status,'awaiting_owner');assert.equal(done.state.retryOf,paused.request_id);
 assert.equal(reads,1);assert.equal(f.providerBodies.length,2);
 assert.ok(done.events.some(e=>e.kind==='media_spec_reused'));
 assert.deepEqual(f.calls.map(c=>c.phase),['builder','builder','tester','reviewer']);
});
