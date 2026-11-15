import { useState } from "react";
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
  return <section className="staff-panel staff-orders" aria-labelledby="included-title">
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
  </section>;
}
