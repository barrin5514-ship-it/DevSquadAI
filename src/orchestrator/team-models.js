import {expansion} from '../providers/expansion.js';
// Prior live verification is evidence of access, not an assertion of present uptime.
export const teamModels = Object.freeze([
 {key:'groq',provider:'groq',model:'openai/gpt-oss-120b',classification:'free',roles:['coding','debugging','testing','planning'],verifiedAt:'2026-10-20',evidence:'Historical Groq generation; current access requires dispatch',expires:null},
 {key:'laguna',provider:'openrouter',model:'poolside/laguna-s-2.1:free',classification:'free',roles:['coding','testing','debugging','planning'],verifiedAt:'2026-10-20',evidence:'Historical free benchmark; current zero pricing/access checked before each dispatch',expires:'2026-10-31'},
 {key:'minimax',provider:'openrouter',model:'minimax/minimax-m3.1-flash:free',classification:'free',roles:['planning','debugging','testing','coding'],verifiedAt:'2026-10-20',evidence:'Historical free benchmark; current zero pricing/access checked before each dispatch',expires:'2026-10-22T12:00:00Z'},
 ...Object.entries(expansion).map(([key,s])=>({key,provider:key,model:s.model,classification:'free',roles:s.roles,verifiedAt:null,evidence:'Implemented; account/free verification and owner routing activation required',expires:null,context:s.context,maxOutput:s.maxOutput,requiresVerification:true})),
 {key:'deepseek',provider:'deepseek',model:'deepseek-flash',classification:'paid',roles:['coding','debugging','review'],verifiedAt:null,evidence:'Prepared only; paid requests disabled',expires:null}
]);
export const teamRoles = Object.freeze({owner:'Human owner',lead:'DeepSeek',reviewer:'DeepSeek',reviewMode:'owner_authorized_paid',specializations:'provisional'});
