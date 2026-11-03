import {ApiError} from '../middleware/errors.js';
import {isIP} from 'node:net';

// Send a short progress summary, never an entire worker context or source file.
// Common credential formats and labelled secrets are removed as well as known
// local keys. Unknown, unlabelled secrets still require owner care before sharing.
export function cleanReport(value,secrets=[]){
 if(typeof value!=='string'||Buffer.byteLength(value)>64000)throw new ApiError(400,'Report must be a bounded text summary');
 let text=value.replace(/\\u([a-fA-F0-9]{4})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
 for(const secret of secrets.filter(s=>typeof s==='string'&&s.length>=4))for(const variant of [secret,JSON.stringify(secret).slice(1,-1),encodeURIComponent(secret),Buffer.from(secret).toString('base64')])text=text.replaceAll(variant,'[secret removed]');
 text=text.replace(/```[\s\S]*?```/g,'[code omitted]')
  .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+\/_=.-]+/gi,'[authorization removed]')
  .replace(/\b(?:password|passwd|secret|(?:api[_ -]?)?key|(?:access[_ -]?|refresh[_ -]?)?token|authorization)\b["']?\s*[:=]\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;}]+)/gi,'[credential removed]')
  .replace(/\b[\w-]*(?:password|passwd|secret|token|api[_-]?key|access[_-]?key)[\w-]*["']?\s*[:=]\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;}]+)/gi,'[credential removed]')
  .replace(/\b(?:sk-[A-Za-z0-9_-]{10,}|gsk_[A-Za-z0-9_-]+|hf_[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9_-]+|github_pat_[A-Za-z0-9_]+|AIza[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g,'[token removed]')
  .replace(/\b[a-z][a-z0-9+.-]{1,20}:\/\/[^\s<>"']+/gi,'[link removed]')
  .replace(/[A-Za-z]:[\\/][^\r\n"'<>;,]*/g,'[path removed]')
  .replace(/\\\\[^\r\n"'<>;,]+/g,'[path removed]')
  .replace(/(?:^|[\s("'=])(?:\.{0,2}\/|~\/|\/)[^\s"'<>;,)]*/g,' [path removed]')
  .replace(/\b[\w.-]+(?:[\\/][\w .-]+)+/g,'[path removed]')
  .replace(/\b[\w.-]+\.(?:js|mjs|cjs|ts|tsx|jsx|json|sqlite|db|py|sh|ps1|env|txt|md)\b/gi,'[file removed]')
  .replace(/(?<!\w)\.env(?:\.[\w.-]+)?\b/gi,'[configuration file removed]')
  .replace(/\[?[a-fA-F0-9:.]*:[a-fA-F0-9:.]+(?:%[\w]+)?\]?/g,match=>isIP(match.replace(/^\[|\]$/g,'').split('%')[0])===6?'[address removed]':match)
  .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g,'[address removed]')
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'');
 return text.slice(0,6000).trim()||'[No shareable summary supplied]';
}
