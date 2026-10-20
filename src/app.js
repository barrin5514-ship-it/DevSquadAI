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
export function createApp(config) {
  const workspace = new Workspace(config.workspace), db = openDatabase(config.database);
  try {
    seedAgents(db); markInterrupted(db);
    const store = new Store(db), service = new ProjectService(store, workspace), app = express();
    app.disable('x-powered-by'); app.use(express.json({limit:'32kb'}));
    app.use('/api',routes(controllers(store,service)));
    app.use((req,res,next)=>next(new ApiError(404,'Route not found'))); app.use(errorHandler);
    return {app,db,store,service,workspace};
  } catch(error) { db.close(); throw error; }
}
