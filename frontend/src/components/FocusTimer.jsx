import { useEffect, useRef, useState } from 'react';
import { breakMinutesFor, playChime, notify } from '../constants.js';
import ProgressRing from './ProgressRing.jsx';

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function FocusTimer({ plannedMinutes, methodId, startedAtMs, onFinish, onDiscard }) {
  const total = plannedMinutes * 60;
  const startedAtRef = useRef(startedAtMs || Date.now());
  const pausedAccumRef = useRef(0); // ms paused so far (completed pauses only)
  const pauseStartRef = useRef(null); // timestamp when current pause began, or null

  // Recompute everything from wall-clock timestamps so the display is always
  // correct even if setInterval ticks are throttled or skipped (background tab, sleep).
  const computeRemaining = () => {
    const now = Date.now();
    const ongoingPause = pauseStartRef.current ? now - pauseStartRef.current : 0;
    const pausedMs = pausedAccumRef.current + ongoingPause;
    const elapsedSeconds = Math.floor((now - startedAtRef.current - pausedMs) / 1000);
    return Math.max(0, total - elapsedSeconds);
  };

  // Bei einer wiederaufgenommenen Session kann der Timer schon abgelaufen sein
  const initialRemaining = computeRemaining();
  const finishedRef = useRef(initialRemaining <= 0);
  const [secondsLeft, setSecondsLeft] = useState(initialRemaining);
  const [running, setRunning] = useState(initialRemaining > 0);
  const [done, setDone] = useState(initialRemaining <= 0);

  // Überschriften-Check: beliebig oft während der Session nutzbar
  const [headings, setHeadings] = useState([]);
  const [showHeadingForm, setShowHeadingForm] = useState(false);
  const [heading, setHeading] = useState('');
  const [headingGuess, setHeadingGuess] = useState('');

  useEffect(() => {
    if (!running || done) return undefined;

    const tick = () => {
      const remaining = computeRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        setRunning(false);
        setDone(true);
        playChime();
        notify('Fokuszeit beendet', 'Gut gemacht — Zeit für eine Pause oder dein Feedback.');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [running, done]);

  const togglePause = () => {
    if (done) return;
    if (running) {
      pauseStartRef.current = Date.now();
      setRunning(false);
    } else {
      if (pauseStartRef.current) {
        pausedAccumRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }
      setRunning(true);
    }
  };

  const finish = () => {
    finishedRef.current = true;
    let pausedMs = pausedAccumRef.current;
    if (pauseStartRef.current) {
      pausedMs += Date.now() - pauseStartRef.current;
    }
    // Nur aktive Timer-Zeit zählt als Fokuszeit — gedeckelt auf die geplante Dauer,
    // damit Liegenlassen nach Ablauf nicht als Lernzeit gutgeschrieben wird
    const activeSeconds = Math.floor((Date.now() - startedAtRef.current - pausedMs) / 1000);
    onFinish({
      focusSeconds: Math.min(Math.max(0, activeSeconds), total),
      pausedSeconds: Math.round(pausedMs / 1000),
      methodData: headings
    });
  };

  const discard = () => {
    if (window.confirm('Session wirklich verwerfen? Sie wird nicht gespeichert.')) onDiscard();
  };

  const addHeading = () => {
    if (!heading.trim() || !headingGuess.trim()) return;
    setHeadings((prev) => [...prev, { heading: heading.trim(), guess: headingGuess.trim() }]);
    setHeading('');
    setHeadingGuess('');
    setShowHeadingForm(false);
  };

  const pausedSecondsTotal = Math.round(
    (pausedAccumRef.current + (pauseStartRef.current ? Date.now() - pauseStartRef.current : 0)) / 1000
  );
  const progress = ((total - secondsLeft) / total) * 100;
  const breakMinutes = breakMinutesFor(methodId);

  return (
    <div className="card timer-card">
      <ProgressRing progress={progress} accent={running ? 'var(--accent)' : 'var(--muted)'}>
        <span className="ring-time">{formatTime(secondsLeft)}</span>
        <span className="ring-label">{running ? 'Fokus läuft' : done ? 'Fertig' : 'Pausiert'}</span>
      </ProgressRing>
      {pausedSecondsTotal > 0 && <p className="hint">Bisher pausiert: {Math.round(pausedSecondsTotal / 60)} min</p>}

      {done && (
        <div className="tool-box done-box">
          <p><strong>Fokuszeit beendet — gut gemacht!</strong></p>
          {breakMinutes && (
            <p className="hint">Mach jetzt {breakMinutes} Minuten Pause, bevor du weitermachst.</p>
          )}
        </div>
      )}

      {headings.length > 0 && (
        <div className="tool-box">
          <p className="hint-label">Überschriften-Check</p>
          <ul className="heading-list">
            {headings.map((h, i) => (
              <li key={i}>
                <strong>{h.heading}</strong>
                <span>{h.guess}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!done && showHeadingForm && (
        <div className="tool-box">
          <p className="hint-label">Überschriften-Check</p>
          <label>
            Nächste Überschrift
            <input
              type="text"
              placeholder="z. B. Kontostruktur in Google Ads"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
            />
          </label>
          <label>
            Was denke ich, was das bedeutet?
            <textarea
              rows="2"
              placeholder="Deine Vermutung, bevor du liest…"
              value={headingGuess}
              onChange={(e) => setHeadingGuess(e.target.value)}
            />
          </label>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setShowHeadingForm(false)}>Abbrechen</button>
            <button type="button" onClick={addHeading} disabled={!heading.trim() || !headingGuess.trim()}>
              Merken & lesen
            </button>
          </div>
        </div>
      )}

      {!done && !showHeadingForm && (
        <button className="link" onClick={() => setShowHeadingForm(true)}>
          + Überschriften-Check (Vermutung vor dem Lesen festhalten)
        </button>
      )}

      <div className="actions">
        {!done && (
          <button className="secondary" onClick={togglePause}>
            {running ? 'Pause' : 'Weiter'}
          </button>
        )}
        <button onClick={finish}>{done ? 'Weiter zum Feedback' : 'Session beenden'}</button>
      </div>
      {!done && (
        <button className="link danger" onClick={discard}>Session verwerfen</button>
      )}
    </div>
  );
}
