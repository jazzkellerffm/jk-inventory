'use client';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { serviceDate } from '@/lib/staff/service-day';
import { berlinDay } from '@/lib/staff/admin/finance';
import type { EveningDashboard, AdminHistory, HistoryPoint } from '@/lib/staff/admin/dashboard';
import { TicketLoader } from './ticket-loader';

const money = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value / 100);
const monthName = (month: string) => new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z'));

export function AdminEveningView({ data, now, refresh, loading }: { data: EveningDashboard; now: number; refresh: () => void; loading: boolean }) {
  const ended = berlinDay(now) > data.date;
  const phase = ended ? 'Abend abgeschlossen' : data.phase === 'upcoming' ? 'Heute Abend' : data.phase === 'started' ? 'Abend läuft' : 'Dieser Abend';
  return <section className="admin-evening" aria-label="Aktueller Serviceabend">
    <div className="admin-evening-heading"><h2>{phase}</h2><time dateTime={data.date}>{new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(data.date + 'T12:00:00Z'))}</time></div>
    <p className="admin-evening-name">{!data.eventsAvailable ? 'Veranstaltung wird noch abgeglichen' : data.events.length ? data.events.map(event => event.name).join(' · ') : 'Keine Veranstaltung eingetragen'}</p>
    <dl className="admin-evening-total"><dt>Gesamtwert des Abends</dt><dd>{money(data.combinedCents)}</dd></dl>
    <div className="admin-evening-split" aria-hidden="true">
      {data.ticketTotal !== null && data.sumupCents !== null && data.combinedCents !== null && data.combinedCents > 0 && <>
        <span style={{ flex: Math.max(0, data.ticketTotal) }} /><span style={{ flex: Math.max(0, data.sumupCents) }} />
      </>}
    </div>
    <dl className="admin-evening-sources">
      <div><dt><i className="admin-key-ticket"/>Ticket Tailor gesamt</dt><dd>{money(data.ticketTotal)}</dd></div>
      <div><dt><i className="admin-key-bar"/>SumUp</dt><dd>{money(data.sumupCents)}</dd></div>
    </dl>
    <div className="admin-evening-bar"><span>SumUp + Inklusivgetränke<small>Kalkulatorisch · Inklusivwert bereits im Ticketwert enthalten</small></span><strong>{money(data.barWithIncludedCents)}</strong></div>
    {data.includedCents === null && data.knownIncludedCents !== null && <p className="admin-evening-note">Inklusivwert bisher {money(data.knownIncludedCents)}. Noch offen: {data.unvaluedSupplies.map(item => `${item.quantity} × ${item.label}`).join(' · ') || 'Ticketbewertung'}.</p>}
    {(data.ticketTotal === null || data.sumupCents === null) && <p className="admin-evening-note" role="status">{data.ticketTotal === null ? 'Ticket Tailor noch unvollständig. ' : ''}{data.sumupCents === null ? 'SumUp noch unvollständig. ' : ''}Die Gesamtsumme bleibt bis zum Abgleich offen.</p>}
    <details className="admin-evening-details"><summary>Zusammensetzung</summary><dl className="admin-values">
      <div><dt>Ticketpakete inklusive Inklusivgetränke</dt><dd>{money(data.ticketCents)}</dd></div>
      <div><dt>Zusatzbestellungen</dt><dd>{money(data.addonCents)}</dd></div>
      <div><dt>Buchungsgebühren</dt><dd>{money(data.feeCents)}</dd></div>
      <div><dt>Davon Inklusivgetränke · kalkulatorisch</dt><dd>{money(data.includedCents)}</dd></div>
    </dl><p>Gültige Ticket-Tailor-Buchungen für diesen Abend, unabhängig vom Kaufdatum, plus SumUp von 03:00 bis 03:00. Vor Anbietergebühren und Kreditrückzahlung. Inklusivwerte sind kein zusätzlicher Zahlungseingang; kein Gewinn oder reiner Gastronomieumsatz.</p></details>
    <div className="admin-evening-footer"><span>{data.guests !== null ? `${data.guests} Gäste gebucht · ` : ''}Stand {new Date(data.asOf).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr<br/>Wechsel zum nächsten Abend um 03:00</span>
      <button type="button" aria-label="Abendübersicht aktualisieren" disabled={loading} onClick={refresh}><RefreshCw size={18} aria-hidden="true" /></button>
    </div>
  </section>;
}

