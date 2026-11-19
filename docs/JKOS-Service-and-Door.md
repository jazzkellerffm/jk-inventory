# JKOS · Service & Door
Stand: 19. November 2026.

Aktuelle technische Übergabe: [Service & Door – Safari, Ladeanzeigen und Ticketmix](JKOS-Service-Door-Checkpoint-2026-11-19.md).

## Übergabe: Vorbestellungen und Serviceübersichten

Dieser Arbeitsbereich erstellt auf Anfrage eine aktuelle operative Übersicht für Bar, Service und Tür/Einlass des Jazzkeller Frankfurt. Die Übersicht erscheint direkt im Chat als kompakte, screenshot-fertige Dashboard-Karte.

## Datenquelle und Auswahl

- Verbundenen Ticket-Tailor-MCP-Server verwenden.
- Veranstaltung anhand des lokalen Datums Europe/Berlin ermitteln; bei ausdrücklich genanntem anderen Datum dieses verwenden.
- Aktuelle Bestellungen, ausgestellte Tickets und Veranstaltungsdetails abrufen.
- Gültige ausgestellte Tickets berücksichtigen, einschließlich manueller Tickets ohne normale Bestellung. Ungültige Tickets ausschließen; bei Teilstornierungen und Erstattungen die verbleibenden gültigen Tickets prüfen, nicht pauschal die ganze Buchung entfernen.
- Add-ons anhand der Order-ID dem richtigen Käufer zuordnen.
- Daten bleiben nach eindeutigen Buchungs-IDs getrennt. In Staff OS dürfen Bestellungen desselben Events für die Anzeige zusammengefasst werden, wenn normalisierter vollständiger Name UND Käufer-E-Mail übereinstimmen. Gleiche Namen allein sind kein Zusammenführungsschlüssel. Buchungsanzahl und Check-in-Zustände bleiben auf Bestellebene nachvollziehbar.
- Ticketpositionen, Bestellungen und tatsächliche Personen getrennt behandeln.

## Personenzählung

Die Gästezahl ergibt sich aus der Ticketkategorie, nicht aus der Zahl der Ticketzeilen. Beispiele: „Club – 2 Guests“ = 2 Gäste; „Premium – 4 Guests“ = 4 Gäste; zwei Zweiertickets = 4 Gäste.

## Gekaufte Add-ons und Inklusivleistungen

Diese Kategorien müssen strikt getrennt ausgewiesen werden:

- Kostenpflichtig gebuchte Add-ons erscheinen unter **Bezahlte Vorbestellungen** und werden den Käufern zugeordnet.
- VIP-Inklusivleistungen erscheinen separat unter **Inklusivleistung**. Eine im VIP-Ticket enthaltene Crémantflasche ist kein gekauftes Add-on.
- Für die Bar zählt die Gesamtmenge zur Vorbereitung: gekaufte Flaschen plus inkludierte VIP-Flaschen.
- Reguläre Getränke, die in Club-Plus- oder Premium-Tickets enthalten sind, sind keine separat gekauften Add-ons.

## Dashboard-Design

Verbindliche Vorlage: die im Thread geteilte weiße „JK · Service & Door“-Karte.

- Weißer Hintergrund; große, abgerundete Hauptkarte mit feiner grauer Kontur.
- Schwarze, klare Typografie und dezente graue Sekundärtexte; kompakte iOS-Anmutung.
- Keine Farbverläufe, Transparenzeffekte oder Schraffuren.
- Kopfzeile: **JK · Service & Door**, darunter Künstler/Veranstaltung und Wochentag mit Datum.
- Mengenkacheln nur für tatsächlich vorhandene Produkte und Leistungen dynamisch anzeigen.
- Darunter Käuferkarten: Name links hervorgehoben, Ticketkategorie und Gästezahl rechts, Add-on-Pills darunter, feine Trennlinien zwischen Einträgen.
- Kurze Liste kompakt halten; bei mehr Buchungen die Karte verlängern statt Lesbarkeit zu opfern.
- Bei mehreren VIP-Tischen jeden Käufer/Tisch als eigenen Eintrag aufführen.

## Semantische Farben der ursprünglichen Chatkarte

- Speisen und Hummus: zartes Mintgrün mit dunkelgrüner Schrift.
- Kostenpflichtige Getränke und Wein: zartes Rosé mit dunkelroter Schrift.
- VIP-Inklusivleistungen: neutrales Hellgrau mit dunkelgrauer Schrift.
- Pill-Hintergründe sind vollständig deckend, einfarbig und gut lesbar.

## Hinweise am Kartenende

Knapp und schlicht wie in der Vorlage, zum Beispiel: **Kein Lugana oder Primitivo vorbestellt.** Nur Produkte nennen, die für die konkrete Veranstaltung relevant sind und nicht vorbestellt wurden. Darunter kann ein Datenstand stehen, etwa: „Stand: aktuelle Ticket-Tailor-Abfrage · abgeschlossene Buchungen, gültige Tickets.“

## Typische Anfrage und Ablauf

Bei „Bitte die Vorbestellungen für heute“ oder „Service- und Doorplan für morgen“ ohne unnötige Rückfragen:

1. Datum und Veranstaltung bestimmen.
2. Ticket-Tailor-Buchungen und Tickets abrufen.
3. Gültigkeit, Zuordnung, Gästezahl und Add-ons prüfen.
4. Gekaufte Add-ons von Inklusivleistungen trennen.
5. Screenshot-fertige Karte im bestätigten weißen Stil direkt im Chat ausgeben.

