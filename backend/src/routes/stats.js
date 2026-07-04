import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/stats?period=week|month -> daily focus-time breakdown for charts/overview
router.get('/', (req, res) => {
  const period = req.query.period === 'month' ? 'month' : 'week';
  const days = period === 'month' ? 30 : 7;

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
       WHERE s.ended_at IS NOT NULL AND date(s.started_at, 'localtime') >= date('now', 'localtime', ?)
       GROUP BY date(s.started_at, 'localtime')`
    )
    .all(`-${days - 1} days`);

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('sv-SE'); // lokales Datum, passend zum SQL-'localtime'
    const row = byDate.get(key);
    series.push({
      date: key,
      focus_seconds: row?.focus_seconds || 0,
      session_count: row?.session_count || 0
    });
  }

  res.json({
    period,
    days: series,
    totalFocusSeconds: series.reduce((sum, d) => sum + d.focus_seconds, 0),
    totalSessions: series.reduce((sum, d) => sum + d.session_count, 0),
    activeDays: series.filter((d) => d.session_count > 0).length
  });
});

export default router;
