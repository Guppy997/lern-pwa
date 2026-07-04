import { useState } from 'react';

export default function FeedbackForm({ onSubmit }) {
  const [recallText, setRecallText] = useState('');
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        efficiencyRating: rating || null,
        feedbackNote: note.trim() || null,
        recallText: recallText.trim() || null
      });
    } catch (err) {
      // Eingaben bleiben erhalten — einfach nochmal speichern
      setError(`Speichern fehlgeschlagen: ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h1>Wie lief's?</h1>

      <label>
        Active Recall: Was hast du gelernt? Gib es in eigenen Worten wieder.
        <textarea
          rows="6"
          placeholder="Schreib aus dem Kopf auf, was hängengeblieben ist — ohne nachzuschauen."
          value={recallText}
          onChange={(e) => setRecallText(e.target.value)}
        />
      </label>

      <p className="subtitle">1 = total abgelenkt · 5 = absolut im Tunnel</p>
      <div className="stars" role="radiogroup" aria-label="Bewertung, 1 bis 5 Sterne">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            className={`star ${n <= rating ? 'active' : ''}`}
            onClick={() => setRating(n)}
            aria-label={`${n} Sterne`}
            aria-checked={n === rating}
          >
            {n <= rating ? '★' : '☆'}
          </button>
        ))}
      </div>

      <label>
        Was lief gut? Wo bin ich hängengeblieben? (optional)
        <textarea
          rows="3"
          placeholder='z. B. "Bei Google Ads Kontostruktur aufgehalten, morgen direkt mit Anzeigengruppen weitermachen."'
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? 'Speichere…' : error ? 'Nochmal speichern' : 'Speichern & weiter'}
      </button>
    </form>
  );
}
