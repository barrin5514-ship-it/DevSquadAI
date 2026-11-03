import {ApiError} from '../middleware/errors.js';
import {transaction} from '../middleware/ai-validation.js';
const local=new Map();
// Prevent a second backend from treating an active worker as a crashed operation.
export function claimRuntime(db,filename){
 transaction(db,()=>{
  const old=db.prepare('SELECT pid FROM team_runtime_lease WHERE id=1').get();
  if(local.get(filename)?.isOpen)throw new ApiError(409,'Another backend already owns this task database');
  if(old&&old.pid!==process.pid){let alive=true;try{process.kill(old.pid,0);}catch(e){alive=e.code!=='ESRCH';}if(alive)throw new ApiError(409,'Another backend process may still own this task database');}
  db.prepare('INSERT INTO team_runtime_lease VALUES (1,?) ON CONFLICT(id) DO UPDATE SET pid=excluded.pid').run(process.pid);
 });
 local.set(filename,db);
}
