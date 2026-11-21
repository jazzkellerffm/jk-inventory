# JKOS · Staff Administration

Stand: 21. November 2026. Übergabe für weitere Threads.

## Projekt und verbindlicher Stand

- App: https://staff.jazzkeller.com, geschützter Bereich `/staff/admin`.
- Repository: https://github.com/jazzkellerffm/jk-inventory, Branch `main`.
- Technische Dokumentation: `docs/STAFF-ADMIN.md`.
- Diese Datei wird zusätzlich unter `/JKOS/DOCUMENTATION/CONTEXT/JKOS-Staff-Administration.md` in Dropbox abgelegt.
- Sicherungspunkt vor der letzten Verfeinerung: `c00b8db14bbdcee14acb84bc4c976be9730b16b5`. Aktuellen Veröffentlichungsstand immer anhand GitHub und Vercel prüfen.

## Oberfläche

Die Administration ergänzt die Teamansicht um vertrauliche Zahlen. Sie ist bewusst ruhig, kompakt und in der bestehenden JKOS-Palette gehalten. Große Zahlen, kleinere Erläuterungen, schlichte Pfeile ohne Kreisrahmen und großzügige unsichtbare Tippflächen.

### Aktueller Abend

- Eigene grüne Kachel oberhalb der Monatsauswahl.
- Veranstaltungsname und direkt darunter die gut sichtbare Anzahl **gebuchter Gäste**. Das ist keine Zahl eingecheckter Gäste.
- Gesamtwert des Abends und getrennt Ticket Tailor / SumUp, mit bestehendem Rosé-/Salbeigrün-Balken.
- Darunter `SumUp + Inklusivgetränke` als kalkulatorische Orientierung.
- Einzelposten unter `Zusammensetzung`, Datenstand und manuelles Aktualisieren im Fuß.
- Aktualisierung alle 60 Sekunden bei sichtbarer, entsperrter Ansicht.
- Nach Berliner Mitternacht `Abend abgeschlossen`; der vergangene Serviceabend bleibt bis 03:00 sichtbar. Um 03:00 wird zum nächsten Serviceabend gewechselt.

### SumUp im Verlauf

- Eigener aufklappbarer Abschnitt unter der Abendkachel; zunächst geschlossen.
- **Keine Historienabfrage beim bloßen Öffnen der Administration.** Erst das Aufklappen lädt die sichtbaren zwölf Monate.
- Schlichte Pfeile wechseln zu älteren beziehungsweise neueren Zwölfmonatsfenstern. Grenzen sind der erste verfügbare Zahlungsmonat und der laufende Monat.
- Monatsbalken statt einer Linie. Salbeigrün als Grundfarbe, Rosé für den ausgewählten Monat. Der laufende Monat ist zusätzlich als `bisher` und mit gepunkteter Balkenkante gekennzeichnet.
- Tippen auf einen Balken oder Auswahl im Monatsfeld zeigt den genauen Betrag. Fehlende Daten bleiben ein Strich; null Euro und negative Erstattungsmonate werden davon unterschieden.
- Ein Ladeindikator pro angefordertem Fenster. Fertig geladene Seiten werden während derselben sichtbaren, entsperrten Sitzung wiederverwendet. Erneutes Aufklappen oder Zurückblättern lädt diese Seiten nicht erneut.
- Datenstand und Aktualisierungsknopf bleiben sichtbar. Manuelles Aktualisieren erneuert das gewählte Fenster; die vorhandenen kurzen Server-Caches gelten weiter.
- Beim Schließen oder Fensterwechsel werden laufende Anfragen abgebrochen. Sperren, Ablauf oder Verbergen der Adminansicht verwirft den privaten Zustand. Keine dauerhafte Browserablage.

### Monatsübersicht

- Bestehender Pillenschalter `Zahlungen / Veranstaltungen`.
- Pfeile und Wischgesten für die Monate bleiben erhalten; aktuell ab Juni 2026 bis zum laufenden Monat.
- Veranstaltungen bleiben kompakte aufklappbare Zeilen mit Datum, vollständigem Namen und Ticket-Tailor-Gesamtwert. Details erscheinen erst beim Öffnen.
- Die Historienauswahl und der aktuelle Abend sind unabhängig von dieser Monatsauswahl.

## Was die Zahlen bedeuten

