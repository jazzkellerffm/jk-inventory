# Gemeinsame Monatsübersicht

Stand: 20. November 2026.

## Sicherung
Vorheriger Produktionsstand: `390b5e8b4a25af744d6ad559b8b5581c704b738d`.
GitHub-Sicherungszweig: `checkpoint/before-month-navigation-2026-11-20`.

## Verhalten
- Abschnitt „Abende im …“: Monat/Jahr, Vor-/Zurück-Pfeile, horizontales Wischen.
- Aktueller Betriebsmonat plus zwölf zurückliegende Monate; frühestens Juni 2026.
- Keine zukünftigen Monate. Der laufende Monat trägt „bisher“.
- Vier bestehende Kategorien bleiben erhalten. Anzahl abgeschlossener Abende und Sold-out-Anteil ergänzen den Vergleich.
- Gemeinsame Überschrift „Monatsübersicht · Monat Jahr“: Abende, Monatsgäste, VIP-Tische und Ticketkategorien wechseln zusammen. Buchungsvorlauf und kommende Events behalten ihren eigenen Zeitraum.
- Maßgeblich ist der Veranstaltungsmonat, nicht das Kaufdatum. Im laufenden Monat zählen Gäste, VIP-Tische und Kategorien auch kommende Termine; das Abenddiagramm nur abgeschlossene Tage.
- Während des Ladens werden keine Zahlen des zuvor ausgewählten Monats stehen gelassen.
- Safari-Veranstaltungsauswahl unverändert.

## Daten
Aktueller Monat nutzt den vorhandenen TicketFeed. Historische Monate werden beim Aufrufen separat über den authentifizierten `/api/staff/night-history?month=YYYY-MM` geladen. Ereignisse und gültige Tickets verwenden die vorhandene V1-Lesehilfe, keine Änderung an der zentralen V2-Bestellschnittstelle.
- Bekannte Absagen werden über den bestehenden Performance-Filter ausgeschlossen.
- Mehrere Events an einem Kalendertag zählen als ein Abend; Paketgrößen zählen Personen, Add-ons nicht.
- Sold out entspricht dem Anbieterstatus, nicht einer neu eingeführten Kapazitätsgrenze.
- Servercache fünf Minuten, maximal 13 Monate, schlüsselgebunden; Fehler werden nicht gespeichert.
- Fehlende/fehlgeschlagene Antworten werden als Ladefehler mit Wiederholen angezeigt. Ein erfolgreich leerer Monat erhält einen ausdrücklichen Leerzustand.
- Client verhindert veraltete Antworten nach Monatswechsel; bereits geladene historische Monate bleiben während der Ansicht im Speicher.

## Prüfung
73 Staff-Tests bestanden, einschließlich Monatsgrenzen/Jahreswechsel, Tagesaggregation, Paketgrößen, Ausschluss von Absagen/Add-ons, Cache und Fehlerwiederholung.
ESLint für geänderte TS/TSX-Dateien sowie Next-Produktionsbuild bestanden.
Echte historische Produktionsdaten und iPhone-Safari-Gesten sind nicht durch diese automatisierten Tests abgedeckt.

## Dezente Pfeile
Auf Wunsch am 20. November: Kreisrahmen entfernt. Pfeile bleiben unverändert, mit unsichtbaren 44 × 44 px Tippflächen, deaktivierten Randzuständen und sichtbarem Tastaturfokus. Keine Änderung an Wischgeste oder Datenlogik.

## Sicherung vor gemeinsamer Monatsübersicht
Produktionsstand: `1fd28c4ad3b0113e29358285114150b6cca660c1`.
Sicherungszweig: `checkpoint/before-shared-month-2026-11-20`.
Der historische Endpunkt liefert alle vier Auswertungen in einer Antwort. Der Client übernimmt sie gemeinsam. Der bestehende `counts`-Wert bleibt kompatibel. Zusätzlicher Test prüft vergangene und kommende Termine, Personen pro Paket, VIP-Tabellen sowie ausgeschlossene ungültige Tickets und Add-ons.

## Stabile Monatsnavigation
Überschrift bewusst in zwei Zeilen: „Monatsübersicht“, darunter Monat/Jahr links und Pfeile in einer festen rechten Grid-Spalte. Lange Monatsnamen verschieben die Navigation nicht mehr in eine neue Zeile. Unsichtbare 44-px-Tippflächen bleiben erhalten. Reine Layoutänderung.
