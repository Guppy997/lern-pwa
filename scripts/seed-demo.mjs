// Legt eine Demo-Datenbank mit ausgedachten Projekten und ~250 Sessions übers
// Jahr an — zum Ausprobieren der App und für die README-Screenshots.
//
//   cd backend && npm ci && cd ..
//   node scripts/seed-demo.mjs [pfad]        # Standard: backend/data/demo.sqlite
//
// Schreibt nur in eine LEERE Datenbank: stehen dort schon Projekte, bricht das
// Skript ab, damit es nie versehentlich echte Lerndaten vermischt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Gleiche Zeitzone wie das Backend, sonst landen Sessions am falschen Kalendertag
process.env.TZ = 'Europe/Berlin';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.resolve(process.argv[2] ?? path.join(root, 'backend', 'data', 'demo.sqlite'));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// db.js legt Schema und Migrationen an, genau wie beim Start des Backends
process.env.DB_PATH = dbPath;
const { db } = await import('../backend/src/db.js');

if (db.prepare('SELECT COUNT(*) AS n FROM projects').get().n > 0) {
  console.error(`Abbruch: ${dbPath} enthält schon Projekte. Für Demo-Daten eine neue Datei angeben.`);
  process.exit(1);
}

// Fester Startwert: jeder Lauf erzeugt dieselben Daten (relativ zu heute)
let state = 7;
const rnd = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const toDb = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const isoDate = (d) => d.toLocaleDateString('sv-SE');
const at = (daysAgo, hour, minute) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const RECALLS = [
  'Regression: Steigung = Kovarianz / Varianz von x. R² sagt, wie viel Streuung das Modell erklärt.',
  'Subjuntivo nach Ausdrücken des Wunsches: quiero que vengas. Unregelmäßig: ser → sea, ir → vaya.',
  'useEffect läuft nach dem Render; Abhängigkeiten steuern, wann. Cleanup gegen doppelte Listener.',
  'Konfidenzintervall wird breiter, wenn n kleiner oder das Konfidenzniveau höher ist.',
  'Generics in TypeScript: Typ-Parameter wie Funktionsparameter, Constraints mit extends.'
];
const NOTES = [
  'Bei den Übungsaufgaben hängen geblieben, morgen mit Aufgabe 4 weiter.',
  'Gut im Flow, Handy lag im anderen Raum.',
  'Zu müde für Deep Work, nächstes Mal lieber vormittags.',
  null, null, null
];
const HEADINGS = [
  [{ heading: 'Multiple Regression', guess: 'Mehrere Einflussgrößen gleichzeitig, Effekte gegenseitig bereinigt' }],
  [{ heading: 'Custom Hooks', guess: 'Wiederverwendbare Logik mit State, Name beginnt mit use' }]
];
const GOALS = {
  'Statistik-Klausur': ['Kapitel 4: Konfidenzintervalle', 'Altklausur 2024 rechnen', 'Hypothesentests wiederholen'],
  'Spanisch B1': ['20 neue Vokabeln + Wiederholung', 'Subjuntivo üben', 'Hörverstehen Lektion 7'],
  'React & TypeScript': ['Eigenen Hook bauen', 'Generics verstehen', 'Formular mit Validierung']
};

// from/to: Zeitraum in Tagen vor heute, p: Wahrscheinlichkeit für einen Lerntag
const PROJECTS = [
  { name: 'Statistik-Klausur', status: 'active', from: 45, to: 1, p: 0.6, method: 'deep', plans: true, streak: true },
  { name: 'Spanisch B1', status: 'active', from: 95, to: 2, p: 0.35, method: 'sprint', plans: true },
  { name: 'React & TypeScript', status: 'active', from: 24, to: 3, p: 0.45, method: 'deep', plans: true },
  { name: 'Buchhaltung Grundlagen', status: 'paused', from: 150, to: 110, p: 0.3, method: 'sprint' },
  { name: 'Bachelorarbeit: Recherche', status: 'paused', from: null },
  { name: 'Python Basics', status: 'done', from: 205, to: 165, p: 0.45, method: 'deep' },
  { name: 'Online-Marketing Grundlagen', status: 'done', from: 270, to: 215, p: 0.35, method: 'sprint' },
  { name: 'Gitarre: Akkorde', status: 'done', from: 240, to: 225, p: 0.5, method: 'sprint', archived: true }
];

