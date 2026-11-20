"use client";
import { BookingLead } from "./booking-lead";
import { NightHistory } from "./night-history";
import { TicketPurchaseMonitor } from "./ticket-activity";
import { TicketLoader } from "./ticket-loader";
import {useState} from "react";
import {ticketDay,weekDay} from "@/lib/staff/ticket-weeks";
import type {TicketFeed} from "@/lib/staff/tickets";

const eventDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit",
});

export function Performance({feed,example,state,refreshing}:{feed:TicketFeed|null;example:boolean;state:string;refreshing:boolean}){
  const [week,setWeek]=useState(0);
  const [opened,setOpened]=useState(false);
  const [eventLimit, setEventLimit] = useState(5);
  const [initialNow] = useState(() => Date.now()/1000);
  const now=feed?.asOf??initialNow;
  const nights=feed?.nights.filter(n=>ticketDay(n.start)>=weekDay(now,week*7) && ticketDay(n.start)<weekDay(now,week*7+7))??[];
  const total=nights.reduce((a,n)=>a+n.guests,0), recent=nights.reduce((a,n)=>a+n.recent,0);
  const ranked = feed?.nights
    .filter(night => night.start > now && night.guests > 0)
    .sort((a, b) => b.guests - a.guests || a.start - b.start)
    .slice(0, 15) ?? [];
  const limits = [5, 10, 15].filter(limit => limit === 5 || ranked.length > limit - 5);
  const visibleLimit = Math.min(eventLimit, limits[limits.length - 1]);
  const max=Math.max(1,...nights.map(n=>n.guests));
  const pct=total?Math.round(recent/total*100):0;
  if (!feed) return <details className="staff-panel perf-panel" id="performance" onToggle={e=>setOpened(e.currentTarget.open)}>
    <summary>Venue Performance</summary>
    {state === "loading" || refreshing ? <TicketLoader label="Venue Performance wird geladen"/> :
      <p role="status">{state === "setup" ? "Ticket Tailor ist noch nicht verbunden." : "Verkaufsdaten derzeit nicht verfügbar."}</p>}
  </details>;
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
    <NightHistory feed={feed} enabled={opened} example={example}/>
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
