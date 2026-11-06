// Compatibility entry point for the existing project runner.
export async function profileFailover(studio,job,agent,phase,error,attempted,options){return studio.failover.tryNext(job,agent,phase,error,attempted,options);}
