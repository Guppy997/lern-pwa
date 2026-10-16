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

// immer Jan-Dez des laufenden Kalenderjahres (auch noch nicht erreichte Monate,
// die tauchen im Lernkalender einfach als leere Kästchen auf)
const currentYearDates = () => {
  const year = new Date().getFullYear();
  const dates = [];
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) dates.push(isoDate(new Date(year, month, day)));
  }
  return dates;
};

// GET /api/stats?period=week|month|currentYear&offset=0 -> daily focus-time breakdown
router.get('/', (req, res) => {
  const period = ['month', 'currentYear'].includes(req.query.period) ? req.query.period : 'week';
  const offset = Number.parseInt(req.query.offset, 10) || 0;

  const dateKeys =
    period === 'currentYear' ? currentYearDates() : period === 'month' ? monthDates(offset) : weekDates(offset);

  const rows = db
    .prepare(
      `SELECT date(s.started_at, 'localtime') AS date,
              CAST(SUM(COALESCE(
                s.focus_seconds,
                MIN(
                  MAX(0, (julianday(s.ended_at) - julianday(s.started_at)) * 86400 - s.paused_seconds),
                  s.planned_minutes * 60
                )
              )) AS INTEGER) AS focus_seconds,
              COUNT(*) AS session_count
       FROM sessions s
       WHERE s.ended_at IS NOT NULL AND date(s.started_at, 'localtime') BETWEEN ? AND ?
       GROUP BY date(s.started_at, 'localtime')`
    )
    .all(dateKeys[0], dateKeys[dateKeys.length - 1]);

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const series = dateKeys.map((key) => {
    const row = byDate.get(key);
    return { date: key, focus_seconds: row?.focus_seconds || 0, session_count: row?.session_count || 0 };
  });

  res.json({
    period,
    offset,
    days: series,
    totalFocusSeconds: series.reduce((sum, d) => sum + d.focus_seconds, 0),
    totalSessions: series.reduce((sum, d) => sum + d.session_count, 0),
    activeDays: series.filter((d) => d.session_count > 0).length
  });
});

export default router;