const insertProject = db.prepare('INSERT INTO projects (name, status, created_at, archived_at) VALUES (?, ?, ?, ?)');
const insertPlan = db.prepare(
  'INSERT INTO day_plans (project_id, date, goal, method, planned_sessions, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const insertSession = db.prepare(`INSERT INTO sessions
  (project_id, day_plan_id, mode, planned_minutes, paused_seconds, method_data, started_at, ended_at,
   efficiency_rating, feedback_note, recall_text, focus_seconds)
  VALUES (?, ?, 'free', ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const addSession = (projectId, planId, method, start) => {
  const planned = method === 'deep' ? 52 : 25;
  const paused = rnd() < 0.3 ? Math.round(rnd() * 240) : 0;
  const focus = Math.round(planned * 60 * (0.85 + rnd() * 0.15));
  const end = new Date(start.getTime() + (focus + paused) * 1000);
  insertSession.run(
    projectId, planId, planned, paused,
    rnd() < 0.12 ? JSON.stringify(pick(HEADINGS)) : null,
    toDb(start), toDb(end),
    pick([3, 4, 4, 4, 5, 5, 2]),
    pick(NOTES),
    rnd() < 0.45 ? pick(RECALLS) : null,
    focus
  );
};

db.transaction(() => {
  for (const p of PROJECTS) {
    const created = at((p.from ?? 30) + 2, 18, 0);
    const archivedAt = p.archived ? toDb(at(200, 20, 0)) : null;
    const projectId = insertProject.run(p.name, p.status, toDb(created), archivedAt).lastInsertRowid;
    if (p.from == null) continue;

    for (let daysAgo = p.from; daysAgo >= p.to; daysAgo--) {
      const inStreak = p.streak && daysAgo <= 5;
      if (!inStreak && rnd() > p.p) continue;
      const count = 1 + Math.floor(rnd() * (p.method === 'deep' ? 2 : 3));
      let planId = null;
      if (p.plans) {
        const planned = count + (rnd() < 0.4 ? 1 : 0);
        planId = insertPlan.run(
          projectId, isoDate(at(daysAgo, 12, 0)), pick(GOALS[p.name]), p.method, planned,
          toDb(at(daysAgo, 8, 30)), count >= planned && rnd() < 0.5 ? toDb(at(daysAgo, 21, 0)) : null
        ).lastInsertRowid;
      }
      let hour = 9 + Math.floor(rnd() * 8);
      for (let i = 0; i < count; i++) {
        addSession(projectId, planId, p.method, at(daysAgo, hour, Math.floor(rnd() * 50)));
        hour += p.method === 'deep' ? 2 : 1;
      }
    }

    // Heute: Statistik-Klausur mit Tagesplan, 2 von 3 Sessions schon erledigt
    if (p.streak) {
      const planId = insertPlan.run(
        projectId, isoDate(new Date()), 'Kapitel 5: Regressionsanalyse durcharbeiten', 'deep', 3,
        toDb(new Date(Date.now() - 4 * 3600e3)), null
      ).lastInsertRowid;
      addSession(projectId, planId, 'deep', new Date(Date.now() - 3.2 * 3600e3));
      addSession(projectId, planId, 'deep', new Date(Date.now() - 2 * 3600e3));
    }
  }
})();

const { projects, sessions } = db
  .prepare('SELECT (SELECT COUNT(*) FROM projects) AS projects, (SELECT COUNT(*) FROM sessions) AS sessions')
  .get();
console.log(`Demo-Daten angelegt: ${projects} Projekte, ${sessions} Sessions → ${dbPath}`);
db.close();
process.exit(0);
