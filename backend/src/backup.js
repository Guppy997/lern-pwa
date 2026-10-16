import { db } from './db.js';
import fs from 'node:fs';
import path from 'node:path';

// Läuft als eigenständiges Skript (nicht Teil des Servers) — per Cron aufgerufen:
//   docker compose exec -T backend node src/backup.js
// VACUUM INTO erzeugt eine einzelne, in sich konsistente Snapshot-Datei,
// unabhängig vom aktuellen WAL-Zustand (im Gegensatz zu `cp lern.sqlite`, das
// die noch nicht eingecheckpointeten Änderungen aus der -wal-Datei verpasst).
// Neben der tatsächlich geöffneten Datenbank ablegen (db.name), auch wenn DB_PATH
// nicht gesetzt ist und der Standardpfad aus db.js greift.
const backupDir = process.env.BACKUP_DIR || path.join(path.dirname(db.name), 'backups');
const keepDays = Number(process.env.BACKUP_KEEP_DAYS) || 14;

fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toLocaleDateString('sv-SE'); // lokales Datum (TZ=Europe/Berlin)
const target = path.join(backupDir, `lern-${stamp}.sqlite`);

// VACUUM INTO bricht ab, wenn die Zieldatei existiert — ein zweiter Lauf am
// selben Tag (z. B. manuell vor einem Update) ersetzt die Tagessicherung
fs.rmSync(target, { force: true });
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
process.exit(0);
