# JK Staff OS · Projektübergabe

Stand 16. November 2026. JK Staff OS ist der mobile Arbeitsbildschirm für Bar, Backstage, Service und Door im Jazzkeller Frankfurt. Diese Datei ist der Einstieg für eine neue Cursor- oder ChatGPT-Sitzung.

## In fünf Minuten wieder einsteigen

1. Das Projekt liegt im Repository `jazzkellerffm/jk-inventory`, Branch `feature/jk-staff-os`. Der geprüfte App-Stand ist `49c8df372415f53fc61730a417d24b555dd022f8`. Für neue Änderungen zuerst den aktuellen Branch prüfen. [Branch](https://github.com/jazzkellerffm/jk-inventory/tree/feature/jk-staff-os) · [Referenzstand](https://github.com/jazzkellerffm/jk-inventory/commit/49c8df372415f53fc61730a417d24b555dd022f8)
2. Auf Philipps Mac ist der vorbereitete Projektordner `~/Documents/JKOS/jk-staff-os`. Im Terminal dieses Ordners zuerst `git status -sb` und `git remote -v` prüfen. Dann `git switch feature/jk-staff-os` und `git pull --ff-only`. Eigene lokale Änderungen vorher sichten und sichern.
3. Für eine frische Arbeitskopie in einem freien Zielordner den folgenden Block verwenden. Eine bestehende Arbeitskopie kann direkt mit `npm ci` und `npm run dev` starten.

```sh
git clone --branch feature/jk-staff-os https://github.com/jazzkellerffm/jk-inventory.git jk-staff-os
cd jk-staff-os
npm ci
npm run dev
```

4. Am vom Terminal gemeldeten Port **/staff/demo** öffnen. Die Startseite **/** zeigt das Inventory, der Paketname beim Start lautet ebenfalls jk-inventory. **/staff** ist der Teamzugang zu den Live-Daten. Für die Demo genügen die eingebauten Beispieldaten.
5. Vor der Veröffentlichung `npm run build` ausführen. In Vercel gehören Branch-Vorschauen zum Projekt `jk-inventory` im Team `jazzkellerffms-projects`. Commit und Status READY prüfen. Dieser Stand wurde als Preview veröffentlicht. Für externe Demo-Tests bei aktivem Vercel-Schutz einen Freigabelink zum aktuellen Deployment mit Pfad `/staff/demo` verwenden. Ein früherer Freigabelink zeigt die frühere Version und kann ablaufen.

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

Mobile first im Rosé-Payout-Look des JK Booking Guide. Dunkelgrün für Baraktivität und aktive Switcher, Rosé für Abendumsatz, Apricot für Food Orders. Stationsfarben im Dienstplan und in der Schnellansicht gemeinsam pflegen: Bar rosé, Backstage apricot, Service pastellgrün, Door grau. Die untere Navigation führt zu Bar, Drinks, Service und Inventory. Zentrale Styles liegen in `app/staff/staff.css`.

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

**Pflege:** Eine Planänderung in der JSON-Datei speichern, committen und deployen. Bei neuen Drink- oder Ticketbezeichnungen die Erkennungsregeln prüfen. Nach Änderungen an Betriebslogik oder Datenquellen diese Datei auf dem Staff-Branch fortschreiben und die Kopie in Dropbox unter `/JKOS/DOCUMENTATION/CONTEXT/JK-Staff-OS.md` aktualisieren. Dort ergänzen `JKOS-Service-and-Door.md` und `JK Booking - Apply v1 & Rose UI Pattern.md` den fachlichen und gestalterischen Kontext.
