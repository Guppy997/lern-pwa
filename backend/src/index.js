import express from 'express';
import './db.js';
import projectsRouter from './routes/projects.js';
import sessionsRouter from './routes/sessions.js';
import statsRouter from './routes/stats.js';

// nginx proxied /api/ auf denselben Origin wie das Frontend (siehe nginx.conf) —
// der Browser sieht also nie eine Cross-Origin-Anfrage. CORS wird hier nicht
// gebraucht; ein offenes app.use(cors()) wäre nur ein Footgun für den Tag,
// an dem das Backend doch mal direkt erreichbar ist.
if (process.env.TZ !== 'Europe/Berlin') {
  console.error(
    `FEHLER: TZ ist "${process.env.TZ}", erwartet "Europe/Berlin". ` +
    `Tagesgrenzen/Statistiken rechnen sonst falsch (siehe docker-compose.yml). Beende.`
  );
  process.exit(1);
}

const app = express();
app.use(express.json());

app.use('/api/projects', projectsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Zentrales Error-Handling: ohne das würde ein durchgereichter DB-Fehler
// (z. B. Datenträger voll) als Express-HTML-Seite statt JSON zurückkommen,
// und im Dev-Modus mit vollem Stacktrace im Response-Body.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Lern-PWA backend läuft auf Port ${port}`));
