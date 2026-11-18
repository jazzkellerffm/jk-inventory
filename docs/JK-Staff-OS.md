# JK Staff OS · Projektübergabe

Stand 18. November 2026. JK Staff OS ist der mobile Arbeitsbildschirm für Bar, Backstage, Service und Door im Jazzkeller Frankfurt. Diese Datei ist der Einstieg für eine neue Cursor- oder ChatGPT-Sitzung.

## Verbindlicher Stand für die nächste Sitzung

Abgleich am 18. November 2026. GitHub `main` ist der maßgebliche Stand; `/JKOS/DOCUMENTATION/CONTEXT/JK-Staff-OS.md` ist die synchronisierte Kontextkopie. Letzter geprüfter Funktionsstand: `3299327a80ef8379f498bc274330649925ec227a` (vereinfachte CSV für Anita), Produktion READY. Produkt-/Add-on-Reparatur: `9f2bcb6abdaf24a09e1a307cde69bfca22dc6de8`, von Philipp live bestätigt. Weitere operative Regeln stehen in [JKOS-Service-and-Door.md](JKOS-Service-and-Door.md).

Aktuell: Service & Door liest Orders über Ticket Tailor v2; Hummus und weitere Produkte werden über die Buchungs-ID zugeordnet. CSV: sechs Spalten, nach Ticketkategorie sortiert. Historische SumUp-Paginierung repariert; Absagen werden aus Performance-Durchschnitten ausgeschlossen und separat gezählt. Jam verwendet Lavendel/Violett, NYJB Pflaumenlila. Die folgenden datierten Änderungsnotizen sind Historie; bei Widersprüchen gilt die jüngste Notiz. Weekend ist bisher nur eine Idee, kein umgesetztes Tool.

| Thema | Status |
| --- | --- |
| SumUp-Artikelzuordnung, Abend-/Wochenbestseller | Repariert und live; Artikel aus Sales statt allein aus leeren Belegfeldern. Produktionsprotokoll bestätigte vier von vier Wochenzahlungen zugeordnet, `incomplete: 0`. |
| SumUp-Monatsbestseller | Noch offen: ältere Zahlungen sind teilweise nicht zugeordnet. Keine vollständige Reparatur behaupten. |
| Wochenwahl und Preloader | Live: Aktuell / +1 Wo. / +2 Wo. / +3 Wo.; SumUp verwendet denselben Salbei/Rosé-Loader wie Ticket Tailor. |
| Barpegel | Live: festes Fünf-Minuten-Fenster für SumUp plus offene Included Drinks aus der letzten Stunde. |
| Küchenpegel | Live: festes Zehn-Minuten-Fenster; ab zwei Hummus oder drei Snackportionen „Viel los“. |
| Mengenabhängiges langsameres Abklingen | Nur besprochen, NICHT implementiert; konkrete Formel und Zeiten noch nicht festgelegt. |
| QR Order & Pay / Web-KDS-Statusintegration | Nur recherchiert, NICHT angebunden; Zugriff mit unserem Schlüssel nicht bestätigt. |

Der letzte Funktionsstand bestand den Produktionsbuild und 41 automatisierte Tests. Die Simulation großer Bestellmengen ersetzt keine Kalibrierung während eines echten vollen Abends. Bei dieser Übergabepflege wird ausschließlich die Dokumentation geändert.

## In fünf Minuten wieder einsteigen

1. Produktion läuft vom Branch `main` im Repository `jazzkellerffm/jk-inventory`. Der Stand vom 17. November enthält den Buchungston, die Zeitraumwahl für Bestseller (Standard immer aktueller Betriebsabend) und die Sales-Artikelanbindung für Bestseller und Barpegel. Für die weitere Arbeit den aktuellen Stand von `main` laden.
2. Auf Philipps Mac ist der vorbereitete Projektordner `~/Documents/JKOS/jk-staff-os`. Im Terminal dieses Ordners zuerst `git status -sb` und `git remote -v` prüfen. Dann `git switch main` und `git pull --ff-only`. Eigene lokale Änderungen vorher sichten und sichern.
3. Für eine frische Arbeitskopie in einem freien Zielordner den folgenden Block verwenden. Eine bestehende Arbeitskopie kann direkt mit `npm ci` und `npm run dev` starten.

```sh
git clone --branch main https://github.com/jazzkellerffm/jk-inventory.git jk-staff-os
cd jk-staff-os
npm ci
npm run dev
```

