// Manuell gepflegt (kein Git in diesem Projekt) — bei jedem sichtbaren Release
// hier oben einen neuen Eintrag ergänzen und APP_VERSION hochzählen.
export const APP_VERSION = '1.4.0';

export const CHANGELOG = [
  {
    version: '1.4.0',
    date: '2026-07-07',
    notes: [
      'Kompletter Mobile-Optimierungsdurchgang: deutlich weniger verschenkter Rand auf schmalen Screens, größere Tipp-Ziele bei den Kanban-Pfeilen/Löschen-Buttons, sauberer Abstand für Versionsverlauf/Zurück-Links auf Geräten mit Notch/Home-Indicator'
    ]
  },
  {
    version: '1.3.0',
    date: '2026-07-06',
    notes: [
      'Dashboard zeigt jetzt immer das komplette laufende Jahr im Lernkalender, in Monats-Blöcken mit etwas Abstand dazwischen',
      'Statistik: durch Wochen/Monate blättern (← →) statt nur "letzte 7/30 Tage" — Balken und Lernkalender zeigen dann genau diesen Zeitraum'
    ]
  },
  {
    version: '1.2.5',
    date: '2026-07-06',
    notes: [
      'Lernkalender zeigt jetzt entweder das komplette Jahr (wenn Platz ist) oder nur den aktuellen Monat — statt eines beliebig abgeschnittenen Wochen-Rests'
    ]
  },
  {
    version: '1.2.4',
    date: '2026-07-06',
    notes: [
      'Fix: Monatsnamen im Lernkalender überlappten sich teils (Sep, Nov, Jan …) — jeder Monat bekommt jetzt zuverlässig genau ein Label'
    ]
  },
  {
    version: '1.2.3',
    date: '2026-07-06',
    notes: [
      'Fix: Breitenberechnung des Lern-Kalenders war ungenau (Monatslabel machten einzelne Wochen breiter)',
      'Lern-Kalender in der Statistik passt sich jetzt auch an die Fensterbreite an (kein Scrollen mehr nötig)',
      'Größere, leichter tippbare Kästchen auf dem Handy'
    ]
  },
  {
    version: '1.2.2',
    date: '2026-07-06',
    notes: [
      'Lern-Kalender auf der Startseite passt sich jetzt an deine Fensterbreite an (zeigt so viele Wochen wie Platz ist)'
    ]
  },
  {
    version: '1.2.1',
    date: '2026-07-06',
    notes: [
      'Lern-Kalender auf der Startseite jetzt kompakter (letzte 3 Monate statt ganzes Jahr)',
      'Volles Jahr des Lern-Kalenders jetzt in der Statistik zu finden'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-07-06',
    notes: [
      'Neu auf der Startseite: Lern-Kalender im GitHub-Stil (letzte 365 Tage, je stärker die Farbe desto mehr gelernt)',
      'Zeigt aktuelle Lern-Serie in Tagen in Folge'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-07-04',
    notes: [
      'Funktioniert jetzt auch offline (zeigt den letzten bekannten Stand, wenn der Pi nicht erreichbar ist)',
      'Signalton am Timer-Ende zuverlässiger',
      'Sterne-Bewertung jetzt mit Tastatur/Screenreader bedienbar',
      'Update-Button und Versionsverlauf hinzugefügt'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-06-13',
    notes: [
      'Großer Umbau: direkter Start ohne Session-Launcher, Active Recall im Feedback-Formular',
      'Verlauf nach Kalendertag gruppiert, Tagesplan abhakbar',
      'Offene Sessions können fortgesetzt oder verworfen werden'
    ]
  }
];
