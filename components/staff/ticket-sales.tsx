"use client";

import { useEffect, useState } from "react";
import { ServicePlan } from "./service-plan";
import { Ticket } from "lucide-react";
import type { TicketFeed } from "@/lib/staff/tickets";

const date = new Intl.DateTimeFormat("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"Europe/Berlin"});
const clock = new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Berlin"});
const demo: TicketFeed = {asOf:1794690000,nights:["Jazz Jam Session","New York Jazz Bar","Friday Quartet","Saturday Trio","Swingin’ Sunday"].map((name,i)=>({
  id:String(i),name,start:1795028400+i*86400,guests:[26,18,42,52,60][i],recent:[4,2,8,5,0][i],drinks:[12,6,18,24,20][i],unknown:0,
}))};

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

export function NightDrinks({example,feed,state}:Props) {
  const berlinDay = new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin"});
  const today = berlinDay.format(example ? demo.nights[0].start * 1000 : Date.now());
  const tonight = feed?.nights.filter(n => berlinDay.format(n.start * 1000) === today);
  return <section className="staff-panel service-drinks" aria-labelledby="night-drinks">
    <div className="staff-section-head"><span className="staff-eyebrow">Heute Abend · Ticket Tailor</span>
      <small>{example ? "Beispieldaten" : feed ? "Stand "+clock.format(feed.asOf*1000)+" Uhr" : ""}</small></div>
    <h2 id="night-drinks">Included Drinks</h2>
    <strong>{tonight ? tonight.reduce((sum,n)=>sum+n.drinks,0) : "–"}</strong>
    <p>{tonight?.length === 0 ? "Heute ist kein Termin eingetragen." : "Mit Club Plus und Premium gebuchte Drinks"}</p>
    {state === "unavailable" && <small>Aktualisierung fehlgeschlagen.</small>}
  </section>;
}

export function TicketSales({example,feed,state}:Props) {
  const scale = Math.max(60,...(feed?.nights.map(n=>n.guests) ?? []));
  return <><section className="staff-panel ticket-sales" aria-labelledby="ticket-title">
    <div className="staff-section-head"><span className="staff-eyebrow"><Ticket size={16}/> Ticket Tailor</span>
      <span className="staff-period">{example ? "Beispieldaten" : feed ? "Stand "+clock.format(feed.asOf*1000)+" Uhr" : "Vorverkauf"}</span></div>
    <h2 id="ticket-title">Gebuchte Gäste</h2>
    {state === "unavailable" && <p role="status">Ticket Tailor ist gerade nicht erreichbar.</p>}
    {feed?.nights.length ? <>
      <ul className="ticket-chart">{feed.nights.map(n => <li key={n.id} className="ticket-night">
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
      <p>{feed ? "Keine kommenden Termine." : state === "setup" ? "Ticket Tailor ist noch nicht verbunden." : state === "loading" ? "Ticketverkauf wird geladen …" : ""}</p>}
  </section><ServicePlan nights={feed?.nights ?? []} example={example}/></>;
}
