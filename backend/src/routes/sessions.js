import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// POST /api/sessions -> start a session for a project (optionally tied to today's plan)
router.post('/', (req, res) => {
  const { projectId, dayPlanId, plannedMinutes } = req.body;
  if (!projectId || !plannedMinutes) {
    return res.status(400).json({ error: 'projectId und plannedMinutes sind erforderlich' });
  }

  // Ohne diesen Check würde eine Session für ein zwischenzeitlich gelöschtes
  // Projekt (z. B. zweiter offener Tab) als Karteileiche angelegt, die keine
  // WHERE project_id = ?-Abfrage je wieder findet.
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const result = db
    .prepare(
      `INSERT INTO sessions (project_id, day_plan_id, mode, planned_minutes)
       VALUES (?, ?, 'free', ?)`
    )
    .run(projectId, dayPlanId || null, plannedMinutes);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ session });
});

// PATCH /api/sessions/:id -> end a session with feedback, recall text and focus stats
router.patch('/:id', (req, res) => {
  const { efficiencyRating, feedbackNote, recallText, pausedSeconds, focusSeconds, methodData } = req.body;

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session nicht gefunden' });

  // Fokuszeit kommt vom Client (aktive Timer-Zeit); nie mehr als geplant gutschreiben
  const plannedSeconds = session.planned_minutes * 60;
  const focus = Number.isFinite(focusSeconds)
    ? Math.min(Math.max(0, Math.round(focusSeconds)), plannedSeconds)
    : null;
  const rating = Number.isFinite(efficiencyRating)
    ? Math.min(Math.max(1, Math.round(efficiencyRating)), 5)
    : null;
  const paused = Number.isFinite(pausedSeconds) ? Math.max(0, Math.round(pausedSeconds)) : 0;

  db.prepare(
    `UPDATE sessions
     SET ended_at = datetime('now'), efficiency_rating = ?, feedback_note = ?,
         recall_text = ?, paused_seconds = ?, focus_seconds = ?, method_data = ?
     WHERE id = ?`
  ).run(
    rating,
    feedbackNote ?? null,
    recallText ?? null,
    paused,
    focus,
    methodData ? JSON.stringify(methodData) : null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  res.json({ session: updated });
});

// DELETE /api/sessions/:id -> discard a running session or remove one from history
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Session nicht gefunden' });
  res.status(204).end();
});

export default router;
