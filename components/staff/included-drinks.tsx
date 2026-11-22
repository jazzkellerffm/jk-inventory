import { useEffect, useState } from "react";
import { ChevronDown, Martini } from "lucide-react";
import type { DrinkFeed, FeedState } from "@/lib/staff/types";

const time = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });

export function IncludedDrinks({ feed, state }: { feed?: DrinkFeed | null; state?: FeedState }) {
  const [expanded, setExpanded] = useState(false);
  const orders = feed?.orders ?? [];
  const unavailable = state === "unavailable";
  const emptyMessage = unavailable ? "Bestellungen können gerade nicht geladen werden." :
    state === "setup" ? "Das Included Drinks Menü ist noch nicht verbunden." :
    state === "ready" ? "In der letzten Stunde sind keine Bestellungen eingegangen." : "Bestellungen werden geladen …";
  return <section id="drink-orders" className="staff-panel staff-orders" aria-labelledby="included-title">
    <div className="staff-section-head"><span className="staff-eyebrow"><Martini size={16}/> Included Drinks</span>
      <span className="staff-period">Letzte Stunde</span></div>
    <h2 id="included-title">Drink-Bestellungen</h2>
    {unavailable && feed && <p className="staff-offline" role="status">Verbindung unterbrochen · Stand {time.format(new Date(feed.asOf))} Uhr</p>}
    {orders.length ? <ol>{orders.slice(0, expanded ? 8 : 4).map(order => <li key={order.id}>
      <time dateTime={order.at}>{time.format(new Date(order.at))}</time>
      <div className="staff-order-lines">
        <span className="staff-table">Tisch {order.table}</span>
        {order.items.map((item, index) => <span key={index}><b>{item.quantity} ×</b> {item.name}</span>)}
      </div>
      <span className={`staff-order-status ${order.status}`}>{order.status === "open" ? "Offen" : "Serviert"}</span>
    </li>)}</ol> : <p className="staff-placeholder">{emptyMessage}</p>}
    {orders.length > 4 && <button className="staff-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      {expanded ? "Weniger anzeigen" : `Alle ${orders.length} Bestellungen`} <ChevronDown size={15}/>
    </button>}
    <IncludedRankingPanel />
  </section>;
}

type RankingFeed={products:{name:string;quantity:number}[];incomplete:number};
function IncludedRankingPanel(){
  const [open,setOpen]=useState(false);
  const [period,setPeriod]=useState<"evening"|"week"|"month">("evening");
  const [limit,setLimit]=useState(3);
  const [feed,setFeed]=useState<RankingFeed|null>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    if(!open)return;
    const controller=new AbortController();
    async function refresh(){
      try{
        const response=await fetch("/api/staff/included-bestsellers?period="+period,{cache:"no-store",signal:controller.signal});
        if(response.status===401){window.location.replace("/staff");return;}
        if(!response.ok)throw new Error();
        const json=await response.json();
        if(!controller.signal.aborted){setFeed(json.feed);setError(false);}
      }catch{if(!controller.signal.aborted)setError(true);}
    }
    setFeed(null);setError(false);void refresh();
    const timer=setInterval(refresh,60000);
    return()=>{controller.abort();clearInterval(timer);};
  },[open,period]);
  return <div className="bestseller-cocktail-section">
    <button type="button" className="bestseller-cocktail-toggle included-ranking-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span>Included Drinks · Bestseller <small>Beliebteste inkludierte Getränke</small></span>
      <ChevronDown size={20} aria-hidden="true"/>
    </button>
    {open&&<div className="included-ranking">
      <div className="bestseller-controls">
        <select aria-label="Zeitraum Included Drinks" value={period} onChange={e=>setPeriod(e.target.value as typeof period)}>
          <option value="evening">Abend</option><option value="week">Woche</option><option value="month">Monat</option>
        </select>
        <div className="service-switch" role="group" aria-label="Anzahl Included Bestseller">
          {[3,5,10].map(n=><button key={n} type="button" aria-pressed={limit===n} onClick={()=>setLimit(n)}>Top {n}</button>)}
        </div>
      </div>
      {error?<p role="status">Included-Drinks-Statistik derzeit nicht verfügbar.</p>:!feed?<p>Wird geladen …</p>:<>
        <ol className="included-ranking-list">{feed.products.slice(0,limit).map((item,i)=><li key={item.name}>
          <span>{i+1}</span><div><b>{item.name}</b><div className="best-track"><i style={{width:(feed.products[0]?.quantity?item.quantity/feed.products[0].quantity*100:0)+"%"}}/></div></div><strong>{item.quantity} ×</strong>
        </li>)}</ol>
        {!feed.products.length&&<p>Noch keine Bestellungen in diesem Zeitraum.</p>}
        {!!feed.incomplete&&<small>{feed.incomplete} unvollständige Bestellpositionen nicht gezählt.</small>}
      </>}
      <small>Bestellte Stückzahl · Tageswechsel 03:00 Uhr</small>
    </div>}
  </div>;
}
