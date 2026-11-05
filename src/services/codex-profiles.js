import fs from 'node:fs';import path from 'node:path';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {cliEnvironment} from './cli-hello.js';
const execute=promisify(execFile);
export const codexProfileIds=['codex-personal','codex-school'];
export const profileLabel=id=>id==='codex-school'?'School':'Personal';
export const profileAuthArgs=['-c','cli_auth_credentials_store="file"','-c','forced_login_method="chatgpt"'];
// Each native login stays outside project folders. Nothing copies or reads its
// tokens. The trusted CLI broker reads it; generated tests do not receive it.
export class CodexProfiles {
 constructor({root=path.join(process.env.USERPROFILE||'','.devsquad','codex'),executeImpl=execute}={}){this.root=root;this.execute=executeImpl;}
 home(id){if(!codexProfileIds.includes(id))throw Error('Unknown Codex profile');return path.join(this.root,profileLabel(id).toLowerCase());}
 selection(id){return {id,label:profileLabel(id),home:this.home(id)};}
 configured(id){return fs.existsSync(path.join(this.home(id),'auth.json'));}
 list(){return codexProfileIds.map(id=>({id,label:profileLabel(id),loginSaved:this.configured(id),connection:'Use Check Codex logins to verify current native authentication.'}));}
 async check(id,exe,cwd){const env={...cliEnvironment(),CODEX_HOME:this.home(id)};try{const r=await this.execute(exe,[...profileAuthArgs,'login','status'],{cwd,env,encoding:'utf8',windowsHide:true,timeout:12000,maxBuffer:64000});return {id,label:profileLabel(id),ok:/logged in using chatgpt/i.test(String(r.stdout||'')+String(r.stderr||'')),method:'ChatGPT native login'};}catch(e){return {id,label:profileLabel(id),ok:false,code:e.killed?'auth_timeout':'auth_expired',message:'Sign in to this dedicated profile using the documented command. No token was read or copied.'};}}
}
