import { db } from './db.js';
import fs from 'node:fs';
import path from 'node:path';

// Läuft als eigenständiges Skript (nicht Teil des Servers) — per Cron aufgerufen.
// VACUUM INTO erzeugt eine einzelne, in sich konsistente Snapshot-Datei,
// unabhängig vom aktuellen WAL-Zustand (im Gegensatz zu `cp lern.sqlite`, das
// die noch nicht eingecheckpointeten Änderungen aus der -wal-Datei verpasst).
const backupDir = process.env.BACKUP_DIR || path.join(path.dirname(process.env.DB_PATH || ''), 'backups');
const keepDays = Number(process.env.BACKUP_KEEP_DAYS) || 14;

fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 10);
const target = path.join(backupDir, `lern-${stamp}.sqlite`);

db.prepare('VACUUM INTO ?').run(target);
console.log(`Backup geschrieben: ${target}`);

const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
for (const file of fs.readdirSync(backupDir)) {
  if (!file.startsWith('lern-') || !file.endsWith('.sqlite')) continue;
  const full = path.join(backupDir, file);
  if (fs.statSync(full).mtimeMs < cutoff) {
    fs.unlinkSync(full);
    console.log(`Alte Sicherung gelöscht: ${full}`);
  }
}

db.close();
