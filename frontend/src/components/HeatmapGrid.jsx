import { useState } from 'react';
import { formatDuration } from '../constants.js';

const WEEKDAY_LABELS = ['Mo', '', 'Mi', '', 'Fr', '', ''];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
];

// Feste Minuten-Schwellen statt relativ zum Tages-Maximum, damit die Farbe über
// Wochen hinweg vergleichbar bleibt (25 min Sprint = Stufe 1, 52 min Deep-Focus = Stufe 3)
const levelFor = (focusSeconds) => {
  if (focusSeconds <= 0) return 0;
  if (focusSeconds < 30 * 60) return 1;
  if (focusSeconds < 60 * 60) return 2;
  if (focusSeconds < 90 * 60) return 3;
  return 4;
};

const mondayIndex = (dateStr) => (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7;

function toColumns(days) {
  const leadingPad = mondayIndex(days[0].date);
  const cells = Array(leadingPad).fill(null).concat(
    days.map((d) => ({ ...d, level: levelFor(d.focus_seconds) }))
  );
  while (cells.length % 7 !== 0) cells.push(null);
  const columns = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
  return columns;
}

// Ein Label pro Monat, an der Spalte, in der der jeweils früheste Tag dieser
// Spalte in einen neuen Monat fällt (Vergleich zur Vorspalte statt einer reinen
// "Tag <= 7"-Schwelle — sonst würden manche Monate, je nach Wochentag ihres 1.,
// über zwei Nachbarspalten hinweg doppelt markiert und die Texte überlappen)
function monthLabels(columns) {
  let prevMonth = null;
  return columns.map((column) => {
    const first = column.find(Boolean);
    if (!first) return '';
    const month = new Date(first.date + 'T00:00:00').getMonth();
    if (month === prevMonth) return '';
    prevMonth = month;
    return MONTH_LABELS[month];
  });
}

// Reine Anzeige-Komponente: bekommt fertige Tagesdaten und stellt sie als
// GitHub-artiges Kästchen-Raster dar. groupByMonth fügt zwischen den
// Monats-Blöcken etwas Abstand ein (fürs ganze-Jahr-Raster auf dem Dashboard) —
// bei einem einzelnen Monat/einer Woche (Statistik-Seite) ist das nicht nötig.
export default function HeatmapGrid({ days, groupByMonth = false, showMonthLabels = true }) {
  const [selected, setSelected] = useState(null);

  const columns = toColumns(days);
  const labels = monthLabels(columns);

  return (
    <>
      <div className="heatmap-scroll">
        <div className="heatmap-grid">
          <div className="heatmap-weekday-labels">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
          <div className="heatmap-columns">
            {columns.map((column, i) => (
              <div
                className={`heatmap-column ${groupByMonth && labels[i] && i > 0 ? 'month-start' : ''}`}
                key={i}
              >
                <span className="heatmap-month-label">{showMonthLabels ? labels[i] : ''}</span>
                <div className="heatmap-column-cells">
                  {column.map((cell, j) =>
                    cell ? (
                      <button
                        type="button"
                        key={j}
                        className={`heatmap-cell level-${cell.level} ${selected?.date === cell.date ? 'selected' : ''}`}
                        title={`${cell.date} · ${formatDuration(cell.focus_seconds)}`}
                        onClick={() => setSelected(selected?.date === cell.date ? null : cell)}
                      />
                    ) : (
                      <span className="heatmap-cell empty" key={j} />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-footer">
        {selected ? (
          <p className="heatmap-detail">
            <strong>
              {new Date(selected.date + 'T00:00:00').toLocaleDateString('de-DE', {
                weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
              })}
            </strong>{' '}
            · {formatDuration(selected.focus_seconds)} ·{' '}
            {selected.session_count} {selected.session_count === 1 ? 'Session' : 'Sessions'}
          </p>
        ) : (
          <span className="heatmap-legend">
            Weniger
            <span className="heatmap-cell level-0" />
            <span className="heatmap-cell level-1" />
            <span className="heatmap-cell level-2" />
            <span className="heatmap-cell level-3" />
            <span className="heatmap-cell level-4" />
            Mehr
          </span>
        )}
      </div>
    </>
  );
}