4. Am vom Terminal gemeldeten Port **/staff/demo** öffnen. Die Startseite **/** zeigt das Inventory, der Paketname beim Start lautet ebenfalls jk-inventory. **/staff** ist der Teamzugang zu den Live-Daten. Für die Demo genügen die eingebauten Beispieldaten.
5. Vor der Veröffentlichung `npm run build` ausführen. Das Vercel-Projekt `jk-inventory` gehört zum Team `jazzkellerffms-projects`. Beim Production-Deployment Commit und Status READY prüfen. [Teamzugang](https://staff.jazzkeller.com/staff) · [Demo](https://staff.jazzkeller.com/staff/demo). Der Branch `feature/jk-staff-os` diente der Vorschau. Branchgebundene Preview-Variablen und Production-Variablen werden separat gepflegt.

## Aufbau und Datenquellen

Next.js App Router, TypeScript und React. Die Staff-Ansicht führt vorhandene Quellen zusammen. Sie hat keine eigene Dienstplan- oder Umsatzdatenbank. Der Browser ruft die Staff-API auf. Die Zugangsdaten für die externen Dienste verwendet der Server.

| Bereich | Quelle und Einstieg im Code | Was die Crew sieht |
| --- | --- | --- |
| Bar-Monitor | `app/api/staff/board/route.ts`, `lib/staff/sumup.ts`, `lib/staff/sumup-sales.ts`, `components/staff/dashboard.tsx` | Erfolgreiche SumUp-Zahlungen, über Zahlungsreferenzen zugeordnete Sales-Positionen (Beleg als Fallback), Abendumsatz und Verlauf der letzten Stunde in Fünf-Minuten-Balken. Ohne Artikeldetails bleibt die Zahlung als solche sichtbar. |
| Included Drinks | Dasselbe Board und `lib/staff/included-drinks.ts` lesen die bestehende Supabase-Tabelle `orders` der Menü-App | Bestellte Menge, Drink, Tisch und ausdrücklich gemeldeter Status offen/serviert. Bis zu acht letzte Bestellungen. Die Ausgabe wird in der Included-Drinks-App gepflegt. |
| Food Orders | `app/api/staff/food/route.ts` und `lib/staff/food.ts` lesen SumUp Sales und deren Einzelpositionen | Bis zu fünf letzte Essensbestellungen, Snack-Umsatz und sein Anteil am SumUp-Abendumsatz. Bei gemischtem Bon zählt nur der Wert der Positionen in der Kategorie „Bar Snacks“. |
| Vorverkauf und Service | `app/api/staff/tickets/route.ts`, `app/api/staff/service/route.ts`, `lib/staff/tickets.ts` und `entitlements.ts` lesen Ticket Tailor | Gebuchte Gäste und inkludierte Drinks je Abend, Gästeliste nach Ticketkategorie, bezahlte Add-ons je Buchung und Check-in. |
| Dienstplan | `data/dienstplan.json`, `lib/staff/schedule.ts`, `components/staff/schedule.tsx` und `station-cards.tsx` | Freigegebene Rollen mit Namen, Woche/Monat und Namensfilter. „Team heute Abend“ verwendet dieselben Stationskacheln für den aktuellen Betriebsabend. |

## Regeln für den laufenden Abend

- **Tageswechsel um 03:00 Uhr Frankfurter Zeit.** Die zentrale Berechnung steht in `lib/staff/service-day.ts` und berücksichtigt die Zeitumstellung. Donnerstag 02:59 gehört noch zum Mittwoch. Die UI spart den Hinweis auf die Uhrzeit aus. Rollierende Anzeigen wie „letzte fünf Minuten“ laufen über diese Grenze hinweg.
- **Barpegel.** Grundlage sind Artikelmengen aus den letzten fünf Minuten erfolgreicher SumUp-Zahlungen plus offene Included Drinks der letzten Stunde. `lib/staff/bar-workload.ts` gewichtet erkannte Cocktailnamen mit 1, einfache Getränke mit 0,125 und übrige Artikel mit 0,5 pro Stück. Ab 3 Punkten „Zieht an“, ab 5 „Viel los“. „Bar Snacks“, Gebühren, Pfand und verkaufte Gutscheine erhöhen den Barpegel nicht. Geteilte Zahlungen desselben Sales zählen die Artikel nur einmal. Alle Zahlungen der letzten fünf Minuten zählen, auch wenn nur acht Karten sichtbar sind. Fehlende Artikelmengen werden nicht als ein Stück geraten. Unvollständige oder über 45 Sekunden alte Daten dürfen niemals „Ruhig“ ergeben; bekannte Mengen können trotzdem „Zieht an“ oder „Viel los“ belegen. Der Pegel schätzt den Arbeitsaufwand. Die aktuelle Staff-OS-Anbindung liest bei SumUp weder den Fertigstellungsstatus noch die Tischnummer aus; im separaten Web KDS sind solche Bestelldaten sichtbar.
- **Küchenpegel.** Für die letzten zehn Minuten ergeben zwei Hummus-Platten oder mindestens drei Snackportionen „Viel los“. Ticket-Tailor-Hummus für denselben Veranstaltungsabend steht separat als Vorbestellung. Er zählt weder zum SumUp-Snackumsatz noch als frisch eingegangene Küchenbestellung.
- **Sichtschutz.** Abendumsatz startet mit vier Punkten. Beim Snack-Umsatz entspricht ein Punkt einer Eurostelle vor dem Komma. 45,00 € erscheinen als ••. Antippen zeigt den Betrag fünf Sekunden lang, erneutes Tippen verdeckt ihn sofort. Die Maskierung dient dem Sichtschutz auf dem Display.
- **Hinweise und Ton.** Beim ersten Öffnen sind Drinks, Essen und Buchungen ausgewählt. Auswahl und Stummschaltung werden lokal für Demo und Teamzugang getrennt gespeichert. „Hinweise an“ zeigt die Auswahl an. Solange die Audioausgabe noch freigeschaltet werden muss, erscheint „Ton aktivieren“. Ein Tipp in der geöffneten App kann die Freigabe ebenfalls auslösen.
- Board und Food Orders aktualisieren sich bei sichtbarer Seite alle 15 Sekunden. Ein Einzelton meldet Drinks, ein Doppelton Essen. Zeitnah eintreffende Bestellhinweise können gebündelt werden. Die Infobar zeigt sie je 20 Sekunden. Antippen führt zu Drink-Bestellungen, SumUp-Zahlungen oder Food Orders.
- Eine neue Ticket-Tailor-Buchung löst beim Eingang in der sichtbaren App einen Dreiklang aus, auch während ein anderer Hinweis angezeigt wird. Die Buchungsanzeige bleibt fünf Sekunden sichtbar und führt beim Antippen zu „Gebuchte Gäste“. Die App erkennt wiederholt geladene Buchungen an ihrer ID. Am gesperrten Telefon gibt es keine Push-Mitteilung. Zuständig ist `components/staff/order-alerts.tsx`.
- **Tonprüfung am iPhone.** Demo oder Teamzugang öffnen, Buchungshinweise auswählen, bei Bedarf „Ton aktivieren“ antippen und „Buchung testen“ auslösen. Das simuliert den Hinweis ohne Ticketverkauf. Der Funktionstest vom 17. November bestätigte je einen Dreiklang für den Testknopf und eine simulierte neue Buchung. Die hörbare Wiedergabe bei einem echten Verkauf auf dem iPhone ist noch offen.

## Buchungslogik und Gestaltung

Ein Club-Ticket für vier ist ein Ticketpaket und zählt vier Gäste. Unklare Paketgrößen werden als ungeklärt ausgewiesen. Club Plus und Premium enthalten üblicherweise einen Drink pro Gast, explizite Mengen in der Ticketbezeichnung haben Vorrang. VIP-Flaschenleistungen und bezahlte Extras separat darstellen. „Checked in“ bedeutet, dass mindestens ein Ticket der Buchung eingecheckt wurde. Der Status sagt nichts über die tatsächliche Kopfzahl der eingetroffenen Gruppe.

„Gebuchte Gäste“ zeigt die Abende wochenweise. Unter der 24-Stunden-Legende stehen die Anzahl der heutigen Buchungen und die letzten Buchungen als wischbare Karten mit Konzertdatum, Titel und Ticketart. „Venue Performance“ ist die aufklappbare Auswertung mit Wochenvergleich, Buchungen der letzten 24 Stunden, monatlichen VIP-/Worldstar-Tischen, Ticketpaketen nach Kategorie und kommenden Events nach Gästezahl (Top 5/10/15 je nach Datenlage). Die Monatsübersicht zeigt auch die gebuchten Gäste aller Konzerttermine. Die Kaufstatistik zählt Ticketpakete nach Kaufzeitpunkt. „Käufe nach Uhrzeit“ fasst dieselbe Uhrzeit über alle sieben angezeigten Tage zusammen. Die Snack-Bestseller unter Food Orders zeigen bis zu fünf verkaufte Snacks nach Stückzahl. Davon getrennt zeigen die SumUp-Bestseller die verkaufte Stückzahl des Betriebsabends, der laufenden Woche oder des laufenden Monats (Top 3/5/10). Beim Öffnen ist immer der aktuelle Betriebsabend ausgewählt.

Mobile first im Rosé-Payout-Look des JK Booking Guide. Dunkelgrün für Baraktivität und aktive Switcher, Rosé für Abendumsatz, Apricot für Food Orders. Stationsfarben im Dienstplan und in der Schnellansicht gemeinsam pflegen: Bar rosé, Backstage apricot, Service pastellgrün, Door grau. Die untere Navigation führt zu Bar, Drinks, Food, Service und Tools. Drinks springt zu den Bestellungen, Food zum Snackpegel und Service öffnet Service & Door. Unter Tools liegen Inventory und Dienstplan. „Team heute Abend“ verlinkt direkt zum Dienstplan. Inventory und Dienstplan verwenden denselben hellen Salbeihintergrund mit dunkelgrünem Icon. Zwischen „Drink-Bestellungen“ und der Ticket-Tailor-Vorschau „Included Drinks“ liegen 16 px. Zentrale Styles liegen in `app/staff/staff.css`.

### Ladeverhalten bei Ticket Tailor

Beim ersten Abruf erscheint ein schmaler Ladebalken in Salbei und Rosé mit Text für Termine, Ticketverkauf oder Buchungen. Mit reduzierter Bewegung bleibt er statisch. „Included Drinks“ und „Gebuchte Gäste“ behalten bei Folgeabrufen ihre Werte und zeigen „Wird aktualisiert …“. Die geöffnete Gästeliste und die Vorbestellungen behalten beim Nachladen desselben Abends ihre Einträge. Ticketdaten werden bei sichtbarer Seite alle 60 Sekunden und bei Rückkehr zur Seite abgerufen. Für die Prüfung den geschützten Teamzugang verwenden. Die Demo nutzt Beispieldaten direkt. Zuständig sind `components/staff/ticket-loader.tsx`, `ticket-sales.tsx`, `service-plan.tsx` und `app/staff/staff.css`.

## Betrieb und Funktionsprüfung

Umgebungsvariablen für lokale Entwicklung in `.env.local`, auf Vercel in der gewünschten Umgebung setzen. Nach einer Änderung neu deployen. Hier sind nur die Variablennamen dokumentiert.

| Variable | Verwendung |
| --- | --- |
| `STAFF_ACCESS_KEY` | Team-Login und Signatur des Sitzungscookies |
| `SUMUP_MERCHANT_CODE`, `SUMUP_API_KEY` | Transaktionen, Belege und Sales |
| `INCLUDED_DRINKS_SUPABASE_URL`, `INCLUDED_DRINKS_PUBLISHABLE_KEY` | Lesender Zugriff auf die Bestellungen des Menüprojekts |
| `TICKET_TAILOR_API_KEY` | Leserechte für Events, Orders und Issued Tickets. Für die personalisierte interne Gästeliste müssen die benötigten Namen in den Antworten enthalten sein. |
| `STAFF_SHIFTS_JSON` | Bestehender Fallback, falls die Dienstplan-Datei leer ist |

**Prüfung nach Änderungen:** Zuerst die Demo auf dem Handy öffnen. Die drei Testtöne für Drink, Essen und Buchung prüfen, Sprungziele antippen, Umsatzfelder aufdecken und wieder verdecken lassen. Teamkacheln mit dem Dienstplan vergleichen. Anschließend im geschützten Teamzugang einen bekannten Beleg, eine Included-Drinks-Bestellung mit Tisch und eine Ticket-Tailor-Buchung mit Add-on vergleichen. Testdaten und Live-Daten getrennt beurteilen.

**Pflege:** Eine Planänderung in der JSON-Datei speichern, committen und deployen. Bei neuen Drink- oder Ticketbezeichnungen die Erkennungsregeln prüfen. Nach Änderungen an Betriebslogik oder Datenquellen diese Datei auf `main` fortschreiben und die Kopie in Dropbox unter `/JKOS/DOCUMENTATION/CONTEXT/JK-Staff-OS.md` aktualisieren. Dort ergänzen `JKOS-Service-and-Door.md` und `JK Booking - Apply v1 & Rose UI Pattern.md` den fachlichen und gestalterischen Kontext.

## Ausverkauf und Monatsauswertung

Für einen ausverkauften Einzeltermin in Ticket Tailor „unavailable“ aktivieren und als Status „Sold out“ oder „Fully booked“ setzen. JKOS zeigt dann neben dem Datum die champagnerfarbene Pille. Eine Gästeschwelle löst sie nicht aus.

Venue Performance zählt abgeschlossene Geschäftstage im laufenden Monat, jeweils einmal pro Veranstaltungsdatum. Ein Abend zählt als Sold out, wenn alle berücksichtigten Termine des Abends so markiert sind. Die übrigen Abende werden nach gebuchten Gästen eingeteilt: ab 45 gut besucht, 25–44 etwa halb voll, bis 24 ruhig. Unklare Paketgrößen werden bei uneindeutiger Einstufung separat ausgewiesen. Grundlage sind aktuelle Ticketdaten, keine historischen Status-Snapshots oder Check-ins.

## SumUp-Artikelkorrektur · 17. November 2026

**Nachgewiesene Ursache:** In den Produktionsprotokollen lieferten sowohl `transaction_data.products` des Receipt-Endpunkts als auch `products` des Transaction-Endpunkts leere Arrays. `product_summary` zeigte trotzdem Namen wie Caipirinha Magnifica; dieser Freitext ist keine belastbare Artikelliste. Der Sales-Probeaufruf lieferte 25 von 25 Verkäufen mit Artikelpositionen. Die alte Bestsellerlogik verwendete diese Positionen noch nicht.

**Artikelquelle:** `lib/staff/sumup-sales.ts` liest paginiert `POST /v1.0/merchants/{merchant}/sales/search` (PAID) und danach die Sale-Details. `payments[].reference` erfolgreicher Purchase-Zahlungen wird exakt gegen `transaction_code` bzw. die Transaktions-ID abgeglichen. Bei Order & Pay kommt die Referenz als Charge-URN (z. B. `urn:sumup:charge:<transaction_code>;2`); der bekannte URN-Vorsatz und die optionale numerische Version müssen vor dem Abgleich entfernt werden. Der direkte Vergleich ohne diese Normalisierung hatte trotz vorhandener Artikel keinen Treffer. Andere URN-Namensräume oder fehlerhafte Versionssuffixe werden nicht geraten. Keine Zuordnung über ähnliche Uhrzeit, Betrag oder Produkttext. Die Geldbeträge und Zahlungsbalken stammen weiterhin aus der erfolgreichen Transaktionshistorie. Damit werden dieselben Zahlungen mit echten Mengen ergänzt. Split-Zahlungen dürfen Bestseller und Arbeitsaufwand nicht verdoppeln.

Search-Ergebnisse sind nach Abschlussdatum sortiert. Der Leser stoppt am Beginn des benötigten Zeitfensters. Ein `start_date`-Filter wird bewusst nicht verwendet: Dieser filtert laut SumUp nach Anlagezeit und könnte einen vor dem Fenster eröffneten, aber erst darin bezahlten Bon verlieren. Details werden kurz gecacht; fehlende Daten werden nachgeladen. Wiederholte Seitentokens, ungültige Antworten und Seitenfehler dürfen keine unvollständige Liste als vollständig ausgeben. Der Live-Artikelabruf hat maximal zehn Sekunden Budget; der Umsatz bleibt auch bei fehlenden Artikeln sichtbar. Bestseller benötigen weiterhin eindeutige Artikel und Mengen für alle berücksichtigten Zahlungen.

**Diagnose:** `SumUp item coverage` protokolliert nur Anzahlen (`payments`, `matchedSales`, `incomplete`), keine Artikel-, Kunden-, Zahlungsreferenz- oder Zugangsdaten. Ein vollständiger erfolgreicher Live-Abgleich hat `incomplete: 0`. Die Prüfung mit echten neuen Bestellungen im laufenden Betrieb bleibt der Maßstab für die praktische Kalibrierung des geschätzten Barpegels.

**Automatische Prüfung:** `npm run test:staff` prüft 15 Fälle mit simulierten SumUp-Antworten, darunter echte Order-&-Pay-Referenzformen, unbekannte URN-Namensräume, 30 Zahlungen/60 Cocktails in fünf Minuten, mehrere Seiten, Split-Zahlungen, Gebühren/Snacks, fehlende Mengen, API-Ausfälle, Zeitlimits, veraltete Daten und den 03:00-Wechsel. `npm run build` prüft den Produktionsbuild. Der komplette ESLint-Lauf meldet weiterhin bestehende Probleme außerhalb dieser Korrektur (Inventory, Bestseller-Effekt, Performance, Ticket-Sales, Tickets); die geänderten Dateien werden separat geprüft.

**Prüfung mit echten Daten:** Der korrigierte Servercode wurde am 17. November in einer Vorschau mit den dort eingerichteten SumUp-Zugangsdaten ausgeführt. Bar-Artikelzuordnung sowie Abend- und Wochenbestseller bestanden den Vollständigkeitscheck. Der Monatsrückblick enthält noch unvollständige ältere Zahlungen; diese sind separat zu prüfen. Die manuelle Prüfung gibt nur Prüfergebnisse aus, keine Artikelnamen, Mengen, Umsätze oder Zahlungsreferenzen. Ein realer voller Betriebsabend bleibt für die praktische Kalibrierung des Pegels erforderlich.

Referenz: https://developer.sumup.com/api/sales/search/ und https://developer.sumup.com/api/sales/get/

## Wochenwahl und SumUp-Ladeanzeigen · 17. November 2026

Die Wochenwahl heißt „Aktuell“, „+1 Wo.“, „+2 Wo.“ und „+3 Wo.“. Gemeint sind die aktuelle Kalenderwoche und die nächsten drei Montag–Sonntag-Zeiträume, keine Wochenzählung innerhalb eines Monats. Die Datumsspanne bleibt darunter sichtbar.

Alle SumUp-Erstladeanzeigen (Baraktivität, Barpegel, Abendumsatz, letzte Zahlungen, Food Orders, Bestseller und Barumsatzvergleich) verwenden dieselbe `TicketLoader`-Komponente wie Ticket Tailor. Damit sind Salbei/Rosé, Animationsgeschwindigkeit und reduzierte Bewegung identisch. Folgeabrufe behalten vorhandene Daten und zeigen dezent „Wird aktualisiert …“. Fehlermeldungen bleiben während weiterer Abrufversuche sichtbar, bis eine erfolgreiche Antwort kommt. Beim Wechsel des Bestsellerzeitraums werden die alten Zahlen entfernt, damit sie nicht unter der neuen Überschrift stehen.

SumUp umfasst sowohl QR Order & Pay als auch Terminalzahlungen und manuell eingegebene, später bezahlte Bestellungen. Es zählt der Zahlungszeitpunkt; der ursprüngliche Bestellzeitpunkt ist daraus nicht verlässlich ableitbar. Der Barpegel berücksichtigt nur die letzten fünf Minuten SumUp-Zahlungen sowie ausdrücklich offene Included Drinks der letzten Stunde. Ein früherer Ansturm hält den Pegel nicht hoch. Ohne aktuelle Zahlungen und ohne offene Included Drinks lautet er bei vollständigen frischen Daten „Ruhig“. 15 automatisierte Tests enthalten nun ausdrücklich den Fall mit 60 Cocktails vor einer halben Stunde und anschließend ruhigem aktuellen Zeitfenster.

## Einsatzzweck der Live-Pegel und besprochene Weiterentwicklung

Philipps konkretes Beispiel: Adri verlässt die Bar für eine kurze Pause (etwa fünf bis neun Minuten), während Hamad noch wenige Cocktails macht. Kommen in dieser Zeit vier oder fünf Tischbestellungen mit zehn bis zwölf Cocktails herein, soll Adri beim Blick aufs geöffnete Handy sofort erkennen, dass er zurückkommen sollte. Joab nutzt den Food-Monitor entsprechend während einer kurzen Unterbrechung seiner Backstage-Arbeit. Der Pegel ist eine praktische Schätzung frisch eingegangener Arbeit, keine Umsatzstatistik und keine Bestätigung, dass alles serviert ist.

**Live bleibt vorerst die dokumentierte Zeitfensterlogik.** Board und Food aktualisieren bei sichtbarer Seite alle 15 Sekunden. Alte Bestellkacheln dürfen weiterhin sichtbar sein, ohne den aktuellen Pegel hochzuhalten. Kein gesicherter Hintergrund- oder Sperrbildschirmbetrieb.

**Nur besprochene Idee:** Größere Cocktail-Bestellschübe sollen sofort hoch ausschlagen und länger nachwirken als kleine Bestellungen; neue Mengen kommen hinzu. Kein starres Multiplizieren von Stückzahl und Zubereitungsminuten, weil Arbeitsschritte gebündelt werden können. Philipps Einschätzung von etwa zwei bis drei Minuten je Cocktail ist eine betriebliche Orientierung, kein bereits verwendeter Rechenparameter. Es wurden weder Abklingkurve noch Personalstärke noch neue Schwellen festgelegt. Diese Idee nicht als eingebaut darstellen und nicht im Rahmen einer reinen Dokumentationspflege umsetzen.

## Food-Monitor: Anzeige und Berechnung getrennt halten

- Bestellkacheln: die fünf neuesten erfassten Snack-Bestellungen; mehrere Snacks derselben Bestellung stehen gemeinsam auf einer Kachel.
- Snack-Bestseller: bis zu fünf unterschiedliche Artikel, nach Stückzahl des Betriebsabends sortiert.
- Küchenpegel und Snack-Abendumsatz werden vor der Begrenzung der Anzeige berechnet. Auch Bestellungen außerhalb der fünf sichtbaren Kacheln zählen im jeweils relevanten Zeitraum.
- Ticket-Tailor-Hummus bleibt separat; keine Doppelzählung als SumUp-Umsatz oder frische Küchenbestellung.
- Philipp bestätigte am 17. November anhand des Live-Screenshots die funktionierende Anzeige: Popcorn von 19:38 Uhr war um 21:05 weiterhin als letzte Bestellung/Bestseller sichtbar, aber korrekt nicht mehr Teil der letzten zehn Minuten. Das ist eine Sichtprüfung dieses Falls, kein vollständiger Lasttest.

## QR Order & Pay / Web KDS: Recherche, keine Integration

Philipps Screenshots zeigen Tisch-/Platznamen (B1, Table 1), Mengen, die Bereiche „Zu erledigen“, „In Bearbeitung“, „Fertig“ und „Bestellung abschließen“. Diese Daten existieren im Web KDS; ihre Verfügbarkeit über unseren vorhandenen API-Zugang wurde nicht nachgewiesen. In den Developer Settings stehen getrennte Schlüssel mit den Bezeichnungen „SumUp JK Staff OS“ und „Order and Pay“. Der Name des zweiten Schlüssels belegt weder seinen Ersteller noch zusätzliche Berechtigungen. Keine Schlüsselwerte in diese Dokumentation aufnehmen.

Recherche vom 17. November:

- Die öffentliche Sales-API liefert bezahlte Verkäufe und den Kanal `ORDER_AND_PAY`; kein dokumentierter KDS-Bearbeitungsstatus wurde dort gefunden. Nicht als Beweis einer grundsätzlichen technischen Unmöglichkeit verstehen.
- Die separate SumUp-POS-Order-API v3 dokumentiert Partner-OAuth, Bestellungen, Standort und Zubereitungsdaten. Ob sie dieses QR-Order-&-Pay/Web-KDS-Produkt abdeckt, bleibt offen; der normale Merchant-Key ist dafür kein bestätigter Zugang.
- „Complete Order“ führt laut KDS-Hilfe zu „Ready“: fertig zur Ausgabe ist nicht zwingend bereits am Tisch serviert.
- Nicht abgeschlossene alte KDS-Einträge können trotz bereits erledigter Arbeit offen bleiben. Für Philipps Pausen-Signal ist deshalb eine einfache Schätzung wichtiger als eine zusätzliche, ungeprüfte Statusintegration.
- QR Order & Pay unterstützt unterschiedliche Menüs nach Tagen und Zeitfenstern. Es wurden weder Menüs noch KDS-Einstellungen noch Schlüssel geändert; keine Anfrage an SumUp versendet.

Bei erneutem Bedarf zuerst offiziell klären, ob ein ausschließlich lesender Zugriff auf QR-Order-&-Pay-Bestellungen, Tisch/Abholplatz und Bearbeitungsstatus oder passende Webhooks verfügbar ist. Keine Versuche am laufenden System im Rahmen dieser Dokumentationspflege.

Quellen der Recherche:
- https://developer.sumup.com/api/sales/list/
- https://tillersystems-v3.readme.io/reference/migrating-from-order-v2
- https://help.sumup.com/en-GB/articles/5tmYbBkiipnwwMVNi2JT5s-article-exploring-my-sumup-kds-screen-and-settings
- https://help.sumup.com/en-GB/articles/5DMyYhDtk3r23QizapYDHi-article-configure-the-menu-for-my-qr-order-and-pay


## Dienstplan November – Aktualisierung 17.11.2026

- Anitas Monatsplan ab 18.11. übernommen; Namen: Hamad, Adri (Adrian), Adriano, Saven (Savus), Chelly, Joab und Laura. Interne Eventtitel werden nicht übernommen. Farben und Stationskacheln bleiben unverändert.
- 18./25.: Bar Hamad + Adri, Backstage Joab, Service Adriano, Door Saven.
- 19.: Bar inkl. Backstage Joab + Adri, Service Laura. Bereits erfasster Door-Einsatz Ana bleibt bestehen.
- 20.: Bar Hamad + Adri, Service Adriano; Joab Backstage vorläufig, da im Bild blass markiert (Interpretation, noch zu bestätigen).
- 21./27./28.: Bar Hamad + Adri, Backstage Joab, Service Adriano.
- 22.: Bar Chelly + Adri, Backstage Joab, Service Adriano, Door Saven.
- 26.: Hamad + Adri bestätigt, Aufgabenverteilung noch offen (ggf. auch Service/Backstage); Joab Backstage ausdrücklich noch offen. Keine feste Stationszuordnung der beiden erfinden.
- Vergangene gespeicherte Schichten bleiben abrufbar, Woche/Monat startet beim aktuellen Betriebsdatum. Vor dem 18.11. wurden keine historischen Einsätze aus dem Foto ergänzt. Dienstplan ist Planung, kein Anwesenheitsnachweis.
- Noch keine Admin-App zum Bearbeiten; Datenquelle bleibt `data/dienstplan.json` und Veröffentlichung per Deployment.


### Ergänzung Tür und offene Einsätze

- Schreibweise auf ausdrückliche Korrektur: **Ana**. Door am 19., 20., 21., 26., 27. und 28. November. Saven bleibt am 18., 22. und 25. November.
- Joabs vorläufige/offene Einsätze am 20. und 26. tragen `status: "tentative"`: Stationskarte mit 72 % Deckkraft und gestrichelter Kontur; Beschriftung bleibt ausdrücklich vorläufig/offen. Keine Unschärfe.
- Hamad und Adri am 26. sind fest eingeplant und bleiben voll sichtbar; nur ihre Aufgabenverteilung ist offen.


## Format-Performance (17.11.2026)

Aktueller Stand: Ein gemeinsames Tool **Jam & NYJB**, mit internen Format-Pillen. Die untere Staff-OS-Navigation bleibt unverändert. Jam erhält auf ausdrücklichen neuen Wunsch ein gedecktes Grau-Blau, NYJB Rosé; weiße Original-Logos direkt auf der Farbfläche. Kein umfassendes Ranking, nur ein kleiner Vergleich unten mit solidem gelbem Blitz.

Ansichten: Monat (Durchschnitt abgeschlossener Abende), letzter Abend im gewählten Monat, nächster kommender Abend. Kennzahlen: gebuchte Gäste, Included Drinks, SumUp-Umsatz und Umsatz pro gebuchtem Gast. Bezahlte Online-Pakete wurden aus der Oberfläche entfernt. Fehlende Daten bleiben „–“.

Ticketmix zählt gültige issued tickets mit den bestehenden Kategorien und Paketgrößen: Club, Club Plus, Premium, VIP, Worldstar VIP, Weitere Tickets. Gruppenpaket für drei = drei Gäste. VIP-Gäste sind in allen Gesamtzahlen enthalten; VIP-Pakete werden zusätzlich als gebuchte Tische pro Datum gezeigt, ohne Gäste doppelt zu zählen. Unbekannte Paketgrößen sperren den Mix. Monatsmix ist eine klar beschriftete Summe, Hauptkennzahlen bleiben Durchschnitte.

Schmale abgerundete Balken zeigen den Mix und kommende Abende. Dunkler Abschnitt = neu gebuchte Gäste in den letzten **7 Tagen**, mit Vergleich zu den 7 Tagen davor. Der Included-Drinks-Kreis zeigt gebuchte Drinks relativ zur Gästezahl, keine eingelösten Getränke. Unten wird das letzte eindeutige abgeschlossene Mittwoch-/Donnerstag-Paar im gewählten Monat nach Gästen, Drinks und SumUp verglichen. Keine Anwesenheitsbehauptung; fehlende Daten niemals null. API und Zugriffsrechte unverändert, zusätzliche aggregierte Mix-/Tischfelder; keine neue Datenbank.

Tests ergänzen VIP-/Gruppen-/Add-on-/Deduplizierungsregeln und vollständige, eindeutige Wochenpaare.

### Technische Grundlage und Historie des ersetzten Battles

Die folgenden Battle-Angaben dokumentieren den vorherigen Aufbau; sie beschreiben keine weiterhin sichtbare Vergleichsoberfläche.

- Tools enthält **Jam vs. NYJB** (`components/staff/format-battle.tsx`, eigenes CSS-Modul). Vorhandene Farben und Navigation bleiben erhalten. Daten werden erst beim Öffnen geladen; Aktualisierung alle fünf Minuten bei sichtbarer Seite, gemeinsamer Ticket-Tailor-Loader und Fehlerhinweis mit letztem Stand. Demo nutzt ausdrücklich gekennzeichnete Beispieldaten.
- Geschützte Read-only-Route `/api/staff/battle?month=YYYY-MM`, gleicher Teamzugang, private/no-store. Sechs auswählbare Monate. Serverdateien `lib/staff/battle.ts` und `battle-math.ts`; keine neue Datenbank, keine Schreibzugriffe auf SumUp/Ticket Tailor. Antwort enthält nur aggregierte Eventdaten, keine Gäste-/Käufernamen oder Zahlungsreferenzen.
- **Monatsranking:** reguläre Mittwoch-Jams (Name Jazz Jam Session) und Donnerstag-New York Jazz Bar/NYJB. Sondertermine wie Friday Edition ausgeschlossen. Rangfolge nach bezahlten Online-Ticketpaketen **durchschnittlich pro abgeschlossenem Abend**, nicht Monatssumme. Bei Gleichstand keine künstliche Platzierung; wenn einem Format Abende fehlen, bleibt Ranking offen.
- **Bezahlte Online-Pakete:** gültige issued tickets werden über die exakten `line_items.fulfilments.reference_id` ihrer abgeschlossenen Bestellung zugeordnet. Ticketposition muss `value > 0` haben; abgewickelte Online-Zahlungen minus Erstattungen müssen positiv sein (`transactions`, Stripe/PayPal/Square). Gratis, offline, pending, cancelled, voided und vollständig erstattete Bestellungen zählen nicht. Fehlende Zahlungs-/Fulfilmentfelder sperren die Rangwertung statt null zu behaupten. Keine Zuordnung über Betrag, Namen oder Zeit.
- Gäste und gebuchte Included Drinks bleiben wie bestehende Anzeige aus gültigen Ticketpaketen, inkl. bestehender Package-/Entitlement-Regeln. Ein Paket für vier = ein Ticketpaket, vier Gäste. Keine Aussage über tatsächliche Anwesenheit oder eingelöste Drinks. Unbekannte Paketgrößen sperren den jeweiligen Vergleich.
- SumUp liefert unabhängig von den Artikelbestsellern erfolgreiche EUR-PAYMENT-Umsätze je Betriebsabend (03:00 Berlin). Eigene Rangefunktion `readBattleRevenue`, bestehende Live-/14-Tage-Ansichten unverändert. Fehlende Quelle oder mehrere Events am gleichen Datum = kein zuordenbarer Betrag („–“). Pro Gast = gesamte SumUp-Umsätze geteilt durch gebuchte Gäste.
- **Letztes Duell:** letztes vollständiges, abgeschlossenes Mi/Do-Paar im gewählten Monat. **Nächstes Duell:** erstes kommendes vollständiges Mi/Do-Paar in den nächsten sechs Wochen; ausdrücklich Buchungsstand ohne Umsatzwertung. „Duell für Duell“ zeigt vollständige Wochenpaare im Monatsranking.
- **Aufsteiger der Woche:** kommende Events der nächsten 42 Tage; neue aktuell gültige Gäste nach Bestellzeit in den letzten 7 × 24 Stunden vs. den 7 × 24 Stunden davor. Mindestens drei neue Gäste, positiver Mehrzuwachs, Top 3 nach Differenz (dann jüngster Zuwachs). Neue Eventanlage innerhalb 14 Tagen wird als „Neu angelegt“ markiert; nicht mit Verkaufsstart gleichsetzen. Alle Formate, nicht nur Jam/NYJB.
- Reale API-Stichprobe vor Veröffentlichung: 18.11. = 24 bezahlte Online-Pakete, 57 Gäste, 17 Included Drinks; 19.11. = 18 Pakete, 40 Gäste, 6 Included Drinks. Zeitpunktgebundene Stichprobe, keine festen UI-Zahlen. Keine personenbezogenen Beispieldaten im Repository.
- Tests: `tests/staff-battle.test.mjs`, mit `npm run test:staff` gemeinsam mit SumUp-Tests. Prüfen Zuordnung, Paket-/Gästeumrechnung, Gratis/Offline/Pending/Refunds, Deduplizierung, unvollständige Daten, faire Durchschnitte und Aufsteiger.
- Ticketkäufe-Reset bereits live: „Alle Tage anzeigen“ mit Undo-Pfeil, setzt Tagesfilter zurück; „Alle 7 Tage“ ohne Auswahl bleibt reine Zustandsanzeige.
- API-Schema geprüft anhand offizieller Dokumentation https://developers.tickettailor.com/docs/api/new-order-webhook/ und realer, ausschließlich lesender Antwort. Tatsächliche Orders-Antwort liefert `transactions` und `line_items.fulfilments` (keine Annahme eines alten `payment_method`-Objekts).


### Aktuelles Performance-Branding

Original-SVGs aus `jazzkellerffm/jkos-public`, unverändert unter `public/branding/`. Bestehende Staff-OS-Variablen, Typografie, Rundungen und `service-switch` bleiben maßgeblich. Umschalter erben Poly Sans; Überschriften/Zahlen verwenden `--staff-display`. Jam: Grau-Blau #e5ebef / #c6d4dd / #91a9b9, dunkler Akzent #526f83, Logofläche #526b79. NYJB: bestehendes Rosé #f4e3e3, Balken #ebcbc4 → #d6a39a, dunkler Abschnitt #b57c73, Logofläche #956860 für lesbares Weiß. Die neue Grau-Blau-Freigabe ersetzt die frühere Ablehnung des ungewünschten Blaugrüns. Keine Ockerbrauntöne. Kompakte Köpfe, schmale Vergleichsbalken; keine Änderung an der Navbar. Technische Dateinamen und API-Pfad bleiben kompatibel.


### Typografischer Feinschliff · 17.11.2026

Poly Sans Bulky (vorhandenes `--font-poly`, Gewicht 700) für Ticketmix-Zahlen, Vergleichssatz, Vergleichswerte, Ringzahl und kompakte kommende Abendzahlen/-daten. Gustavo (`--staff-display`) bleibt bei großen Hauptkennzahlen und Überschriften. Keine neuen Fonts. „Buchungen in Bewegung“ erhält 16 px Abstand zum Erklärungstext und 24 px bis zur Liste; Zeilen bekommen mehr vertikale Luft. Große eingefärbte Gäste- und Bewegungsflächen entfallen: neutrale App-Fläche, Farbakzente in Logos und Balken. Alle Statistikabschnitte sind ohne zusätzliche innere Seiteneinrückung auf einer gemeinsamen Kante ausgerichtet; äußerer Kartenabstand bleibt als Lesegutter erhalten. „Auf Null“ betrifft die Einrückung, niemals Datenwerte. Navbar, Zählregeln und APIs unverändert.


### Historische Umsätze und NYJB-Farbe · 18.11.2026

NYJB wechselt auf gedecktes Pflaumengrau (#eeebf0 / #d5cbd9 / #a99ab2, dunkel #786580, Logokopf #68596f); Jam bleibt Grau-Blau. Gleicher Aufbau und Umschalter. Doppelte Abschnittslinien bei Pro-Gast/Mix und VIP/Bewegung entfernt.

Historische SumUp-Daten waren bereits vorgesehen, aktuell im Nutzer-Screenshot jedoch nicht verfügbar; konkrete Live-Ursache noch nicht bestätigt. Monatsabfrage nun in lückenlosen, halb offenen 7-Tage-Fenstern statt einem langen Verlauf; Fehler verwerfen weiterhin den gesamten Betrag. Zugangswerte werden wie in der funktionierenden Barabende-Route getrimmt. Server protokolliert Ausfallgrund ohne Zahlungsdaten. Oberfläche unterscheidet nicht ladbare Quelle von nicht zuordenbarem Abend, fehlende Werte bleiben Striche. Bei komplett fehlenden Chartwerten kompakter Hinweis statt leerer Säulenfläche. Tests prüfen Fenstergrenze, Tageswechsel und Teilfehler. Keine Behauptung, reale historische Umsätze seien bereits verifiziert.


### Originalmotive im Performance-Kopf · 18.11.2026

Auf Nutzerwunsch größere plakative Bildköpfe (16:10 plus kompakte Performance-Zeile) statt kleiner Logozelle. Jam verwendet unverändert `/JKOS/EXPERIENCE_ASSETS/jam/artwork/jamsession-wide.png`, NYJB `/JKOS/REUSABLE_ARTWORK/nyjb-classic-4x3.jpg`, lokal unter `public/branding/*-performance.*`. Eingebettete Originalschrift/Logos bleiben sichtbar; kein doppeltes Titel-Overlay. Responsive CSS-Ausschnitte mit motivspezifischem Fokus. NYJB-Pflaumengrau ausdrücklich bestätigt; Diagramme, Navigation, Datenlogik unverändert. Alternative bei späterer Ablehnung: gleich großer Farbkopf mit weißem Original-SVG, nicht zurück zur kleinen Zelle.

### Eventfarben, reine Bildköpfe und VIP-Größen · 18.11.2026

Performance-Farbstreifen vollständig entfernt, große Gustavo-Titel oberhalb der reinen 3:2-Bildfläche. Jam: Lavendel (#eee9f5 / #d7cbea / #aa92ca), Violett #66518e; NYJB: warmes Pflaumenlila (#eeebf0 / #d5cbd9 / #b399ab), dunkel #805d72. Interne aktive Umschalter und Hauptschrift verwenden die Eventfamilie; globale Navbar bleibt unverändert. Vergleichszeilen behalten unabhängig von der Auswahl ihre festen, beschrifteten Formatfarben. Kompaktere Statistikabstände bei unverändertem Seitenraster.

VIP-Abende zeigen nun je Datum Anzahl und Größe der gültigen Pakete, z.B. 2 × VIP für 2; Worldstar VIP separat, Tische und VIP-Gäste insgesamt ergänzend. Gruppierung direkt aus vorhandener Ticketkategorie und packageSize, keine neuen Annahmen oder Doppelzählung. Unbekannte Größen bleiben ausdrücklich unbekannt. Optionales zusätzliches vipPackages-Feld für kompatible API-Antworten. Test deckt Größen 2/3/4, getrennte Kategorien, Deduplizierung und ungültige Tickets ab.

### Einheitliche Schriftfarbe und Buchungslisten · 18.11.2026
- Pro Event ein gemeinsamer dunkler Textton (`--paper`), auch für große Gästezahlen und Titel; Akzentfarben bleiben für Balken und aktive Schalter erhalten.
- „Buchungen in Bewegung“ folgt der Ticket-Tailor-Gästeliste: Wochentag und Datum, Eventname links, Gästezahl und neue Gäste rechts. Dünne 9-px-Balken bleiben erhalten, dunkler Abschnitt zeigt weiterhin die letzten sieben Tage (nicht 24 Stunden). Der vorherige Sieben-Tage-Zeitraum steht unter dem Balken. Keine zusätzlichen Trennlinien zwischen den Abenden.

### Vollständige SumUp-Paginierung · 18.11.2026

Bestätigte Code-Ursache für unvollständige historische Abendumsätze: SumUp liefert `links[].href` üblicherweise als reine Query-Zeichenfolge. Die bisherige URL-Auswertung verlor dabei die Query und beendete den Abruf nach der ersten Seite. Dadurch konnten Teilbeträge oder scheinbare Nullumsätze in Jam & NYJB erscheinen. Der gemeinsame History-Reader verarbeitet nun reine Queries, `?`-Queries und absolute/relative URL-Links. Ungültige oder wiederholte Cursor sowie Fehler auf Folgeseiten verwerfen den Abruf statt unvollständige Summen auszugeben. Zahlungs-Deduplizierung und Betriebsabendgrenze 03:00 Europe/Berlin bleiben erhalten.

Regressionstests prüfen drei Linkformate, Mehrseitensumme, Deduplizierung, Zuordnung nach Mitternacht und Folgeseitenfehler. 31 Staff-Tests und Produktionsbuild erfolgreich. Reale korrigierte Beträge für 12.11., 21.10. und 17.09. sind noch nicht unabhängig mit SumUp abgeglichen; keine verifizierten Ersatzwerte behaupten. Offizielle Referenz: https://developer.sumup.com/api/transactions/list/ . Keine Designänderung.

### Abgesagte Formatabende · 18.11.2026

Jam & NYJB trennt Absagen bereits vor Ticket-/Umsatzzuordnung von aktiven Events. Eindeutige Wörter im Ticket-Tailor-Status oder `unavailable_status`: cancelled, canceled, abgesagt, ausgefallen (Großschreibung egal). Sold out, close_sales, sales_closed und 0 € sind ausdrücklich keine Absageindikatoren. Absagen fehlen in Durchschnitten, Diagrammen, Ticketmix, VIP-Auswertung, kommenden Abenden und Wochenpaarvergleichen; der Monatsbereich zeigt separat Anzahl und Daten abgesagter Abende je Format.

Reale Ticket-Tailor-Prüfung: Jam 02.09.2026 (`ev_8956423`, „Cancelled – sorry“) und 21.10.2026 (`ev_9116869`, „CANCELLED“). NYJB 03.09.2026 (`ev_8985314`) hat nur close_sales ohne Absagetext; exakte Event-ID-/Datum-Ausnahme aufgrund Philipps ausdrücklicher Bestätigung. Keine pauschalen Ausschlüsse weiterer September-/Oktober-Termine. Ticket Tailor selbst bleibt unverändert. Die dokumentierte NYJB-Absage 25.06. mit „Cancelled – worldcup“ wird ebenfalls automatisch erkannt, wenn der Monat angezeigt wird. Unklare Texte wie „World Cup 1st Game“ werden nicht als Absage interpretiert.

### Bestätigte NYJB-Absage 11.06.2026

Philipp hat den Ausfall am 11.06.2026 ausdrücklich bestätigt. `ev_8170032` mit Datum 2026-06-11 ist nun als genaue Ausnahme ausgeschlossen und zählt separat als Absage. Der Ticket-Tailor-Hinweis „World Cup 1st Game“ allein bleibt für andere Events kein automatischer Absageindikator. Diese Bestätigung ersetzt die zuvor dokumentierte Unklarheit für diesen Termin.


## Service CSV · 18.11.2026
Eigenexport über geschützten GET /api/staff/service/csv?event=ev_…; keine dokumentierte fertige CSV-API gefunden. Frische Events/Orders/Issued Tickets, alle Ergebnisseiten, kein Cache. Eine Zeile je gültigem Paket, Personenlogik aus entitlements; manuelle Tickets ohne Bestellung zählen mit. Vorbestellungen über Buchungs-ID nur einmal ausgegeben; die aktuelle Spaltenauswahl steht unten unter „CSV für Anita“. UTF-8-BOM, Semikolon, CRLF, CSV-Escaping und Formelschutz. Bei fehlenden Orders, unbekannten Paketgrößen, mehrdeutiger Add-on-Zuordnung, Vorbestellungen ohne gültiges Ticket oder ungeklärter Erstattung mit Add-ons wird der Export vollständig abgebrochen. Kein stiller Teil-Export. Keine Änderung der bisherigen Service-Gästelistenlogik.
Live-Datenabgleich über TT: Jam 18.11. ev_9116873: 21 Bestellungen, 25 gültige Pakete, 59 Gäste, 1 Hummus Plate. Korrektur: Die ursprüngliche separate Kontrollrechnung (55) übersah zwei Club-Crémant-for-2-Pakete. Der CSV-Exporter selbst verwendet packageSize und zählte bereits korrekt 59. Gegen Original-TT-Doorlist export_1795019680_doorlist_91168730000040516727.csv alle 25 Ticketcodes, Ticketbeschreibungen und Buchungsnummern exakt abgeglichen; keine fehlenden Tickets. Beide API-Listen endeten mit next=null. Synthetische Tests: mehrere Seiten, API-Fehler, Teilstornierung, manuelle Tickets, mehrere Ticketarten, einmalige Add-ons, unbekannte Pakete, fehlende Orders und Dubletten. Der Browserdownload in der angemeldeten Produktion wurde nicht getestet. Service aktualisiert mit bestehendem TicketLoader, Fehler bleiben sichtbar.

## Historischer Diagnoseversuch · durch v2-Korrektur ersetzt
Screenshot zeigt fehlende Hummus Plate bei or_85424331, obwohl vollständige TT-Bestelldaten 1 × Mediterranean Hummus Plate enthalten. Bestehende Transformation funktioniert mit diesen Daten; genaue Abweichung der Produktionsantwort nicht nachgewiesen. Service liest jetzt zusätzlich jede zu gültigen Tickets gehörende Bestellung direkt /orders/:id (max. vier parallel, no-store). Fehlende/fehlerhafte Details brechen den Abruf ab, statt leere Vorbestellungen zu behaupten. event_id und event_summary.event_id unterstützt. Regressionstest: Listenantwort ohne Add-on, Detail mit Hummus; einmal je Buchung trotz zwei Tickets, fremder Event ausgeschlossen, Detailfehler verworfen. Dieser Zwischenstand ist durch die folgende v2-Korrektur ersetzt; keine vollständigen redundanten Detailabrufe mehr einbauen.

## Service-Produkte · API-Version korrigiert 18.11.2026
Die vorherige Nachprüfung verwendete MCP-Bestelldaten im v2-Format, während die App /v1/orders abrief. Die Testdaten entsprachen damit nicht dem angefragten API-Vertrag. v2 enthält event_summary je Zeile und unterstützt Multi-Event-Checkouts; v1 ist dafür nicht gleichwertig. Service & Door lädt jetzt ausdrücklich /v2/orders, ebenso der CSV-Export. Issued Tickets und Events bleiben v1. Nur in der vollständigen Liste fehlende Orders werden einzeln via /v2/orders/:id nachgeladen; keine 21 redundanten Detailabrufe bei 21 bereits vorhandenen Orders. Mehrdeutige Produktzuordnung bricht ab, statt Produkte still zu verschlucken. Vorbestellungen bleiben einmal je Buchungs-ID, Inklusivleistungen getrennt.
Offizielle Referenzen: https://developers.tickettailor.com/docs/api/get-all-orders-v-2/ und https://developers.tickettailor.com/docs/api/get-order-by-id-v-2/ . Tests prüfen nun ausdrücklich die URL-Version, fehlende Orders, Fehler und mehrdeutige Produkte. 40 Tests und Produktionsbuild erfolgreich. Abgleich gespeicherter echter TT-Daten für 18.11.: 21 Buchungen, 59 Gäste, 1 Hummus-Platte in or_85424331. Philipp hat die funktionierende Produktionsanzeige anschließend ausdrücklich bestätigt („jetzt hat’s funktioniert“). Dies bestätigt Service & Door; der CSV-Browserdownload wurde nicht separat durch den Agenten getestet. Temporäre Produktdiagnostik wieder entfernt; Fehlerstatus wird ohne Namen/Schlüssel serverseitig protokolliert.

## CSV für Anita · vereinfachte Spalten 18.11.2026
Export enthält nur Datum, Veranstaltung, Buchungsname, Ticketkategorie, Personenzahl und Vorbestellungen der Buchung. Keine IDs, Abrufzeit, separate Gastnamen oder Paketanzahl. Bei manuell ausgestellten Tickets ohne Käuferdaten dient der Ticketname als Buchungsname. Sortierung: Club, Club Plus, Premium, VIP, Worldstar VIP, danach weitere Kategorien; innerhalb der Kategorie alphabetisch nach Buchungsname. Eine Zeile je gültigem Paket bleibt erhalten, Personen werden nicht zusammengelegt oder verloren. Add-ons erscheinen nach Sortierung nur auf der ersten Zeile der Buchung. 41 Tests erfolgreich; echter gespeicherter 18.11.-Datensatz weiterhin 25 Zeilen, 59 Gäste und einmal Hummus.


### Bestätigter Abschluss und Farben · 18.11.2026
- Produktanzeige von Philipp live bestätigt. Hummus ist ein gekauftes Produkt/Add-on, kein aus einem Ticketnamen abgeleitetes Getränk.
- App-Pills: Speisen/Hummus Salbei-Mint `#dcefe4`, Text `#244c39`; Wein und inkludierte Getränke Rosé `#f5dce2`, Text `#652c41`. Inklusivleistungen bleiben ausdrücklich so beschriftet und getrennt von bezahlten Vorbestellungen.
- CSV für Anita: 41 Tests und Produktionsbuild bestanden; gespeicherter realer Abgleich 18.11.: 25 gültige Paketzeilen, 21 Buchungen, 59 Gäste, genau 1 Hummus Plate. Keine personenbezogenen Beispieldaten in die Dokumentation übernehmen.
- „Kommende Abende“ ersetzt „Buchungen in Bewegung“. „Abgesagte Abende“ und die zugehörige Zahl verwenden Poly Sans Bulky.


### Barpegel und Inklusivleistungen · 18.11.2026
Auf Philipps Wunsch verwenden die Barpegel-Statuswörter (Ruhig, Zieht an, Viel los und fehlende Daten) Poly Sans Bulky. Service-Inklusivleistungen, insbesondere VIP-Crémant, sind wieder hellgrau (#eeefed, Schrift #424944). Bezahlte Wein-/Flaschen-Add-ons bleiben Rosé, Speisen Salbei-Mint. Diese Farbkorrektur ersetzt die vorherige Rosé-Regel für inkludierte Getränke.

### Service-Pills und Namen · 18.11.2026
Pills erhalten 8 px Abstand innerhalb und zwischen unmittelbar benachbarten Produkt-/Inklusivgruppen; leere Gruppen werden nicht gerendert. Buchungsnamen werden ausschließlich zur Anzeige in Gästeliste und Vorbestellungen normalisiert: reine Groß-/Kleinschreibungs-Wörter in normale Anfangsgroßschreibung, gemischte Schreibweisen bleiben erhalten. Bindestriche, Apostrophe und Umlaute unterstützt. Originaldaten, Buchungs-IDs und CSV bleiben unverändert. Produktionsbuild und gezielte Namensprüfungen bestanden.

### Erster Praxistest und vorgemerkte Ideen · 18.11.2026
Philipp bestätigt im laufenden Betrieb: SumUp und Included Drinks laufen gut. Jetzt ausschließlich Snack-Bestseller-Überschrift und Listentexte auf Poly Sans Bulky angepasst; keine Monitor- oder Datenlogik geändert.
Für später, ausdrücklich NICHT umgesetzt: Countdown bis Einlass/Show mit Gästezahl und wenigen Zusatzinfos (Platzierung noch offen); optional Included-Cocktails/Mocktails als andersfarbige Kacheln im Stream letzter Getränkebestellungen. Wein/Bier für diese Idee ausnehmen. Motivation: Pausen meist erst nach erstem Gästeschwung; bestehendes Verhalten zunächst im echten Betrieb beobachten. Dies ist keine Änderung der bestehenden Barpegel-Formel oder Quellen.


### Bestseller: freie Zahlungen (18.11.2026)

Die Rangliste berücksichtigt nur zugeordnete Katalog- bzw. Kategorieartikel mit eindeutiger Menge. Freie Positionen (CUSTOM, etwa Custom amount, Drinks oder Bier ohne Artikelzuordnung) bleiben im Umsatz und Zahlungsstream, werden aber aus der Rangliste ausgeschlossen und blockieren sie nicht. Gemischte Verkäufe behalten ihre zugeordneten Artikel. Ein kompakter Hinweis erklärt ausgeschlossene freie Zahlungen. Echte fehlende Artikelmengen und nicht identifizierbare Abruflücken bleiben weiterhin als unvollständig markiert. Keine Änderung an Barpegel, Food-Berechnung oder Umsatzlogik.

### 18.11.2026 — Freie Zahlungen und Pegel
- Explizite CUSTOM-Positionen (auch beliebige Namen wie Bier) bleiben im Zahlungsstream/Umsatz, erzeugen jedoch keinen geschätzten Artikelaufwand und keinen Fehler wegen fehlender Menge/Kategorie.
- Barpegel behandelt diese Positionen wie die Bestseller separat; Küchenpegel prüft nur Produktpositionen, nicht CUSTOM/FEE/DEPOSIT/GIFT_CARD oder Nullmengen.
- Wirklich fehlende Katalogdaten und Abruffehler bleiben als unvollständig erkennbar.
- Den dauerhaften Hinweis „Positionen ohne Kategorie sind ausgenommen“ bei Snack-Bestsellern entfernt.
- 45 Staff-Tests und Produktionsbuild erfolgreich, einschließlich gemischter Verkäufe, freier Beträge, fehlender Katalogdaten und fehlgeschlagener Zahlungen.
