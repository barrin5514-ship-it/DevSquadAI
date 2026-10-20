export const initialAgents = [
  ['orchestrator','Orchestrator','orchestrator',['plan','coordinate'],'ready'],
  ['junior','Junior Developer','junior_developer',['implement'],'ready'],
  ['qa','QA Tester','qa_tester',['test','report'],'disabled'],
  ['senior','Senior Developer','senior_developer',['review','approve'],'manual_review']
];
export function registerAgent(db, { id, name, role, capabilities, status = 'disabled', providerId = null, systemPrompt = '' }) {
  db.prepare('INSERT INTO agents VALUES (?,?,?,?,?,?,?)').run(id,name,role,JSON.stringify(capabilities),status,providerId,systemPrompt);
  if (db.prepare('SELECT id FROM positions WHERE id=?').get(role)) db.prepare('INSERT INTO agent_positions VALUES (?,?)').run(id,role);
}
export function seedAgents(db) { for (const [id,name,role,capabilities,status] of initialAgents) if (!db.prepare('SELECT id FROM agents WHERE id=?').get(id)) registerAgent(db,{id,name,role,capabilities,status}); }
