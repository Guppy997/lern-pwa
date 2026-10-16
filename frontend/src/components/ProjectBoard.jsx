import { useState } from 'react';
import { BOARD_COLUMNS, formatDuration, parseDbDate } from '../constants.js';
import ContributionHeatmap from './ContributionHeatmap.jsx';

// Auf dem Handy liegen die Spalten untereinander — dort bleiben nur die aktiven
// Projekte aufgeklappt, damit "weiterlernen" ohne Scrollen erreichbar ist
const NARROW_QUERY = '(max-width: 760px)';
const isNarrow = () => Boolean(window.matchMedia?.(NARROW_QUERY).matches);

// Kalendertage statt 24h-Blöcke, damit "gestern 23 Uhr" auch "gestern" heißt
const lastActiveLabel = (dbDate) => {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(new Date()) - startOfDay(parseDbDate(dbDate))) / 86400000);
  if (days <= 0) return 'zuletzt heute';
  if (days === 1) return 'zuletzt gestern';
  return `zuletzt vor ${days} Tagen`;
};

const projectStats = (project) => {
  if (!project.session_count) return 'Noch keine Session';
  const sessions = `${project.session_count} ${project.session_count === 1 ? 'Session' : 'Sessions'}`;
  return `${formatDuration(project.focus_seconds)} gelernt · ${sessions} · ${lastActiveLabel(project.last_active)}`;
};

function ProjectCard({ project, menuOpen, onToggleMenu, onOpen, onMove, onArchive }) {
  const targets = BOARD_COLUMNS.filter((c) => c.id !== project.status);

  return (
    <div className={`project-card ${menuOpen ? 'menu-open' : ''}`}>
      <div className="project-card-row">
        <button className="project-card-main" onClick={() => onOpen(project)}>
          <strong>{project.name}</strong>
          <span className="project-card-stats">{projectStats(project)}</span>
        </button>
        <button
          type="button"
          className="ghost project-card-toggle"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Aktionen schließen' : `Aktionen für ${project.name}`}
        >
          {menuOpen ? '✕' : '⋯'}
        </button>
      </div>
      {menuOpen && (
        <div className="project-card-actions">
          {targets.map((c) => (
            <button type="button" className="secondary" key={c.id} onClick={() => onMove(project, c.id)}>
              → {c.label}
            </button>
          ))}
          {/* Ohne Rückfrage: aus dem Archiv lässt es sich jederzeit wiederherstellen */}
          <button type="button" className="secondary" onClick={() => onArchive(project)}>
            Archivieren
          </button>
        </div>
      )}
    </div>
  );
}

// Projekte anlegen ist selten (Projekte öffnen dagegen täglich) — darum kein
// dauerhaft sichtbares Eingabefeld mehr, sondern ein Link am Ende von "Aktiv"
function NewProjectForm({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const close = () => {
    setOpen(false);
    setName('');
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setCreating(true);
    try {
      await onCreate(name.trim());
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="link new-project-toggle" onClick={() => setOpen(true)}>
        + Neues Projekt
      </button>
    );
  }

  return (
    <form className="new-project" onSubmit={submit}>
      <input
        type="text"
        autoFocus
        placeholder="z. B. 'SEO-Recherche'"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="secondary" onClick={close}>Abbrechen</button>
        <button type="submit" disabled={creating || !name.trim()}>Anlegen</button>
      </div>
    </form>
  );
}

function ArchiveSection({ projects, onRestore, onDelete }) {
  const [open, setOpen] = useState(false);

  const handleDelete = (project) => {
    const warning = project.session_count
      ? `"${project.name}" endgültig löschen? Dabei verschwinden auch alle ${project.session_count} Sessions — Lernkalender und Statistik verlieren diese Zeit.`
      : `"${project.name}" endgültig löschen?`;
    if (window.confirm(warning)) onDelete(project);
  };

  return (
    <div className="board-archive">
      <button type="button" className="column-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="column-toggle-icon" aria-hidden="true">{open ? '▾' : '▸'}</span>
        Archiv <span className="column-count">({projects.length})</span>
      </button>
      {open && (
        <ul className="archive-list">
          {projects.map((p) => (
            <li className="archive-item" key={p.id}>
              <div className="archive-item-text">
                <strong>{p.name}</strong>
                <span className="project-card-stats">{projectStats(p)}</span>
              </div>
              <div className="archive-item-actions">
                <button type="button" className="secondary" onClick={() => onRestore(p)}>Wiederherstellen</button>
                <button type="button" className="link danger" onClick={() => handleDelete(p)}>Endgültig löschen</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProjectBoard({
  projects, onOpen, onMove, onArchive, onRestore, onDelete, onCreate, onShowStats,
  notifPermission, onEnableNotifications
}) {
  const [collapsed, setCollapsed] = useState(() => (isNarrow() ? { paused: true, done: true } : {}));
  const toggleColumn = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // Immer nur ein ⋯-Menü offen — sonst bleiben vergessene Menüs anderer Karten
  // stehen, und nach dem Verschieben wäre die Karte in der neuen Spalte noch aufgeklappt
  const [openMenuId, setOpenMenuId] = useState(null);
  const toggleMenu = (id) => setOpenMenuId((current) => (current === id ? null : id));
  const moveProject = (project, status) => {
    setOpenMenuId(null);
    onMove(project, status);
  };
  const archiveProject = (project) => {
    setOpenMenuId(null);
    onArchive(project);
  };

  const onBoard = projects.filter((p) => !p.archived_at);
  const archived = projects.filter((p) => p.archived_at);

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
        {BOARD_COLUMNS.map((col) => {
          const items = onBoard.filter((p) => p.status === col.id);
          const isActive = col.id === 'active';
          const isCollapsed = !isActive && Boolean(collapsed[col.id]);
          return (
            <div className={`board-column ${isCollapsed ? 'collapsed' : ''}`} key={col.id}>
              {isActive ? (
                <h2>{col.label}</h2>
              ) : (
                <h2>
                  <button
                    type="button"
                    className="column-toggle"
                    onClick={() => toggleColumn(col.id)}
                    aria-expanded={!isCollapsed}
                  >
                    <span className="column-toggle-icon" aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
                    {col.label} <span className="column-count">({items.length})</span>
                  </button>
                </h2>
              )}
              {!isCollapsed && (
                <div className="board-column-cards">
                  {items.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      menuOpen={openMenuId === p.id}
                      onToggleMenu={() => toggleMenu(p.id)}
                      onOpen={onOpen}
                      onMove={moveProject}
                      onArchive={archiveProject}
                    />
                  ))}
                  {items.length === 0 && <p className="empty-hint">Keine Projekte hier</p>}
                  {isActive && <NewProjectForm onCreate={onCreate} />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ContributionHeatmap />

      {archived.length > 0 && (
        <ArchiveSection projects={archived} onRestore={onRestore} onDelete={onDelete} />
      )}
    </div>
  );
}
