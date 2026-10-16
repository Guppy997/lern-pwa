import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDuration } from '../constants.js';
import HeatmapGrid from './HeatmapGrid.jsx';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const dayLabel = (dateStr, period) => {
  const d = new Date(dateStr + 'T00:00:00');
  if (period === 'week') return d.toLocaleDateString('de-DE', { weekday: 'short' });
  return d.getDate();
};

const shortDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

// ISO-8601-Kalenderwochennummer (Woche mit dem ersten Donnerstag des Jahres ist KW 1)
const isoWeekNumber = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

const periodLabel = (period, days) => {
  const first = days[0].date;
  const last = days[days.length - 1].date;
  if (period === 'week') return `KW ${isoWeekNumber(first)} · ${shortDate(first)}–${shortDate(last)}`;
  const d = new Date(first + 'T00:00:00');
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

export default function StatsView({ onBack }) {
  const [period, setPeriod] = useState('week');
  const [offset, setOffset] = useState(0);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    setSelectedDate(null);
    api.getStats(period, offset).then(setStats).catch((err) => setError(err.message));
  }, [period, offset]);

  const switchPeriod = (next) => {
    setPeriod(next);
    setOffset(0);
  };

  if (error) return <div className="card"><p className="error">{error}</p></div>;
  if (!stats) return <div className="card"><p>Lade…</p></div>;

  const maxSeconds = Math.max(...stats.days.map((d) => d.focus_seconds), 1);
  const selectedDay = stats.days.find((d) => d.date === selectedDate);

  return (
    <div className="card stats-card">
      <button className="link-back" onClick={onBack}>← Alle Projekte</button>
      <h1>Statistik</h1>

      <div className="period-toggle">
        <button
          className={period === 'week' ? '' : 'secondary'}
          onClick={() => switchPeriod('week')}
        >
          Woche
        </button>
        <button
          className={period === 'month' ? '' : 'secondary'}
          onClick={() => switchPeriod('month')}
        >
          Monat
        </button>
      </div>

      <div className="period-nav">
        <button type="button" className="ghost" onClick={() => setOffset((o) => o - 1)} aria-label="Vorherige Periode">
          ←
        </button>
        <span className="period-nav-label">{periodLabel(period, stats.days)}</span>
        <button
          type="button"
          className="ghost"
          onClick={() => setOffset((o) => o + 1)}
          disabled={offset >= 0}
          aria-label="Nächste Periode"
        >
          →
        </button>
      </div>

      <div className="stats-summary">
        <div>
          <strong>{formatDuration(stats.totalFocusSeconds)}</strong>
          <span>Lernzeit gesamt</span>
        </div>
        <div>
          <strong>{stats.totalSessions}</strong>
          <span>Sessions</span>
        </div>
        <div>
          <strong>{stats.activeDays} / {stats.days.length}</strong>
          <span>aktive Tage</span>
        </div>
      </div>

      <div className={`chart ${period === 'month' ? 'chart-dense' : ''}`}>
        {stats.days.map((d) => (
          <button
            type="button"
            className={`chart-col ${selectedDate === d.date ? 'selected' : ''}`}
            key={d.date}
            onClick={() => setSelectedDate(selectedDate === d.date ? null : d.date)}
          >
            <div className="chart-bar-track">
              <div
                className={`chart-bar ${d.focus_seconds > 0 ? 'filled' : ''}`}
                style={{ height: `${Math.max(4, (d.focus_seconds / maxSeconds) * 100)}%` }}
              />
            </div>
            <span className="chart-label">{dayLabel(d.date, period)}</span>
          </button>
        ))}
      </div>

      {selectedDay && (
        <p className="chart-detail">
          <strong>
            {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('de-DE', {
              weekday: 'long', day: '2-digit', month: '2-digit'
            })}
          </strong>{' '}
          · {formatDuration(selectedDay.focus_seconds)} ·{' '}
          {selectedDay.session_count} {selectedDay.session_count === 1 ? 'Session' : 'Sessions'}
        </p>
      )}

      <h2 className="stats-heatmap-heading">Lernkalender — {periodLabel(period, stats.days)}</h2>
      <div className="heatmap-card">
        <HeatmapGrid days={stats.days} showMonthLabels={false} />
      </div>
    </div>
  );
}
