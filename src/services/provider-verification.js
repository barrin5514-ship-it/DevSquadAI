import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const connectionFile=config=>path.join(path.dirname(config.database),'provider-connections.json');
export const keyFingerprint=key=>createHash('sha256').update(key||'').digest('hex');
export function savedVerification(config,provider){
 try{const file=connectionFile(config);if(fs.statSync(file).size>64000)return null;const data=JSON.parse(fs.readFileSync(file,'utf8'))[provider.id];if(!data||data.keyFingerprint!==keyFingerprint(provider.key))return null;const age=Date.now()-Date.parse(data.checkedAt);if(!Number.isFinite(age)||age<0||age>86400000)return null;return data;}catch{return null;}
}

export function saveVerification(config,provider,data){let all={};try{const file=connectionFile(config);if(fs.statSync(file).size<=64000)all=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}all[provider.id]={...data,keyFingerprint:keyFingerprint(provider.key)};const file=connectionFile(config);fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.tmp';fs.writeFileSync(temporary,JSON.stringify(all,null,2));fs.renameSync(temporary,file);}