| Anzeige | Bedeutung |
| --- | --- |
| Zahlungen im Monat | Zahlungs- und Rückzahlungsdatum in Europe/Berlin, auch für später stattfindende Veranstaltungen |
| Veranstaltungen im Monat | Veranstaltungsdatum, unabhängig vom Kaufmonat; gültige Buchungen gemäß bestehendem Abgleich |
| Ticket Tailor gesamt | Ticketpakete + tatsächlich berechnete Kunden-Buchungsgebühren + Zusatzbestellungen |
| Ticketpakete | Paketwert einschließlich enthaltener Getränke, ohne Buchungsgebühren und Zusatzbestellungen |
| Buchungsgebühren | Tatsächliche Gebühren aus den Bestellzeilen; keine pauschale Annahme von 3 oder 5 Euro |
| Bewertete Inklusivgetränke | Kalkulatorischer Teil des Paketwerts, kein zusätzlicher Zahlungseingang und keine Verbrauchsmessung |
| Ticketanteil ohne Inklusivgetränke | Paketwert minus vollständig bewertete Inklusivleistungen; kein einheitlicher Basispreis oder Gewinn |
| SumUp-Zahlungen des Abends | Bestehende Zuordnung zum Berliner Serviceabend von 03:00 bis 03:00, einschließlich verifizierter Erstattungszuordnung |
| Gesamtwert des Abends | Ticket Tailor gesamt + SumUp; Inklusivleistungen werden nicht nochmals addiert |
| SumUp + Inklusivgetränke | Separate kalkulatorische Summe zur Orientierung; kein verifizierter reiner Gastronomieumsatz |
| SumUp im Verlauf | Kalendermonate nach Rückzahlungen, vor Anbietergebühren und Kreditrückzahlung; etwaige Trinkgelder enthalten |

Stripe wird nicht noch einmal addiert. Auszahlungen, Kreditrückzahlungen, Kosten und Gewinn sind andere Größen. Unvollständige oder nicht sicher zuordenbare Daten werden nicht durch erfundene Werte ersetzt. Stornierte Buchungen werden in der Veranstaltungsansicht ausgeschlossen; ihre Zahlungen/Rückzahlungen bleiben in der Zahlungsansicht berücksichtigt.

### Vereinbarte Inklusivwerte

| Leistung | Rechenwert |
| --- | --- |
| Inklusivdrink | 15 € |
| Flasche Crémant | 50 € |
| Flasche Moët | 129 €, noch vorläufig zu bestätigen |
| Historische Gläser Crémant | Noch kein vereinbarter Rechenwert |

Fehlende Werte werden mit Menge benannt. Bekannte Teilbeträge bleiben sichtbar; abhängige Gesamtberechnungen dürfen bei unvollständiger Bewertung nicht als vollständig erscheinen. Der Vergleich mit einem vermeintlichen einheitlichen Club-/Single-Basispreis ist auf Philipps Wunsch vorerst aus der Oberfläche genommen.

## Zugriff und Daten

- Bestehende Teamsitzung plus separate serverseitig geprüfte Admin-PIN-Sitzung.
- PIN-Prüfwert in der Production-Konfiguration; keine PIN, Prüfwerte oder API-Schlüssel in Markdown, GitHub oder Chat übernehmen.
- Private API-Antworten mit `no-store`, Autorisierungsprüfung vor dem Lesen und vor dem Ausliefern.
- Die Verfeinerung ändert keine Finanzformel, API-Version, Zugangskonfiguration oder öffentliche Teamstatistik.

## Technische Orientierung und Prüfung

- `components/staff/admin-dashboard.tsx`: Abendkachel, Historienaufklapper und Monatsbalken.
- `lib/staff/admin/history-window.ts`: Zwölfmonatsfenster, sitzungsinterner Seitencache, Abbruch- und Wiederholungslogik.
- `lib/staff/admin/dashboard.ts`: vorhandene Abend-/Historienberechnung.
- `app/staff/staff.css`: bestehende Staff-Gestaltung plus eingegrenzte Admin-Stile.
- `tests/staff-admin-history-window.test.mjs` und `tests/staff-admin-history-ui.test.mjs`: neue Abfrage-, Cache- und Lebenszyklusprüfungen.

117 Staff-Tests erfolgreich; TypeScript, gezielte ESLint-Prüfung und lokale Renderprüfungen erfolgreich. Die Renderprüfungen decken Gästezahl, geschlossenen Aufklapper, fehlende/teilweise Daten, Balken, Gebühren und Mitternachtszustand ab. Sie sind kein visueller iPhone-/Safari-Test. Dieser bleibt offen, da der lokale Browser nicht startet und die automatische Freigabe einen zusätzlichen externen Browsercheck mit internem Quellcode abgelehnt hat. Der Versuch wurde nicht wiederholt.

Vor Veröffentlichung muss der vollständige Deployment-Build erfolgreich sein; Vercel dokumentiert das Ergebnis zum jeweiligen Commit. Vorherige Live-Abgleiche und ihre Grenzen stehen in `docs/STAFF-ADMIN.md`; ältere Archivmonate sind dadurch nicht pauschal zertifiziert.

## Später, nicht Teil dieser Änderung

- Vorläufigen Moët-Rechenwert und historische Crémant-Glaswerte bestätigen.
- Weitere gestalterische Anpassungen anhand der tatsächlichen Nutzung.
- Getränkemix, öffentlicher saisonaler Verlauf, Wochenkennzahlen und Payout-Builder separat besprechen.
- Für einen echten Gastronomieanteil SumUp-Produkte gezielt klassifizieren; die jetzige Orientierung nicht entsprechend umbenennen.
