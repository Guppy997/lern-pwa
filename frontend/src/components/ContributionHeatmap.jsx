import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDuration } from '../constants.js';
import HeatmapGrid from './HeatmapGrid.jsx';

const RANGES = [3, 6, 12];
const DEFAULT_RANGE = 3;

// Gewählter Zeitraum wird pro Gerät gemerkt — ohne localStorage (privater
// Modus o. Ä.) gilt einfach wieder der Standard
const RANGE_KEY = 'lern-pwa:heatmap-months';
const loadRange = () => {
  try {
    const value = Number(localStorage.getItem(RANGE_KEY));
    return RANGES.includes(value) ? value : DEFAULT_RANGE;
  } catch {
    return DEFAULT_RANGE;
  }
};
const saveRange = (value) => {
  try {
    localStorage.setItem(RANGE_KEY, String(value));
  } catch {
    // nicht speicherbar — gilt dann nur bis zum nächsten Neustart
  }
};

// Erster sichtbarer Tag: der 1. des Monats vor (months - 1) Monaten — dieselbe
// Regel wie period=lastMonths im Backend
const rangeStart = (months) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).toLocaleDateString('sv-SE');
};

// Zählt die aktuelle Serie aufeinanderfolgender Lern-Tage. Heute zählt nur mit,
// wenn schon eine Session drin ist — sonst würde ein noch laufender Tag die
// Serie fälschlich auf 0 zurücksetzen, bevor der Tag überhaupt vorbei ist.
const currentStreak = (days) => {
  let i = days.length - 1;
  if (days[i].session_count === 0) i--;
  let streak = 0;
  for (; i >= 0; i--) {
    if (days[i].session_count === 0) break;
    streak++;
  }
  return streak;
};

// Dashboard-Lernkalender: lädt einmal die letzten 12 Monate (bis heute) und
// zeigt davon den gewählten Ausschnitt. Die Serie läuft über alle 12 Monate,
// die Zusammenfassung nur über den sichtbaren Zeitraum.
export default function ContributionHeatmap() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState(loadRange);

  useEffect(() => {
    api.getRecentStats(12).then(setStats).catch((err) => setError(err.message));
  }, []);

  const chooseRange = (value) => {
    setMonths(value);
    saveRange(value);
  };

  if (error || !stats) return null;

  const streak = currentStreak(stats.days);
  const start = rangeStart(months);
  const visibleDays = stats.days.filter((d) => d.date >= start);
  const learnedDays = visibleDays.filter((d) => d.session_count > 0).length;
  const focusSeconds = visibleDays.reduce((sum, d) => sum + d.focus_seconds, 0);

  return (
    <div className="heatmap-card">
      <div className="heatmap-head">
        <div className="heatmap-summary">
          <span>
            🔥 <strong>{streak}</strong> {streak === 1 ? 'Tag' : 'Tage'} in Folge
          </span>
          <span className="heatmap-summary-muted">
            {learnedDays} von {visibleDays.length} Tagen gelernt · {formatDuration(focusSeconds)} insgesamt
          </span>
        </div>
        <div className="heatmap-range" role="group" aria-label="Zeitraum des Lernkalenders">
          {RANGES.map((value) => (
            <button
              type="button"
              key={value}
              className={value === months ? 'active' : ''}
              aria-pressed={value === months}
              onClick={() => chooseRange(value)}
            >
              {value} Monate
            </button>
          ))}
        </div>
      </div>

      <HeatmapGrid days={visibleDays} />
    </div>
  );
}
