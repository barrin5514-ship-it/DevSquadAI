import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
const sentence=value=>typeof value==='string'&&value.trim().length>0&&value.length<=1200;

// Display-only sidecars: never generate, execute code, update SQLite or call AI.
// A summary cannot silently carry forward to another revision or database.
export function artifactSummaries(config,db,taskId){
 const result={};
 for(const draft of db.prepare('SELECT id,files,content_hash FROM generated_drafts WHERE task_id=?').all(taskId)){
  if(!/^[\w-]{1,100}$/.test(draft.id))continue;
  try{
   const file=path.join(path.dirname(config.database),'artifact-summaries',draft.id+'.json');
   if(fs.statSync(file).size>32000)continue;
   const saved=JSON.parse(fs.readFileSync(file,'utf8'));
   if(saved.version!==1||saved.databasePath!==fs.realpathSync(config.database)||saved.taskId!==taskId||saved.draftId!==draft.id||saved.draftHash!==draft.content_hash||hash(draft.files)!==draft.content_hash||!Array.isArray(saved.files))continue;
   const files=JSON.parse(draft.files),accepted=[];
   for(const source of files){
    const summary=saved.files.find(s=>s.path===source.path&&s.fileHash===hash(source.content));
    if(!summary||!sentence(summary.overview)||!Array.isArray(summary.parts)||summary.parts.length<1||summary.parts.length>8||!summary.parts.every(sentence)||summary.testMeaning!==null&&!sentence(summary.testMeaning))continue;
    accepted.push({path:source.path,overview:summary.overview,parts:summary.parts,testMeaning:summary.testMeaning,source:'Written locally; no AI request'});
   }
   if(accepted.length)result[draft.id]=accepted;
  }catch{/* Missing, stale or malformed explanations never block the saved code. */}
 }
 return result;
}
