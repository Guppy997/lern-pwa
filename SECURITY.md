# Sicherheit

## Unterstützte Versionen

Sicherheitskorrekturen gibt es für den aktuellen Stand des `main`-Branches. Ältere Versionen werden nicht gepflegt.

## Sicherheitslücke melden

Bitte melde Sicherheitslücken **nicht** über ein öffentliches Issue, sondern vertraulich über GitHub: Reiter **Security**, dann **Report a vulnerability**. Die Meldung sehe nur ich.

Hilfreich sind:
- die betroffene Version oder der Commit,
- Schritte, mit denen sich das Problem nachvollziehen lässt,
- was ein Angreifer damit erreichen könnte.

Ich melde mich, sobald ich die Meldung gesehen habe, und gebe Bescheid, wenn eine Korrektur veröffentlicht ist.

## Bekannte Grenzen

Die App hat bewusst keine Anmeldung und ist für den Betrieb in einem privaten Netz oder hinter Tailscale bzw. einem VPN gedacht (siehe README, Abschnitt „Selbst hosten“). Dass jemand mit Zugang zu diesem Netz die Daten lesen und ändern kann, ist deshalb eine dokumentierte Grenze und keine Sicherheitslücke. Alles, was darüber hinausgeht, zum Beispiel Zugriff ohne Netzzugang oder das Ausführen von Code, ist eine willkommene Meldung.
