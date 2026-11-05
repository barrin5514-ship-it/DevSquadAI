import {codexProfileIds} from './codex-profiles.js';

// A confirmed quota failure may hand the same saved step to the other login.
// Unknown process outcomes never switch: overlapping workers could damage files.
export async function profileFailover(studio,job,agent,phase,error,attempted){
 if(!codexProfileIds.includes(agent)||error?.code!=='usage_limit'||error.stopped!==true)return false;
 attempted.add(agent);const next=codexProfileIds.find(id=>!attempted.has(id));if(!next)return false;
 const roles={...job.state.roles,[phase]:next};
 try{studio.roleManager.validate(roles,job.state.authors);}catch{return false;}
 if(!await studio.workers.profileAvailable?.(next,studio.root(job.project_id).root))return false;
 studio.change(job.id,'running',{roles,currentAgent:next},'worker_handoff',next);
 studio.event(job.id,'profile_switched',{time:new Date().toISOString(),reason:'usage_limit',from:agent,to:next,phase,summary:'Codex reached its usage limit. Continuing the saved step with the other signed-in profile.'},next);
 return true;
}
