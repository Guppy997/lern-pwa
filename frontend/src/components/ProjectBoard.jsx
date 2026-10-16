import { useState } from 'react';
import { BOARD_COLUMNS, formatDuration, parseDbDate } from '../constants.js';
import ContributionHeatmap from './ContributionHeatmap.jsx';

// Eingeklappte Spalten bleiben über Neustarts hinweg eingeklappt. Reine
// Bequemlichkeit pro Gerät — ohne localStorage (privater Modus o. Ä.) ist
// einfach wieder alles offen.
const COLLAPSED_KEY = 'lern-pwa:collapsed-columns';
const loadCollapsed = () => {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || {};
  } catch {
    return {};
  }
};
const saveCollapsed = (value) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(value));
  } catch {
    // nicht speicherbar — gilt dann nur bis zum nächsten Neustart
  }
};

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

function ProjectCard({ project, menuOpen, onToggleMenu, onOpen, onMove, onArchive, onDelete }) {
  const columnIndex = BOARD_COLUMNS.findIndex((c) => c.id === project.status);
  const prev = BOARD_COLUMNS[columnIndex - 1];
  const next = BOARD_COLUMNS[columnIndex + 1];

  const handleDelete = () => {
    const warning = project.session_count
      ? `"${project.name}" inkl. Verlauf wirklich löschen? Die ${project.session_count} Sessions verschwinden dann auch aus Lernkalender und Statistik — "Archivieren" behält sie.`
      : `"${project.name}" wirklich löschen?`;
    if (window.confirm(warning)) onDelete(project);
  };

  return (
    <div className={`project-card ${menuOpen ? 'menu-open' : ''}`}>
      <div className="project-card-row">
        <button className="project-card-main" onClick={() => onOpen(project)}>
          <strong>{project.name}</strong>
          <span className="project-card-stats">{projectStats(project)}</span>
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
          <button
            className="ghost menu-toggle"
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Menü schließen' : `Weitere Aktionen für ${project.name}`}
          >
            ⋯
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="project-card-actions">
          {/* Ohne Rückfrage: aus dem Archiv lässt es sich jederzeit wiederherstellen */}
          <button type="button" className="secondary" onClick={() => onArchive(project)}>Archivieren</button>
          <button type="button" className="secondary danger" onClick={handleDelete}>Löschen</button>
        </div>
      )}
    </div>
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
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const toggleColumn = (id) => {
    const next = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(next);
    saveCollapsed(next);
  };

  // Immer nur ein ⋯-Menü offen — sonst bleiben vergessene Menüs anderer Karten
  // stehen, und nach dem Verschieben wäre die Karte in der neuen Spalte noch aufgeklappt
  const [openMenuId, setOpenMenuId] = useState(null);
  const toggleMenu = (id) => setOpenMenuId((current) => (current === id ? null : id));
  const closeMenuAnd = (action) => (...args) => {
    setOpenMenuId(null);
    action(...args);
  };

  const onBoard = projects.filter((p) => !p.archived_at);
  const archived = projects.filter((p) => p.archived_at);

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
        {BOARD_COLUMNS.map((col) => {
          const items = onBoard.filter((p) => p.status === col.id);
          const isCollapsed = Boolean(collapsed[col.id]);
          return (
            <div className={`board-column ${isCollapsed ? 'collapsed' : ''}`} key={col.id}>
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
              {!isCollapsed && (
                <div className="board-column-cards">
                  {items.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      menuOpen={openMenuId === p.id}
                      onToggleMenu={() => toggleMenu(p.id)}
                      onOpen={onOpen}
                      onMove={closeMenuAnd(onMove)}
                      onArchive={closeMenuAnd(onArchive)}
                      onDelete={closeMenuAnd(onDelete)}
                    />
                  ))}
                  {items.length === 0 && <p className="empty-hint">Keine Projekte hier</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {archived.length > 0 && (
        <ArchiveSection projects={archived} onRestore={onRestore} onDelete={onDelete} />
      )}
    </div>
  );
}
