import {ProjectStudio} from './services/project-studio.js';
import {consoleRoutes} from './routes/console.js';
import {claimRuntime} from './services/runtime-lease.js';
import express from 'express';
import { openDatabase } from './database/index.js';
import { Workspace } from './workspace/index.js';
import { Store } from './models/store.js';
import { ProjectService } from './services/projects.js';
import { seedAgents } from './agents/registry.js';
import { markInterrupted } from './orchestrator/recovery.js';
import { controllers } from './controllers/api.js';
import { routes } from './routes/api.js';
import { ApiError, errorHandler } from './middleware/errors.js';
import { GenerationService } from './orchestrator/generation.js';
import { aiRoutes } from './routes/ai.js';
import { TeamOrchestrator } from './orchestrator/team.js';
import { teamRoutes } from './routes/team.js';
import { fileURLToPath } from 'node:url';
export function createApp(config, options = {}) {
  const workspace = new Workspace(config.workspace), db = openDatabase(config.database);
  try {
    claimRuntime(db,config.database);
    seedAgents(db); markInterrupted(db);
    const store = new Store(db), service = new ProjectService(store, workspace), app = express();
    const ai = new GenerationService(store, workspace, config, options);
    const team = new TeamOrchestrator(store,workspace,config,ai.usage,options);
    team.studio=new ProjectStudio(team,service,options.studioOptions||{});
    app.disable('x-powered-by'); app.use(express.json({limit:'32kb'}));
    app.use('/api/console',consoleRoutes(team,service));
    app.use('/api/team',teamRoutes(team));
    app.get('/team-dashboard.css',(req,res)=>res.sendFile(fileURLToPath(new URL('./dashboard/dashboard.css',import.meta.url))));
    app.get('/',(req,res)=>res.redirect('/team'));
    app.get('/team',(req,res)=>res.set('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'").sendFile(fileURLToPath(new URL('./dashboard/index.html',import.meta.url))));
    app.get('/team/zapier-setup',(req,res)=>res.type('text/plain').sendFile(fileURLToPath(new URL('../docs/zapier-setup.md',import.meta.url))));
    app.get('/team-dashboard.js',(req,res)=>res.sendFile(fileURLToPath(new URL('./dashboard/dashboard.js',import.meta.url))));
    app.get('/team/style-preview',(req,res)=>res.set('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'none'; frame-ancestors 'none'; form-action 'none'").sendFile(fileURLToPath(new URL('./dashboard/style-preview.html',import.meta.url))));
    app.get('/team-style-preview.css',(req,res)=>res.sendFile(fileURLToPath(new URL('./dashboard/style-preview.css',import.meta.url))));
    app.use('/api',aiRoutes(ai));
    app.use('/api',routes(controllers(store,service,config)));
    app.use((req,res,next)=>next(new ApiError(404,'Route not found'))); app.use(errorHandler);
    return {app,db,store,service,workspace,ai,team};
  } catch(error) { db.close(); throw error; }
}
