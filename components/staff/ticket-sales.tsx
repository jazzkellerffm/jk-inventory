"use client";

import { useEffect, useState } from "react";
import { TicketLoader } from "./ticket-loader";
import { Performance } from "./performance";
import { ServicePlan } from "./service-plan";
import { Ticket } from "lucide-react";
import type { TicketFeed } from "@/lib/staff/tickets";

import { ticketCategory, packageSize, includedDrinks } from "@/lib/staff/entitlements";
import { serviceDate } from "@/lib/staff/service-day";
import {ticketDay,weekDay} from "@/lib/staff/ticket-weeks";

const date = new Intl.DateTimeFormat("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"Europe/Berlin"});
const clock = new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Berlin"});
const demoHours = [
  [[10, 2], [17, 3], [20, 4]], [[12, 2], [18, 5]], [[11, 3], [17, 4], [20, 5]],
  [[10, 2], [18, 3], [20, 1]], [[12, 4], [18, 7], [20, 5]], [[16, 4], [19, 5]],
  [[11, 1], [16, 2], [18, 1], [20, 3]],
];
const demo: TicketFeed = {ticketActivity: {
  asOf: 1794859200,
  days: demoHours.map((sales, index) => {
    const hours = Array<number>(24).fill(0);
    for (const [hour, quantity] of sales) hours[hour] = quantity;
    return { date: "2026-11-" + (10 + index), hours };
  }),
},bookingDay:{count:6,recent:[
  {id:"demo-a",at:1794859140,lines:[{ticket:"Worldstar VIP · 2 Gäste",event:"Saturday Trio",date:"2026-11-21"}]},
  {id:"demo-b",at:1794856200,lines:[{ticket:"Premium · 2 Gäste",event:"New York Jazz Bar",date:"2026-11-19"}]},
  {id:"demo-c",at:1794850500,lines:[{ticket:"Club · 1 Guest",event:"Jazz Jam Session",date:"2026-11-18"}]},
  {id:"demo-d",at:1794846900,lines:[{ticket:"Club Plus · 3 Gäste",event:"Friday Quartet",date:"2026-11-20"}]},
]},monthlyGuests:{count:812,unknownPackages:0},monthlyNights:{soldOut:2,busy:4,half:3,quiet:1,unclear:0},foodPreorders:2,asOf:1794859200,monthlyCategories:{Club:164,"Club Plus":83,Premium:62,VIP:8,"Worldstar VIP":2,"Weitere Tickets":0},monthlyTables:{vip:8,worldstar:2},nights:Array.from({length:4},(_,week)=>["Jazz Jam Session","New York Jazz Bar","Friday Quartet","Saturday Trio","Swingin’ Sunday"].map((name,i)=>({
  soldOut:week===0 && i===4,id:String(week*5+i),name,start:1795028400+(week*7+i)*86400,guests:[26,18,42,52,60][i],recent:[4,2,8,5,0][i],drinks:[12,6,18,24,20][i],unknown:0,
}))).flat()};

export function useTicketFeed(example:boolean) {
  const [feed,setFeed] = useState<TicketFeed|null>(example ? demo : null);
  const [refreshing,setRefreshing] = useState(false);
  const [state,setState] = useState("loading");
  useEffect(()=>{
    if (example) return;
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      setRefreshing(true);
      try {
        const res = await fetch("/api/staff/tickets",{cache:"no-store",signal:controller.signal});
        if (res.status === 401) { window.location.replace("/staff"); return; }
        if (!res.ok) throw new Error();
        const result = await res.json();
        if (!controller.signal.aborted) { setFeed(result.feed ?? null); setState(result.state); }
      } catch { if (!controller.signal.aborted) setState("unavailable"); }
      finally { busy = false; if (!controller.signal.aborted) setRefreshing(false); }
    }
    void refresh();
    const timer = setInterval(refresh,60000);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[example]);
  return {feed,state,refreshing};
}

type Props = ReturnType<typeof useTicketFeed> & {example:boolean};

export function NightDrinks({example,feed,state,refreshing,today}:Props & {today: string}) {
  const [selection,setSelection] = useState("");
  const upcoming = (feed?.nights ?? []).filter(n=>ticketDay(n.start)>=today);
  const days = [...new Set(upcoming.map(n=>ticketDay(n.start)))];
  const selected = days.includes(selection) ? selection : days[0];
  const events = upcoming.filter(n=>ticketDay(n.start)===selected);
  const period = selected===today ? "Heute Abend" : selected && selected===days[0] ? "Nächster Abend" : "Vorschau";
  return <section className="staff-panel service-drinks" aria-labelledby="night-drinks">
    <div className="staff-section-head"><span className="staff-eyebrow">{period} · Ticket Tailor</span>
      <small>{example ? "Beispieldaten" : refreshing && feed ? "Wird aktualisiert …" : feed ? "Stand "+clock.format(feed.asOf*1000)+" Uhr" : ""}</small></div>
    <h2 id="night-drinks">Included Drinks</h2>
    {days.length>1 && <label className="drinks-date">Abend auswählen
      <select value={selected} onChange={e=>setSelection(e.target.value)}>{days.map(key=>
        <option key={key} value={key}>{date.format(new Date(key+"T12:00:00Z"))}</option>)}</select></label>}
    {events.length>0 && <p>{days.length===1 && date.format(events[0].start*1000)+" · "}{events.map(n=>n.name).join(" · ")}</p>}
    {!feed && state==="loading" ? <TicketLoader label="Termine werden geladen"/> : <><strong>{events.length ? events.reduce((sum,n)=>sum+n.drinks,0) : "–"}</strong>
    <p>{events.length ? "Mit Club Plus und Premium gebuchte Drinks" : feed ? "Keine kommenden Termine." : state==="setup" ? "Ticket Tailor ist noch nicht verbunden." : ""}</p></>}
    {state === "unavailable" && <small>Aktualisierung fehlgeschlagen.</small>}
  </section>;
}

export function TicketSales({example,feed,state,refreshing,week,setWeek}:Props & {week: number; setWeek: (week: number) => void}) {
  const asOf=feed?.asOf ?? Math.floor(Date.now()/1000);
  const start=weekDay(asOf,week*7), end=weekDay(asOf,week*7+7);
  const nights=(feed?.nights ?? []).filter(n=>ticketDay(n.start)>=start && ticketDay(n.start)<end);
  const today=serviceDate(asOf*1000);
  const upcoming=(feed?.nights ?? []).filter(n=>ticketDay(n.start)>=today);
  const scale = Math.max(60,...(feed?.nights.map(n=>n.guests) ?? []));
  return <><section className="staff-panel ticket-sales" aria-labelledby="ticket-title">
    <div className="staff-section-head"><span className="staff-eyebrow"><Ticket size={16}/> Ticket Tailor</span>
      <span className="staff-period">{example ? "Beispieldaten" : refreshing && feed ? "Wird aktualisiert …" : feed ? "Stand "+clock.format(feed.asOf*1000)+" Uhr" : "Vorverkauf"}</span></div>
    <h2 id="ticket-title">Gebuchte Gäste</h2>
    <div className="service-switch week-switch" role="group" aria-label="Verkaufswoche">{[0,1,2,3].map(i=>
      <button key={i} type="button" aria-pressed={week===i} onClick={()=>setWeek(i)}>{i===0 ? "Aktuell" : "+"+i+" Wo."}</button>)}</div>
    <p className="ticket-week-range">{date.format(new Date(start+"T12:00:00Z"))} – {date.format(new Date(weekDay(asOf,week*7+6)+"T12:00:00Z"))}</p>
    {state === "unavailable" && <p role="status">Ticket Tailor ist gerade nicht erreichbar.</p>}
    {!feed && state === "loading" ? <TicketLoader label="Ticketverkauf wird geladen"/> : nights.length ? <>
      <ul className="ticket-chart">{nights.map(n => <li key={n.id} className="ticket-night">
        <div className="ticket-event"><b>{date.format(n.start * 1000)}{n.soldOut && <small className="sold-out-pill">Sold out</small>}</b><span>{n.name}</span></div>
        <div className="ticket-track" aria-hidden="true">
          <div className="ticket-fill" style={{width:100 * n.guests / scale + "%"}}>
            <i style={{width:(n.guests ? 100 * n.recent / n.guests : 0) + "%"}}/>
          </div>
        </div>
        <div className="ticket-figures"><strong>{n.unknown ? "≥ " : ""}{n.guests}</strong><small>{n.recent} neu</small></div>
        {n.unknown > 0 && <small className="ticket-uncertain">{n.unknown} Pakete ungeklärt</small>}
      </li>)}</ul>
      <p className="ticket-legend"><i aria-hidden="true"/> Neu gebuchte Gäste in den letzten 24 Stunden</p>
    </> :
      <p>{feed ? "Keine Veranstaltungen in dieser Woche." : state === "setup" ? "Ticket Tailor ist noch nicht verbunden." : ""}</p>}
    {feed && <BookingHistory day={feed.bookingDay}/>}
  </section>
  <Performance feed={feed} example={example} state={state} refreshing={refreshing}/>
  <ServicePlan state={state} nights={feed?.nights ?? []} defaultId={upcoming[0]?.id} example={example}/></>;
}

const concertMonth = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" });
const concertWeekday = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "Europe/Berlin" });

