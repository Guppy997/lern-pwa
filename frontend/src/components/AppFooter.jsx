import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { APP_VERSION, CHANGELOG } from '../changelog.js';

export default function AppFooter() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW({
    // Der Browser prüft sw.js nur beim Navigieren — eine installierte PWA, die
    // tagelang im Hintergrund offen bleibt, bekäme ein neues Release also nie
    // mit. Darum zusätzlich beim Zurückholen in den Vordergrund und stündlich.
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return;
        // Pi nicht erreichbar -> einfach beim nächsten Mal wieder versuchen
        registration.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', checkForUpdate);
      setInterval(checkForUpdate, 60 * 60 * 1000);
    }
  });

  return (
    <div className="app-footer">
      {needRefresh && (
        <button type="button" className="update-badge" onClick={() => updateServiceWorker(true)}>
          ↻ Update verfügbar
        </button>
      )}

      <button
        type="button"
        className="version-badge"
        onClick={() => setHistoryOpen((o) => !o)}
        aria-expanded={historyOpen}
      >
        v{APP_VERSION}
      </button>

      {historyOpen && (
        <div className="version-history">
          <p className="hint-label">Versionsverlauf</p>
          <ul>
            {CHANGELOG.map((entry) => (
              <li key={entry.version}>
                <div className="version-history-head">
                  <strong>v{entry.version}</strong>
                  <span className="version-date">{entry.date}</span>
                </div>
                <ul>
                  {entry.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