export function AdminHistoryView({ points, firstMonth, loading, error, retry }: { points: HistoryPoint[]; firstMonth: string | null; loading: boolean; error: string; retry: () => void }) {
  const [selected, setSelected] = useState('');
  const point = points.find(item => item.month === selected) ?? points[points.length - 1];
  const values = points.flatMap(item => item.cents === null ? [] : [item.cents]);
  const max = Math.max(1, ...values), min = Math.min(0, ...values), range = max - min;
  const x = (index: number) => points.length < 2 ? 300 : 12 + index / (points.length - 1) * 576;
  const y = (value: number) => 130 - (value - min) / range * 112;
  // Missing months break the line; a source failure never becomes a zero month.
  const segments = points.flatMap((item, index) => {
    const prior = points[index - 1];
    return index && item.cents !== null && prior.cents !== null ? [{ index, path: `M ${x(index - 1)} ${y(prior.cents)} L ${x(index)} ${y(item.cents)}`, partial: item.partial }] : [];
  });
  return <section className="admin-history" aria-label="SumUp-Monatsverlauf">
    <div className="admin-history-heading"><h2>SumUp im Verlauf</h2>{firstMonth && <span>Seit {monthName(firstMonth)}</span>}</div>
    {point && <>
      <div className="admin-history-selection"><label>Monat<select value={point.month} onChange={event => setSelected(event.target.value)}>{points.map(item => <option value={item.month} key={item.month}>{monthName(item.month)}{item.partial ? ' · bisher' : ''}</option>)}</select></label><strong>{money(point.cents)}</strong></div>
      <svg viewBox="0 0 600 150" role="img" aria-label="SumUp-Zahlungen pro Monat nach erfassten Rückzahlungen. Gestrichelt: laufender Monat. Fehlende Werte unterbrechen die Linie.">
        <line x1="12" x2="588" y1={y(0)} y2={y(0)} className="admin-chart-axis" />
        {segments.map(segment => <path key={segment.index} d={segment.path} className={segment.partial ? 'admin-chart-partial' : 'admin-chart-line'} />)}
        {points.map((item, index) => item.cents === null ? null : <circle key={item.month} cx={x(index)} cy={y(item.cents)} r={item.month === point.month ? 5 : 2.5} className={item.month === point.month ? 'admin-chart-selected' : 'admin-chart-dot'}><title>{`${monthName(item.month)}: ${money(item.cents)}${item.partial ? ' · bisher' : ''}`}</title></circle>)}
      </svg>
      <div className="admin-history-axis"><span>{monthName(points[0].month)}</span><span>{monthName(points[points.length - 1].month)}</span></div>
    </>}
    {loading && <TicketLoader label={points.length ? 'Ältere Monate werden ergänzt' : 'SumUp-Verlauf wird geladen'} />}
    {!loading && !points.length && !error && <p className="admin-note">Noch keine SumUp-Zahlungen erfasst.</p>}
    {(error || points.some(item => item.cents === null)) && <p className="admin-note" role="status">{error || 'Einzelne Monate sind noch nicht vollständig abgeglichen.'} <button type="button" className="admin-retry" onClick={retry} disabled={loading}>Erneut laden</button></p>}
    {points.length > 0 && <p className="admin-history-note">Zahlungen nach Rückzahlungen, vor Gebühren und Kreditrückzahlung. Laufender Monat nur bis jetzt; erster Monat ab der ersten verfügbaren Zahlung.</p>}
  </section>;
}

