import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDuration } from '../constants.js';

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

const formatRating = (value) => value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ratingStars = (value) => {
  const full = Math.round(value);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
};

// Wofür im Zeitraum gelernt wurde: ein Balken pro Projekt, Anteil an der Gesamtzeit
function ProjectBreakdown({ projects, totalSeconds }) {
  if (projects.length === 0) return <p className="empty-hint">In diesem Zeitraum keine Sessions.</p>;
  return (
    <ul className="project-breakdown">
      {projects.map((p) => {
        const share = totalSeconds ? Math.round((p.focus_seconds / totalSeconds) * 100) : 0;
        return (
          <li key={p.id}>
            <div className="breakdown-head">
              <span className="breakdown-name">
                {p.name}
                {p.archived && <span className="breakdown-tag">archiviert</span>}
              </span>
              <span className="breakdown-time">{formatDuration(p.focus_seconds)}</span>
            </div>
            <div className="breakdown-track">
              <div className="breakdown-bar" style={{ width: `${Math.max(2, share)}%` }} />
            </div>
            <div className="breakdown-meta">
              <span>{p.session_count} {p.session_count === 1 ? 'Session' : 'Sessions'}</span>
              <span>{share} %</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Auswertung der Sterne aus dem Feedback: Schnitt im Zeitraum und nach Tageszeit.
// "Beste Zeit" nur, wenn mindestens zwei Tageszeiten je 2+ Bewertungen haben —
// eine einzelne gute Session macht noch keine beste Tageszeit
function RatingSummary({ rating }) {
  if (!rating.count) return <p className="empty-hint">Keine bewerteten Sessions in diesem Zeitraum.</p>;
  const comparable = rating.byDaytime.filter((t) => t.count >= 2);
  const best = comparable.length >= 2
    ? comparable.reduce((a, b) => (b.average > a.average || (b.average === a.average && b.count > a.count) ? b : a))
    : null;
  return (
    <div className="rating-block">
      <div className="rating-summary">
        <span className="rating-value"><span className="rating-star">★</span> {formatRating(rating.average)}</span>
        <span className="rating-caption">
          Ø Bewertung aus {rating.count} {rating.count === 1 ? 'Session' : 'Sessions'}
        </span>
      </div>
      <ul className="rating-daytimes">
        {rating.byDaytime.map((t) => (
          <li key={t.key} className={best?.key === t.key ? 'best' : ''}>
            <span className="rating-daytime-label">
              {t.label}
              {best?.key === t.key && <small className="rating-best">beste Zeit</small>}
            </span>
            <span className="rating">{ratingStars(t.average)}</span>
            <span className="rating-daytime-value">{formatRating(t.average)}</span>
            <span className="rating-daytime-count">{t.count}×</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

      {/* Fallbacks: offline kann noch eine zwischengespeicherte Antwort vom
          Server vor v1.6.0 kommen, die diese Felder nicht kennt */}
      <h2 className="stats-section-heading">Wofür du gelernt hast</h2>
      <ProjectBreakdown projects={stats.projects || []} totalSeconds={stats.totalFocusSeconds} />

      <h2 className="stats-section-heading">Wie es lief</h2>
      <RatingSummary rating={stats.rating || { count: 0, byDaytime: [] }} />
    </div>
  );
}
