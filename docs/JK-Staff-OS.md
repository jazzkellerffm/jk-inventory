# JK Staff OS · Projektübergabe

Stand 16. November 2026. JK Staff OS ist der mobile Arbeitsbildschirm für Bar, Backstage, Service und Door im Jazzkeller Frankfurt. Diese Datei ist der Einstieg für eine neue Cursor- oder ChatGPT-Sitzung.

## In fünf Minuten wieder einsteigen

1. Produktion läuft vom Branch `main` im Repository `jazzkellerffm/jk-inventory`. Der am 16. November 2026 veröffentlichte App-Referenzstand ist [`509cf49`](https://github.com/jazzkellerffm/jk-inventory/commit/509cf49169201d81e6c4026d3118cdd97e64d9f0). Für die weitere Arbeit den aktuellen Stand von `main` laden.
2. Auf Philipps Mac ist der vorbereitete Projektordner `~/Documents/JKOS/jk-staff-os`. Im Terminal dieses Ordners zuerst `git status -sb` und `git remote -v` prüfen. Dann `git switch main` und `git pull --ff-only`. Eigene lokale Änderungen vorher sichten und sichern.
3. Für eine frische Arbeitskopie in einem freien Zielordner den folgenden Block verwenden. Eine bestehende Arbeitskopie kann direkt mit `npm ci` und `npm run dev` starten.

```sh
git clone --branch main https://github.com/jazzkellerffm/jk-inventory.git jk-staff-os
cd jk-staff-os
npm ci
npm run dev
```

4. Am vom Terminal gemeldeten Port **/staff/demo** öffnen. Die Startseite **/** zeigt das Inventory, der Paketname beim Start lautet ebenfalls jk-inventory. **/staff** ist der Teamzugang zu den Live-Daten. Für die Demo genügen die eingebauten Beispieldaten.
5. Vor der Veröffentlichung `npm run build` ausführen. Das Vercel-Projekt `jk-inventory` gehört zum Team `jazzkellerffms-projects`. Beim Production-Deployment Commit und Status READY prüfen. [Teamzugang](https://jk-inventory.vercel.app/staff) · [Demo](https://jk-inventory.vercel.app/staff/demo). Der Branch `feature/jk-staff-os` diente der Vorschau. Branchgebundene Preview-Variablen und Production-Variablen werden separat gepflegt.

## Aufbau und Datenquellen

Next.js App Router, TypeScript und React. Die Staff-Ansicht führt vorhandene Quellen zusammen. Sie hat keine eigene Dienstplan- oder Umsatzdatenbank. Der Browser ruft die Staff-API auf. Die Zugangsdaten für die externen Dienste verwendet der Server.

| Bereich | Quelle und Einstieg im Code | Was die Crew sieht |
| --- | --- | --- |
| Bar-Monitor | `app/api/staff/board/route.ts`, `lib/staff/sumup.ts`, `components/staff/dashboard.tsx` | Erfolgreiche SumUp-Zahlungen, Belegpositionen, Abendumsatz und Verlauf der letzten Stunde in Fünf-Minuten-Balken. Ohne Artikeldetails bleibt die Zahlung als solche sichtbar. |
| Included Drinks | Dasselbe Board und `lib/staff/included-drinks.ts` lesen die bestehende Supabase-Tabelle `orders` der Menü-App | Bestellte Menge, Drink, Tisch und ausdrücklich gemeldeter Status offen/serviert. Bis zu acht letzte Bestellungen. Die Ausgabe wird in der Included-Drinks-App gepflegt. |
| Food Orders | `app/api/staff/food/route.ts` und `lib/staff/food.ts` lesen SumUp Sales und deren Einzelpositionen | Bis zu fünf letzte Essensbestellungen, Snack-Umsatz und sein Anteil am SumUp-Abendumsatz. Bei gemischtem Bon zählt nur der Wert der Positionen in der Kategorie „Bar Snacks“. |
| Vorverkauf und Service | `app/api/staff/tickets/route.ts`, `app/api/staff/service/route.ts`, `lib/staff/tickets.ts` und `entitlements.ts` lesen Ticket Tailor | Gebuchte Gäste und inkludierte Drinks je Abend, Gästeliste nach Ticketkategorie, bezahlte Add-ons je Buchung und Check-in. |
| Dienstplan | `data/dienstplan.json`, `lib/staff/schedule.ts`, `components/staff/schedule.tsx` und `station-cards.tsx` | Freigegebene Rollen mit Namen, Woche/Monat und Namensfilter. „Team heute Abend“ verwendet dieselben Stationskacheln für den aktuellen Betriebsabend. |

## Regeln für den laufenden Abend

- **Tageswechsel um 03:00 Uhr Frankfurter Zeit.** Die zentrale Berechnung steht in `lib/staff/service-day.ts` und berücksichtigt die Zeitumstellung. Donnerstag 02:59 gehört noch zum Mittwoch. Die UI spart den Hinweis auf die Uhrzeit aus. Rollierende Anzeigen wie „letzte fünf Minuten“ laufen über diese Grenze hinweg.
- **Barpegel.** Grundlage sind Artikelmengen aus den letzten fünf Minuten erfolgreicher SumUp-Zahlungen plus offene Included Drinks der letzten Stunde. `lib/staff/bar-workload.ts` gewichtet erkannte Cocktailnamen mit 1, einfache Getränke mit 0,125 und übrige Artikel mit 0,5 pro Stück. Ab 3 Punkten „Zieht an“, ab 5 „Viel los“. Unvollständige Daten können „Daten fehlen“ ergeben. Der Pegel schätzt den Arbeitsaufwand. Bei SumUp kennt die App weder den Fertigstellungsstatus noch die Tischnummer.
- **Küchenpegel.** Für die letzten zehn Minuten ergeben zwei Hummus-Platten oder mindestens drei Snackportionen „Viel los“. Ticket-Tailor-Hummus für denselben Veranstaltungsabend steht separat als Vorbestellung. Er zählt weder zum SumUp-Snackumsatz noch als frisch eingegangene Küchenbestellung.
- **Sichtschutz.** Abendumsatz startet mit vier Punkten. Beim Snack-Umsatz entspricht ein Punkt einer Eurostelle vor dem Komma. 45,00 € erscheinen als ••. Antippen zeigt den Betrag fünf Sekunden lang, erneutes Tippen verdeckt ihn sofort. Die Maskierung dient dem Sichtschutz auf dem Display.
- **Live-Hinweise.** Board und Food Orders aktualisieren sich bei sichtbarer Seite alle 15 Sekunden. Hinweise pro Gerät aktivieren und Drinks, Essen oder Beides wählen. Die Auswahl wird lokal gemerkt, nach dem Öffnen wird der Ton per Tipp aktiviert. Die Demo bietet Testknöpfe. Der iPhone-Testton wurde am 16. November von Philipp bestätigt.
- Ein heller Einzelton und Rosé kennzeichnen Drinks, ein Doppelton und Apricot Essen. Neue offene Included Drinks und erkannte Getränke auf SumUp-Belegen lösen Drink-Hinweise aus. Die App prüft Kennung und Zeit, um alte oder wiederholt geladene Einträge auszusparen. Zeitnah eintreffende Hinweise können gebündelt werden.
- Die Infobar bleibt **20 Sekunden** sichtbar. Erst Antippen springt zum Abschnitt: Included Drinks zu „Drink-Bestellungen“, SumUp-Drinks zu „Letzte Zahlungen“, Snacks zu „Food Orders“. Ein neuer Hinweis startet die Frist erneut. Am gesperrten Telefon gibt es keine Push-Benachrichtigungen. Zuständig ist `components/staff/order-alerts.tsx`.

## Buchungslogik und Gestaltung

Ein Club-Ticket für vier ist ein Ticketpaket und zählt vier Gäste. Unklare Paketgrößen werden als ungeklärt ausgewiesen. Club Plus und Premium enthalten üblicherweise einen Drink pro Gast, explizite Mengen in der Ticketbezeichnung haben Vorrang. VIP-Flaschenleistungen und bezahlte Extras separat darstellen. „Checked in“ bedeutet, dass mindestens ein Ticket der Buchung eingecheckt wurde. Der Status sagt nichts über die tatsächliche Kopfzahl der eingetroffenen Gruppe.

„Gebuchte Gäste“ zeigt die Abende wochenweise. „Venue Performance“ ist die aufklappbare Auswertung mit Wochenvergleich, Buchungen der letzten 24 Stunden, monatlichen VIP-/Worldstar-Tischen, Ticketpaketen nach Kategorie und kommenden Events nach Gästezahl (Top 5/10/15 je nach Datenlage). Davon getrennt zeigen die SumUp-Bestseller die verkaufte Stückzahl des Betriebsabends (Top 3/5/10).

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

**Prüfung nach Änderungen:** Zuerst die Demo auf dem Handy öffnen. Beide Testtöne hören, Sprungziele antippen, Umsatzfelder aufdecken und wieder verdecken lassen. Teamkacheln mit dem Dienstplan vergleichen. Anschließend im geschützten Teamzugang einen bekannten Beleg, eine Included-Drinks-Bestellung mit Tisch und eine Ticket-Tailor-Buchung mit Add-on vergleichen. Testdaten und Live-Daten getrennt beurteilen.

**Pflege:** Eine Planänderung in der JSON-Datei speichern, committen und deployen. Bei neuen Drink- oder Ticketbezeichnungen die Erkennungsregeln prüfen. Nach Änderungen an Betriebslogik oder Datenquellen diese Datei auf `main` fortschreiben und die Kopie in Dropbox unter `/JKOS/DOCUMENTATION/CONTEXT/JK-Staff-OS.md` aktualisieren. Dort ergänzen `JKOS-Service-and-Door.md` und `JK Booking - Apply v1 & Rose UI Pattern.md` den fachlichen und gestalterischen Kontext.

## Ausverkauf und Monatsauswertung

Für einen ausverkauften Einzeltermin in Ticket Tailor „unavailable“ aktivieren und als Status „Sold out“ setzen. JKOS zeigt dann neben dem Datum die champagnerfarbene Pille. Eine Gästeschwelle löst sie nicht aus.

Venue Performance zählt abgeschlossene Geschäftstage im laufenden Monat, jeweils einmal pro Veranstaltungsdatum. Ein Abend zählt als Sold out, wenn alle berücksichtigten Termine des Abends so markiert sind. Die übrigen Abende werden nach gebuchten Gästen eingeteilt: ab 45 gut besucht, 25–44 etwa halb voll, bis 24 ruhig. Unklare Paketgrößen werden bei uneindeutiger Einstufung separat ausgewiesen. Grundlage sind aktuelle Ticketdaten, keine historischen Status-Snapshots oder Check-ins.
