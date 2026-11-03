import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {CliHello} from './cli-hello.js';
import {transaction} from '../middleware/ai-validation.js';
import {ApiError} from '../middleware/errors.js';
import {PaidHello} from './paid-hello.js';

// Public pricing evidence is an estimate, not an active spending grant.
export const helloEstimate=Object.freeze({model:'deepseek-flash',inputTokensEstimate:32,inputTokensReserved:128,outputTokensMax:32,thinking:'disabled',inputUSDPerMillion:0.30,outputUSDPerMillion:1.20,expectedUSD:0.000012,conservativeUSD:0.0000768,localCapUSD:0.001,source:'https://api-docs.deepseek.com/quick_start/pricing/',checkedOn:'2026-11-02',prompt:'Reply with exactly the word hello.'});
export class HubConnections {
 constructor(team,options={}){
  this.team=team;this.db=team.db;
  this.scope=options.helloGrantFile?new PaidHello(team,options.helloGrantFile):null;
  const user=process.env.USERPROFILE||'';
  this.cli=options.cliHello||new CliHello({codex:process.env.CODEX_EXECUTABLE||path.join(user,'AppData/Local/Programs/OpenAI/Codex/bin/codex.exe'),claude:process.env.CLAUDE_EXECUTABLE||path.join(user,'.local/bin/claude.exe')});
  this.db.prepare("UPDATE hub_connection_checks SET status='interrupted',updated_at=? WHERE status='running'").run(new Date().toISOString());
 }
 status(){const last=this.db.prepare('SELECT * FROM hub_connection_checks ORDER BY created_at DESC LIMIT 1').get();return {codexInstalled:this.cli.installed('codex'),claudeInstalled:this.cli.installed('claude'),deepseekConfigured:Boolean(this.team.paid.settings.key),deepseekModel:this.team.paid.settings.model,estimate:helloEstimate,last:last?{...last,result:JSON.parse(last.result)}:null};}
 async test(body){
  this.team.fields(body,['approvedBy','confirmIncluded']);if(body.approvedBy!=='owner'||body.confirmIncluded!==true)throw new ApiError(403,'Confirm your native CLI subscriptions have included usage before this check');
  const id=this.scope?.terms.id||randomUUID(),time=new Date().toISOString();
  const old=this.db.prepare('SELECT * FROM hub_connection_checks WHERE id=?').get(id);if(old){if(old.status==='running')throw new ApiError(409,'This one-shot hello batch is already running');return {id,results:JSON.parse(old.result),cached:true};}
  transaction(this.db,()=>{if(this.db.prepare("SELECT 1 FROM hub_connection_checks WHERE status='running'").get())throw new ApiError(409,'A hello check is already running');this.db.prepare("INSERT INTO hub_connection_checks VALUES (?,'running','[]',?,?)").run(id,time,time);});
  const results=[];
  try{
   // Paid DeepSeek is deliberately not called by this button. Approval must be
   // bound to an exact separately authorized request through the paid safeguards.
   results.push(this.scope?{agent:'deepseek',...await this.scope.execute()}:{agent:'deepseek',ok:false,kind:'not_run',code:'approval_required',message:'Waiting for your separate DeepSeek cost approval. No paid request was sent.'});
   for(const agent of ['codex','claude']){let result;try{result=await this.cli.hello(agent);}catch{result={ok:false,kind:'live',code:'failed',message:'The local connection check could not finish.'};}this.team.safe(result);results.push({agent,...result});this.db.prepare('UPDATE hub_connection_checks SET result=?,updated_at=? WHERE id=?').run(JSON.stringify(results),new Date().toISOString(),id);}
   this.db.prepare("UPDATE hub_connection_checks SET status='finished',result=?,updated_at=? WHERE id=?").run(JSON.stringify(results),new Date().toISOString(),id);return {id,results};
  }catch{this.db.prepare("UPDATE hub_connection_checks SET status='interrupted',updated_at=? WHERE id=?").run(new Date().toISOString(),id);throw new ApiError(503,'Connection check interrupted; no automatic retry was made');}
 }
}
