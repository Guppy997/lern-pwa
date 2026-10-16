import { app } from './app.js';

// Tagesplan, Verlauf und Statistik rechnen mit lokalen Kalendertagen — mit
// falscher Zeitzone würden sie still falsch zählen, darum lieber gar nicht starten.
if (process.env.TZ !== 'Europe/Berlin') {
  console.error(
    `FEHLER: TZ ist "${process.env.TZ}", erwartet "Europe/Berlin". ` +
    `Tagesgrenzen/Statistiken rechnen sonst falsch (siehe docker-compose.yml). Beende.`
  );
  process.exit(1);
}

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Lern-PWA backend läuft auf Port ${port}`));
