"use client";
import { useEffect, useState } from "react";
import { Utensils } from "lucide-react";
import type { FoodFeed } from "@/lib/staff/food";

const euro = new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"});
const time = new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"});
const demo: FoodFeed = {totalCents:4500, uncategorized:false, orders:[
  {id:"one",at:"2026-11-18T20:54:00Z",description:"2 × Hummus-Platte",cents:3000},
  {id:"two",at:"2026-11-18T20:41:00Z",description:"1 × Hummus-Platte",cents:1500},
]};

export function FoodOrders({example}:{example:boolean}) {
  const [feed,setFeed] = useState<FoodFeed|null>(example ? demo : null);
  const [message,setMessage] = useState("Bestellungen werden geladen …");
  useEffect(()=>{
    if (example) return;
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const res = await fetch("/api/staff/food",{signal:controller.signal,cache:"no-store"});
        if (res.status === 401) { window.location.replace("/staff"); return; }
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!controller.signal.aborted) {
          setFeed(data.feed ?? null);
          setMessage(data.state === "setup" ? "SumUp ist noch nicht verbunden." : "");
        }
      } catch {
        if (!controller.signal.aborted) setMessage("Food Orders derzeit nicht abrufbar.");
      } finally { busy = false; }
    }
    void refresh();
    const timer = setInterval(refresh,60000);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{ controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange",refresh); };
  },[example]);
  return <section id="food-orders" className="staff-panel staff-feed" style={{background:"#f7e8d8",marginBottom:16}}>
    <div className="staff-section-head"><span className="staff-eyebrow"><Utensils size={16}/> SumUp · Bar Snacks</span>
      {example && <small>Beispieldaten</small>}</div>
    <h2>Food Orders</h2>
    {feed && <>
      <p><b className="text-3xl tabular-nums">{euro.format(feed.totalCents/100)}</b> seit 06:00 Uhr</p>
      {feed.orders.length > 0 ? <ol>{feed.orders.map(order=><li key={order.id}>
        <time dateTime={order.at}>{time.format(Date.parse(order.at))}</time><div>{order.description}</div>
        <strong>{euro.format(order.cents/100)}</strong>
      </li>)}</ol> : <p>Keine Verkäufe mit der Kategorie „Bar Snacks“.</p>}
      {feed.uncategorized && <small>Positionen ohne Kategorie sind ausgenommen.</small>}
    </>}
    {!example && message && <p role="status">{message}</p>}
  </section>;
}
