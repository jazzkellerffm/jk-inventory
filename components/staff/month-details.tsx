import { ticketCategories } from '@/lib/staff/entitlements';
import type { MonthSummary } from '@/lib/staff/tickets';
type ChartRow = [label: string, hint: string, count: number, tone: string];

function MonthlyBars({rows}: {rows: ChartRow[]}) {
  const total = rows.reduce((sum, [, , count]) => sum + count, 0);
  return <dl className="mt-3 space-y-3">
    {rows.map(([label, hint, count, tone]) => <div key={label} className="grid grid-cols-[1fr_auto] items-baseline gap-x-2 gap-y-1">
      <dt className="flex flex-wrap items-baseline gap-x-2">
        <b>{label}</b>{hint && <small className="text-[var(--muted)]">{hint}</small>}
      </dt>
      <dd className="font-bold tabular-nums">{count}</dd>
      <div aria-hidden="true" className="col-span-2 h-2 overflow-hidden rounded-full bg-black/[0.035]">
        <div className={tone + " h-full rounded-full"} style={{width: (total ? 100 * count / total : 0) + "%"}}/>
      </div>
    </div>)}
  </dl>;
}

export function MonthDetails({feed, monthLabel, current}: {feed: MonthSummary; monthLabel: string; current: boolean}) {
  const categories = ticketCategories.map(label => ({ label, count: feed?.monthlyCategories?.[label] ?? 0 }))
    .filter(row => row.label !== "Weitere Tickets" || row.count > 0)
    .sort((a,b) => b.count - a.count);
  const highest = categories[0].count;
  return <>
    {feed.monthlyGuests && <section className="mt-4 flex items-baseline justify-between gap-3 border-t border-[var(--line)] pt-4">
      <div>
        <h3 className="font-poly-bulky">Gebuchte Gäste im Monat</h3>
        <p className="text-sm text-[var(--muted)]">Alle Konzerttermine · {monthLabel}{current && " · inklusive kommender Termine"}</p>
        {feed.monthlyGuests.unknownPackages > 0 && <small className="text-[var(--muted)]">
          {feed.monthlyGuests.unknownPackages === 1 ? "1 Ticketpaket ohne Gästezahl" : feed.monthlyGuests.unknownPackages + " Ticketpakete ohne Gästezahl"}
        </small>}
      </div>
      <strong className="perf-monthly-guests-value shrink-0 whitespace-nowrap">
        {feed.monthlyGuests.unknownPackages > 0 && "≥ "}{feed.monthlyGuests.count.toLocaleString("de-DE")}
      </strong>
    </section>}
    {feed?.monthlyTables && <section className="mt-4 border-t border-[var(--line)] pt-4">
      <h3 className="font-bold">VIP-Tische · {monthLabel}</h3>
      <MonthlyBars rows={[
        ["VIP", "", feed.monthlyTables.vip, "bg-[#dbe8df]"],
        ["Worldstar VIP", "", feed.monthlyTables.worldstar, "bg-[#f4e3e3]"],
      ]}/>
      <p className="mt-2 text-sm text-[var(--muted)]">Gebuchte Tische für Veranstaltungen in diesem Monat</p>
    </section>}
    {feed?.monthlyCategories && <details className="mt-4 border-t border-[var(--line)] pt-4">
      <summary>Ticketkategorien im Vergleich</summary>
      <p className="text-sm text-[var(--muted)]">{monthLabel} · Gebuchte Ticketpakete</p>
      {highest ? <ol className="mt-3 space-y-3">{categories.map(({label,count}) =>
        <li key={label}>
          <div className="flex items-baseline justify-between gap-3"><b>{label}</b><b className="tabular-nums">{count}</b></div>
          <div aria-hidden="true" className="mt-1 h-3 overflow-hidden rounded-full bg-[#e8eeea]">
            <div className="ticket-fill" style={{width:count / highest * 100 + "%"}}/>
          </div>
        </li>)}</ol> : <p>Noch keine gebuchten Ticketpakete für diesen Monat.</p>}
    </details>}
  </>;
}
