import { useEffect, useRef, useState } from 'react';
import { playChime, notify } from '../constants.js';
import ProgressRing from './ProgressRing.jsx';

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function BreakTimer({ minutes, onDone, onSkip }) {
  const total = minutes * 60;
  const startedAtRef = useRef(Date.now());
  const firedRef = useRef(false);

  const computeRemaining = () => {
    const elapsedSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
    return Math.max(0, total - elapsedSeconds);
  };

  const [secondsLeft, setSecondsLeft] = useState(() => computeRemaining());

  useEffect(() => {
    const tick = () => {
      const remaining = computeRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        playChime();
        notify('Pause vorbei', 'Bereit für die nächste Lern-Session?');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const progress = ((total - secondsLeft) / total) * 100;
  const finished = secondsLeft === 0;

  return (
    <div className="card timer-card break-card">
      <ProgressRing progress={progress} accent="var(--break-accent)">
        <span className="ring-time">{formatTime(secondsLeft)}</span>
        <span className="ring-label">{finished ? 'Fertig' : 'Pause läuft'}</span>
      </ProgressRing>
      <p className="hint">{finished ? 'Pause vorbei — bereit für die nächste Runde?' : 'Lehn dich zurück, steh auf, trink etwas. Die Uhr läuft.'}</p>
      <div className="actions">
        <button className="secondary" onClick={onSkip}>Pause überspringen</button>
        <button onClick={onDone}>Weiter lernen</button>
      </div>
    </div>
  );
}
