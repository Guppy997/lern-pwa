import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'lern.sqlite');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
// better-sqlite3 lässt Foreign Keys standardmäßig aus — ohne das hier sind die
// REFERENCES-Constraints unten reine Dokumentation und werden nie geprüft.
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS day_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    date TEXT NOT NULL,
    goal TEXT NOT NULL,
    method TEXT NOT NULL,
    planned_sessions INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, date)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    day_plan_id INTEGER REFERENCES day_plans(id),
    mode TEXT NOT NULL,
    planned_minutes INTEGER NOT NULL,
    paused_seconds INTEGER NOT NULL DEFAULT 0,
    method_data TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    efficiency_rating INTEGER,
    feedback_note TEXT
  );
`);

// Nachträgliche Spalten für bestehende Datenbanken (SQLite kennt kein ADD COLUMN IF NOT EXISTS)
const addColumnIfMissing = (table, column, definition) => {
  const exists = db
    .prepare(`SELECT 1 FROM pragma_table_info(?) WHERE name = ?`)
    .get(table, column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
};

addColumnIfMissing('sessions', 'recall_text', 'TEXT');
addColumnIfMissing('sessions', 'focus_seconds', 'INTEGER');
addColumnIfMissing('day_plans', 'completed_at', 'TEXT');
addColumnIfMissing('projects', 'archived_at', 'TEXT');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
  CREATE INDEX IF NOT EXISTS idx_day_plans_project_id ON day_plans(project_id);
`);

// WAL-Datei klein halten, damit im Ernstfall (Stromausfall, Backup zwischendurch)
// möglichst wenig ungecheckpointet ist. PASSIVE blockiert keine parallelen Schreiber.
const checkpointInterval = setInterval(() => {
  db.pragma('wal_checkpoint(PASSIVE)');
}, 5 * 60 * 1000).unref();

const shutdown = () => {
  clearInterval(checkpointInterval);
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
