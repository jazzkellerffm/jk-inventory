'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { serviceDate } from '@/lib/staff/service-day';
import { berlinDay } from '@/lib/staff/admin/finance';
import type { EveningDashboard, AdminHistory, HistoryPoint } from '@/lib/staff/admin/dashboard';
import { clearHistoryWindow, historyMonth, loadHistoryWindow, type HistoryWindow } from '@/lib/staff/admin/history-window';
import { TicketLoader } from './ticket-loader';

const money = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value / 100);
const shortDay = (date: string) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
const monthName = (month: string) => new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z'));

export function AdminEveningView({ data, now, refresh, loading }: { data: EveningDashboard; now: number; refresh: () => void; loading: boolean }) {
  const [greenOpen,setGreenOpen]=useState(false),[roseOpen,setRoseOpen]=useState(false);
  const [comparison,setComparison]=useState<EveningDashboard['comparison']>();
  const [compareError,setCompareError]=useState(false);
  const open=greenOpen||roseOpen;
  useEffect(()=>{
    if(!open)return;
    const controller=new AbortController();
    fetch('/api/staff/admin/evening?comparison=1',{cache:'no-store',signal:controller.signal})
      .then(async response=>{if(!response.ok)throw Error();return response.json();})
      .then(result=>{if(!controller.signal.aborted&&result.date===data.date){setComparison(result.comparison);setCompareError(false);}})
      .catch(()=>{if(!controller.signal.aborted)setCompareError(true);});
    return()=>controller.abort();
  },[open,data.date]);
  const ended = berlinDay(now) > data.date;
  const phase = ended ? 'Abend abgeschlossen' : data.phase === 'upcoming' ? 'Heute Abend' : data.phase === 'started' ? 'Abend läuft' : 'Dieser Abend';
  return <section className="admin-evening" aria-label="Aktueller Serviceabend"><div className="admin-evening-primary">
    <div className="admin-evening-heading"><h2>{phase}</h2><time dateTime={data.date}>{new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(data.date + 'T12:00:00Z'))}</time></div>
    <p className="admin-evening-name">{!data.eventsAvailable ? 'Veranstaltung wird noch abgeglichen' : data.events.length ? data.events.map(event => event.name).join(' · ') : 'Keine Veranstaltung eingetragen'}</p>
    {data.guests !== null && <p className="admin-evening-guests"><strong>{data.guests}</strong> {data.guests === 1 ? 'Gast gebucht' : 'Gäste gebucht'}</p>}
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
    <div className="admin-week-compare" aria-label="Gesamtumsatz im Vergleich zur Vorwoche">
      <button type="button" className="admin-compare-toggle" aria-expanded={greenOpen} onClick={()=>setGreenOpen(v=>!v)}>Vorwochenvergleich <ChevronDown size={18}/></button>
      {greenOpen && <>{!comparison && <p>{compareError?"Vergleich derzeit nicht verfügbar.":"Vergleich wird geladen …"}</p>}<h3><small>Ticket Tailor + SumUp</small></h3>
      {([{label:ended?'Letzter Abend':'Heute · live',date:data.date,cents:data.combinedCents},{label:'Vorwoche',date:comparison?.date,cents:comparison?.combinedCents ?? null}] as const).map((item,index) => {
        const peak = Math.max(1, data.combinedCents ?? 0, comparison?.combinedCents ?? 0);
        return <div className="admin-compare-row" key={index}>
          <div className="admin-compare-label"><span>{item.label}{item.date ? ' · ' + shortDay(item.date) : ''}</span><strong>{money(item.cents)}</strong></div>
          <div className="admin-compare-track"><span className={index===0?'admin-compare-current':'admin-compare-previous'} style={{width:item.cents===null?'0%':Math.max(0,item.cents)/peak*100+'%'}} /></div>
        </div>;
      })}</>}
    </div>
    </div><div className="admin-evening-secondary"><div className="admin-evening-bar"><span>SumUp + Inklusivgetränke<small>Kalkulatorisch · bereits im Ticketwert enthalten</small></span><strong>{money(data.barWithIncludedCents)}</strong></div>
    <div className="admin-rose-compare" aria-label="SumUp-Umsatz im Vergleich zur Vorwoche">
      <button type="button" className="admin-compare-toggle" aria-expanded={roseOpen} onClick={()=>setRoseOpen(v=>!v)}>SumUp · Vorwochenvergleich <ChevronDown size={18}/></button>
      {roseOpen && <>{!comparison && <p>{compareError?"Vergleich derzeit nicht verfügbar.":"Vergleich wird geladen …"}</p>}
      {([{label:ended?'Letzter Abend':'Heute · live',cents:data.sumupCents},{label:'Vorwoche · '+(comparison?.date ? shortDay(comparison.date) : '–'),cents:comparison?.sumupCents ?? null}] as const).map((item,index) => {
        const peak = Math.max(1,data.sumupCents ?? 0,comparison?.sumupCents ?? 0);
        return <div className="admin-compare-row" key={index}>
          <div className="admin-compare-label"><span>{item.label}</span><strong>{money(item.cents)}</strong></div>
          <div className="admin-compare-track"><span className={index===0?'admin-compare-current':'admin-compare-previous'} style={{width:item.cents===null?'0%':Math.max(0,item.cents)/peak*100+'%'}} /></div>
        </div>;
      })}</>}
    </div>
    {data.includedCents === null && data.knownIncludedCents !== null && <p className="admin-evening-note">Inklusivwert bisher {money(data.knownIncludedCents)}. Noch offen: {data.unvaluedSupplies.map(item => `${item.quantity} × ${item.label}`).join(' · ') || 'Ticketbewertung'}.</p>}
    {(data.ticketTotal === null || data.sumupCents === null) && <p className="admin-evening-note" role="status">{data.ticketTotal === null ? 'Ticket Tailor noch unvollständig. ' : ''}{data.sumupCents === null ? 'SumUp noch unvollständig. ' : ''}Die Gesamtsumme bleibt bis zum Abgleich offen.</p>}
    <details className="admin-evening-details"><summary>Details</summary><dl className="admin-values">
      <div><dt>Ticketpakete inklusive Inklusivgetränke</dt><dd>{money(data.ticketCents)}</dd></div>
      <div><dt>Zusatzbestellungen</dt><dd>{money(data.addonCents)}</dd></div>
      <div><dt>Buchungsgebühren</dt><dd>{money(data.feeCents)}</dd></div>
      <div><dt>Davon Inklusivgetränke · kalkulatorisch</dt><dd>{money(data.includedCents)}</dd></div>
    </dl><p>Gültige Ticket-Tailor-Buchungen für diesen Abend, unabhängig vom Kaufdatum, plus SumUp von 03:00 bis 03:00. Vor Anbietergebühren und Kreditrückzahlung. Inklusivwerte sind kein zusätzlicher Zahlungseingang; kein Gewinn oder reiner Gastronomieumsatz.</p></details>
    <div className="admin-evening-footer"><span>Stand {new Date(data.asOf).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr<br/>Wechsel zum nächsten Abend um 03:00</span>
      <button type="button" aria-label="Abendübersicht aktualisieren" disabled={loading} onClick={refresh}><RefreshCw size={18} aria-hidden="true" /></button>
    </div></div>
  </section>;
}

