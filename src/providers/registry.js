// Credentials are resolved from configuration only when a future adapter needs them.
// Never persist adapter secrets or return configuration metadata through the API.
export function listProviders(db) { return db.prepare('SELECT id, provider_name, model_name, enabled FROM ai_providers').all(); }
