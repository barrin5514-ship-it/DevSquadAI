import { DatabaseSync, backup } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  try {
    db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
    const dir = new URL('./migrations/', import.meta.url);
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
      if (db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(file)) continue;
      db.exec('BEGIN IMMEDIATE');
      try { db.exec(fs.readFileSync(new URL(file, dir), 'utf8')); db.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(file, new Date().toISOString()); db.exec('COMMIT'); }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    return db;
  } catch (error) { db.close(); throw error; }
}
export async function backupDatabase(db, directory) {
  const target = path.join(directory, `backup-${Date.now()}-${randomUUID()}.sqlite`);
  try {
    fs.mkdirSync(directory, { recursive: true });
    await backup(db, target);
    const check = new DatabaseSync(target, { readOnly: true });
    try { if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || check.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Integrity check failed'); } finally { check.close(); }
    return target;
  } catch { throw new Error('Backup failed; existing database and backups were preserved'); }
}
