import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDuration } from '../constants.js';

const dayLabel = (dateStr, period) => {
  const d = new Date(dateStr + 'T00:00:00');
  if (period === 'week') return d.toLocaleDateString('de-DE', { weekday: 'short' });
  return d.getDate();
};

export default function StatsView({ onBack }) {
  const [period, setPeriod] = useState('week');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    setSelectedDate(null);
    api.getStats(period).then(setStats).catch((err) => setError(err.message));
  }, [period]);

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
          onClick={() => setPeriod('week')}
        >
          Woche
        </button>
        <button
          className={period === 'month' ? '' : 'secondary'}
          onClick={() => setPeriod('month')}
        >
          Monat
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
    </div>
  );
}
