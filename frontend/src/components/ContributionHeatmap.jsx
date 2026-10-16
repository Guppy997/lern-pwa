import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatDuration } from '../constants.js';
import HeatmapGrid from './HeatmapGrid.jsx';

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

// Dashboard-Lernkalender: immer Jan-Dez des laufenden Jahres, komplett (auch
// noch nicht erreichte Monate als leere Kästchen). Streak/Zusammenfassung
// zählen nur die bereits vergangenen Tage — sonst würden die leeren
// Zukunfts-Kästchen die Serie sofort auf 0 reißen bzw. die Quote verfälschen
export default function ContributionHeatmap() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getStats('currentYear').then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error || !stats) return null;

  const today = new Date().toLocaleDateString('sv-SE');
  const elapsedDays = stats.days.filter((d) => d.date <= today);
  const streak = currentStreak(elapsedDays);

  return (
    <div className="heatmap-card">
      <div className="heatmap-summary">
        <span>
          🔥 <strong>{streak}</strong> {streak === 1 ? 'Tag' : 'Tage'} in Folge
        </span>
        <span className="heatmap-summary-muted">
          {elapsedDays.filter((d) => d.session_count > 0).length} von {elapsedDays.length} Tagen gelernt ·{' '}
          {formatDuration(elapsedDays.reduce((sum, d) => sum + d.focus_seconds, 0))} insgesamt
        </span>
      </div>

      <HeatmapGrid days={stats.days} groupByMonth />
    </div>
  );
}
