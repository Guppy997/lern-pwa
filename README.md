# Lern-PWA

Persönlicher Lern-Tracker als installierbare PWA — Tagesplanung pro Projekt, Fokus-Timer, Active-Recall-Feedback und Verlauf. Läuft als Docker-Compose-Stack auf einem Raspberry Pi, erreichbar per Tailscale.

## Was die App macht

- **Projekt-Board** (Kanban: Aktiv / Pausiert / Abgeschlossen) für alles, was gerade gelernt wird
- **Tagesplan pro Projekt**: Ziel, Lernmethode, Anzahl geplanter Sessions — abhakbar
- **Fokus-Timer** mit drei Zeitsystemen (25/5-Sprint, 52/17-Deep-Work, freier Timer), Pause/Weiter, Signalton + Browser-Benachrichtigung am Ende
- **Überschriften-Check**: während der Session beliebig oft nutzbares Active-Recall-Tool (Vermutung vor dem Lesen festhalten)
- **Feedback nach jeder Session**: Active-Recall-Text (was ist hängengeblieben, aus dem Kopf), Effizienz-Bewertung (1–5 Sterne), freie Notiz
- **Verlauf** nach Kalendertag gruppiert, mit Detailansicht pro Session
- **Lernkalender** im GitHub-Stil auf der Startseite (laufendes Jahr) mit Lern-Serie in Tagen
- **Statistik-Ansicht** (Woche/Monat, durchblätterbar) mit Fokuszeit-Diagramm und Lernkalender für den Zeitraum
- **Offene Sessions** (App zwischendurch geschlossen) lassen sich fortsetzen oder verwerfen
- Als **PWA installierbar**, funktioniert offline (zeigt den letzten bekannten Stand, wenn der Pi nicht erreichbar ist)
- **Update-Button** unten links, sobald eine neue Version bereitsteht, plus **Versionsverlauf** per Klick

## Architektur

```
React + Vite (PWA)  →  nginx (nginx-unprivileged, non-root, :8080)
                          │  proxy /api/ →
                       Express-Backend (non-root, :3001)
                          │
                       better-sqlite3 (WAL-Modus, Foreign Keys, Indizes)
```

- **Frontend:** `frontend/` — React 18, Vite, `vite-plugin-pwa` (Manifest, Service Worker, Offline-Caching für `/api/*` per NetworkFirst)
- **Backend:** `backend/` — Node 24, Express, better-sqlite3, keine ORM, alle Queries parametrisiert
- **Deployment:** `docker-compose.yml`, drei Container (`backend`, `frontend`, Tailscale-Sidecar `ts-lern`), Ressourcen-Limits gesetzt (Pi teilt sich RAM mit einem k3s-Cluster nebenan)
- **Erreichbarkeit:** `ts-lern` ist ein eigener Tailnet-Knoten (`lern-pwa`) und reicht HTTPS per `ts-serve.json` an nginx durch. Der Auth-Key steht als `TS_AUTHKEY` in `.env` (nicht im Repo)
- **Builds:** beide Dockerfiles bauen per `npm ci` exakt aus den Lockfiles
- **Daten:** `./data/lern.sqlite` (Bind-Mount), `TZ=Europe/Berlin` ist wichtig für korrekte Tagesgrenzen in Statistik/Tagesplan

## Backup

Tägliches Backup per Cronjob (03:30), Script `backend/src/backup.js`:
- `VACUUM INTO` erzeugt eine konsistente Single-File-Snapshot-Datei — unabhängig vom aktuellen WAL-Zustand
- Ablage in `data/backups/`, 14-Tage-Rotation
- Manuell auslösen: `docker compose exec backend node src/backup.js`

## Lokal starten

```bash
docker compose up -d --build backend frontend
```

Frontend danach unter `http://127.0.0.1:8090` erreichbar (Backend ist nicht direkt exponiert, nur intern über nginx-Proxy). Den Tailscale-Sidecar braucht man lokal nicht — ohne `TS_AUTHKEY` in `.env` startet er ohnehin nicht.

Für Frontend-Entwicklung mit Hot Reload:
```bash
cd frontend && npm install && npm run dev
```

## Stand

Erste Version 13.06.2026 (großer Umbau: direkter Start ohne Session-Launcher, Verlauf nach Kalendertag). Härtungsrunde 04.07.2026: Backup-Strategie, Foreign Keys, non-root Container, Ressourcen-Limits, Offline-Fähigkeit, Update-Button + Versionsverlauf. 06.–07.07.2026 (v1.2–1.4): Lernkalender, Statistik zum Blättern, Mobile-Feinschliff, Tailscale-Sidecar. Wartung 16.10.2026: Node 24, better-sqlite3 12, reproduzierbare Builds. Details siehe `frontend/src/changelog.js` (manuell gepflegt, kein CI in diesem Projekt).
