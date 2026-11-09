import {cleanReport} from './report-cleaning.js';

export const replyEvidenceCap=6144;

// Save only the completed visible reply, never an SSE or CLI transcript.
export function replyEvidence(text,check,error){
 const offset=/\bposition (\d+)\b/.exec(error?.message||'');
 const line=/\bline (\d+) column (\d+)\b/.exec(error?.message||'');
 return {visibleText:typeof text==='string'?text:null,validation:{
  check,message:error instanceof SyntaxError?'Final reply could not be parsed as JSON.':'Final reply failed validation.',
  position:offset?Number(offset[1]):null,line:line?Number(line[1]):null,column:line?Number(line[2]):null
 }};
}

export function safeFailedReply(team,text){
 if(typeof text!=='string')return null;
 let safe=text.replace(/<think\b[^>]*>[\s\S]*?(?:<\/think\s*>|$)/gi,'[reasoning omitted]')
  .replace(/"(?:reasoning(?:_content)?|thinking)"\s*:\s*(?:"(?:\\.|[^"\\])*(?:"|$)|[\[{][\s\S]*$|[^,}\r\n]*)/gi,'"reasoning":"[omitted]"')
  .replace(/^\s*(?:thinking|analysis|reasoning)\s*:[\s\S]*$/gim,'[reasoning omitted]');
 for(const secret of team.coordinator.configuredSecrets().filter(s=>typeof s==='string'&&s.length>=4)){
  for(const variant of [secret,JSON.stringify(secret).slice(1,-1),encodeURIComponent(secret),Buffer.from(secret).toString('base64')])safe=safe.replaceAll(variant,'[secret removed]');
 }
 safe=safe.replace(/\b(?:Bearer|Basic)\s+[^"\s,]+/gi,'[authorization removed]')
  .replace(/\b(?:sk-[\w-]{10,}|gsk_[\w-]+|hf_[\w-]+|gh[pousr]_[\w-]+|github_pat_[\w-]+|AIza[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+)/g,'[token removed]')
  .replace(/\b(?:password|secret|api[_ -]?key|(?:access[_ -]?|refresh[_ -]?)?token|authorization)["']?\s*[:=]\s*(?:"(?:\\.|[^"\\])*(?:"|$)|'[^']*(?:'|$)|[^\s,;}]+)/gi,'[credential removed]')
  .replace(/https?:\/\/hooks\.zapier\.com\/[^"'\s]+/gi,'[webhook removed]');
 const bytes=Buffer.from(safe),prefix=bytes.subarray(0,replyEvidenceCap).toString('utf8').replace(/\uFFFD$/,'');
 return {text:prefix,capBytes:replyEvidenceCap,truncated:bytes.length>replyEvidenceCap};
}

export function safeCouncilText(team,text){
 return cleanReport(String(text??'').slice(0,2600),team.coordinator.configuredSecrets()).slice(0,1400);
}
