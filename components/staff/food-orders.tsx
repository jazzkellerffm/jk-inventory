"use client";

import { TicketLoader } from "./ticket-loader";
import { MaskedRevenue } from "./masked-revenue";
import { useEffect, useState } from "react";
import { Utensils } from "lucide-react";
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
    {feed && <div className="food-layout"><div className="food-current">
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
      </ul> : <p>Heute noch keine Bar Snacks verkauft.</p>}
      </div>
      {!!feed.bestsellers?.length && <div className="food-ranking">
        <h3>Snack-Bestseller des Abends</h3>
        <ol aria-label="Meistverkaufte Snacks nach Stückzahl">
          {feed.bestsellers.map(snack => <li key={snack.name}>
            <div className="food-share"><span>{snack.name}</span><b>{snack.quantity} Stück</b></div>
            <div className="food-meter" aria-hidden="true"><i style={{width:100 * snack.quantity / feed.bestsellers[0].quantity + "%"}}/></div>
          </li>)}
        </ol>
      </div>}
    </div>}
    {!example && message && <p role="status">{message}</p>}
    {!feed && message === "Food Orders derzeit nicht abrufbar." && paymentSnacks.length > 0 &&
      <ul className="cocktail-tiles" aria-label="Snacks aus letzten Zahlungen">
        {paymentSnacks.map(snack => <li key={snack.id}><b>{snack.label}</b>
          <small>{time.format(new Date(snack.at))} · SumUp-Zahlung</small></li>)}
      </ul>}
    <div className="food-preorders"><small>Ticket Tailor · Vorbestellungen für diesen Abend</small>
      <b>{preorders == null ? "Vorbestellungen derzeit nicht verfügbar" : preorders + " × Hummus-Platte"}</b></div>
  </section>;
}