export function AdminHistoryView({ points, loading, error, retry }: { points: HistoryPoint[]; loading: boolean; error: string; retry: () => void }) {
  const [selected, setSelected] = useState('');
  const point = points.find(item => item.month === selected) ?? points[points.length - 1];
  const values = points.flatMap(item => item.cents === null ? [] : [item.cents]);
  const max = Math.max(1, ...values), min = Math.min(0, ...values), range = max - min;
  const baseline = max / range * 100;
  return <>
    {point && <>
      <div className="admin-history-selection"><label>Monat<select value={point.month} onChange={event => setSelected(event.target.value)}>{points.map(item => <option value={item.month} key={item.month}>{monthName(item.month)}{item.partial ? ' · bisher' : ''}</option>)}</select></label><strong aria-live="polite">{money(point.cents)}</strong></div>
      <div className="admin-history-bars" role="group" aria-label="SumUp-Zahlungen pro Monat" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
        {points.map(item => <button type="button" key={item.month} aria-pressed={item.month === point.month} onClick={() => setSelected(item.month)}
          aria-label={`${monthName(item.month)}: ${item.cents === null ? 'noch nicht verfügbar' : money(item.cents)}${item.partial ? ' · bisher' : ''}`}>
          <span className="admin-history-bar-area" aria-hidden="true">
            <span className="admin-history-zero" style={{ top: `${baseline}%` }} />
            {item.cents === null ? <span className="admin-history-missing">—</span> : <span className="admin-history-bar" data-partial={item.partial} data-zero={item.cents === 0}
              style={{ top: `${item.cents >= 0 ? (max - item.cents) / range * 100 : baseline}%`, height: `${Math.abs(item.cents) / range * 100}%` }} />}
          </span>
          <span className="admin-history-month" aria-hidden="true">{item.month.slice(5)}</span>
        </button>)}
      </div>
      <div className="admin-history-axis"><span>{monthName(points[0].month)}</span><span>{monthName(points[points.length - 1].month)}</span></div>
    </>}
    {loading && <TicketLoader label="Monate werden geladen" />}
    {!loading && !points.length && !error && <p className="admin-note">Noch keine SumUp-Zahlungen erfasst.</p>}
    {(error || points.some(item => item.cents === null)) && <p className="admin-note" role="status">{error || 'Einzelne Monate sind noch nicht vollständig abgeglichen.'} <button type="button" className="admin-retry" onClick={retry} disabled={loading}>Erneut laden</button></p>}
    {points.length > 0 && <p className="admin-history-note">Zahlungen nach Rückzahlungen, vor Gebühren und Kreditrückzahlung. Laufender Monat nur bis jetzt. Rosé markiert die Auswahl.</p>}
  </>;
}

