import { Router } from 'express';
import { db } from '../db.js';

const router = Router();
// Lokales Datum (TZ aus docker-compose), nicht UTC — sonst rutscht ein Plan,
// der kurz nach Mitternacht angelegt wird, auf den Vortag
const today = () => new Date().toLocaleDateString('sv-SE');

// Echte Fokuszeit: vom Client gemeldete aktive Zeit; für Alt-Sessions ohne
// focus_seconds die Wandzeit minus Pausen, gedeckelt auf die geplante Dauer
// (sonst zählt Liegenlassen nach Timer-Ende als Lernzeit).
const PER_SESSION_FOCUS_SQL = `
  COALESCE(
    s.focus_seconds,
    CAST(MIN(
      MAX(0, (julianday(s.ended_at) - julianday(s.started_at)) * 86400 - s.paused_seconds),
      s.planned_minutes * 60
    ) AS INTEGER)
  )
`;

const FOCUS_SECONDS_SQL = `
  COALESCE(SUM(
    CASE WHEN s.ended_at IS NOT NULL THEN ${PER_SESSION_FOCUS_SQL} ELSE 0 END
  ), 0)
`;

// GET /api/projects -> board view with stats per project
router.get('/', (req, res) => {
  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.status, p.created_at, p.archived_at,
              COUNT(s.id) FILTER (WHERE s.ended_at IS NOT NULL) AS session_count,
              CAST(${FOCUS_SECONDS_SQL} AS INTEGER) AS focus_seconds,
              MAX(s.started_at) AS last_active
       FROM projects p
       LEFT JOIN sessions s ON s.project_id = p.id
       GROUP BY p.id
       ORDER BY last_active IS NULL, last_active DESC`
    )
    .all();

  res.json({ projects });
});

// POST /api/projects -> create a new project
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name ist erforderlich' });

  try {
    const result = db
      .prepare(`INSERT INTO projects (name, status) VALUES (?, 'active')`)
      .run(name.trim());
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ project });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // Archivierte Projekte sind auf dem Board unsichtbar — ohne den Hinweis
      // wäre unklar, wo das "bereits existierende" Projekt steckt
      const existing = db.prepare('SELECT archived_at FROM projects WHERE name = ?').get(name.trim());
      return res.status(409).json({
        error: existing?.archived_at
          ? 'Ein Projekt mit diesem Namen liegt im Archiv — stell es von dort wieder her'
          : 'Ein Projekt mit diesem Namen existiert bereits'
      });
    }
    throw err;
  }
});

// PATCH /api/projects/:id -> move between board columns (active/paused/done)
// and/or archive/restore. Archiv ist ein eigenes Feld statt eines weiteren
// Status, damit Wiederherstellen das Projekt in seine alte Spalte zurückbringt.
router.patch('/:id', (req, res) => {
  const { status, archived } = req.body;
  if (status === undefined && archived === undefined) {
    return res.status(400).json({ error: 'status oder archived ist erforderlich' });
  }
  if (status !== undefined && !['active', 'paused', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }
  if (archived !== undefined && typeof archived !== 'boolean') {
    return res.status(400).json({ error: 'archived muss true oder false sein' });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  if (status !== undefined) {
    db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(status, project.id);
  }
  if (archived !== undefined) {
    db.prepare(
      `UPDATE projects SET archived_at = ${archived ? "datetime('now')" : 'NULL'} WHERE id = ?`
    ).run(project.id);
  }

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
  res.json({ project: updated });
});

// DELETE /api/projects/:id -> remove project with its plans and sessions
router.delete('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const remove = db.transaction((id) => {
    db.prepare('DELETE FROM sessions WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM day_plans WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  });
  remove(project.id);

  res.status(204).end();
});

// GET /api/projects/:id -> detail incl. today's plan, history and totals
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const dayPlan = db
    .prepare('SELECT * FROM day_plans WHERE project_id = ? AND date = ?')
    .get(project.id, today());

  // Alle Tagespläne fürs Gruppieren im Verlauf — auch Tage mit Plan, aber ohne
  // absolvierte Session sollen dort als "geplant, nichts gemacht" auftauchen
  const dayPlans = db
    .prepare('SELECT * FROM day_plans WHERE project_id = ? ORDER BY date DESC')
    .all(project.id);

  const sessions = db
    .prepare(
      `SELECT s.*,
              CASE WHEN s.ended_at IS NOT NULL THEN ${PER_SESSION_FOCUS_SQL} ELSE NULL END AS effective_focus_seconds
       FROM sessions s WHERE s.project_id = ? ORDER BY s.started_at DESC`
    )
    .all(project.id);

  const totals = db
    .prepare(
      `SELECT COUNT(*) FILTER (WHERE s.ended_at IS NOT NULL) AS session_count,
              CAST(${FOCUS_SECONDS_SQL} AS INTEGER) AS focus_seconds
       FROM sessions s WHERE s.project_id = ?`
    )
    .get(project.id);

  res.json({ project, dayPlan: dayPlan || null, dayPlans, sessions, totals });
});

// POST /api/projects/:id/day-plan -> create or replace today's plan for this project
router.post('/:id/day-plan', (req, res) => {
  const { goal, method, plannedSessions } = req.body;
  if (!goal || !method || !plannedSessions) {
    return res.status(400).json({ error: 'goal, method und plannedSessions sind erforderlich' });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const existed = Boolean(
    db.prepare('SELECT 1 FROM day_plans WHERE project_id = ? AND date = ?').get(project.id, today())
  );

  db.prepare(
    `INSERT INTO day_plans (project_id, date, goal, method, planned_sessions)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(project_id, date) DO UPDATE SET
       goal = excluded.goal, method = excluded.method, planned_sessions = excluded.planned_sessions,
       completed_at = NULL`
  ).run(project.id, today(), goal.trim(), method, plannedSessions);

  const dayPlan = db
    .prepare('SELECT * FROM day_plans WHERE project_id = ? AND date = ?')
    .get(project.id, today());

  res.status(existed ? 200 : 201).json({ dayPlan });
});

// PATCH /api/projects/:id/day-plan -> mark today's plan as completed (or reopen it)
router.patch('/:id/day-plan', (req, res) => {
  const { completed } = req.body;

  const dayPlan = db
    .prepare('SELECT * FROM day_plans WHERE project_id = ? AND date = ?')
    .get(req.params.id, today());
  if (!dayPlan) return res.status(404).json({ error: 'Kein Tagesplan für heute vorhanden' });

  db.prepare(
    `UPDATE day_plans SET completed_at = ${completed ? "datetime('now')" : 'NULL'} WHERE id = ?`
  ).run(dayPlan.id);

  const updated = db.prepare('SELECT * FROM day_plans WHERE id = ?').get(dayPlan.id);
  res.json({ dayPlan: updated });
});

export default router;
