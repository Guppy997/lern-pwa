import { useState } from 'react';
import { BOARD_COLUMNS, formatDuration } from '../constants.js';
import ContributionHeatmap from './ContributionHeatmap.jsx';

function ProjectCard({ project, onOpen, onMove, onDelete }) {
  const columnIndex = BOARD_COLUMNS.findIndex((c) => c.id === project.status);
  const prev = BOARD_COLUMNS[columnIndex - 1];
  const next = BOARD_COLUMNS[columnIndex + 1];

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`"${project.name}" inkl. Verlauf wirklich löschen?`)) onDelete(project);
  };

  return (
    <div className="project-card">
      <button className="project-card-main" onClick={() => onOpen(project)}>
        <strong>{project.name}</strong>
        <span className="project-card-stats">
          {formatDuration(project.focus_seconds)} gelernt · {project.session_count}{' '}
          {project.session_count === 1 ? 'Session' : 'Sessions'}
        </span>
      </button>
      <div className="project-card-move">
        <button
          className="ghost"
          disabled={!prev}
          onClick={() => prev && onMove(project, prev.id)}
          aria-label={`Nach ${prev?.label} verschieben`}
        >
          ←
        </button>
        <button
          className="ghost"
          disabled={!next}
          onClick={() => next && onMove(project, next.id)}
          aria-label={`Nach ${next?.label} verschieben`}
        >
          →
        </button>
        <button className="ghost danger" onClick={handleDelete} aria-label="Projekt löschen">
          ✕
        </button>
      </div>
    </div>
  );
}

export default function ProjectBoard({
  projects, onOpen, onMove, onDelete, onCreate, onShowStats, notifPermission, onEnableNotifications
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setCreating(true);
    try {
      await onCreate(name.trim());
      setName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="board">
      <div className="board-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/icon-192.png" alt="" aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
          <div>
            <h1>Deine Projekte</h1>
            <p className="subtitle">Wähle ein Projekt, um weiterzulernen — oder leg ein neues an.</p>
          </div>
        </div>
        <button className="stats-button" onClick={onShowStats}>
          <span>Statistik</span>
          <span className="stats-button-arrow">→</span>
        </button>
      </div>

      <ContributionHeatmap />

      <form className="new-project" onSubmit={submit}>
        <input
          type="text"
          placeholder="Neues Projekt, z. B. 'SEO-Recherche'"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={creating || !name.trim()}>+ Anlegen</button>
      </form>
      {error && <p className="error">{error}</p>}

      {notifPermission === 'default' && (
        <div className="notif-banner">
          <span>🔔 Erinnerungen aktivieren, damit du Pausenende & Sessions nicht verpasst.</span>
          <button className="secondary" onClick={onEnableNotifications}>Aktivieren</button>
        </div>
      )}
      {notifPermission === 'denied' && (
        <div className="notif-banner muted">
          <span>🔕 Benachrichtigungen sind in deinem Browser blockiert. Du kannst das in den Website-Einstellungen ändern.</span>
        </div>
      )}

      <div className="board-columns">
        {BOARD_COLUMNS.map((col) => (
          <div className="board-column" key={col.id}>
            <h2>{col.label}</h2>
            <div className="board-column-cards">
              {projects
                .filter((p) => p.status === col.id)
                .map((p) => (
                  <ProjectCard key={p.id} project={p} onOpen={onOpen} onMove={onMove} onDelete={onDelete} />
                ))}
              {projects.filter((p) => p.status === col.id).length === 0 && (
                <p className="empty-hint">Keine Projekte hier</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