export function AdminDashboard({ onExpired }: { onExpired: () => void }) {
  const [clock, setClock] = useState(() => Date.now()), [evening, setEvening] = useState<EveningDashboard | null>(null);
  const [eveningBusy, setEveningBusy] = useState(true), [eveningError, setEveningError] = useState('');
  const [points, setPoints] = useState<HistoryPoint[]>([]), [firstMonth, setFirstMonth] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(true), [historyError, setHistoryError] = useState('');
  const [refresh, setRefresh] = useState(0), [historyRefresh, setHistoryRefresh] = useState(0);
  const date = serviceDate(clock), month = berlinDay(clock).slice(0, 7);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const read = async () => {
      if (running || controller.signal.aborted || document.visibilityState === 'hidden') return;
      running = true; setEveningBusy(true); setEveningError('');
      try {
        const response = await fetch('/api/staff/admin/evening', { cache: 'no-store', signal: controller.signal });
        if (response.status === 401) { onExpired(); return; }
        if (!response.ok) throw Error('Abendübersicht konnte nicht aktualisiert werden.');
        const result: EveningDashboard = await response.json();
        if (!controller.signal.aborted && result.date === serviceDate(Date.now())) setEvening(result);
      } catch (error) { if (!controller.signal.aborted) setEveningError(error instanceof Error ? error.message : 'Verbindung unterbrochen.'); }
      finally { running = false; if (!controller.signal.aborted) setEveningBusy(false); }
    };
    const initial = window.setTimeout(() => void read(), 0), timer = window.setInterval(() => void read(), 60000);
    return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(timer); };
  }, [date, refresh, onExpired]);
  useEffect(() => {
    const controller = new AbortController();
    const read = async () => {
      setHistoryBusy(true); setHistoryError(''); setPoints([]); setFirstMonth(null);
      let before: string | null = month;
      const seen = new Set<string>(), collected = new Map<string, HistoryPoint>();
      try {
        while (before && !controller.signal.aborted) {
          if (seen.has(before)) throw Error('Der Verlauf konnte nicht vollständig geladen werden.');
          seen.add(before);
          const response = await fetch('/api/staff/admin/history?before=' + before, { cache: 'no-store', signal: controller.signal });
          if (response.status === 401) { onExpired(); return; }
          if (!response.ok) throw Error('Der SumUp-Verlauf konnte nicht vollständig geladen werden.');
          const result: AdminHistory = await response.json();
          if (controller.signal.aborted) return;
          for (const point of result.points) collected.set(point.month, point);
          setPoints([...collected.values()].sort((a, b) => a.month.localeCompare(b.month))); setFirstMonth(result.firstMonth);
          before = result.nextBefore;
        }
      } catch (error) { if (!controller.signal.aborted) setHistoryError(error instanceof Error ? error.message : 'Verbindung unterbrochen.'); }
      finally { if (!controller.signal.aborted) setHistoryBusy(false); }
    };
    const initial = window.setTimeout(() => void read(), 0);
    return () => { controller.abort(); window.clearTimeout(initial); };
  }, [month, historyRefresh, onExpired]);
  return <div className="admin-dashboard">
    {evening?.date === date ? <AdminEveningView data={evening} now={clock} loading={eveningBusy} refresh={() => setRefresh(value => value + 1)} /> : !eveningError ? <TicketLoader label="Abendübersicht wird geladen" /> : null}
    {eveningError && <p className="admin-note" role="status">{eveningError} <button type="button" className="admin-retry" onClick={() => setRefresh(value => value + 1)}>Erneut laden</button></p>}
    <AdminHistoryView points={points} firstMonth={firstMonth} loading={historyBusy} error={historyError} retry={() => setHistoryRefresh(value => value + 1)} />
  </div>;
}
