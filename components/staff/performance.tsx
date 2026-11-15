"use client";
import {useState} from "react";
import {ticketDay,weekDay} from "@/lib/staff/ticket-weeks";
import type {TicketFeed} from "@/lib/staff/tickets";

export function Performance({feed,example}:{feed:TicketFeed|null;example:boolean}){
  const [week,setWeek]=useState(0);
  const now=feed?.asOf??Date.now()/1000;
  const nights=feed?.nights.filter(n=>ticketDay(n.start)>=weekDay(now,week*7) && ticketDay(n.start)<weekDay(now,week*7+7))??[];
  const total=nights.reduce((a,n)=>a+n.guests,0), recent=nights.reduce((a,n)=>a+n.recent,0);
  const max=Math.max(1,...nights.map(n=>n.guests));
  const pct=total?Math.round(recent/total*100):0;
  return <details className="staff-panel perf-panel" id="performance"><summary>Venue Performance</summary>
    <div className="service-switch week-switch" role="group" aria-label="Performance-Woche">{[0,1,2,3].map(i=><button key={i} type="button" aria-pressed={i===week} onClick={()=>setWeek(i)}>{i===0?"Aktuell":"Woche "+(i+1)}</button>)}</div>
    <p>{example?"Beispieldaten":"Ticket Tailor"} · {weekDay(now,week*7).split("-").reverse().join(".")}</p>
    {!feed || !nights.length ? <p>{feed?"Keine Termine in dieser Woche.":"Verkaufsdaten derzeit nicht verfügbar."}</p> :
    <div className="perf-grid"><section><h3>Gebuchte Gäste</h3><strong>{nights.some(n=>n.unknown)?"≥ ":""}{total}</strong>
      <div className="perf-bars">{nights.map(n=><div key={n.id} title={n.name}><b>{n.guests}</b><i style={{height:Math.max(2,n.guests/max*78)}}/><small>{new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",weekday:"short",day:"numeric"}).format(n.start*1000)}</small></div>)}</div></section>
      <section><h3>Neu in 24 Stunden</h3><div className="perf-ring" style={{background:`conic-gradient(#b97881 ${pct}%, #dbe8df 0)`}}><b>{pct}%</b></div><p>{recent} von {total} gebuchten Gästen</p></section></div>}
  </details>;
}
