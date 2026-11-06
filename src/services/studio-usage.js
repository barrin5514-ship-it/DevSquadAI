// Usage is evidence, not permission. Send starts the owner's selected workflow;
// automatic handoffs enforce their separately approved task reservations.
export class StudioUsage {
 constructor(studio){this.studio=studio;this.db=studio.db;}
 start(chat,executionId,model){const e=this.studio.executions.get(executionId);if(e.chat_id!==chat||e.agent!=='deepseek')throw Error('API request does not belong to this execution');if(this.db.prepare("SELECT 1 FROM studio_events WHERE chat_id=? AND kind='api_request_started' AND json_extract(content,'$.executionId')=?").get(chat,executionId))throw Error('This execution already dispatched; duplicate request prevented');this.studio.event(chat,'api_request_started',{executionId,model,startedAt:new Date().toISOString()},'deepseek');}
 record(chat,executionId,model,usage=null,outcome='unknown'){
  const execution=this.studio.executions.get(executionId);
  if(execution.chat_id!==chat||execution.agent!=='deepseek')throw Error('Usage does not belong to this DeepSeek execution');
  const previous=this.db.prepare("SELECT content FROM studio_events WHERE chat_id=? AND kind='api_usage' AND json_extract(content,'$.executionId')=?").get(chat,executionId);
  if(previous)return JSON.parse(previous.content);
  const number=n=>Number.isSafeInteger(n)&&n>=0?n:null,p=this.studio.team.paid.settings;
  const input=number(usage?.input),output=number(usage?.output),total=number(usage?.total);
  const ratesKnown=[p?.inputPrice,p?.outputPrice].every(n=>Number.isFinite(n)&&n>0);
  const content={executionId,model,outcome,input,output,total,reasoning:number(usage?.reasoning),source:input!==null||output!==null?'provider_reported':'unknown',estimatedCostUSD:input!==null&&output!==null&&ratesKnown?(input*p.inputPrice+output*p.outputPrice)/1e6:null,inputUSDPerMillion:ratesKnown?p.inputPrice:null,outputUSDPerMillion:ratesKnown?p.outputPrice:null,costNote:'Calculated from recorded tokens and configured rates; not a provider invoice. Unknown usage is not zero.'};
  this.studio.event(chat,'api_usage',content,'deepseek');return content;
 }
 summary(chat){const rows=this.db.prepare("SELECT id,kind,content FROM studio_events WHERE chat_id=? AND (kind IN ('api_request_started','api_usage') OR kind='worker_report' AND agent='deepseek') ORDER BY id").all(chat);const latest=new Map();for(const row of rows){const r=JSON.parse(row.content);if(row.kind==='worker_report'){if(!r.usage||r.executionId&&latest.has(r.executionId))continue;const u=r.usage;latest.set(r.executionId||'historical:'+row.id,{input:u.input??null,output:u.output??null,estimatedCostUSD:Number.isFinite(u.estimatedCost)?u.estimatedCost:null});}else latest.set(r.executionId,row.kind==='api_usage'?r:{executionId:r.executionId,input:null,output:null,estimatedCostUSD:null});}const records=[...latest.values()];return {calls:records.length,input:records.reduce((n,r)=>n+(r.input??0),0),output:records.reduce((n,r)=>n+(r.output??0),0),knownEstimatedUSD:records.reduce((n,r)=>n+(r.estimatedCostUSD??0),0),unknownCalls:records.filter(r=>r.estimatedCostUSD===null).length,notice:this.studio.get(chat).state.fallbackPolicy?.enabled||this.studio.get(chat).state.paidFallbackActive?'Automatic DeepSeek turns require approved task reservations. These are local controls, not provider-side billing ceilings. Unknown usage is not zero.':'Prepaid API charges are uncapped by this project workflow. Send starts work; Stop prevents further steps.'};}
}
