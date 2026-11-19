# JKOS · Service & Door – gesicherter Stand

Stand: 19. November 2026 · Repo: jazzkellerffm/jk-inventory
Produktion: https://staff.jazzkeller.com

## Bestätigter Safari-Rückkehrpunkt

- Commit: `d6c1eaa447cbd27c365ed11b4d5c094e2567d510`
- Gesicherter GitHub-Branch: `checkpoint/staff-safari-select-2026-11-19`
- Philipp bestätigte auf seinem iPhone: Auswahl funktioniert wieder, Fehler beseitigt.
- Native Veranstaltungsauswahl beibehalten. Keine eigene lange Dropdown-Liste.
- Select bleibt im normalen Dokumentfluss; kein absolut positioniertes Select.
- Beschriftung separat mit `htmlFor="service-event"`, Select mit entsprechender ID.
- `overflow:hidden` direkt auf dem Select begrenzt überstehende native Optionstexte.
- `width:100%`, `min-width:0`, `max-width:100%`, mindestens 44px Höhe und 16px Schrift.
- Kein globales Abschalten von Zoom; keine globale Overflow-Sperre.
- Betroffene Dateien: `components/staff/service-plan.tsx`, `app/staff/staff.css`.

Die vorherige absolute Positionierung mit festem Wrapper behob das iPhone-Problem nicht. Eine eigene aufklappende Liste funktionierte anders, war aber nicht die gewünschte vertraute Bedienung. Diese Varianten nicht erneut als bestätigte Lösung verwenden.

## Wiederherstellen

Der Checkpoint ist ein unveränderter Referenzbranch vor den folgenden Ergänzungen. Für einen gezielten Rückbau nur die betroffenen Dateien mit diesem Stand vergleichen; spätere Funktionen und Datenlogik nicht pauschal zurücksetzen. Kein Force-Push auf main. Einen Wiederherstellungscommit erstellen, prüfen und regulär veröffentlichen.

## Ladeanzeigen

- Gemeinsame Komponente: `components/staff/ticket-loader.tsx`; vorhandener animierter grün/rosé Balken, `role="status"`, reduced-motion berücksichtigt.
- ServicePlan erhält den Ticket-Feed-Zustand vom übergeordneten TicketSales.
- Offenes Service-Panel ohne Termine während des Erstabrufs: „Veranstaltungen aus Ticket Tailor werden geladen …“ mit TicketLoader.
- Fehler: eigene Nicht-erreichbar-Meldung, kein scheinbar endloser Loader.
- Fehlende Konfiguration: „Ticket Tailor ist noch nicht verbunden.“
- Erfolgreich geladene, leere Liste: „Keine Veranstaltungen für diesen Zeitraum vorhanden.“
- Nach Eventwechsel: vorhandener Buchungsloader; bei Aktualisierung bleiben vorhandene Buchungen sichtbar.
- CSV-Erstellung hat bereits einen TicketLoader.
- Ticketverkauf, Included Drinks, Venue Performance, Buchungsvorlauf und Jam/NYJB verwenden bereits den gemeinsamen TicketLoader für ihre initialen Abrufe.

## Ticketmix des ausgewählten Abends

- Oberhalb der Umschaltung Vorbestellungen/Gästeliste: kompakte Gesamtzeile mit Gästen, Buchungen und tatsächlich vorhandenen Einzeltickets.
- Daten ausschließlich aus denselben gültigen Service-Buchungen wie Gästeliste und Vorbestellungen; keine zusätzliche API-Abfrage.
- Nur tatsächlich gebuchte Kategorien anzeigen: Club, Club Plus, Premium, VIP, Worldstar VIP, Weitere Tickets. Keine Null-Kacheln.
- Je Kategorie eine kompakte Zeile mit Gästen und ausgestellten Tickets. Verteilung der Paketgrößen im standardmäßig geschlossenen Aufklapper „Paketgrößen anzeigen“.
- Beispiel: zwei Club-Einzeltickets plus drei Club-Zweierpakete = fünf Tickets, acht Gäste; „2 × Einzelticket · 3 × 2er-Paket“.
- Ein Ticket/Paket ist nicht dasselbe wie eine Bestellung oder eine Person. Mehrere Tickets in einer Bestellung werden vollständig gezählt.
- Einzelticket heißt Paketgröße 1, nicht Bestellung mit einer Ticketposition.
- Premium für zwei zählt zwei Gäste. Crémant for 2 zählt zwei Gäste.
- Worldstar VIP bleibt eine eigene Kategorie, erscheint aber nur, wenn tatsächlich gebucht.
- Unbekannte Paketgrößen ausdrücklich markieren; keine Gästezahl erfinden.
- API-Gültigkeitsfilter, Add-on-Zuordnung, Inklusivleistungen und Check-in bleiben unverändert.
- Berechnung: `lib/staff/service-ticket-summary.ts`.

## Prüfung und Grenzen

