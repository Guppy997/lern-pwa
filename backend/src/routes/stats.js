import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const isoDate = (d) => d.toLocaleDateString('sv-SE'); // lokales Datum, passend zum SQL-'localtime'

// Montag der Woche, die `date` enthält
const mondayOf = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

// offset=0 -> aktuelle Kalenderwoche (Mo-So), -1 -> vorherige, usw.
const weekDates = (offset) => {
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });
};

// offset=0 -> aktueller Kalendermonat, -1 -> vorheriger, usw.
const monthDates = (offset) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => isoDate(new Date(year, month, i + 1)));
};

// Jan-Dez des laufenden Kalenderjahres. Nutzt seit v1.6.0 nur noch eine ältere,
// noch nicht aktualisierte App — darum bleibt die Periode bestehen.
const currentYearDates = () => {
  const year = new Date().getFullYear();
  const dates = [];
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) dates.push(isoDate(new Date(year, month, day)));
  }
  return dates;
};

// Lernkalender der Startseite: vom 1. des Monats vor (months - 1) Monaten bis
// heute — bei 3 Monaten am 16.10. also 01.08.–16.10. Keine Zukunft, die wäre
// im Kalender nur leere Fläche.
const lastMonthsDates = (months) => {
  const today = new Date();
  const end = isoDate(today);
  const dates = [];
  for (const d = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1); isoDate(d) <= end; d.setDate(d.getDate() + 1)) {
    dates.push(isoDate(d));
  }
  return dates;
};

// Echte Fokuszeit einer Session: vom Client gemeldete aktive Zeit; für Alt-Sessions
// ohne focus_seconds die Wandzeit minus Pausen, gedeckelt auf die geplante Dauer.
// Pro Session auf ganze Sekunden, damit Tages- und Projektsummen exakt übereinstimmen.
const FOCUS_SQL = `CAST(COALESCE(
  s.focus_seconds,
  MIN(
    MAX(0, (julianday(s.ended_at) - julianday(s.started_at)) * 86400 - s.paused_seconds),
    s.planned_minutes * 60
  )
) AS INTEGER)`;

const IN_RANGE_SQL = `s.ended_at IS NOT NULL AND date(s.started_at, 'localtime') BETWEEN ? AND ?`;

// Tageszeiten für die Bewertungs-Auswertung; die Nacht läuft über Mitternacht
// (Stunden 0–4 zählen als 24–28)
const DAYTIMES = [
  { key: 'morning', label: 'Vormittag', from: 5, to: 12 },
  { key: 'afternoon', label: 'Nachmittag', from: 12, to: 17 },
  { key: 'evening', label: 'Abend', from: 17, to: 22 },
  { key: 'night', label: 'Nacht', from: 22, to: 29 }
];
const daytimeOf = (hour) => {
  const h = hour < 5 ? hour + 24 : hour;
  return DAYTIMES.find((t) => h >= t.from && h < t.to);
};

const average = (ratings) =>
  ratings.length ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 100) / 100 : null;

const summarizeRatings = (rows) => ({
  average: average(rows.map((r) => r.rating)),
  count: rows.length,
  byDaytime: DAYTIMES.map((t) => {
    const ratings = rows.filter((r) => daytimeOf(r.hour) === t).map((r) => r.rating);
    return { key: t.key, label: t.label, average: average(ratings), count: ratings.length };
  }).filter((t) => t.count > 0)
});

// GET /api/stats?period=week|month|lastMonths|currentYear&offset=0&months=12
// -> Fokuszeit pro Tag, dazu Lernzeit pro Projekt und Auswertung der Bewertungen
router.get('/', (req, res) => {
  const period = ['month', 'currentYear', 'lastMonths'].includes(req.query.period) ? req.query.period : 'week';
  const offset = Number.parseInt(req.query.offset, 10) || 0;
  const months = Math.min(12, Math.max(1, Number.parseInt(req.query.months, 10) || 12));

  const dateKeys = {
    week: () => weekDates(offset),
    month: () => monthDates(offset),
    currentYear: currentYearDates,
    lastMonths: () => lastMonthsDates(months)
  }[period]();
  const range = [dateKeys[0], dateKeys[dateKeys.length - 1]];

  const rows = db
    .prepare(
      `SELECT date(s.started_at, 'localtime') AS date,
              SUM(${FOCUS_SQL}) AS focus_seconds,
              COUNT(*) AS session_count
       FROM sessions s
       WHERE ${IN_RANGE_SQL}
       GROUP BY date(s.started_at, 'localtime')`
    )
    .all(...range);

  // Archivierte Projekte zählen mit — die Lernzeit war ja echt
  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.archived_at IS NOT NULL AS archived,
              SUM(${FOCUS_SQL}) AS focus_seconds,
              COUNT(*) AS session_count
       FROM sessions s
       JOIN projects p ON p.id = s.project_id
       WHERE ${IN_RANGE_SQL}
       GROUP BY p.id
       ORDER BY focus_seconds DESC`
    )
    .all(...range)
    .map((p) => ({ ...p, archived: Boolean(p.archived) }));

  const ratingRows = db
    .prepare(
      `SELECT s.efficiency_rating AS rating,
              CAST(strftime('%H', s.started_at, 'localtime') AS INTEGER) AS hour
       FROM sessions s
       WHERE ${IN_RANGE_SQL} AND s.efficiency_rating IS NOT NULL`
    )
    .all(...range);

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const series = dateKeys.map((key) => {
    const row = byDate.get(key);
    return { date: key, focus_seconds: row?.focus_seconds || 0, session_count: row?.session_count || 0 };
  });

  res.json({
    period,
    offset,
    months: period === 'lastMonths' ? months : undefined,
    days: series,
    totalFocusSeconds: series.reduce((sum, d) => sum + d.focus_seconds, 0),
    totalSessions: series.reduce((sum, d) => sum + d.session_count, 0),
    activeDays: series.filter((d) => d.session_count > 0).length,
    projects,
    rating: summarizeRatings(ratingRows)
  });
});

export default router;
