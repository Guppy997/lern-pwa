import { useState, useMemo } from 'react';
import { methodLabel, formatDuration, parseDbDate } from '../constants.js';
import DayPlanForm from './DayPlanForm.jsx';

const DAYS_PAGE = 10;

// Lokaler Kalendertag einer in UTC gespeicherten Session — passt zur
// day_plans.date (Backend rechnet ebenfalls in Europe/Berlin)
const localDate = (dbDate) => parseDbDate(dbDate).toLocaleDateString('sv-SE');

const dayLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date === today.toLocaleDateString('sv-SE')) return 'Heute';
  if (date === yesterday.toLocaleDateString('sv-SE')) return 'Gestern';
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
};

// method_data: neues Format ist ein Array von Überschriften-Checks,
// alte Sessions haben noch ein einzelnes Objekt {heading, headingGuess}
const parseHeadings = (raw) => {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    if (data.heading) return [{ heading: data.heading, guess: data.guess || data.headingGuess }];
    return [];
  } catch {
    return [];
  }
};

const formatStartedAt = (dbDate) => {
  const d = parseDbDate(dbDate);
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
};

// Im Verlauf steht das Datum schon am Tages-Block, die Session zeigt nur die Uhrzeit
const formatTime = (dbDate) =>
  `${parseDbDate(dbDate).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;

function HistoryItem({ session, expanded, onToggle, onDelete }) {
  const headings = parseHeadings(session.method_data);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Diese Session aus dem Verlauf löschen?')) onDelete(session.id);
  };

  return (
    <li className={`history-item ${expanded ? 'expanded' : ''}`}>
      <button type="button" className="history-row" onClick={onToggle}>
        <div>
          <span>{formatDuration(session.effective_focus_seconds || 0)}</span>
          <span className="history-date">{formatTime(session.started_at)}</span>
        </div>
        <span className="rating">
          {'★'.repeat(session.efficiency_rating || 0)}{'☆'.repeat(5 - (session.efficiency_rating || 0))}
        </span>
      </button>

      {expanded && (
        <div className="history-detail">
          <p className="history-meta">
            {session.planned_minutes} min geplant · {formatDuration(session.effective_focus_seconds || 0)} fokussiert
            {session.paused_seconds > 0 && ` · ${Math.round(session.paused_seconds / 60)} min pausiert`}
          </p>
          {session.recall_text && (
            <>
              <p className="hint-label">Active Recall</p>
              <p className="history-text">{session.recall_text}</p>
            </>
          )}
          {headings.length > 0 && (
            <>
              <p className="hint-label">Überschriften-Checks</p>
              <ul className="heading-list">
                {headings.map((h, i) => (
                  <li key={i}>
                    <strong>{h.heading}</strong>
                    <span>{h.guess}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {session.feedback_note && (
            <>
              <p className="hint-label">Notiz</p>
              <p className="history-text">{session.feedback_note}</p>
            </>
          )}
          <button type="button" className="link danger" onClick={handleDelete}>Session löschen</button>
        </div>
      )}
    </li>
  );
}

export default function ProjectDashboard({
  project, dayPlan, dayPlans, sessions, totals,
  onSavePlan, onPlanCompleted, onStart, onBack, onDelete, onResume, onDiscardSession
}) {
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const handleDelete = () => {
    if (window.confirm(`"${project.name}" inkl. gesamtem Verlauf wirklich löschen?`)) onDelete(project);
  };

  const openSession = sessions.find((s) => !s.ended_at);
  const finished = sessions.filter((s) => s.ended_at);
  const todayStr = new Date().toLocaleDateString('sv-SE');

  // Verlauf nach Kalendertag: Tagesplan (Ziel + geplant) zusammen mit den an
  // dem Tag absolvierten Sessions. Tage mit Plan, aber ohne Session bleiben
  // sichtbar (= "geplant, nichts geschafft"); den heutigen leeren Plan zeigt
  // schon die Karte oben, der gehört noch nicht in den Verlauf.
  const dayGroups = useMemo(() => {
    const map = new Map();
    for (const p of dayPlans) map.set(p.date, { date: p.date, plan: p, sessions: [] });
    for (const s of finished) {
      const date = localDate(s.started_at);
      if (!map.has(date)) map.set(date, { date, plan: null, sessions: [] });
      map.get(date).sessions.push(s);
    }
    return [...map.values()]
      .filter((g) => g.sessions.length > 0 || g.date !== todayStr)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [dayPlans, finished, todayStr]);

  const visibleGroups = showAllHistory ? dayGroups : dayGroups.slice(0, DAYS_PAGE);

  const completed = finished.filter((s) => localDate(s.started_at) === todayStr).length;
  const planDone = Boolean(dayPlan?.completed_at);

  const handleSavePlan = async (data) => {
    await onSavePlan(data);
    setShowPlanForm(false);
  };

  const handleDiscardOpen = () => {
    if (window.confirm('Offene Session wirklich verwerfen? Sie wird nicht gespeichert.')) {
      onDiscardSession(openSession.id);
    }
  };

  return (
    <div className="card">
      <div className="dashboard-top">
        <button className="link-back" onClick={onBack}>← Alle Projekte</button>
        <button className="link danger" onClick={handleDelete}>Projekt löschen</button>
      </div>
      <h1>{project.name}</h1>
      <p className="subtitle">
        Insgesamt {formatDuration(totals.focus_seconds)} · {totals.session_count}{' '}
        {totals.session_count === 1 ? 'Session' : 'Sessions'}
      </p>

      {openSession && (
        <div className="resume-banner">
          <div>
            <strong>Offene Session</strong>
            <span>gestartet {formatStartedAt(openSession.started_at)} · {openSession.planned_minutes} min geplant</span>
          </div>
          <div className="actions">
            <button className="secondary" onClick={handleDiscardOpen}>Verwerfen</button>
            <button onClick={() => onResume(openSession)}>Fortsetzen</button>
          </div>
        </div>
      )}

      {dayPlan && !showPlanForm ? (
        <div className={`plan-summary ${planDone ? 'plan-done' : ''}`}>
          <p className="goal">{planDone && '✓ '}{dayPlan.goal}</p>
          <p className="subtitle">{methodLabel(dayPlan.method)}</p>
          {planDone ? (
            <p className="hint">Tagesziel erreicht — sauber!</p>
          ) : (
            <div className="progress">
              {Array.from({ length: dayPlan.planned_sessions }, (_, i) => (
                <span key={i} className={`circle ${i < completed ? 'filled' : ''}`} />
              ))}
              <span className="progress-label">{completed} / {dayPlan.planned_sessions} heute</span>
            </div>
          )}
          <div className="plan-links">
            {!planDone && (
              <button className="link" onClick={() => onPlanCompleted(true)}>
                Tagesziel abhaken ✓
              </button>
            )}
            {planDone && (
              <button className="link" onClick={() => onPlanCompleted(false)}>Wieder öffnen</button>
            )}
            <button className="link" onClick={() => setShowPlanForm(true)}>Heutigen Plan anpassen</button>
          </div>
        </div>
      ) : (
        <DayPlanForm
          initialPlan={dayPlan}
          onSave={handleSavePlan}
          onCancel={dayPlan ? () => setShowPlanForm(false) : null}
          onSkip={dayPlan ? null : () => { setShowPlanForm(false); onStart({ withoutPlan: true }); }}
        />
      )}

      {!showPlanForm && !openSession && (
        <button onClick={() => onStart({ withoutPlan: !dayPlan || planDone })}>
          {dayPlan && !planDone ? 'Session starten' : 'Schnellstart (ohne Tagesplan)'}
        </button>
      )}

      {dayGroups.length > 0 && (
        <div className="history">
          <p className="hint-label">Verlauf</p>
          {visibleGroups.map((g) => {
            const done = g.sessions.length;
            const planned = g.plan?.planned_sessions;
            const dayDone = Boolean(g.plan?.completed_at);
            return (
              <div className="history-day" key={g.date}>
                <div className="history-day-head">
                  <div className="history-day-title">
                    <span className="history-day-label">{dayDone && '✓ '}{dayLabel(g.date)}</span>
                    {g.plan && <span className="history-day-goal">{g.plan.goal}</span>}
                  </div>
                  <span className={`history-day-count ${planned != null && done >= planned ? 'reached' : ''}`}>
                    {planned != null ? `${done} / ${planned}` : done}{' '}
                    {planned == null && done === 1 ? 'Session' : 'Sessions'}
                  </span>
                </div>
                {g.plan && <p className="history-day-method">{methodLabel(g.plan.method)}</p>}
                {done > 0 ? (
                  <ul className="session-list">
                    {g.sessions.map((s) => (
                      <HistoryItem
                        key={s.id}
                        session={s}
                        expanded={expandedId === s.id}
                        onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        onDelete={onDiscardSession}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="history-day-empty">Keine Session absolviert</p>
                )}
              </div>
            );
          })}
          {dayGroups.length > DAYS_PAGE && !showAllHistory && (
            <button className="link" onClick={() => setShowAllHistory(true)}>
              Alle {dayGroups.length} Tage anzeigen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
