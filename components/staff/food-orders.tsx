"use client";

import { TicketLoader } from "./ticket-loader";
import { MaskedRevenue } from "./masked-revenue";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Popcorn, Utensils } from "lucide-react";
import type { FoodFeed } from "@/lib/staff/food";

import type { Payment } from "@/lib/staff/types";

const euro = new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"});
const time = new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"});
const demo: FoodFeed = {recentPortions:2, recentHummus:2, recentIncomplete:false, totalCents:5100, uncategorized:false,
  bestsellers:[{name:"Hummus-Platte",quantity:3},{name:"Bowl of Crisps",quantity:2}], orders:[
  {id:"one",at:"2026-11-18T20:54:00Z",description:"2 × Hummus-Platte",cents:3000},
  {id:"two",at:"2026-11-18T20:41:00Z",description:"1 × Hummus-Platte",cents:1500},
  {id:"three",at:"2026-11-18T20:20:00Z",description:"2 × Bowl of Crisps",cents:600},
]};

export function FoodOrders({example, eveningCents, preorders, onOrders, payments}:{
  payments?: Payment[];
  onOrders:(orders: FoodFeed["orders"])=>void; example:boolean; eveningCents?:number; preorders?:number|null;
}) {
  const [feed,setFeed] = useState<FoodFeed|null>(example ? demo : null);
  const [message,setMessage] = useState("");
  const [loading,setLoading] = useState(!example);
  const [rankingLimit,setRankingLimit] = useState<3|5>(3);
  const [analyticsOpen,setAnalyticsOpen] = useState(false);
  useEffect(()=>{
    if (example) return;
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      setLoading(true);
      try {
        const res = await fetch("/api/staff/food",{signal:controller.signal,cache:"no-store"});
        if (res.status === 401) { window.location.replace("/staff"); return; }
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!controller.signal.aborted) {
          setFeed(data.feed ?? null);
          if (data.feed) onOrders(data.feed.orders);
          setMessage(data.state === "setup" ? "SumUp ist noch nicht verbunden." : "");
        }
      } catch {
        if (!controller.signal.aborted) setMessage("Food Orders derzeit nicht abrufbar.");
      } finally { busy = false; if (!controller.signal.aborted) setLoading(false); }
    }
    void refresh();
    const timer = setInterval(refresh,15000);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{ controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange",refresh); };
  },[example,onOrders]);
  const paymentSnacks = (payments ?? []).flatMap(payment => {
    const labels = payment.items.length
      ? payment.items.map(item => item.name)
      : (payment.summary ?? "").split(/,\s*/);
    const snacks = labels.filter(label => /^(?:\d+\s*[x×]\s*)?(?:bowl of crisps|nachos con salsa)$/i.test(label.trim()));
    return snacks.length ? [{id:payment.id, at:payment.at, label:snacks.join(" · ")}] : [];
  });
  const share = feed && !message && eveningCents && eveningCents > 0 && feed.totalCents <= eveningCents
    ? 100 * feed.totalCents / eveningCents : null;
  const busyKitchen = feed && (feed.recentHummus >= 2 || feed.recentPortions >= 3);
  const kitchenLevel = !feed || message ? "unknown" : busyKitchen ? "busy"
    : feed.recentPortions ? "active" : feed.recentIncomplete ? "unknown" : "quiet";
  const kitchenLabels = {unknown:"Daten fehlen", busy:"Viel los", active:"Neue Bestellung", quiet:"Ruhig"};
  return <section id="food-orders" className="staff-panel food-panel" aria-labelledby="food-title">
    <div className="staff-section-head"><span className="staff-eyebrow"><Utensils size={16}/> SumUp · Bar Snacks</span>
      {example ? <small>Beispieldaten</small> : loading && feed ? <small>Wird aktualisiert …</small> : null}</div>
    <h2 id="food-title">Food Orders</h2>
    {!feed && loading && !message && <TicketLoader label="Bestellungen werden geladen"/>}
    {feed && <>
      <div className="kitchen-load" data-level={kitchenLevel}>
        <div className="food-share"><span>Küchenpegel · geschätzt</span>
          <strong role="status">{kitchenLabels[kitchenLevel]}</strong></div>
        <div className="load-meter" aria-hidden="true"/>
        {kitchenLevel !== "unknown" && <small>{feed.recentIncomplete ? "Mindestens " : ""}{feed.recentPortions} {feed.recentPortions === 1 ? "Portion" : "Portionen"} in 10 Min.</small>}
        {!message && feed.recentIncomplete && <small>Einige Artikel haben keine Kategorie; weitere Snacks sind möglich.</small>}
      </div>
      <div className="food-total"><MaskedRevenue label="Snack-Umsatz" cents={feed.totalCents}/></div>
      <div className="food-share"><span>Anteil am SumUp-Abendumsatz</span>
        <b>{share === null ? "–" : share.toLocaleString("de-DE",{maximumFractionDigits:1}) + " %"}</b></div>
      <div className="food-meter" aria-hidden="true"><i style={{width:(share ?? 0) + "%"}}/></div>
      {feed.orders.length ? <ul className="cocktail-tiles" tabIndex={0} aria-label="Letzte Essensbestellungen">
        {feed.orders.map(order => <li key={order.id}><b>{order.description}</b>
          <small><time dateTime={order.at}>{time.format(new Date(order.at))}</time> · {euro.format(order.cents / 100)}</small>
        </li>)}
      </ul> : <p>In der letzten Stunde sind keine Snackbestellungen eingegangen.</p>}
    <div className="food-preorders">
      <small>Ticket Tailor · Food-Vorbestellungen</small>
      <div className="food-preorder-row">{preorders == null ? <b>Vorbestellungen derzeit nicht verfügbar</b> : preorders === 0 ? <span className="food-preorder-empty">Keine Food-Vorbestellungen</span> : <><strong className="food-preorder-count">{preorders} ×</strong><span className="food-preorder-product">Hummus-Platte</span></>}</div>
    </div>
      <div className="food-ranking">
        <button type="button" className="food-ranking-toggle" aria-expanded={analyticsOpen} onClick={()=>setAnalyticsOpen(v=>!v)}>
          <span><b className="food-ranking-heading"><Popcorn size={19} aria-hidden="true"/> Snack-Bestseller</b><small>Beliebteste Snacks des Abends</small></span>
          <ChevronDown size={20} aria-hidden="true"/>
        </button>
        {analyticsOpen && <div className="food-ranking-content">
          <div className="food-ranking-filter" role="group" aria-label="Anzahl Snack-Bestseller">
            {([3,5] as const).map(n=><button key={n} type="button" aria-pressed={rankingLimit===n} onClick={()=>setRankingLimit(n)}>Top {n}</button>)}
          </div>
          {feed.bestsellers?.length ? <ol aria-label="Meistverkaufte Snacks nach Stückzahl">
            {feed.bestsellers.slice(0,rankingLimit).map((snack,index)=><li key={snack.name}>
              <span className="food-ranking-position">{index+1}</span>
              <div className="food-ranking-item"><b>{snack.name}</b>
                <div className="food-meter" aria-hidden="true"><i style={{width:feed.bestsellers[0].quantity>0?100*snack.quantity/feed.bestsellers[0].quantity+"%":"0%"}}/></div>
              </div>
              <strong>{snack.quantity} ×</strong>
            </li>)}
          </ol> : <p>Heute noch keine Snackverkäufe.</p>}
          <small>Verkaufte Portionen · Tageswechsel 03:00 Uhr</small>
        </div>}
        {analyticsOpen && <FoodWeekdayHistory example={example}/>}
      </div>

    </>}
    {!example && message && <p role="status">{message}</p>}
    {!feed && message === "Food Orders derzeit nicht abrufbar." && paymentSnacks.length > 0 &&
      <ul className="cocktail-tiles" aria-label="Snacks aus letzten Zahlungen">
        {paymentSnacks.map(snack => <li key={snack.id}><b>{snack.label}</b>
          <small>{time.format(new Date(snack.at))} · SumUp-Zahlung</small></li>)}
      </ul>}

  </section>;
}

