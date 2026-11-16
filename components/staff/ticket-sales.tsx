"use client";

import { useEffect, useState } from "react";
import { Performance } from "./performance";
import { ServicePlan } from "./service-plan";
import { Ticket } from "lucide-react";
import type { TicketFeed } from "@/lib/staff/tickets";

import { serviceDate } from "@/lib/staff/service-day";
import {ticketDay,weekDay} from "@/lib/staff/ticket-weeks";

const date = new Intl.DateTimeFormat("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"Europe/Berlin"});
const clock = new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Berlin"});
const demo: TicketFeed = {foodPreorders:2,asOf:1794859200,monthlyCategories:{Club:54,"Club Plus":38,Premium:21,VIP:8,"Worldstar VIP":2,"Weitere Tickets":0},monthlyTables:{vip:8,worldstar:2},nights:Array.from({length:4},(_,week)=>["Jazz Jam Session","New York Jazz Bar","Friday Quartet","Saturday Trio","Swingin’ Sunday"].map((name,i)=>({
  id:String(week*5+i),name,start:1795028400+(week*7+i)*86400,guests:[26,18,42,52,60][i],recent:[4,2,8,5,0][i],drinks:[12,6,18,24,20][i],unknown:0,
}))).flat()};

export function useTicketFeed(example:boolean) {
  const [feed,setFeed] = useState<TicketFeed|null>(example ? demo : null);
  const [state,setState] = useState("loading");
  useEffect(()=>{
    if (example) return;
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const res = await fetch("/api/staff/tickets",{cache:"no-store",signal:controller.signal});
        if (res.status === 401) { window.location.replace("/staff"); return; }
        if (!res.ok) throw new Error();
        const result = await res.json();
        if (!controller.signal.aborted) { setFeed(result.feed ?? null); setState(result.state); }
      } catch { if (!controller.signal.aborted) setState("unavailable"); }
      finally { busy = false; }
    }
    void refresh();
    const timer = setInterval(refresh,60000);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[example]);
  return {feed,state};
}

type Props = ReturnType<typeof useTicketFeed> & {example:boolean};

export function NightDrinks({example,feed,state,today}:Props & {today: string}) {
  const [selection,setSelection] = useState("");
  const upcoming = (feed?.nights ?? []).filter(n=>ticketDay(n.start)>=today);
  const days = [...new Set(upcoming.map(n=>ticketDay(n.start)))];
  const selected = days.includes(selection) ? selection : days[0];
  const events = upcoming.filter(n=>ticketDay(n.start)===selected);
  const period = selected===today ? "Heute Abend" : selected && selected===days[0] ? "Nächster Abend" : "Vorschau";
  return <section className="staff-panel service-drinks" aria-labelledby="night-drinks">
    <div className="staff-section-head"><span className="staff-eyebrow">{period} · Ticket Tailor</span>
      <small>{example ? "Beispieldaten" : feed ? "Stand "+clock.format(feed.asOf*1000)+" Uhr" : ""}</small></div>
    <h2 id="night-drinks">Included Drinks</h2>
    {days.length>1 && <label className="drinks-date">Abend auswählen
      <select value={selected} onChange={e=>setSelection(e.target.value)}>{days.map(key=>
        <option key={key} value={key}>{date.format(new Date(key+"T12:00:00Z"))}</option>)}</select></label>}
    {events.length>0 && <p>{days.length===1 && date.format(events[0].start*1000)+" · "}{events.map(n=>n.name).join(" · ")}</p>}
    <strong>{events.length ? events.reduce((sum,n)=>sum+n.drinks,0) : "–"}</strong>
    <p>{events.length ? "Mit Club Plus und Premium gebuchte Drinks" : feed ? "Keine kommenden Termine." : state==="setup" ? "Ticket Tailor ist noch nicht verbunden." : state==="loading" ? "Termine werden geladen …" : ""}</p>
    {state === "unavailable" && <small>Aktualisierung fehlgeschlagen.</small>}
  </section>;
}

export function TicketSales({example,feed,state}:Props) {
  const [week,setWeek]=useState(0);
  const asOf=feed?.asOf ?? Math.floor(Date.now()/1000);
  const start=weekDay(asOf,week*7), end=weekDay(asOf,week*7+7);
  const nights=(feed?.nights ?? []).filter(n=>ticketDay(n.start)>=start && ticketDay(n.start)<end);
  const today=serviceDate(asOf*1000);
  const upcoming=(feed?.nights ?? []).filter(n=>ticketDay(n.start)>=today);
  const scale = Math.max(60,...(feed?.nights.map(n=>n.guests) ?? []));
  return <><section className="staff-panel ticket-sales" aria-labelledby="ticket-title">
    <div className="staff-section-head"><span className="staff-eyebrow"><Ticket size={16}/> Ticket Tailor</span>
      <span className="staff-period">{example ? "Beispieldaten" : feed ? "Stand "+clock.format(feed.asOf*1000)+" Uhr" : "Vorverkauf"}</span></div>
    <h2 id="ticket-title">Gebuchte Gäste</h2>
    <div className="service-switch week-switch" role="group" aria-label="Verkaufswoche">{[0,1,2,3].map(i=>
      <button key={i} type="button" aria-pressed={week===i} onClick={()=>setWeek(i)}>{i===0 ? "Aktuell" : "Woche "+(i+1)}</button>)}</div>
    <p className="ticket-week-range">{date.format(new Date(start+"T12:00:00Z"))} – {date.format(new Date(weekDay(asOf,week*7+6)+"T12:00:00Z"))}</p>
    {state === "unavailable" && <p role="status">Ticket Tailor ist gerade nicht erreichbar.</p>}
    {nights.length ? <>
      <ul className="ticket-chart">{nights.map(n => <li key={n.id} className="ticket-night">
        <div className="ticket-event"><b>{date.format(n.start * 1000)}</b><span>{n.name}</span></div>
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
      <p>{feed ? "Keine Veranstaltungen in dieser Woche." : state === "setup" ? "Ticket Tailor ist noch nicht verbunden." : state === "loading" ? "Ticketverkauf wird geladen …" : ""}</p>}
  </section>
  <Performance feed={feed} example={example}/>
  <ServicePlan nights={feed?.nights ?? []} defaultId={upcoming[0]?.id} example={example}/></>;
}
