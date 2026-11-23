// Liest für den Release-Workflow die aktuelle Version und die Notizen dazu.
//
// Quelle der Wahrheit sind die package.json-Dateien (müssen alle dieselbe
// Version haben) und der handgepflegte Changelog der App. Das Skript bricht
// ab, wenn etwas nicht zusammenpasst, damit nie ein halbes Release entsteht.
//
// Eingaben per Umgebungsvariable:
//   PACKAGES   package.json-Pfade, durch Leerzeichen getrennt
//   CHANGELOG  Pfad zur Changelog-Datei (.js oder .ts), exportiert CHANGELOG
// Ausgaben:
//   version=<x.y.z> in $GITHUB_OUTPUT, die Notizen in release-notes.md

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// GitHub Actions liest Log-Zeilen, die mit "::" beginnen, als Befehle
// (::add-mask::, ::warning:: …). Darum gilt hier:
// 1. Inhalte aus dem Changelog landen nur in release-notes.md, nie im Log.
// 2. Fehlermeldungen werden wie von GitHub vorgegeben maskiert, damit ein
//    Zeilenumbruch in einem Wert keine eigene Befehlszeile erzeugen kann.
function escapeCommandData(text) {
  return String(text).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function fail(message) {
  console.error(`::error::${escapeCommandData(message)}`);
  process.exit(1);
}

const packages = (process.env.PACKAGES ?? '').split(/\s+/).filter(Boolean);
if (packages.length === 0) fail('PACKAGES ist leer.');

const versions = packages.map((path) => ({ path, version: JSON.parse(readFileSync(path, 'utf8')).version }));
const version = versions[0].version;
const abweichend = versions.filter((v) => v.version !== version);
if (abweichend.length > 0) {
  fail(`Versionen passen nicht zusammen: ${versions.map((v) => `${v.path}=${v.version}`).join(', ')}`);
}
// Nur reine SemVer-Nummern, damit nichts Unerwartetes in Tag-Namen oder Befehle gerät.
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`Ungültige Version: ${version}`);

const changelogPath = process.env.CHANGELOG;
if (!changelogPath) fail('CHANGELOG ist nicht gesetzt.');
// Node 24 lädt .ts-Dateien direkt (Typen werden entfernt), .js als ES-Modul.
const { CHANGELOG } = await import(pathToFileURL(resolve(changelogPath)).href);
const entry = CHANGELOG?.find((e) => e.version === version);
if (!entry) fail(`Im Changelog (${changelogPath}) fehlt ein Eintrag für ${version}.`);

const punkte = entry.notes ?? entry.changes ?? [];
if (punkte.length === 0) fail(`Der Changelog-Eintrag für ${version} hat keine Punkte.`);

const datum = entry.date ? new Date(`${entry.date}T12:00:00Z`).toLocaleDateString('de-DE') : null;
const notes = [
  datum ? `Veröffentlicht am ${datum}.` : null,
  '',
  '## Was ist neu',
  '',
  // Ein Punkt bleibt ein Listenpunkt, auch wenn er Zeilenumbrüche enthält.
  ...punkte.map((p) => `- ${String(p).replace(/\s*\r?\n\s*/g, ' ')}`),
  '',
]
  .filter((zeile) => zeile !== null)
  .join('\n');

writeFileSync('release-notes.md', notes);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
// Nur geprüfte Werte ins Log: die Version (reine SemVer) und eine Zahl.
console.log(`Version ${version}, ${punkte.length} Punkte aus dem Changelog, Notizen in release-notes.md`);
