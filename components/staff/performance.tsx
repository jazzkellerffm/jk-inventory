"use client";
import { BookingLead } from "./booking-lead";
import { serviceDate } from "@/lib/staff/service-day";
import { TicketPurchaseMonitor } from "./ticket-activity";
import { TicketLoader } from "./ticket-loader";
import {useState} from "react";
import { ticketCategories } from "@/lib/staff/entitlements";
import {ticketDay,weekDay} from "@/lib/staff/ticket-weeks";
import type {TicketFeed} from "@/lib/staff/tickets";

const eventDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit",
});

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

export function Performance({feed,example,state,refreshing}:{feed:TicketFeed|null;example:boolean;state:string;refreshing:boolean}){
  const [week,setWeek]=useState(0);
  const [opened,setOpened]=useState(false);
  const [eventLimit, setEventLimit] = useState(5);
  const now=feed?.asOf??Date.now()/1000;
  const nights=feed?.nights.filter(n=>ticketDay(n.start)>=weekDay(now,week*7) && ticketDay(n.start)<weekDay(now,week*7+7))??[];
  const total=nights.reduce((a,n)=>a+n.guests,0), recent=nights.reduce((a,n)=>a+n.recent,0);
  const ranked = feed?.nights
    .filter(night => night.start > now && night.guests > 0)
    .sort((a, b) => b.guests - a.guests || a.start - b.start)
    .slice(0, 15) ?? [];
  const limits = [5, 10, 15].filter(limit => limit === 5 || ranked.length > limit - 5);
  const visibleLimit = Math.min(eventLimit, limits[limits.length - 1]);
  const categories = ticketCategories.map(label => ({ label, count: feed?.monthlyCategories?.[label] ?? 0 }))
    .filter(row => row.label !== "Weitere Tickets" || row.count > 0)
    .sort((a,b) => b.count - a.count);
  const highest = categories[0].count;
  const max=Math.max(1,...nights.map(n=>n.guests));
  const pct=total?Math.round(recent/total*100):0;
  if (!feed) return <details className="staff-panel perf-panel" id="performance">
    <summary>Venue Performance</summary>
    {state === "loading" || refreshing ? <TicketLoader label="Venue Performance wird geladen"/> :
      <p role="status">{state === "setup" ? "Ticket Tailor ist noch nicht verbunden." : "Verkaufsdaten derzeit nicht verfügbar."}</p>}
  </details>;
  const monthLabel = new Intl.DateTimeFormat("de-DE", {month:"long", year:"numeric", timeZone:"Europe/Berlin"}).format(feed.asOf * 1000);
  return <details className="staff-panel perf-panel" id="performance" onToggle={e=>setOpened(e.currentTarget.open)}><summary>Venue Performance</summary>
    <div className="service-switch week-switch" role="group" aria-label="Performance-Woche">{[0,1,2,3].map(i=><button key={i} type="button" aria-pressed={i===week} onClick={()=>setWeek(i)}>{i===0?"Aktuell":"+"+i+" Wo."}</button>)}</div>
    <p>{example?"Beispieldaten":"Ticket Tailor"} · {weekDay(now,week*7).split("-").reverse().join(".")}{refreshing && " · Wird aktualisiert …"}</p>
    {state === "unavailable" && !refreshing && <small>Letzte Aktualisierung fehlgeschlagen.</small>}
    {!nights.length ? <p>Keine Termine in dieser Woche.</p> :
    <div className="perf-grid"><section><h3>Gebuchte Gäste</h3><strong>{nights.some(n=>n.unknown)?"≥ ":""}{total}</strong>
      <div className="perf-bars">{nights.map(n=><div key={n.id} title={n.name}><b>{n.guests}</b><i style={{height:Math.max(2,n.guests/max*78)}}/><small>{new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",weekday:"short",day:"numeric"}).format(n.start*1000)}</small></div>)}</div></section>
      <section><h3>Neu in 24 Stunden</h3><div className="perf-ring" style={{background:`conic-gradient(var(--accent) ${pct}%, #dbe8df 0)`}}><b>{pct}%</b></div><p>{recent} von {total} gebuchten Gästen</p></section></div>}
    <TicketPurchaseMonitor activity={feed.ticketActivity}/>
    <BookingLead enabled={opened} example={example}/>
    {feed?.monthlyNights && <section className="mt-4 border-t border-[var(--line)] pt-4">
      <h3 className="font-bold">Abende im {new Intl.DateTimeFormat("de-DE", {month:"long"}).format(new Date(serviceDate(feed.asOf*1000)+"T12:00:00Z"))}</h3>
      <p className="text-sm text-[var(--muted)]">Abgeschlossene Abende · gebuchte Gäste</p>
      <NightColumns rows={[
          ["Sold out", "Ticket Tailor", feed.monthlyNights.soldOut, "bg-[#f2e8ce]"],
          ["Gut besucht", "Ab 45 Gästen", feed.monthlyNights.busy, "bg-[#42675a]"],
          ["Halb voll", "25–44 Gäste", feed.monthlyNights.half, "bg-[#9eb7a6]"],
          ["Ruhig", "Bis 24 Gäste", feed.monthlyNights.quiet, "bg-[#dce3dd]"],
       ]}/>
      {feed.monthlyNights.unclear > 0 && <small>Gästezahl ungeklärt · {feed.monthlyNights.unclear}</small>}
    </section>}
    {feed.monthlyGuests && <section className="mt-4 flex items-baseline justify-between gap-3 border-t border-[var(--line)] pt-4">
      <div>
        <h3 className="font-poly-bulky">Gebuchte Gäste im Monat</h3>
        <p className="text-sm text-[var(--muted)]">Alle Konzerttermine · {monthLabel}</p>
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
    {feed && <details className="mt-4 border-t border-[var(--line)] pt-4">
      <summary>Kommende Events im Vergleich</summary>
      {limits.length > 1 && <div className="service-switch" role="group" aria-label="Anzahl kommender Events">
        {limits.map(limit => <button key={limit} type="button" aria-pressed={visibleLimit === limit} onClick={() => setEventLimit(limit)}>Top {limit}</button>)}
      </div>}
      <p className="text-sm text-[var(--muted)]">Nach gebuchten Gästen · bis {eventDate.format(new Date(weekDay(now, 27) + "T12:00:00Z"))}</p>
      {ranked.length ? <ol className="mt-2 divide-y divide-[var(--line)]">
        {ranked.slice(0, visibleLimit).map((night, index) => <li key={night.id} className="grid grid-cols-[2ch_1fr_auto] items-center gap-3 py-2">
          <span className="text-[var(--muted)]">{index + 1}.</span>
          <div><b>{night.name}</b><small className="block text-[var(--muted)]">{eventDate.format(night.start * 1000)}</small></div>
          <b className="whitespace-nowrap">{night.unknown > 0 ? "≥ " : ""}{night.guests} {night.guests === 1 ? "Gast" : "Gäste"}</b>
        </li>)}
      </ol> : <p>Keine kommenden Events mit gezählten Gästen in diesem Zeitraum.</p>}
    </details>}
  </details>;
}
