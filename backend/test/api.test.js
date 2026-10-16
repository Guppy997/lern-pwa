import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

// Die Tests laufen nacheinander gegen dieselbe frische In-Memory-Datenbank
// (siehe vitest.config.js) und bauen aufeinander auf: Projekt anlegen, planen,
// lernen, auswerten, aufräumen.
const api = request(app);
const isoDate = (d) => d.toLocaleDateString('sv-SE');

describe('Grundgerüst', () => {
  it('meldet sich im Healthcheck', async () => {
    const res = await api.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('Projekte', () => {
  it('legt ein Projekt an', async () => {
    const res = await api.post('/api/projects').send({ name: '  Statistik-Klausur ' });
    expect(res.status).toBe(201);
    expect(res.body.project).toMatchObject({ id: 1, name: 'Statistik-Klausur', status: 'active', archived_at: null });
  });

  it('lehnt leere und doppelte Namen ab', async () => {
    expect((await api.post('/api/projects').send({ name: ' ' })).status).toBe(400);
    const dup = await api.post('/api/projects').send({ name: 'Statistik-Klausur' });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/existiert bereits/);
  });

  it('liefert das Board mit Fokuszeit, Session-Anzahl und Archiv-Feld', async () => {
    const res = await api.get('/api/projects');
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0]).toMatchObject({ session_count: 0, focus_seconds: 0, archived_at: null });
  });
});

describe('Archiv', () => {
  it('prüft die Eingaben beim Ändern', async () => {
    expect((await api.patch('/api/projects/1').send({})).status).toBe(400);
    expect((await api.patch('/api/projects/1').send({ status: 'irgendwas' })).status).toBe(400);
    expect((await api.patch('/api/projects/1').send({ archived: 'ja' })).status).toBe(400);
    expect((await api.patch('/api/projects/999').send({ archived: true })).status).toBe(404);
  });

  it('archiviert, ohne die Spalte zu verlieren, und stellt wieder her', async () => {
    await api.patch('/api/projects/1').send({ status: 'paused' });
    const archived = await api.patch('/api/projects/1').send({ archived: true });
    expect(archived.body.project.status).toBe('paused');
    expect(archived.body.project.archived_at).not.toBeNull();

    const dup = await api.post('/api/projects').send({ name: 'Statistik-Klausur' });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/Archiv/);

    const restored = await api.patch('/api/projects/1').send({ archived: false, status: 'active' });
    expect(restored.body.project).toMatchObject({ status: 'active', archived_at: null });
  });
});

describe('Tagesplan', () => {
  it('verlangt Ziel, Methode und Anzahl', async () => {
    expect((await api.post('/api/projects/1/day-plan').send({ goal: 'Kapitel 4' })).status).toBe(400);
  });

  it('legt den heutigen Plan an und ersetzt ihn', async () => {
    const created = await api.post('/api/projects/1/day-plan').send({ goal: 'Kapitel 4', method: 'sprint', plannedSessions: 3 });
    expect(created.status).toBe(201);
    expect(created.body.dayPlan).toMatchObject({ goal: 'Kapitel 4', method: 'sprint', planned_sessions: 3, date: isoDate(new Date()) });

    const replaced = await api.post('/api/projects/1/day-plan').send({ goal: 'Kapitel 5', method: 'deep', plannedSessions: 2 });
    expect(replaced.status).toBe(200);
    expect(replaced.body.dayPlan).toMatchObject({ goal: 'Kapitel 5', method: 'deep', planned_sessions: 2 });
  });

  it('hakt den Plan ab und öffnet ihn wieder', async () => {
    const done = await api.patch('/api/projects/1/day-plan').send({ completed: true });
    expect(done.body.dayPlan.completed_at).not.toBeNull();
    const reopened = await api.patch('/api/projects/1/day-plan').send({ completed: false });
    expect(reopened.body.dayPlan.completed_at).toBeNull();
  });
});

describe('Sessions', () => {
  let sessionId;

  it('startet nur für bestehende Projekte', async () => {
    expect((await api.post('/api/sessions').send({ projectId: 999, plannedMinutes: 25 })).status).toBe(404);
    expect((await api.post('/api/sessions').send({ projectId: 1 })).status).toBe(400);

    const res = await api.post('/api/sessions').send({ projectId: 1, plannedMinutes: 25 });
    expect(res.status).toBe(201);
    expect(res.body.session).toMatchObject({ project_id: 1, planned_minutes: 25, ended_at: null });
    sessionId = res.body.session.id;
  });

  it('deckelt die Fokuszeit auf die geplante Dauer und begrenzt die Bewertung auf 1 bis 5', async () => {
    const res = await api.patch(`/api/sessions/${sessionId}`).send({
      focusSeconds: 9999,
      pausedSeconds: -30,
      efficiencyRating: 9,
      recallText: 'Konfidenzintervalle werden mit kleinerem n breiter.'
    });
    expect(res.body.session).toMatchObject({
      focus_seconds: 25 * 60,
      paused_seconds: 0,
      efficiency_rating: 5,
      recall_text: 'Konfidenzintervalle werden mit kleinerem n breiter.'
    });
    expect(res.body.session.ended_at).not.toBeNull();
  });

  it('meldet unbekannte Sessions beim Löschen', async () => {
    expect((await api.delete('/api/sessions/999')).status).toBe(404);
  });
});

describe('Statistik', () => {
  it('liefert Tage, Lernzeit pro Projekt und Bewertung für die aktuelle Woche', async () => {
    const res = await api.get('/api/stats?period=week&offset=0');
    expect(res.body.days).toHaveLength(7);
    expect(res.body).toMatchObject({ totalFocusSeconds: 1500, totalSessions: 1, activeDays: 1 });
    expect(res.body.projects).toEqual([
      { id: 1, name: 'Statistik-Klausur', archived: false, focus_seconds: 1500, session_count: 1 }
    ]);
    expect(res.body.rating).toMatchObject({ average: 5, count: 1 });
    expect(res.body.rating.byDaytime).toHaveLength(1);
  });

  it('zeigt für den Lernkalender den Zeitraum vom Monatsersten bis heute', async () => {
    const now = new Date();
    const res = await api.get('/api/stats?period=lastMonths&months=3');
    expect(res.body.months).toBe(3);
    expect(res.body.days[0].date).toBe(isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)));
    expect(res.body.days.at(-1).date).toBe(isoDate(now));

    const clamped = await api.get('/api/stats?period=lastMonths&months=99');
    expect(clamped.body.months).toBe(12);
  });

  it('liefert für leere Zeiträume leere Auswertungen', async () => {
    const res = await api.get('/api/stats?period=week&offset=-40');
    expect(res.body.projects).toEqual([]);
    expect(res.body.rating).toEqual({ average: null, count: 0, byDaytime: [] });
  });
});

describe('Projekt löschen', () => {
  it('löscht das Projekt samt Tagesplänen und Sessions', async () => {
    expect((await api.delete('/api/projects/1')).status).toBe(204);
    expect((await api.get('/api/projects/1')).status).toBe(404);
    const stats = await api.get('/api/stats?period=week&offset=0');
    expect(stats.body.totalSessions).toBe(0);
  });
});
