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
export function createApp(config, options = {}) {
  const workspace = new Workspace(config.workspace), db = openDatabase(config.database);
  try {
    seedAgents(db); markInterrupted(db);
    const store = new Store(db), service = new ProjectService(store, workspace), app = express();
    const ai = new GenerationService(store, workspace, config, options);
    app.disable('x-powered-by'); app.use(express.json({limit:'32kb'}));
    app.use('/api',aiRoutes(ai));
    app.use('/api',routes(controllers(store,service)));
    app.use((req,res,next)=>next(new ApiError(404,'Route not found'))); app.use(errorHandler);
    return {app,db,store,service,workspace,ai};
  } catch(error) { db.close(); throw error; }
}
