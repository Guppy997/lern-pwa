export const TIME_SYSTEMS = [
  { id: 'sprint', label: '25 / 5 — Schnelle Sprints', minutes: 25, breakMinutes: 5 },
  { id: 'deep', label: '52 / 17 — Tiefe Fokus-Phasen', minutes: 52, breakMinutes: 17 },
  { id: 'free', label: 'Freier Projekt-Timer', minutes: null, breakMinutes: null }
];

export const BOARD_COLUMNS = [
  { id: 'active', label: 'Aktiv' },
  { id: 'paused', label: 'Pausiert' },
  { id: 'done', label: 'Abgeschlossen' }
];

export const timeSystemMinutes = (methodId, fallbackMinutes) => {
  if (methodId.startsWith('free:')) return Number(methodId.split(':')[1]) || fallbackMinutes || 45;
  const system = TIME_SYSTEMS.find((s) => s.id === methodId);
  return system?.minutes || fallbackMinutes || 45;
};

export const breakMinutesFor = (methodId) => {
  if (methodId.startsWith('free:')) return null;
  return TIME_SYSTEMS.find((s) => s.id === methodId)?.breakMinutes ?? null;
};

export const methodLabel = (methodId) => {
  if (methodId.startsWith('free:')) return `Freier Timer (${methodId.split(':')[1]} min)`;
  return TIME_SYSTEMS.find((s) => s.id === methodId)?.label || methodId;
};

// Beste Zuordnung eines Zeitsystems für eine wiederaufgenommene Session,
// bei der nur die geplanten Minuten in der DB stehen
export const methodIdForMinutes = (minutes) => {
  const system = TIME_SYSTEMS.find((s) => s.minutes === minutes);
  return system ? system.id : `free:${minutes}`;
};

// SQLite speichert datetime('now') als UTC ohne Zeitzonen-Suffix —
// ohne das 'Z' würde der Browser die Zeit als lokale Zeit fehlinterpretieren
export const parseDbDate = (dbDate) => new Date(dbDate.replace(' ', 'T') + 'Z');

export const formatDuration = (totalSeconds) => {
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
};

export const notificationsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const notificationPermission = () =>
  notificationsSupported() ? Notification.permission : 'unsupported';

export const requestNotificationPermission = async () => {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

// Zeigt eine Browser-Benachrichtigung, wenn die Berechtigung bereits erteilt wurde.
// Läuft die App im Hintergrund-Tab, holt das den Nutzer zurück; ist sie sichtbar,
// reicht der Signalton (kein doppeltes Stören).
export const notify = (title, body) => {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  try {
    new Notification(title, { body, icon: '/icon-192.png', tag: 'lern-pwa' });
  } catch {
    // Benachrichtigung fehlgeschlagen — Signalton hat den Nutzer ohnehin schon erreicht.
  }
};

// Ein einziger, wiederverwendeter AudioContext. Browser suspendieren einen
// AudioContext, der außerhalb einer echten Nutzergeste (Klick/Tap) erzeugt
// wird — playChime() wird aber aus einem setInterval-Tick aufgerufen (Timer
// läuft ab), das zählt nicht als Geste. Darum: primeAudio() aus echten
// Klick-Handlern aufrufen (z. B. "Session starten"), damit der Context schon
// läuft, wenn der Chime später fällig wird.
let audioCtx = null;
const getAudioContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
};

export const primeAudio = () => {
  try {
    getAudioContext()?.resume();
  } catch {
    // ignorieren — playChime versucht es beim eigentlichen Ton ohnehin nochmal
  }
};

// Kurzer, dezenter Signalton per Web Audio API — kein Audio-Asset nötig.
export const playChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.5);
    });
    // Context bleibt offen (wiederverwendet für die nächste Session) — nicht
    // mehr schließen wie zuvor, sonst bräuchte jede weitere Session wieder
    // eine neue Geste, um einen frischen Context zu erzeugen.
  } catch {
    // Web Audio nicht verfügbar — Stille ist ok, Timer-UI zeigt das Ende ohnehin an.
  }
};
