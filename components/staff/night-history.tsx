'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { earliestNightMonth, shiftMonth } from '@/lib/staff/night-history';
import { serviceDate } from '@/lib/staff/service-day';
import type { MonthSummary, TicketFeed } from '@/lib/staff/tickets';
import { ticketCategories } from '@/lib/staff/entitlements';
import { ticketDay } from '@/lib/staff/ticket-weeks';
import { MonthDetails } from './month-details';
import { TicketLoader } from './ticket-loader';
type ChartRow = [label: string, hint: string, count: number, tone: string];
function NightColumns({rows}: {rows: ChartRow[]}) {
  const max = Math.max(1, ...rows.map(row => row[2]));
  return <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
    {rows.map(([label, hint, count, tone]) => <div key={label} className="flex min-w-0 flex-col">
      <dt className="mt-1 text-xs leading-tight">
        <span className="font-poly-bulky">{label}</span>
        <span className="mt-1 block font-normal text-[var(--muted)]">{hint}</span>
      </dt>
      <dd className="order-first flex h-28 flex-col items-center justify-end">
        <b className="mb-1 tabular-nums">{count}</b>
        <div aria-hidden="true" className={tone + " w-full max-w-20 rounded-t-md rounded-b-[2px]"} style={{height: 80 * count / max}}/>
      </dd>
    </div>)}
  </dl>;
}

export function NightHistory({ feed, enabled, example }: { feed: TicketFeed; enabled: boolean; example: boolean }) {
  const current = serviceDate(feed.asOf * 1000).slice(0, 7);
  const earliest = earliestNightMonth(current);
  const [selected, setSelected] = useState<string | null>(null);
  const month = selected && selected >= earliest && selected <= current ? selected : current;
  const [history, setHistory] = useState<Record<string, MonthSummary>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const useLive = month === current && ticketDay(feed.asOf).slice(0, 7) === current;
  const data: MonthSummary | undefined = useLive && feed.monthlyNights ? { counts: feed.monthlyNights, monthlyGuests: feed.monthlyGuests, monthlyCategories: feed.monthlyCategories, monthlyTables: feed.monthlyTables } : history[month];
  const counts = data?.counts;
  const move = (delta: number) => {
    const next = shiftMonth(month, delta);
    if (next >= earliest && next <= current) { setFailed(null); setSelected(next === current ? null : next); }
  };
  useEffect(() => {
    if (!enabled || example || useLive || history[month]) return;
    const abort = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => { if (!disposed) setFailed(month); abort.abort(); }, 60_000);
    fetch('/api/staff/night-history?month=' + month, { cache: 'no-store', signal: abort.signal })
      .then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(data => {
        const nonnegative = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0;
        if (!nonnegative(data.monthlyGuests?.count) || !nonnegative(data.monthlyGuests?.unknownPackages) || !nonnegative(data.monthlyTables?.vip) || !nonnegative(data.monthlyTables?.worldstar) || !ticketCategories.every(k => nonnegative(data.monthlyCategories?.[k]))) throw Error();
        if (data.month !== month || !['soldOut', 'busy', 'half', 'quiet', 'unclear'].every(k => Number.isInteger(data.counts?.[k]) && data.counts[k] >= 0)) throw Error();
        if (!disposed && !abort.signal.aborted) setHistory(old => ({ ...old, [month]: data }));
      })
      .catch(() => { if (!disposed) setFailed(month); })
      .finally(() => clearTimeout(timeout));
    return () => { disposed = true; clearTimeout(timeout); abort.abort(); };
  }, [enabled, example, month, useLive, history, retry]);
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const label = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z'));
  const buttonClass = 'flex h-11 w-11 items-center justify-center border-0 bg-transparent disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2';
  return <section className="mt-4 border-t border-[var(--line)] pt-4" aria-label="Monatsübersicht"
    onTouchStart={e => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
    onTouchCancel={() => { touch.current = null; }}
    onTouchEnd={e => { const start = touch.current; touch.current = null; if (!start) return; const t = e.changedTouches[0]; const dx = t.clientX - start.x; const dy = t.clientY - start.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx > 0 ? -1 : 1); }}>
    <h3 className="font-poly-bulky">Monatsübersicht</h3>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <p className="min-w-0 font-poly-bulky">{label}</p>
      <div className="flex gap-1" role="group" aria-label="Monat wechseln">
        <button className={buttonClass} type="button" aria-label="Vorheriger Monat" disabled={month <= earliest} onClick={() => move(-1)}><ChevronLeft size={20}/></button>
        <button className={buttonClass} type="button" aria-label="Nächster Monat" disabled={month >= current} onClick={() => move(1)}><ChevronRight size={20}/></button>
      </div>
    </div>
    <p className="text-sm text-[var(--muted)]">Abgeschlossene Abende · gebuchte Gäste{month === current && ' · bisher'}</p>
    <div aria-live="polite">
      {example && month !== current ? <p className="mt-3 text-sm">Historische Monate im Livebetrieb verfügbar.</p> : failed === month ? <p className="mt-3 text-sm" role="status">Dieser Monat konnte nicht geladen werden. <button type="button" className="underline" onClick={() => { setFailed(null); setRetry(n => n + 1); }}>Erneut laden</button></p> : !data || !counts ? <TicketLoader label="Monatsübersicht wird geladen"/> : <>
        <p className="mt-2 text-sm text-[var(--muted)]">{total} abgeschlossene Abende{total > 0 && ` · ${Math.round(counts.soldOut / total * 100)} % Sold out`}</p>
        {total ? <NightColumns rows={[
          ['Sold out', 'Ticket Tailor', counts.soldOut, 'bg-[#f2e8ce]'],
          ['Gut besucht', 'Ab 45 Gästen', counts.busy, 'bg-[#42675a]'],
          ['Halb voll', '25–44 Gäste', counts.half, 'bg-[#9eb7a6]'],
          ['Ruhig', 'Bis 24 Gäste', counts.quiet, 'bg-[#dce3dd]'],
        ]}/> : <p className="mt-3 text-sm">Keine abgeschlossenen Abende für diesen Monat vorhanden.</p>}
        {counts.unclear > 0 && <small>Gästezahl ungeklärt · {counts.unclear}</small>}
        <MonthDetails feed={data} monthLabel={label} current={month === current}/>
      </>}
    </div>
  </section>;
}
