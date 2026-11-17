"use client";

import { useEffect, useState } from "react";
import { ChartBar } from "lucide-react";
import { bestsellerStart, defaultBestsellerPeriod, type BestsellerPeriod } from "@/lib/staff/bestseller-period";
import type { BestsellerFeed } from "@/lib/staff/types";

const sample:BestsellerFeed={
  asOf:"2026-11-14T21:00:00Z",incomplete:0,
  products:["Pils","Caipirinha","Mineralwasser","Gin Tonic","Weißwein","Negroni","Espresso Martini","Paloma","Espresso","Whisky Sour"]
    .map((name,i)=>({name,quantity:[32,25,19,17,14,12,9,7,5,3][i]})),
};
const clock=new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"});

const titles = { evening: "Bestseller des Abends", week: "Bestseller der Woche", month: "Bestseller des Monats" };
const dates = new Intl.DateTimeFormat("de-DE", {timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit"});
const periods: {id:BestsellerPeriod;label:string}[] = [
  {id:"evening",label:"Abend"}, {id:"week",label:"Woche"}, {id:"month",label:"Monat"},
];
function demoFeed(period:BestsellerPeriod):BestsellerFeed {
  const factor = period === "month" ? 12 : period === "week" ? 3 : 1;
  return {...sample,products:sample.products.map(p=>({...p,quantity:p.quantity*factor}))};
}

export function Bestsellers({example}:{example:boolean}) {
  const [period,setPeriod]=useState<BestsellerPeriod>("week");
  const [initialized,setInitialized]=useState(false);
  useEffect(()=>{setPeriod(defaultBestsellerPeriod(Date.now()));setInitialized(true);},[]);
  const [limit,setLimit]=useState(3);
  const [feed,setFeed]=useState<BestsellerFeed|null>(example ? demoFeed("week") : null);
  const [message,setMessage]=useState("Verkäufe werden geladen …");
  useEffect(()=>{
    if(!initialized) return;
    setMessage("Verkäufe werden geladen …");
    if(example) {setFeed(demoFeed(period));return;}
    setFeed(null);
    const controller=new AbortController();
    let busy=false;
    async function refresh(){
      if(busy || document.hidden) return;
      busy=true;
      try {
        const res=await fetch("/api/staff/bestsellers?period="+period,{cache:"no-store",signal:controller.signal});
        if(res.status===401){window.location.replace("/staff");return;}
        if(!res.ok) throw new Error();
        const data=await res.json();
        if(!controller.signal.aborted){
          setFeed(data.feed ?? null);
          setMessage(data.state==="setup" ? "SumUp ist noch nicht verbunden." : "");
        }
      } catch {if(!controller.signal.aborted)setMessage("Aktualisierung fehlgeschlagen.");}
      finally {busy=false;}
    }
    void refresh();
    const timer=setInterval(refresh,60000);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[example,period,initialized]);
  return <section id="bestseller" className="staff-panel staff-bestsellers">
    <div className="staff-section-head"><span className="staff-eyebrow"><ChartBar size={16}/> SumUp</span>
      <small>{example ? "Beispieldaten" : feed ? "Stand "+clock.format(Date.parse(feed.asOf))+" Uhr" : ""}</small></div>
    <h2>{titles[period]}</h2>
    <div className="service-switch" role="group" aria-label="Zeitraum der Bestseller">{periods.map(p=>
      <button key={p.id} type="button" aria-pressed={period===p.id} onClick={()=>{setFeed(example?demoFeed(p.id):null);setPeriod(p.id);}}>{p.label}</button>)}</div>
    <p>{feed ? dates.format(bestsellerStart(Date.parse(feed.asOf),period))+" – "+dates.format(Date.parse(feed.asOf))+" · Tageswechsel 03:00 Uhr" : "Tageswechsel 03:00 Uhr"}</p>
    <div className="service-switch" role="group" aria-label="Anzahl Bestseller">{[3,5,10].map(n=>
      <button key={n} type="button" aria-pressed={limit===n} onClick={()=>setLimit(n)}>Top {n}</button>)}</div>
    {feed && <ol>{feed.products.slice(0,limit).map((p,i)=><li key={p.name}>
      <span>{i+1}</span><div><b>{p.name}</b><div className="best-track"><i style={{width:100*p.quantity/feed.products[0].quantity+"%"}}/></div></div><strong>{p.quantity} ×</strong>
    </li>)}</ol>}
    {feed && !feed.products.length && !feed.incomplete && <p>In diesem Zeitraum noch keine Artikel verkauft.</p>}
    {!example && message && <p role="status">{message}</p>}
    {!!feed?.incomplete && <p>{feed.incomplete} Beleg(e) ohne vollständige Artikeldaten.</p>}
    <small>Verkaufte Stückzahl</small>
  </section>;
}
