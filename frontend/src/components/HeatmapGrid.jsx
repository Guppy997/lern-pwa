import { useEffect, useRef, useState } from 'react';
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

// Reine Anzeige-Komponente: stellt Tagesdaten als GitHub-artiges Kästchen-Raster
// dar. Alles liegt in EINEM CSS-Grid, das spaltenweise gefüllt wird (erst die
// Wochentags-Labels, dann je Woche Monats-Label + 7 Tage) — so bleiben Labels
// und Felder bündig, egal wie groß die Felder gerade sind (siehe .heatmap-grid).
export default function HeatmapGrid({ days }) {
  const [selected, setSelected] = useState(null);
  const scrollRef = useRef(null);

  // Passt das Raster nicht in die Breite (12 Monate auf dem Handy), den heutigen
  // Tag in die Mitte scrollen. Nur horizontal im Kalender, die Seite springt nicht.
  useEffect(() => {
    const scroller = scrollRef.current;
    const todayCell = scroller?.querySelector(`[data-date="${new Date().toLocaleDateString('sv-SE')}"]`);
    if (!todayCell || scroller.scrollWidth <= scroller.clientWidth) return;
    const offset = todayCell.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
    scroller.scrollLeft += offset - scroller.clientWidth / 2;
  }, [days[0]?.date, days.length]);

  const columns = toColumns(days);
  const labels = monthLabels(columns);

  return (
    <>
      <div className="heatmap-scroll" ref={scrollRef}>
        <div className="heatmap-grid" style={{ '--weeks': columns.length }}>
          <span className="heatmap-corner" />
          {WEEKDAY_LABELS.map((label, i) => (
            <span className="heatmap-weekday" key={`wd-${i}`}>{label}</span>
          ))}
          {columns.map((column, i) => [
            <span className="heatmap-month-label" key={`m-${i}`}>{labels[i]}</span>,
            ...column.map((cell, j) =>
              cell ? (
                <button
                  type="button"
                  key={`${i}-${j}`}
                  data-date={cell.date}
                  className={`heatmap-cell level-${cell.level} ${selected?.date === cell.date ? 'selected' : ''}`}
                  title={`${cell.date} · ${formatDuration(cell.focus_seconds)}`}
                  aria-label={`${cell.date}: ${formatDuration(cell.focus_seconds)}`}
                  onClick={() => setSelected(selected?.date === cell.date ? null : cell)}
                />
              ) : (
                <span className="heatmap-cell empty" key={`${i}-${j}`} />
              )
            )
          ])}
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
