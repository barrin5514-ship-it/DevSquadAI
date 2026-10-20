export function markInterrupted(db) {
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("UPDATE tasks SET status='requires_review', updated_at=? WHERE status='running'").run(now);
    db.prepare("UPDATE agent_executions SET status='requires_review', ended_at=? WHERE status='running'").run(now);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
