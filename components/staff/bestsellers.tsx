"use client";

import { TicketLoader } from "./ticket-loader";

import { useEffect, useState } from "react";
import { ChartBar, ChevronDown, Martini } from "lucide-react";
import { bestsellerStart, type BestsellerPeriod } from "@/lib/staff/bestseller-period";
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

export function Bestsellers({example,category="all"}:{example:boolean;category?:"all"|"cocktails"}) {
  const [cocktailsOpen,setCocktailsOpen]=useState(false);
  const [period,setPeriod]=useState<BestsellerPeriod>("evening");
  const [limit,setLimit]=useState(3);
  const [feed,setFeed]=useState<BestsellerFeed|null>(example ? demoFeed("evening") : null);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(!example);
  useEffect(()=>{
    setMessage("");
    if(example) {setFeed(demoFeed(period));return;}
    setFeed(null);
    const controller=new AbortController();
    let busy=false;
    async function refresh(){
      if(busy || document.hidden) return;
      busy=true;
      setLoading(true);
      try {
        const res=await fetch("/api/staff/bestsellers?period="+period+"&category="+category,{cache:"no-store",signal:controller.signal});
        if(res.status===401){window.location.replace("/staff");return;}
        if(!res.ok) throw new Error();
        const data=await res.json();
        if(!controller.signal.aborted){
          setFeed(data.feed ?? null);
          setMessage(data.state==="setup" ? "SumUp ist noch nicht verbunden." : "");
        }
      } catch {if(!controller.signal.aborted)setMessage("Aktualisierung fehlgeschlagen.");}
      finally {busy=false;if(!controller.signal.aborted)setLoading(false);}
    }
    void refresh();
    const timer=setInterval(refresh,60000);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[example,period,category]);
  return <section id="bestseller" className="staff-panel staff-bestsellers">
    <div className="staff-section-head"><span className="staff-eyebrow"><ChartBar size={16}/> SumUp</span>
      <small>{example ? "Beispieldaten" : loading && feed ? "Wird aktualisiert …" : feed ? "Stand "+clock.format(Date.parse(feed.asOf))+" Uhr" : ""}</small></div>
    <h2>{category==="cocktails" ? (period==="evening"?"Cocktail-Bestseller des Abends":period==="week"?"Cocktail-Bestseller der Woche":"Cocktail-Bestseller des Monats") : titles[period]}</h2>
    <div className="bestseller-controls">
      <select aria-label="Zeitraum der Bestseller" value={period} onChange={event=>{
        const next=event.target.value as BestsellerPeriod;
        setFeed(example?demoFeed(next):null);setMessage("");setLoading(!example);setPeriod(next);
      }}>{periods.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select>
      <div className="service-switch" role="group" aria-label="Anzahl Bestseller">{[3,5,10].map(n=>
        <button key={n} type="button" aria-pressed={limit===n} onClick={()=>setLimit(n)}>Top {n}</button>)}</div>
    </div>
    <p className="bestseller-period">{feed ? dates.format(bestsellerStart(Date.parse(feed.asOf),period))+" – "+dates.format(Date.parse(feed.asOf)) : "Zeitraum wird geladen"}</p>
    {!example && !feed && loading && !message && <TicketLoader label="Artikel werden geladen"/>}
    {feed && !feed.incomplete && <ol>{feed.products.slice(0,limit).map((p,i)=><li key={p.name}>
      <span>{i+1}</span><div><b>{p.name}</b><div className="best-track"><i style={{width:feed.products[0].quantity>0?100*p.quantity/feed.products[0].quantity+"%":"0%"}}/></div></div><strong>{p.quantity} ×</strong>
    </li>)}</ol>}
    {feed && !feed.products.length && !feed.incomplete && <p>In diesem Zeitraum noch keine zugeordneten Artikel verkauft.</p>}
    {!example && message && <p role="status">{message}</p>}
    {!!feed?.incomplete && <div className="bestseller-unavailable" role="status">
      <b>Für diesen Zeitraum fehlt eine verlässliche Artikelübersicht.</b>
      <p>{category==="cocktails" ? "Bei einzelnen Zahlungen fehlen verlässliche Produktkategorien oder Stückzahlen. Deshalb zeigen wir keine möglicherweise falsche Cocktail-Rangliste." : `Bei ${feed.incomplete} Zahlungen fehlen eindeutige Artikel oder Stückzahlen. Deshalb zeigen wir hier keine Rangliste.`}</p>
    </div>}
    {!!feed?.excluded && !feed.incomplete && <small>Freie Zahlungen ohne zugeordneten Artikel sind nicht enthalten.</small>}
    <small>Verkaufte Stückzahl · Tageswechsel 03:00 Uhr</small>
    {category==="all" && <div className="bestseller-cocktail-section"><button type="button" className="bestseller-cocktail-toggle" aria-expanded={cocktailsOpen} onClick={()=>setCocktailsOpen(value=>!value)}><span><Martini size={18} aria-hidden="true"/> Cocktail-Bestseller <small>Cocktails + Mocktails</small></span><ChevronDown size={20} aria-hidden="true"/></button>{cocktailsOpen && <Bestsellers example={example} category="cocktails" />}</div>}
    {category==="all" && <CocktailCounter example={example}/>}
  </section>;
}

function CocktailCounter({example}:{example:boolean}){
  const [counts,setCounts]=useState<{sumup:number;included:number}|null>(example?{sumup:29,included:19}:null);
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    if(example)return;
    const controller=new AbortController();
    async function refresh(){
      try{
        const responses=await Promise.all([
          fetch("/api/staff/bestsellers?period=evening&category=cocktails",{cache:"no-store",signal:controller.signal}),
          fetch("/api/staff/included-bestsellers?period=evening",{cache:"no-store",signal:controller.signal})
        ]);
        if(responses.some(r=>r.status===401)){window.location.replace("/staff");return;}
        if(responses.some(r=>!r.ok))throw new Error();
        const [sumup,included]=await Promise.all(responses.map(r=>r.json()));
        if(sumup.feed?.incomplete||included.feed?.incomplete||typeof sumup.feed?.totalQuantity!=="number"||typeof included.feed?.cocktailTotal!=="number")throw new Error();
        if(!controller.signal.aborted){setCounts({sumup:sumup.feed.totalQuantity,included:included.feed.cocktailTotal});setUnavailable(false);}
      }catch{if(!controller.signal.aborted){setCounts(null);setUnavailable(true);}}
    }
    void refresh();
    const timer=setInterval(refresh,60000);
    return()=>{controller.abort();clearInterval(timer);};
  },[example]);
  const total=(counts?.sumup??0)+(counts?.included??0);
  return <div className="cocktail-counter" aria-label="Cocktail Counter des Abends">
    <div className="cocktail-counter-label"><Martini size={16}/> HEUTE BESTELLT</div>
    {counts?<><div className="cocktail-counter-number"><strong>{total}</strong><span>Cocktails &amp; Mocktails</span></div>
      <div className="cocktail-counter-bars" aria-hidden="true">
        <i style={{flex:counts.sumup||0.001}}/><i style={{flex:counts.included||0.001}}/>
      </div>
      <div className="cocktail-counter-sources"><span>SumUp {counts.sumup}</span><span>Included {counts.included}</span></div>
    </>:<p className="cocktail-counter-pending">{unavailable?"Zählung derzeit nicht vollständig verfügbar.":"Cocktails werden gezählt …"}</p>}
    <small>Erfasste Bestellungen · Tageswechsel 03:00 Uhr</small>
  </div>;
}
