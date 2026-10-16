import { defineConfig } from 'vitest/config';

// Jede Testdatei läuft in einem eigenen Prozess und bekommt so eine frische
// In-Memory-Datenbank; db.js legt das Schema an wie beim normalen Start.
export default defineConfig({
  test: {
    env: {
      TZ: 'Europe/Berlin',
      DB_PATH: ':memory:'
    }
  }
});
