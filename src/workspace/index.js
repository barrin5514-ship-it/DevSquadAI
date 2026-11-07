import fs from 'node:fs';
import path from 'node:path';
import { ApiError } from '../middleware/errors.js';
import {createManagedRoot,managedRootState,verifyManagedRoot,rootHash} from '../services/managed-workspace-root.js';
export class Workspace {
  constructor(root,{managed=false,authorityRoot=null,database=null,initializer=createManagedRoot}={}) { fs.mkdirSync(root, { recursive: true }); this.root = fs.realpathSync(root); this.managed=managed;this.authorityRoot=authorityRoot;this.contextHash=database?rootHash(process.platform==='win32'?path.resolve(database).toLowerCase():path.resolve(database)):null;this.initializer=initializer; }
  resolve(relative) {
    if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes(':') || relative.includes('\0') || path.isAbsolute(relative) || relative.split('/').some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p))) throw new ApiError(400, 'Invalid workspace path');
    let current = this.root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      try { if (fs.lstatSync(current).isSymbolicLink()) throw new ApiError(400, 'Workspace links are not allowed'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    return current;
  }
  // Project notes are copied first; the trusted security policy is kept last.
  instructions(){
    const policy=path.join(this.authorityRoot,'AGENTS.md'),relative=path.relative(this.authorityRoot,this.root),dirs=[];
    if(!relative.startsWith('..')&&!path.isAbsolute(relative)){let dir=this.authorityRoot;dirs.push(dir);for(const bit of relative.split(path.sep).filter(Boolean)){dir=path.join(dir,bit);dirs.push(dir);}}else dirs.push(this.root);
    const inherited=[];for(const dir of dirs){for(const name of ['AGENTS.override.md','AGENTS.md']){const file=path.join(dir,name);try{fs.lstatSync(file);if(path.resolve(file)!==path.resolve(policy))inherited.push(file);break;}catch(e){if(e.code!=='ENOENT')throw e;}}}
    return {instructionSources:inherited,mandatorySources:[policy]};
  }
  create(id,metadata={}) { const target=this.resolve(id);if(this.managed&&metadata.managed!==false){if(id.includes('/'))throw new ApiError(400,'Managed workspace identities cannot contain directories');this.initializer(target,{...this.instructions(),identity:id,contextHash:this.contextHash,metadata:{id,name:metadata.name||id,description:metadata.description||''},resume:true});}else fs.mkdirSync(target);return id; }
  status(id){const root=this.resolve(id),state=managedRootState(root);if(!state||state.contextHash!==this.contextHash||state.identity!==id)return null;return {id,phase:state.phase,instructionsHash:state.instructionsHash,contextHash:state.contextHash};}
  pending(){if(!this.managed)return [];return fs.readdirSync(this.root,{withFileTypes:true}).slice(0,2000).filter(e=>e.isDirectory()&&!e.isSymbolicLink()).flatMap(e=>{const s=managedRootState(this.resolve(e.name));return s?.contextHash===this.contextHash&&s.identity===e.name&&s.metadata?.id===e.name?[{id:e.name,name:s.metadata.name,description:s.metadata.description,phase:s.phase}]:[];});}
  recover(id){const state=managedRootState(this.resolve(id));if(!state||state.contextHash!==this.contextHash||state.identity!==id||state.metadata?.id!==id)throw new ApiError(409,'This folder is not a pending workspace owned by this database');this.create(id,state.metadata);return state.metadata;}
  verify(id){return verifyManagedRoot(this.resolve(id),{identity:id,contextHash:this.contextHash});}
  write(project, relative, content, { approveOverwrite = false } = {}) {
    if(this.status(project)&&/^AGENTS(?:\.override)?\.md$/i.test(path.basename(relative)))throw new ApiError(403,'Managed security instructions are protected; use a separate policy change');
    const target = this.resolve(`${project}/${relative}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    try { fs.writeFileSync(target, content, { flag: approveOverwrite ? 'w' : 'wx' }); } catch (e) { if (e.code === 'EEXIST') throw new ApiError(409, 'File exists; explicit overwrite approval required'); throw e; }
    return relative;
  }
}
