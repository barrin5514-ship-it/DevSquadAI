import fs from 'node:fs';
import path from 'node:path';
import { ApiError } from '../middleware/errors.js';
export class Workspace {
  constructor(root) { fs.mkdirSync(root, { recursive: true }); this.root = fs.realpathSync(root); }
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
  create(id) { fs.mkdirSync(this.resolve(id)); return id; }
  write(project, relative, content, { approveOverwrite = false } = {}) {
    const target = this.resolve(`${project}/${relative}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    try { fs.writeFileSync(target, content, { flag: approveOverwrite ? 'w' : 'wx' }); } catch (e) { if (e.code === 'EEXIST') throw new ApiError(409, 'File exists; explicit overwrite approval required'); throw e; }
    return relative;
  }
}
