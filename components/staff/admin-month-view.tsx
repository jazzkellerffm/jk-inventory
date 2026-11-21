import { ChevronDown } from 'lucide-react';
import { serviceDate } from '@/lib/staff/service-day';
import type { AdminSummary } from '@/lib/staff/admin/data';

export type AdminMode = 'payments' | 'events';
const money = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value / 100);
const day = (value: string) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));

function Calculation({ children }: { children: React.ReactNode }) {
  return <details className="admin-calculation">
    <summary>Berechnung <ChevronDown size={18} aria-hidden="true" /></summary>
    <div className="admin-note">{children}</div>
  </details>;
}

export function AdminMonthView({ data, mode, retry }: { data: AdminSummary; mode: AdminMode; retry: () => void }) {
  const nights = data.ticket?.nights ?? [];
  const eventComplete = data.ticket && data.ticket.eventIssues === 0;
  const ticketTotal = eventComplete ? nights.reduce((sum, night) => sum + night.ticketCents, 0) : null;
  const retryButton = <button className="admin-retry" type="button" onClick={retry}>Erneut laden</button>;
  return <>
    {mode === 'payments' ? <>
      <section className="admin-total" aria-label="Zahlungen im Monat">
        <p>Zahlungen im Monat</p><strong>{money(data.combinedPayments)}</strong>
        <small>Ticket Tailor + SumUp · nach Rückzahlungen</small>
      </section>
      <dl className="admin-values">
        <div><dt>Ticket Tailor</dt><dd>{money(data.ticket?.netPayments)}</dd></div>
        <div><dt>SumUp</dt><dd>{money(data.bar?.netPayments)}</dd></div>
        <div><dt>Bereits abgezogene Rückzahlungen</dt><dd>{money(data.ticket?.netPayments != null && data.bar?.netPayments != null ? data.ticket.refunds + data.bar.refunds : null)}</dd></div>
      </dl>
      {data.combinedPayments === null && <div role="status">
        {!data.ticket ? <p>Ticket Tailor konnte nicht vollständig geladen werden.</p> : data.ticket.paymentIssues > 0 && <p>Ticket Tailor: {data.ticket.paymentIssues} Zahlungsvorgänge benötigen noch einen Abgleich.</p>}
        {!data.bar ? <p>SumUp konnte nicht vollständig geladen werden.</p> : data.bar.paymentIssues > 0 && <p>SumUp: {data.bar.paymentIssues} Erstattungen konnten noch nicht vollständig zugeordnet werden.</p>}
        <p>Die Gesamtsumme erscheint, sobald beide Quellen vollständig abgeglichen sind.</p>{retryButton}
      </div>}
      <Calculation>
        <p>Es zählt das Zahlungsdatum in Europe/Berlin. Ticketkäufe für spätere Veranstaltungen zählen hier mit. Rückzahlungen werden im Monat der Erstattung abgezogen.</p>
        <p>Vor Anbietergebühren und Kreditrückzahlung, inklusive etwaiger Trinkgelder. Stripe wird nicht nochmals addiert. Auszahlungen und Gewinn sind andere Größen.</p>
      </Calculation>
    </> : <>
      <section className="admin-total" aria-label="Ticketpakete im Veranstaltungsmonat">
        <p>Ticketpakete im Monat</p><strong>{money(ticketTotal)}</strong>
        <small>Veranstaltungsdatum · ohne Gebühren & Zusatzbestellungen</small>
      </section>
      {!eventComplete && <div role="status"><p>{!data.ticket ? 'Ticket Tailor konnte nicht vollständig geladen werden.' : 'Einige Bestellungen benötigen einen Abgleich. Die vollständige Monatssumme bleibt bis dahin offen.'}</p>{retryButton}</div>}
      {!data.bar && <div role="status"><p>SumUp konnte nicht vollständig geladen werden. Die Abendzahlungen bleiben bis dahin offen.</p>{retryButton}</div>}
      <Calculation>
        <p>Gültige Ticketpakete für Veranstaltungen in diesem Monat, unabhängig vom Kaufmonat. Buchungsgebühren, Zusatzbestellungen und stornierte Tickets sind ausgenommen.</p>
        {!!data.ticket?.excludedEventOrders && <p>{data.ticket.excludedEventOrders} stornierte {data.ticket.excludedEventOrders === 1 ? 'Buchung ist' : 'Buchungen sind'} ausgenommen. Zugehörige Zahlungen und Rückzahlungen bleiben unter „Zahlungen“ berücksichtigt.</p>}
        <p>Ticketanteil ohne Inklusivgetränke = Ticketpakete minus bewertete Inklusivgetränke. Darin stecken Eintritt und Platzvorteile. Es ist kein Gewinn und kein Vergleich mit einem Basis-Ticket.</p>
        <p>Inklusivdrinks: vereinbarter Ansatz 15 € je enthaltenem Drink. Flasche Crémant: 50 €; Flasche Moët: vorläufig 129 €. Die jeweilige Aufschlüsselung steht beim Abend. Diese Werte beschreiben enthaltene Leistungen, nicht den tatsächlichen Verbrauch oder zusätzliche Einnahmen.</p>
        <p>Fehlende Rechenwerte werden beim Abend genannt. Abgeleitete Summen erscheinen erst bei vollständiger Bewertung.</p>
        <p>SumUp kann Trinkgelder und weitere Artikel enthalten. SumUp + Inklusivwert ist daher kein reiner Gastronomieumsatz. Vor Anbietergebühren und Kreditrückzahlung. Serviceabend: 03:00 bis 03:00; kommende Abende haben noch keine SumUp-Zahlungen.</p>
      </Calculation>
      <div className="admin-events-heading"><h3>Veranstaltungen</h3><span>{nights.length} {nights.length === 1 ? 'Termin' : 'Termine'}</span></div>
      {eventComplete && !nights.length && <p className="admin-note">Keine gültigen Ticketpakete für diesen Monat vorhanden.</p>}
      {nights.map(night => {
        const sameDate = nights.filter(other => other.date === night.date).length;
        const bar = data.bar && sameDate === 1 && night.date <= serviceDate(data.asOf)
          ? Object.hasOwn(data.bar.nights, night.date) ? data.bar.nights[night.date] : 0 : null;
        const gastro = !night.uncertain && bar != null && night.includedCents != null ? bar + night.includedCents : null;
        return <details className="admin-night" key={night.id} name="admin-event">
          <summary>
            <span className="admin-night-title"><time dateTime={night.date}>{day(night.date)}</time><span>{night.name}</span></span>
            <span className="admin-night-value"><small>Ticketwert</small><strong>{money(night.uncertain ? null : night.ticketCents)}</strong></span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          {night.uncertain ? <p className="admin-note">Zuordnung wird geprüft · keine verlässliche Aufteilung.</p> : <dl className="admin-values">
            <div><dt>Ticketpakete</dt><dd>{money(night.ticketCents)}</dd></div>
            <div><dt>{night.includedCents === null ? 'Bewertete Inklusivgetränke · Teilbetrag' : 'Davon Inklusivgetränke'}
              <small className="admin-value-note">Kalkulatorischer Wert</small>
              {night.includedItems.map(item => <small className="admin-value-note" key={`${item.label}:${item.unitCents}`}>
                {item.quantity} × {item.label} à {money(item.unitCents)}{item.label === 'Flasche Moët' && ' · vorläufig'}
              </small>)}
              {night.unvaluedSupplies.length > 0 && <small className="admin-value-note">Noch ohne Rechenwert: {night.unvaluedSupplies.map(item => `${item.quantity} × ${item.label}`).join(' · ')}</small>}
            </dt><dd>{money(night.knownIncludedCents)}</dd></div>
            {night.admissionCents !== null && <div><dt>Ticketanteil ohne Inklusivgetränke</dt><dd>{money(night.admissionCents)}</dd></div>}
            <div><dt>SumUp-Zahlungen des Abends</dt><dd>{money(bar)}</dd></div>
            {gastro !== null && <div><dt>SumUp + Inklusivwert<small className="admin-value-note">Kalkulatorisch</small></dt><dd>{money(gastro)}</dd></div>}
            <div><dt>Zusatzbestellungen über Ticket Tailor</dt><dd>{money(night.addonCents)}</dd></div>
          </dl>}
        </details>;
      })}
    </>}
    <p className="admin-note admin-updated">Stand {new Date(data.asOf).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr</p>
  </>;
}
