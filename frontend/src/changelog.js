// Manuell gepflegt — bei jedem sichtbaren Release hier oben einen neuen Eintrag
// ergänzen und APP_VERSION (+ "version" in package.json) hochzählen.
export const APP_VERSION = '1.6.2';

export const CHANGELOG = [
  {
    version: '1.6.2',
    date: '2026-10-16',
    notes: [
      'Überschriften-Check entfernt: Der Timer zeigt nur noch Zeit, Pause und Beenden'
    ]
  },
  {
    version: '1.6.1',
    date: '2026-10-16',
    notes: [
      'Statistik: "Wofür du gelernt hast" und "Wie es lief" sind jetzt ruhiger und aufgeräumter, mit dünnen Balken in einer Farbe, weniger Text und ohne farbige Flächen',
      'Fix: Die Statistik ist in Wochen- und Monatsansicht gleich breit und springt beim Umschalten nicht mehr'
    ]
  },
  {
    version: '1.6.0',
    date: '2026-10-16',
    notes: [
      'Lernkalender auf der Startseite: standardmäßig die letzten 3 Monate mit deutlich größeren Feldern. Über den Filter oben rechts auch 6 oder 12 Monate. Die App merkt sich deine Wahl',
      'Statistik: Statt der kleinen Kalender-Kästchen zeigt sie jetzt, wofür du wie lange gelernt hast (pro Projekt) und wie es lief (Ø Bewertung, auch nach Tageszeit)'
    ]
  },
  {
    version: '1.5.2',
    date: '2026-10-16',
    notes: [
      'Die Versionsnummer steht jetzt ganz unten auf der Seite, statt beim Scrollen über dem Inhalt zu schweben',
      'Nur der Hinweis "Update verfügbar" schwebt weiter unten links, solange ein Update bereitliegt'
    ]
  },
  {
    version: '1.5.1',
    date: '2026-10-16',
    notes: [
      'Startseite wieder im gewohnten Aufbau: Lernkalender und "Projekt anlegen" oben, Pfeile ← → auf den Karten',
      'Unter den Pfeilen öffnet "⋯" die Aktionen Archivieren und Löschen',
      'Spalten lassen sich per Tipp auf die Überschrift ein- und ausklappen. Sie sind standardmäßig offen, und die App merkt sich deine Auswahl',
      'Das Archiv bleibt gesammelt unter dem Board'
    ]
  },
  {
    version: '1.5.0',
    date: '2026-10-16',
    notes: [
      'Neu: Archiv — Projekte verschwinden vom Board, ihre Lernzeit zählt aber weiter in Lernkalender und Statistik. Wiederherstellen bringt sie in ihre alte Spalte zurück',
      'Endgültig löschen geht nur noch aus dem Archiv heraus',
      'Projekte stehen jetzt ganz oben, der Lernkalender darunter. Auf dem Handy sind "Pausiert" und "Abgeschlossen" eingeklappt',
      'Statt der Pfeile ← → öffnet "⋯" auf jeder Karte die Aktionen: verschieben oder archivieren',
      'Karten zeigen, wann du zuletzt an dem Projekt gelernt hast',
      '"+ Neues Projekt" sitzt jetzt am Ende der Spalte "Aktiv"',
      'Fix: Auf dem Handy war die Startseite breiter als der Bildschirm (wegen des Jahres-Lernkalenders). Jetzt scrollt nur noch der Kalender, und zwar direkt zum heutigen Tag'
    ]
  },
  {
    version: '1.4.1',
    date: '2026-10-16',
    notes: [
      'Der Hinweis "Update verfügbar" kommt jetzt auch, wenn die App lange offen bleibt: Sie sucht beim Zurückholen in den Vordergrund und stündlich nach neuen Versionen',
      'Wartung im Hintergrund: Server auf Node 24 aktualisiert, reproduzierbare Builds'
    ]
  },
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
