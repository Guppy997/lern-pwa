// Erzeugt die Screenshots für die README per headless Chrome (DevTools-Protokoll,
// keine zusätzlichen Pakete). Voraussetzungen: Node 22+, Google Chrome, und die
// App läuft mit DEMO-Daten (siehe scripts/seed-demo.mjs):
//
//   Backend:  cd backend && DB_PATH=data/demo.sqlite TZ=Europe/Berlin npm start
//   Frontend: cd frontend && npm run dev
//   Dann:     node scripts/readme-screenshots.mjs
//
// Umgebungsvariablen: APP_URL (Standard http://127.0.0.1:5173/), CHROME_PATH,
// OUT_DIR (Standard docs/screenshots), CDP_PORT (Standard 9333)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_URL = (process.env.APP_URL || 'http://127.0.0.1:5173/').replace(/\/?$/, '/');
const OUT_DIR = path.resolve(process.env.OUT_DIR || path.join(root, 'docs', 'screenshots'));
const CDP_PORT = Number(process.env.CDP_PORT) || 9333;
const CHROME_PATH = process.env.CHROME_PATH || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : 'google-chrome');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sicherung: nur mit Demo-Daten fotografieren, nie mit echten Projekten
const projects = await fetch(`${APP_URL}api/projects`).then((r) => r.json()).then((d) => d.projects).catch(() => null);
if (!projects) {
  console.error(`Keine App unter ${APP_URL} erreichbar.`);
  process.exit(1);
}
if (!projects.some((p) => p.name === 'Statistik-Klausur')) {
  console.error('Abbruch: Die App zeigt keine Demo-Daten. Backend mit DB_PATH auf die Demo-Datenbank starten.');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lern-pwa-shots-'));
const chrome = spawn(CHROME_PATH, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profileDir}`, 'about:blank'
], { stdio: 'ignore' });

const cdpJson = async (p) => (await fetch(`http://127.0.0.1:${CDP_PORT}${p}`)).json();
let version;
for (let i = 0; i < 50 && !version; i++) {
  await sleep(200);
  try { version = await cdpJson('/json/version'); } catch {}
}
const connect = async (url) => {
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); });
  const send = (method, params = {}) => new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  return { ws, send };
};

// Benachrichtigungen erlauben, damit der "Erinnerungen aktivieren"-Banner nicht im Bild ist
const browser = await connect(version.webSocketDebuggerUrl);
await browser.send('Browser.grantPermissions', { origin: new URL(APP_URL).origin, permissions: ['notifications'] });
const page = await connect((await cdpJson('/json')).find((t) => t.type === 'page').webSocketDebuggerUrl);
const { send } = page;

const evaluate = async (expr) =>
  (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const waitFor = async (expr) => {
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    if (await evaluate(`Boolean(${expr})`)) return;
  }
  throw new Error(`Timeout beim Warten auf: ${expr}`);
};
const click = (selector, text) => evaluate(`(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
    .find((e) => ${text ? `e.textContent.includes(${JSON.stringify(text)})` : 'true'});
  if (!el) throw new Error('Nicht gefunden: ${selector} ${text ?? ''}');
  el.click();
})()`);
// React bekommt Eingaben nur über den nativen Setter + input-Event mit
const type = (selector, value) => evaluate(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
const scrollTo = (selector, margin = 16) =>
  evaluate(`window.scrollTo(0, document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top + scrollY - ${margin})`);
const open = async (waitExpr) => {
  await send('Page.navigate', { url: APP_URL });
  await waitFor(waitExpr);
  await sleep(700);
};
const shot = async (name) => {
  await sleep(300);
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(result.data, 'base64'));
  console.log(`✓ ${path.relative(root, path.join(OUT_DIR, name))}`);
};
const desktop = () => send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 940, deviceScaleFactor: 1, mobile: false });
const phone = () => send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const boardReady = 'document.querySelectorAll(".project-card").length > 0 && document.querySelector(".heatmap-cell[data-date]")';

try {
  await send('Page.enable');
  await send('Runtime.enable');

  // 1) Desktop: Board mit 12-Monats-Lernkalender
  await desktop();
  await open(boardReady);
  await evaluate("localStorage.setItem('lern-pwa:heatmap-months', '12')");
  await open(boardReady);
  await shot('board-desktop.png');
  await evaluate("localStorage.removeItem('lern-pwa:heatmap-months')");

  // 2) Handy: Startseite mit 3-Monats-Kalender und Filter
  await phone();
  await open(boardReady);
  await shot('start-handy.png');

  // 3) Handy: Projektkarte mit geöffnetem ⋯-Menü
  await scrollTo('.board-columns');
  await click('.menu-toggle');
  await shot('aktionen-handy.png');

  // 4) Handy: Projekt mit Tagesplan und Verlauf
  await open(boardReady);
  await click('.project-card-main', 'Statistik-Klausur');
  await waitFor('document.querySelector(".plan-summary")');
  await shot('projekt-handy.png');

  // 5) Handy: laufender Fokus-Timer
  await click('button', 'Session starten');
  await waitFor('document.querySelector(".timer-card")');
  await sleep(2000);
  await shot('timer-handy.png');

  // 6) Handy: Feedback nach der Session (wird nicht gespeichert, siehe Aufräumen)
  await click('button', 'Session beenden');
  await waitFor('document.querySelector(".stars")');
  await type('textarea', 'Regressionsanalyse: Die Steigung zeigt, wie stark y mit x steigt. R² = Anteil der erklärten Streuung, Residuen sollten kein Muster haben.');
  await click('.stars button:nth-child(4)');
  await evaluate(`(() => {
    const note = document.querySelectorAll('textarea')[1];
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(note, 'Bei der Interpretation von R² kurz hängen geblieben, morgen mit den Übungsaufgaben weiter.');
    note.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await shot('feedback-handy.png');

  // 7) Handy: Statistik (Monat), Diagramm + Projekte + Bewertungen im Bild
  await open(boardReady);
  await click('.stats-button');
  await waitFor('document.querySelector(".chart")');
  await click('.period-toggle button', 'Monat');
  await waitFor('document.querySelector(".period-nav-label")?.textContent.match(/\\d{4}/) && document.querySelector(".rating-value")');
  await sleep(500);
  await scrollTo('.chart');
  await shot('statistik-handy.png');
} finally {
  // Aufräumen: die für Timer/Feedback gestartete Session wieder verwerfen
  const demo = projects.find((p) => p.name === 'Statistik-Klausur');
  const detail = await fetch(`${APP_URL}api/projects/${demo.id}`).then((r) => r.json()).catch(() => null);
  for (const s of detail?.sessions.filter((x) => !x.ended_at) ?? []) {
    await fetch(`${APP_URL}api/sessions/${s.id}`, { method: 'DELETE' });
  }
  page.ws.close();
  browser.ws.close();
  chrome.kill();
  await sleep(500); // Chrome schreibt beim Beenden noch kurz ins Profil
  fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3 });
}