type SnackNight={date:string;weekday:number;portions:number};
type SnackHistory={days:SnackNight[];strongest:{date:string;portions:number}|null;total:number};
function FoodWeekdayHistory({example}:{example:boolean}){
  const [history,setHistory]=useState<SnackHistory|null>(null);
  const [error,setError]=useState(false);
  const [selected,setSelected]=useState("");
  const scroller=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(example)return;
    const controller=new AbortController();
    async function load(){
      try{
        const response=await fetch("/api/staff/food-history",{cache:"no-store",signal:controller.signal});
        if(response.status===401){window.location.replace("/staff");return;}
        if(!response.ok)throw Error();
        const data=await response.json();
        if(!controller.signal.aborted){setHistory(data.history);setError(false);}
      }catch{if(!controller.signal.aborted)setError(true);}
    }
    void load();
    const timer=setInterval(()=>{if(!document.hidden)void load();},600000);
    return()=>{controller.abort();clearInterval(timer);};
  },[example]);
  const data=example?{
    days:["04","05","06","07","11","12","13","14"].map((day,i)=>({date:"2026-11-"+day,weekday:[2,3,4,5,2,3,4,5][i],portions:[6,3,12,8,4,9,7,15][i]})),
    strongest:{date:"2026-11-14",portions:15},total:64
  }:history;
  const nights=data?.days??[];
  const chosen=nights.find(n=>n.date===selected)??nights.at(-1);
  const max=Math.max(1,...nights.map(d=>d.portions));
  const formatDate=(date:string)=>new Intl.DateTimeFormat("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
  useEffect(()=>{if(scroller.current)scroller.current.scrollLeft=scroller.current.scrollWidth;},[history,example]);
  return <div className="food-weekday-history">
    <h3>Snackverkäufe im Vergleich</h3>
    <p>Verkaufte Portionen · letzte 8 Abende sichtbar · ältere nach links</p>
    {data?<>{chosen && <div className="food-history-selected"><span>{formatDate(chosen.date)}</span><strong>{chosen.portions} Portionen</strong></div>}
      <div className="food-weekday-bars" ref={scroller} aria-label="Snackverkäufe nach Abend, horizontal scrollen">
      {nights.map(d=><button type="button" className="food-weekday-column" key={d.date} aria-pressed={chosen?.date===d.date} onClick={()=>setSelected(d.date)} aria-label={formatDate(d.date)+": "+d.portions+" Portionen"}>
        <span className="food-weekday-track"><i style={{height:(d.portions?Math.max(5,100*d.portions/max):0)+"%"}}/></span>
        <span>{d.date.slice(8)}.{d.date.slice(5,7)}.</span>
      </button>)}
    </div>
    {chosen && <small className="food-history-insight">{(()=>{const avg=nights.length?data.total/nights.length:0;const difference=chosen.portions-avg;const percent=avg>0?Math.round(Math.abs(difference)/avg*100):0;return avg===0?"Noch keine Snackverkäufe im Vergleichszeitraum":Math.abs(difference)<0.5?"Entspricht dem Durchschnitt der letzten "+nights.length+" Verkaufsabende":(difference>0?"+":"−")+percent+" % gegenüber dem Durchschnitt der letzten "+nights.length+" Verkaufsabende";})()}</small>}
    <small className="food-history-footnote">Tageswechsel 03:00 Uhr</small>
    </>:<p role="status">{error?"Snackstatistik derzeit nicht verfügbar.":"Snackstatistik wird geladen …"}</p>}
  </div>;
}
