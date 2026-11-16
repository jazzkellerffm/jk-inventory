"use client";
import { MaskedRevenue } from "./masked-revenue";
import { useEffect, useState } from "react";
import { Utensils } from "lucide-react";
import type { FoodFeed } from "@/lib/staff/food";

const euro = new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"});
const time = new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"});
const demo: FoodFeed = {recentPortions:2, recentHummus:2, recentIncomplete:false, totalCents:4500, uncategorized:false, orders:[
  {id:"one",at:"2026-11-18T20:54:00Z",description:"2 × Hummus-Platte",cents:3000},
  {id:"two",at:"2026-11-18T20:41:00Z",description:"1 × Hummus-Platte",cents:1500},
]};

export function FoodOrders({example, eveningCents, preorders, onOrders}:{
  onOrders:(orders: FoodFeed["orders"])=>void; example:boolean; eveningCents?:number; preorders?:number|null;
}) {
  const [feed,setFeed] = useState<FoodFeed|null>(example ? demo : null);
  const [message,setMessage] = useState(example ? "" : "Bestellungen werden geladen …");
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
          if (data.feed) onOrders(data.feed.orders);
          setMessage(data.state === "setup" ? "SumUp ist noch nicht verbunden." : "");
        }
      } catch {
        if (!controller.signal.aborted) setMessage("Food Orders derzeit nicht abrufbar.");
      } finally { busy = false; }
    }
    void refresh();
    const timer = setInterval(refresh,15000);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{ controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange",refresh); };
  },[example,onOrders]);
  const share = feed && !message && eveningCents && eveningCents > 0 && feed.totalCents <= eveningCents
    ? 100 * feed.totalCents / eveningCents : null;
  const busyKitchen = feed && (feed.recentHummus >= 2 || feed.recentPortions >= 3);
  const kitchenLevel = !feed || message ? "unknown" : busyKitchen ? "busy"
    : feed.recentIncomplete ? "unknown" : feed.recentPortions ? "active" : "quiet";
  const kitchenLabels = {unknown:"Daten fehlen", busy:"Viel los", active:"Neue Bestellung", quiet:"Ruhig"};
  return <section id="food-orders" className="staff-panel food-panel" aria-labelledby="food-title">
    <div className="staff-section-head"><span className="staff-eyebrow"><Utensils size={16}/> SumUp · Bar Snacks</span>
      {example && <small>Beispieldaten</small>}</div>
    <h2 id="food-title">Food Orders</h2>
    {feed && <>
      <div className="kitchen-load" data-level={kitchenLevel}>
        <div className="food-share"><span>Küchenpegel · geschätzt</span>
          <strong role="status">{kitchenLabels[kitchenLevel]}</strong></div>
        <div className="load-meter" aria-hidden="true"/>
        {kitchenLevel !== "unknown" && <small>{feed.recentPortions} {feed.recentPortions === 1 ? "Portion" : "Portionen"} in 10 Min.</small>}
      </div>
      <div className="food-total"><MaskedRevenue label="Snack-Umsatz" cents={feed.totalCents} dots={String(Math.floor(Math.abs(feed.totalCents) / 100)).length}/></div>
      <div className="food-share"><span>Anteil am SumUp-Abendumsatz</span>
        <b>{share === null ? "–" : share.toLocaleString("de-DE",{maximumFractionDigits:1}) + " %"}</b></div>
      <div className="food-meter" aria-hidden="true"><i style={{width:(share ?? 0) + "%"}}/></div>
      {feed.orders.length ? <ul className="cocktail-tiles" tabIndex={0} aria-label="Letzte Essensbestellungen">
        {feed.orders.map(order => <li key={order.id}><b>{order.description}</b>
          <small><time dateTime={order.at}>{time.format(new Date(order.at))}</time> · {euro.format(order.cents / 100)}</small>
        </li>)}
      </ul> : <p>Heute noch keine Bar Snacks verkauft.</p>}
      {feed.uncategorized && <small>Positionen ohne Kategorie sind ausgenommen.</small>}
    </>}
    {!example && message && <p role="status">{message}</p>}
    <div className="food-preorders"><small>Ticket Tailor · Vorbestellungen für diesen Abend</small>
      <b>{preorders == null ? "Vorbestellungen derzeit nicht verfügbar" : preorders + " × Hummus-Platte"}</b></div>
  </section>;
}