## Verhältnis zur JK Guest List

Dieser Ablauf ist für die schnelle operative Service- und Doorübersicht. Die separate **JKOS · Guest List** erstellt vollständige Gästelisten als PNG im festgelegten A7-Design. Beide Workflows verwenden dieselben Ticket-Tailor-Zuordnungs- und Gästezählregeln.



## Staff OS: aktueller produktiver Stand

Repo: `jazzkellerffm/jk-inventory`, Funktionsstand `3299327a80ef8379f498bc274330649925ec227a`, Produktion READY. Einstieg: `docs/JK-Staff-OS.md`. Beide MD-Dateien werden auch unter `/JKOS/DOCUMENTATION/CONTEXT/` gepflegt.

### Produkte und API-Vertrag

- Service & Door und CSV verwenden ausdrücklich `/v2/orders`, alle Ergebnisseiten. Events und Issued Tickets bleiben v1. Ursache der fehlenden Hummus-Anzeige war der Unterschied zwischen v2-Testdaten und dem bisherigen v1-Abruf.
- Nur fehlende Bestellungen einzeln via `/v2/orders/:id` nachladen, höchstens vier parallel. Keine redundanten Detailabrufe aller bereits vorhandenen Orders.
- Produkte/Add-ons aus Bestellpositionen lesen, nicht aus Ticketnamen ableiten. Eventzuordnung über `event_summary.event_id` bzw. `event_id`; Fallback nur bei eindeutigem Einzel-Event. Bei unklarer Zuordnung verständlicher Fehler statt „keine Vorbestellungen“.
- Extras über Buchungs-ID genau einmal zählen. Ticketbasierte Inklusivleistungen separat ausweisen. Fehlende Daten dürfen nicht als null oder leere Liste erscheinen.
- Philipp hat die reparierte Produktionsanzeige am 18.11. ausdrücklich bestätigt.
- Aktuelle App-Farben: Essen/Hummus Salbei-Mint `#dcefe4`, Text `#244c39`; Wein und inkludierte Getränke Rosé `#f5dce2`, Text `#652c41`. Der Typ bleibt durch „Inklusivleistung“ erkennbar. Diese App-Regel ersetzt die frühere graue Darstellung der Inklusivleistungen; die obige Chatkartenbeschreibung ist historisch.

### Anita-CSV

Geschützter Download: `/api/staff/service/csv?event=ev_…`. Frischer vollständiger Abruf für exakt den ausgewählten Termin; vorhandene Staff-Berechtigungen, Schlüssel ausschließlich serverseitig.

Spalten in dieser Reihenfolge:
1. Datum
2. Veranstaltung
3. Buchungsname
4. Ticketkategorie
5. Personenzahl
6. Vorbestellungen der Buchung

Keine separate Gastnamenspalte, Paketanzahl, IDs oder Abrufzeit. Bei manuellen Tickets ohne Käuferdaten wird der Ticketname als Buchungsname verwendet. Eine Zeile je gültigem Paket bleibt erhalten; volle Ticketbeschreibung und berechnete Personenanzahl. Sortierung: Club → Club Plus → Premium → VIP → Worldstar VIP → weitere Kategorien, innerhalb der Kategorie alphabetisch nach Buchungsname. Vorbestellungen nach Sortierung nur auf der ersten Zeile derselben Buchung ausgeben; sie gehören zur Buchung, nicht zu einer angenommenen Einzelperson.

UTF-8-BOM, Semikolon, CRLF, korrektes CSV-Escaping und Formelschutz für Excel/Numbers. Bei unvollständiger Pagination, API-Fehler, fehlender Bestellung, unbekannter Paketgröße oder ungeklärter Produkt-/Erstattungszuordnung keinen scheinbar vollständigen Export ausgeben.

### Nachweis und Grenzen

41 Tests und Produktionsbuild bestanden. Realer gespeicherter Abgleich für Jam am 18.11.2026: 25 gültige Paketzeilen aus 21 Buchungen, 59 Gäste, genau 1 Hummus Plate. Alle 25 Ticketcodes, Beschreibungen und Buchungsnummern gegen die Original-Ticket-Tailor-Doorlist abgeglichen. Die frühere Kontrollzahl 55 war ein Fehler der separaten Handrechnung: zwei Crémant-für-2-Pakete waren übersehen worden; der Export zählte bereits 59.

Tests decken Mehrpersonenpakete, mehrere Ticketarten, Teilstornierungen, manuelle Tickets, mehrere Ergebnisseiten, Dubletten und einmalige Add-ons ab. Die Live-Bestätigung betrifft die Service-Anzeige; der angemeldete CSV-Browserdownload wurde nicht separat durch den Agenten geprüft. Keine Kundennamen oder Zugangsdaten in dieser Übergabe speichern.

### Farbkorrektur · 18.11.2026
Neueste Vorgabe: VIP-Crémant und sonstige Inklusivleistungen wieder Hellgrau (#eeefed, Text #424944). Rosé gilt weiterhin für bezahlte Wein-/Flaschen-Add-ons, Salbei-Mint für Essen. Diese Regel ersetzt die vorstehende Rosé-Zuordnung inkludierter Getränke.