- 51 Staff-Tests bestehen, einschließlich neuer Tests für Einzeltickets, Gruppenpakete, leere Kategorien, VIP/Worldstar und unbekannte Größen.
- TypeScript-Prüfung und Next.js-Produktionsbuild bestanden.
- Lint für ServicePlan und die neue Berechnungsfunktion bestanden.
- Die reine Safari-Auswahl am Checkpoint wurde vom Nutzer auf dem echten iPhone bestätigt. Nachfolgende Ticketmix-/Loader-Ergänzungen benötigen noch die visuelle Geräteprüfung.
- Lokaler Browserlauf war in dieser Umgebung wegen fehlender WebKit-Systembibliotheken bzw. nicht erlaubter Browser-Sockets nicht ausführbar. Kein echter Safari-Test der neuen Ergänzungen behaupten.
- Bestehender Lint-Befund in TicketSales: `Date.now()` im Render-Fallback (`react-hooks/purity`), bereits vor diesem Änderungssatz vorhanden.

## Kompaktere Serviceansicht (19.11.2026)

- Hohe Kacheln durch kompakte Kategoriezeilen ersetzt; Null-Kategorien weiterhin ausgeblendet.
- Gesamtzeile: Gäste, Anzahl Buchungen (nicht Tickets) und Einzeltickets nur bei Anzahl > 0.
- Paketgrößen gesammelt aufklappbar; unbekannte Größen bereits in der Kategoriezeile sichtbar.
- CSV als kleiner beschrifteter Button mit mindestens 44px Touchhöhe.
- Hintergrundaktualisierung in einer reservierten Statuszeile, kein zusätzlich eingeblendeter großer Ladebalken. Erster Buchungsabruf behält TicketLoader. Fehler bleiben sichtbar.
- ServicePlan-Block einschließlich des nativen Selects und dessen CSS gegen den vorherigen Stand bytegenau verglichen: unverändert.
- TypeScript, Komponenten-Lint und 51 Staff-Tests bestanden; Produktionsbuild geprüft. Visuelle Prüfung auf dem iPhone noch ausstehend.

## Ticketgrößen als Tabelle (19.11.2026)

Der Aufklapper heißt jetzt „Ticketgrößen“. Die bisherige Paket-Aufzählung wurde durch eine kompakte Tabelle ersetzt: gebuchte Kategorien als Zeilen, tatsächlich vorkommende Größen als Spalten (Einzel, 2er, 3er usw.). Werte sind Ticket-/Paketanzahlen, keine Gästezahlen. Nicht gebuchte Kombinationen zeigen „–“, unbekannte Größen bleiben explizit unter der Tabelle vermerkt. Zusätzliche Größen wie 5er werden dynamisch aufgenommen; bei vielen Spalten scrollt nur die Tabelle horizontal. Obere Zusammenfassung und Safari-Auswahl unverändert.

## Gesamtzeile aufklappbar und Nachbuchungen (19.11.2026)

- Gäste/Buchungen/Einzeltickets bilden den zunächst geschlossenen Aufklapper mit Chevron. Dahinter liegen Kategorien und Ticketgrößen.
- Ticketgrößen in PolySans Bulky, 17px. CSV-Button als kleinere 36px-Pille.
- Service-Daten behalten jede Bestell-ID und deren Check-in-Status. Zusätzlich weist der Server übereinstimmendem normalisiertem vollständigem Namen UND E-Mail desselben Events eine gemeinsame `displayGroupId` zu. Die E-Mail wird nicht an den Browser gegeben; die Gruppen-ID ist die erste Bestell-ID.
- Gästeliste fasst diese Bestellungen je Kategorie zusammen; Vorbestellungen ebenfalls als gemeinsame Anzeige. Tickets, Gäste und Add-ons werden addiert. „2 Buchungen“ kennzeichnet den Zusammenschluss. Die Gesamtzahl der Buchungen und der Check-in-Zähler beruhen weiter auf den Originalbestellungen.
- Gemischter Check-in wird als „1 von 2 Buchungen eingecheckt“ gezeigt, nicht als vollständig eingecheckt. Die bestehende Check-in-Auswertung innerhalb einer einzelnen Bestellung bleibt unverändert.
- Fehlende E-Mail oder verschiedene E-Mail-Adressen: keine automatische Gruppierung nur nach Namen. CSV bleibt auf Ticket-/Bestellebene.
- Live-Ursache verifiziert: Freya hatte zwei separate Bestellungen für denselben Abend mit identischem Namen und E-Mail (2 + 1 Gäste). Andrea hatte drei Dreiertickets in einer einzigen Bestellung (9 Gäste).
- Tests für Nachbuchungen, Namensgleichheit ohne Identitätsbeleg, teilweise eingecheckte Gruppen und unveränderte Originaldaten ergänzt.
- Safari-Auswahl und ihre CSS-Regeln erneut unverändert geprüft.

## Namen, Gästezahl und CSV-Leiste (19.11.2026)

- Gästeliste und Vorbestellungen: Name links in einer flexiblen Spalte, Gästezahl stets rechts oben. Lange Namen brechen vollständig um; Schriftgröße bleibt erhalten. Buchungsanzahl und Check-in-Hinweise stehen unter dem Namen. Ungeklärte Gästezahlen dürfen innerhalb ihrer rechten Spalte umbrechen.
- Ansichtsschalter links und dezenter Download-Button rechts in einer gemeinsamen Leiste. Sichtbar nur Download-Icon und „CSV“, vollständige Beschriftung für Screenreader. Mindestens 44px Touchhöhe. Bei Platzmangel bricht CSV rechts in die nächste Zeile um.
- Check-in-Zähler darunter; reservierte kompakte Aktualisierungszeile. Keine Änderung an Download-Funktion, Datenberechnung oder Safari-Select.
