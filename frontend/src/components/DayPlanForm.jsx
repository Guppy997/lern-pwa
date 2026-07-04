import { useState } from 'react';
import { TIME_SYSTEMS } from '../constants.js';

export default function DayPlanForm({ initialPlan, onSave, onSkip, onCancel }) {
  const initialIsFree = initialPlan?.method?.startsWith('free:');
  const [goal, setGoal] = useState(initialPlan?.goal || '');
  const [method, setMethod] = useState(initialIsFree ? 'free' : initialPlan?.method || TIME_SYSTEMS[0].id);
  const [freeMinutes, setFreeMinutes] = useState(initialIsFree ? Number(initialPlan.method.split(':')[1]) : 45);
  const [plannedSessions, setPlannedSessions] = useState(initialPlan?.planned_sessions || 4);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!goal.trim()) {
      setError('Bitte trag dein heutiges Ziel für dieses Projekt ein.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        goal: goal.trim(),
        method: method === 'free' ? `free:${freeMinutes}` : method,
        plannedSessions: Number(plannedSessions)
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form className="day-plan-form" onSubmit={submit}>
      <p className="hint-label">Heutiges Ziel für dieses Projekt</p>
      <input
        type="text"
        placeholder='z. B. "Kapitel 3 zusammenfassen"'
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
      />

      <fieldset>
        <legend>System heute</legend>
        {TIME_SYSTEMS.map((s) => (
          <label key={s.id} className="radio">
            <input
              type="radio"
              name="method"
              value={s.id}
              checked={method === s.id}
              onChange={() => setMethod(s.id)}
            />
            {s.label}
          </label>
        ))}
        {method === 'free' && (
          <label className="inline">
            Minuten pro Session
            <input
              type="number"
              min="5"
              max="180"
              value={freeMinutes}
              onChange={(e) => setFreeMinutes(e.target.value)}
            />
          </label>
        )}
      </fieldset>

      <label className="inline">
        Geplante Sessions heute
        <input
          type="number"
          min="1"
          max="12"
          value={plannedSessions}
          onChange={(e) => setPlannedSessions(e.target.value)}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>Abbrechen</button>
        )}
        {onSkip && (
          <button type="button" className="secondary" onClick={onSkip}>Ohne Plan starten</button>
        )}
        <button type="submit" disabled={saving}>{saving ? 'Speichere…' : 'Plan speichern'}</button>
      </div>
    </form>
  );
}
