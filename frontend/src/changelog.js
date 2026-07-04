// Manuell gepflegt (kein Git in diesem Projekt) — bei jedem sichtbaren Release
// hier oben einen neuen Eintrag ergänzen und APP_VERSION hochzählen.
export const APP_VERSION = '1.1.0';

export const CHANGELOG = [
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
