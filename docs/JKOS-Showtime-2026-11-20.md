# JKOS · Showtime

Stand: 20. November 2026 · Repo: jazzkellerffm/jk-inventory

## Gesicherter Rücksprungpunkt

Vor dieser Ergänzung wurde der Branch `checkpoint/before-showtime-2026-11-20` auf GitHub angelegt, ausgehend von `e8c0816dc5474c7126211cf7d01e840ba8a11303`.

Für einen Rückbau die Showtime-Ergänzung gezielt in einem neuen Commit entfernen. Kein Force-Push und kein pauschales Zurücksetzen späterer Änderungen. Safari-Auswahl, CSV, Dienstplan und Buchungslogik gehören nicht zu dieser Änderung.

## Anzeige und Daten

- Kompakter Abschnitt oben in der bestehenden grünen Baraktivitäts-Kachel. Gustavo für den Countdown, schmaler Rosé-Balken für gebuchte Gäste. Das bestehende Zahlungsdiagramm bleibt darunter.
- Verwendet `useTicketFeed` und dessen vorhandene `nights`. Keine zusätzliche API-Abfrage, keine Änderung an Ticket Tailor.
- Wählt den frühesten gültigen Termin ab dem aktuellen Betriebstag. Der laufende Abend bleibt bis 03:00 Uhr Europe/Berlin sichtbar; Sommerzeit wird berücksichtigt.
- Showzeit kommt vom tatsächlichen Event. Einlass ist eine Stunde vorher. Mi/Do somit gewöhnlich 20:00/21:00, Fr/Sa 20:30/21:30, So 19:00/20:00. Abweichende Eventzeiten bleiben möglich.
- Vor Einlass: „Einlass in …“. Danach bis zum Showbeginn: „Show in …“. Anschließend: „Showtime seit HH:mm“ als planmäßige Startzeit, keine Live-Bestätigung eines Bühnenbeginns.
- Zukünftige Kalendertage erscheinen als „morgen“ bzw. „in N Tagen“. Eventdatum und beide Uhrzeiten stehen immer dabei. Keine Sekunden; die vorhandene 15-Sekunden-Uhr des Dashboards aktualisiert den Countdown.
- Balken: gebuchte Personen / Richtwert 60, auf 0–100 % begrenzt. Paketanzahl wird nicht als Gästezahl verwendet.
- Expliziter Sold-out-Status aus dem bestehenden Feed füllt den Balken vollständig und zeigt „Sold out“, auch unter 60 Gästen. Ein voller Balken erzeugt allein keinen Sold-out-Status.
- Unbekannte Paketgrößen werden mit „≥“ und „Zuordnung offen“ kenntlich gemacht. Bei Abruffehlern oder einem über fünf Minuten alten Feed bleiben Daten mit „Letzter Stand“ erkennbar; der Balken wird abgeschwächt.
- Ladezustand, fehlende Verbindung, fehlgeschlagener Abruf und leere Vorschau haben jeweils eigene Texte.

## Dateien

- `lib/staff/showtime.ts`: Auswahl, Zeitphasen und Füllstand.
- `components/staff/showtime.tsx` und `showtime.module.css`: Anzeige.
- `components/staff/dashboard.tsx` und `app/staff/staff.css`: Einbettung und inneres Grid für die bisherige Baraktivität.
- `tests/staff-showtime.test.mjs`: sechs Regressionstests; in `test:staff` aufgenommen.

## Prüfung

- 64 Staff-Tests bestanden, einschließlich Einlass/Show, Wochenend-/Sonderzeiten, Mitternacht, 03:00-Umschaltung, Sommerzeit und Sold-out-/Gästegrenzen.
- TypeScript, gezielter ESLint-Lauf und Next.js-Produktionsbuild bestanden.
- Safari-Select-Komponente und ihre Styles nicht verändert.
- Veröffentlichte Desktop-Demo unter `https://staff.jazzkeller.com/staff/demo` im Cloud-Browser visuell geprüft: Showtime mit Gustavo-Zeit, Rosé-Balken und bestehendem Zahlungsdiagramm wird korrekt dargestellt.
- Visuelle iPhone-/Safari-Prüfung steht aus: lokales WebKit scheitert an fehlenden Systembibliotheken, Chromium an gesperrten Browser-Sockets. Die erfolgreiche Desktop-Prüfung ersetzt keinen mobilen Safari-Test.