function BookingHistory({day}: {day: TicketFeed["bookingDay"]}) {
  return <section className="booking-history" aria-label="Buchungsübersicht">
    <div className="booking-history-heading"><b>Buchungen heute</b><strong>{day?.count ?? "–"}</strong></div>
    {day?.recent?.length ? <ul className="booking-history-rail" tabIndex={0} aria-label="Letzte Buchungen, neueste zuerst">
      {day.recent.map(record => <li key={record.id} className="booking-history-card">
        {record.lines.map((line, i) => {
          const first = record.lines.findIndex(other => other.eventId === line.eventId && other.event === line.event && other.date === line.date);
          if (first !== i) return null;
          const lines = record.lines.filter(other => other.eventId === line.eventId && other.event === line.event && other.date === line.date);
          const concert = line.date ? new Date(line.date + "T12:00:00Z") : null;
          return <div className="booking-history-event" key={i}>
            {concert && Number.isFinite(concert.getTime()) && <time className="booking-history-date" dateTime={line.date}>
              <b>{concert.getUTCDate()}</b><span>{concertWeekday.format(concert)}<small>{concertMonth.format(concert)} {concert.getUTCFullYear()}</small></span>
            </time>}
            <b className="booking-history-title">{line.event || "Konzert noch offen"}</b>
            <div className="booking-history-packages">{lines.map((item, index) => {
              const category = ticketCategory(item.ticket);
              const qty = Number(item.ticket.match(/^(\d+) × /)?.[1] ?? 1);
              const guests = packageSize(item.ticket) * qty;
              const drinks = includedDrinks(item.ticket) * qty;
              const detail = [guests && (guests === 1 ? "1 Gast" : guests + " Gäste"), drinks && (drinks === 1 ? "1 Drink" : drinks + " Drinks")].filter(Boolean).join(" · ");
              return <div className="booking-history-package" key={index}>
                <b>{category === "Weitere Tickets" ? item.ticket : (qty > 1 ? qty + " × " : "") + category}</b>
                {detail && <span>{detail}</span>}
              </div>;
            })}</div>
          </div>;
        })}
        <small className="booking-history-stamp">Gebucht am {date.format(record.at * 1000)} · {clock.format(record.at * 1000)} Uhr</small>
      </li>)}
    </ul> : <small>{day ? "Noch keine Ticketbuchung." : "Buchungen derzeit nicht abrufbar."}</small>}
  </section>;
}
