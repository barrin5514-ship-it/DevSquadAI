// Network connection heartbeats are not worker activity. Call touch only when
// the worker actually sends bytes, and close after every success or failure.
export function workerIdle(onIdle,ms=180000){let timer,closed=false;const touch=()=>{if(closed)return;clearTimeout(timer);timer=setTimeout(onIdle,ms);};touch();return {touch,close(){closed=true;clearTimeout(timer);}};}
