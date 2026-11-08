// A dry plan is not permission. This module cannot call, change roles, release
// locks, or restart completed work. It explains safe choices for owner review.
export function continuationPlan({roles,phase,checkpoint,completedRoles=[],authors=[],candidates=[],allowed=[],failure}) {
 const blocked=reason=>({status:'PAUSED',reason,checkpoint,roles:{...roles},needsApproval:true,dispatch:false});
 if(!checkpoint)return blocked('A trustworthy saved checkpoint is required.');
 if(failure?.unknownOutcome||failure?.stopped!==true)return blocked('Unknown outcome or unverified termination; retain reservations and locks.');
 if(!['usage_limit','quota_exhausted','subscription_exhausted','rate_limit','provider_outage','auth_expired','connection_error','timeout'].includes(failure.code))return blocked('Task, schema, context or unclassified failure needs diagnosis; do not call it quota exhaustion.');
 if(completedRoles.includes(phase))return blocked('This phase is completed; do not rerun its work.');
 const byId=new Map(candidates.map(c=>[c.id,c]));
 const eligible=c=>{
  if(!allowed.includes(c.id)||c.id===roles[phase]||c.availability!=='AVAILABLE'||c.roleCapabilities?.[phase]!=='VERIFIED'||!c.authorized||c.remainingKnown!==true||c.remaining<=0||!c.family)return false;
  const next={...roles,[phase]:c.id},families=Object.values(next).map(id=>byId.get(id)?.family);
  if(families.some(f=>!f)||new Set(families).size!==3)return false;
  if(phase==='tester'&&authors.some(a=>a.role==='builder'&&a.family===c.family))return false;
  if(phase==='reviewer'&&authors.some(a=>['builder','tester'].includes(a.role)&&a.family===c.family))return false;
  return c.costAuthorized===true;
 };
 const choices=candidates.filter(eligible).sort((a,b)=>
  (b.verifiedRoleQuality??-1)-(a.verifiedRoleQuality??-1)||
  (b.verifiedReliability??-1)-(a.verifiedReliability??-1)||
  (a.estimatedCost??Infinity)-(b.estimatedCost??Infinity));
 if(!choices.length)return blocked('No verified, available, independently qualified and authorized replacement. Keep completed roles unchanged; broader reshuffling needs separate evidence and approval.');
 const best=choices[0];
 return {status:'PROPOSED',from:roles[phase],to:best.id,phase,roles:{...roles,[phase]:best.id},checkpoint,completedRoles:[...completedRoles],needsApproval:true,dispatch:false,reason:'Replace only the unavailable role; verified quality and reliability take precedence over price. Unknown quality remains unknown.'};
}