export function AdminHistorySection({ month, onExpired }: { month: string; onExpired: () => void }) {
  const [open, setOpen] = useState(false), [end, setEnd] = useState('');
  const [data, setData] = useState<HistoryWindow | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const pages = useRef(new Map<string, AdminHistory>()), contentId = useId();
  const endMonth = end || month;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const read = async () => {
      setBusy(true); setError('');
      let partial: HistoryWindow | null = null;
      try {
        const result = await loadHistoryWindow(endMonth, pages.current, controller.signal, async (before, signal) => {
          const response = await fetch('/api/staff/admin/history?before=' + before, { cache: 'no-store', signal });
          if (response.status === 401) { onExpired(); throw Error('Sitzung abgelaufen.'); }
          if (!response.ok) throw Error('Der SumUp-Verlauf konnte nicht vollständig geladen werden.');
          return response.json();
        }, value => { partial = value; });
        if (!controller.signal.aborted) setData(result);
      } catch (error) { if (!controller.signal.aborted) { if (partial) setData(partial); setError(error instanceof Error ? error.message : 'Verbindung unterbrochen.'); } }
      finally { if (!controller.signal.aborted) setBusy(false); }
    };
    const initial = window.setTimeout(() => void read(), 0);
    return () => { controller.abort(); window.clearTimeout(initial); };
  }, [open, endMonth, refresh, onExpired]);
  const visible = data?.endMonth === endMonth ? data.points : [];
  const start = historyMonth(endMonth, -11);
  const retry = () => { clearHistoryWindow(endMonth, pages.current); setRefresh(value => value + 1); };
  return <section className="admin-history" aria-label="SumUp-Monatsverlauf">
    <h2><button type="button" className="admin-history-toggle" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}>
      <span>SumUp im Verlauf<small>{data?.firstMonth ? `Seit ${monthName(data.firstMonth)}` : 'Monatsübersicht'}</small></span><ChevronDown size={20} aria-hidden="true" />
    </button></h2>
    <div id={contentId} hidden={!open}>
      <div className="admin-history-window"><span>{monthName(data?.firstMonth && data.firstMonth > start ? data.firstMonth : start)} – {monthName(endMonth)}</span>
        <div><button type="button" aria-label="Ältere zwölf Monate" disabled={busy || !data?.firstMonth || start <= data.firstMonth} onClick={() => setEnd(historyMonth(endMonth, -12))}><ChevronLeft size={20} aria-hidden="true" /></button>
          <button type="button" aria-label="Neuere zwölf Monate" disabled={busy || endMonth >= month} onClick={() => setEnd(historyMonth(endMonth, 12) >= month ? '' : historyMonth(endMonth, 12))}><ChevronRight size={20} aria-hidden="true" /></button></div>
      </div>
      <AdminHistoryView points={visible} loading={busy || (open && data?.endMonth !== endMonth && !error)} error={error} retry={retry} />
      {visible.length > 0 && data && <div className="admin-history-footer"><span>Stand {new Date(data.asOf).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr</span><button type="button" aria-label="SumUp-Verlauf aktualisieren" disabled={busy} onClick={retry}><RefreshCw size={18} aria-hidden="true" /></button></div>}
    </div>
  </section>;
}

export function AdminDashboard({ onExpired }: { onExpired: () => void }) {
  const [clock, setClock] = useState(() => Date.now()), [evening, setEvening] = useState<EveningDashboard | null>(null);
  const [eveningBusy, setEveningBusy] = useState(true), [eveningError, setEveningError] = useState('');
  const [refresh, setRefresh] = useState(0);
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
  return <div className="admin-dashboard">
    {evening?.date === date ? <AdminEveningView data={evening} now={clock} loading={eveningBusy} refresh={() => setRefresh(value => value + 1)} /> : !eveningError ? <TicketLoader label="Abendübersicht wird geladen" /> : null}
    {eveningError && <p className="admin-note" role="status">{eveningError} <button type="button" className="admin-retry" onClick={() => setRefresh(value => value + 1)}>Erneut laden</button></p>}
    <AdminHistorySection month={month} onExpired={onExpired} />
  </div>;
}
