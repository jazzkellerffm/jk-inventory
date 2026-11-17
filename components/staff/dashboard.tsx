"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, ChevronDown, Clock3, ReceiptText } from "lucide-react";
import type { BarFeed, StaffBoard } from "@/lib/staff/types";
import { IncludedDrinks } from "./included-drinks";
import type { BookingAlert } from "@/lib/staff/tickets";
import { weekDay } from "@/lib/staff/ticket-weeks";
import { OrderAlerts } from "./order-alerts";
import type { FoodOrder } from "@/lib/staff/food";
import { MaskedRevenue } from "./masked-revenue";
import { FoodOrders } from "./food-orders";
import { Bestsellers } from "./bestsellers";
import { QuickMenu } from "./quick-menu";
import { NightDrinks, TicketSales, useTicketFeed } from "./ticket-sales";
import { staffModules } from "./modules";
import { serviceDate } from "@/lib/staff/service-day";
import { StationCards } from "./station-cards";
import { isCocktail } from "@/lib/staff/bar-workload";
import { Masthead } from "./masthead";

const time = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
const day = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long" });
const money = (amount: number, currency: string) => new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amount);

function useBoard(example?: StaffBoard) {
  const [board, setBoard] = useState<StaffBoard | undefined>(example);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (example) return;
    const controller = new AbortController();
    let busy = false;
    const update = async () => {
      if (document.hidden || busy) return;
      busy = true;
      try {
        const response = await fetch("/api/staff/board", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) { window.location.replace("/staff"); return; }
        if (!response.ok) throw new Error();
        const next: StaffBoard = await response.json();
        if (controller.signal.aborted) return;
        setBoard(prior => ({
          ...next,
          feed: next.feedState === "unavailable" ? prior?.feed ?? null : next.feed,
          drinks: next.drinksState === "unavailable" ? prior?.drinks ?? null : next.drinks,
        }));
        setError(false);
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { busy = false; }
    };
    void update();
    const timer = window.setInterval(update, 15_000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("online", update);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("online", update);
    };
  }, [example]);
  return { board, error };
}

function ActivityChart({ feed }: { feed: BarFeed }) {
  const max = Math.max(1, ...feed.buckets);
  const end = Date.parse(feed.asOf);
  const tick = (mins: number) => time.format(end - mins * 60_000);
  return <figure className="staff-figure">
    <figcaption>Zahlungen je 5 Minuten</figcaption>
    <div className="staff-plot" role="img" aria-label={`Zahlungen in 5-Minuten-Abschnitten ab ${tick(60)} Uhr: ${feed.buckets.join(", ")}`}>
      {feed.buckets.map((value, i) => <div key={i} className="staff-column" title={`${tick(60 - i * 5)} Uhr · ${value} Zahlungen`}>
        <span className={i === feed.buckets.length - 1 ? "staff-bright" : ""} style={{ height: value ? `${value / max * 100}%` : "3px" }}/>
      </div>)}
    </div>
    <div className="staff-axis"><span>{tick(60)}</span><span>{tick(30)}</span><span>{tick(0)}</span></div>
  </figure>;
}

export function StaffDashboard({ example }: { example?: StaffBoard }) {
  const tickets = useTicketFeed(!!example);
  const [salesWeek, setSalesWeek] = useState(0);
  function openBooking(booking: BookingAlert) {
    const now = tickets.feed?.asOf ?? Date.now() / 1000;
    const day = booking.eventDate;
    const week = [0, 1, 2, 3].find(index => day && day >= weekDay(now, index * 7) && day < weekDay(now, index * 7 + 7));
    if (week !== undefined) setSalesWeek(week);
  }
  const { board, error } = useBoard(example);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>();
  const [showAll, setShowAll] = useState(false);
  const feed = board?.feed;
  const lastFive = feed?.buckets.at(-1);
  const paid = !error && board?.feedState === "ready" ? feed : null;
  const open = !error && board?.drinksState === "ready" ? board.drinks : null;
  const cocktailTiles = [
    ...(paid?.payments ?? []).map(payment => ({ ...payment, source: "SumUp" })),
    ...(open?.orders ?? []).map(order => ({ ...order, source: "Included Drinks" })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .flatMap(entry => entry.items.flatMap((item, index) => isCocktail(item.name)
      ? [{ ...item, at: entry.at, source: entry.source, key: [entry.source, entry.id, index].join("/") }]
      : []));
  const effort = (paid?.paidEffort ?? 0) + (open?.openEffort ?? 0);
  const complete = paid && open && !paid.missingReceiptDetails;
  const level = effort >= 5 ? 3 : effort >= 3 ? 2 : complete ? 1 : 0;
  const loadLabel = [paid?.missingReceiptDetails ? "SumUp-Artikeldetails fehlen" : "Daten fehlen", "Ruhig", "Zieht an", "Viel los"][level];
  const stale = error || board?.feedState === "unavailable";
  const status = example ? "Beispieldaten" : stale ? "Verbindung unterbrochen" : feed ? "Verbunden" : board ? "Einrichtung offen" : "Lädt …";
  const timestamps = [feed?.asOf, board?.drinks?.asOf].filter((at): at is string => !!at);
  const snapshot = timestamps.length ? new Date(Math.max(...timestamps.map(at => Date.parse(at)))) : undefined;
  const rosterDay = serviceDate(example && snapshot ? snapshot.getTime() : Date.now());
  const tonight = board?.shifts.filter(shift => shift.date === rosterDay) ?? [];
  const message = stale ? "SumUp ist gerade nicht erreichbar." : board?.feedState === "setup" ? "SumUp ist noch nicht verbunden." : "Zahlungen werden geladen …";
  return <div className="staff-shell">
    <Masthead signedIn={!example} demo={!!example}/>
    <main>
      <div id="bar-monitor" className="staff-heading"><div><h1>Bar-Monitor<span>.</span></h1></div>
        {snapshot && <div className="staff-stamp"><span>{day.format(snapshot)}</span><b>{time.format(snapshot)} <small>Uhr</small></b></div>}
      </div>
      <OrderAlerts bookings={tickets.feed?.bookingAlerts} onBooking={openBooking} board={board} food={foodOrders} demo={!!example}/>
      <section aria-labelledby="activity" className="staff-activity staff-panel">
          <div className="staff-section-head"><span className="staff-eyebrow"><Activity size={17}/> SumUp</span><span className={`staff-status ${stale ? "staff-warn" : ""}`} role="status"><i/>{status}</span></div>
          <h2 id="activity">Baraktivität</h2>
          <div className="staff-metric"><strong>{lastFive ?? "–"}</strong><span>Zahlungen<br/>in 5 Minuten</span></div>
          {feed ? <ActivityChart feed={feed}/> : <p className="staff-placeholder">{message}</p>}
          <p className="staff-note"><Clock3 size={14}/>{stale && feed ? "Letzter Stand · " + time.format(new Date(feed.asOf)) + " Uhr" : example ? "Beispielabend · 60 Minuten" : "Aktualisierung alle 15 Sekunden"}</p>
        </section>

      <section id="barpegel" className="staff-panel bar-load" aria-labelledby="load-title" data-level={level}>
        <div><h2 id="load-title">Barpegel · geschätzt</h2>
          <strong role="status">{board || error ? loadLabel : "Lädt …"}</strong>
        </div>
        <div className="load-meter" aria-hidden="true"/>
        {cocktailTiles.length > 0 && <ul className="cocktail-tiles" tabIndex={0} aria-label="Letzte Cocktails, horizontal scrollbar">
          {cocktailTiles.map(tile => <li key={tile.key}>
            <b>{tile.quantity !== null && tile.quantity > 1 && tile.quantity + " × "}{tile.name}</b>
            <small><time dateTime={tile.at}>{time.format(new Date(tile.at))}</time> · {tile.source}</small>
          </li>)}
        </ul>}
      </section>

      <section id="abendumsatz" className="staff-panel staff-turnover" aria-labelledby="turnover-title">
        <div className="staff-section-head"><span className="staff-eyebrow"><ReceiptText size={16}/> SumUp</span>
          <small>{example ? "Beispieldaten" : feed ? "Stand "+time.format(new Date(feed.asOf))+" Uhr" : "Geschäftstag"}</small></div>
        <h2 id="turnover-title">Abendumsatz</h2>
        {typeof feed?.eveningCents === "number" ? (
          <MaskedRevenue label="Abendumsatz" cents={feed.eveningCents}/>
        ) : <strong>–</strong>}
        <p>{stale ? "Aktualisierung fehlgeschlagen." : "Erfolgreiche Zahlungen"}</p>
      </section>
        <section id="bar-orders" className="staff-feed staff-panel" aria-labelledby="payments">
          <div className="staff-section-head"><span className="staff-eyebrow"><ReceiptText size={17}/> SumUp</span><span className="staff-period">Letzte Stunde</span></div>
          <h2 id="payments">Letzte Zahlungen</h2>
          {!feed?.payments.length ? <p className="staff-placeholder">{!feed ? message : "In der letzten Stunde gab es keine bezahlten Verkäufe."}</p> :
            <ol>{feed.payments.slice(0, showAll ? 8 : 4).map(payment => <li key={payment.id}>
              <time dateTime={payment.at}>{time.format(new Date(payment.at))}</time>
              <div>{payment.items.length ? payment.items.map((item, index) => <span key={index}>{item.quantity !== null && <em>{item.quantity} × </em>}{item.name}</span>) : <span>{payment.summary || "Artikel nicht verfügbar"}</span>}</div>
              <strong>{money(payment.amount, payment.currency)}</strong>
            </li>)}</ol>}
          {feed && feed.payments.length > 4 && <button className="staff-more" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "Weniger anzeigen" : `Alle ${feed.payments.length} anzeigen`} <ChevronDown size={16}/></button>}
        </section>
      <IncludedDrinks feed={board?.drinks} state={error ? "unavailable" : board?.drinksState}/>
      <NightDrinks {...tickets} example={!!example} today={rosterDay}/>
      <FoodOrders payments={paid?.payments} onOrders={setFoodOrders} example={!!example} eveningCents={paid?.eveningCents}
        preorders={tickets.state === "unavailable" ? null : tickets.feed?.foodPreorders}/>
      {board && <section className="shift-line" aria-labelledby="tonight-team">
        <div className="staff-section-head"><h2 id="tonight-team">Team heute Abend</h2>
          <a className="staff-roster-link" href="#schedule" onClick={() => {
            const schedule = document.querySelector<HTMLDetailsElement>("#schedule");
            if (schedule) schedule.open = true;
          }}>Zum Dienstplan <ArrowRight size={14} aria-hidden="true"/></a></div>
        {board.scheduleError || error ? <p>Dienstplan derzeit nicht verfügbar.</p> : tonight.length ?
          <StationCards shifts={tonight}/>
          : <p>Für heute ist keine Schicht eingetragen.</p>}
      </section>}
      <Bestsellers example={!!example}/>
      <TicketSales week={salesWeek} setWeek={setSalesWeek} {...tickets} example={!!example}/>
      <h2 id="staff-tools" className="staff-tools-title">Tools</h2>
      <div className="staff-modules">
        {staffModules.map(module => {
          const { id, title, hint, icon: Icon } = module;
          const label = <><span className="staff-tile-icon"><Icon size={22}/></span><span className="staff-tile-copy"><b>{title}</b><small>{hint}</small></span></>;
          return "href" in module ?
            <Link key={id} className="staff-tile" href={module.href}>{label}<ArrowUpRight size={20}/></Link> :
            <details key={id} id={id} className="staff-tile-detail"><summary className="staff-tile">{label}<ChevronDown size={20}/></summary>
              {module.render(board, error)}</details>;
        })}
      </div>
      {example && <Link className="staff-exit-demo" href="/staff">Zum Teamzugang <ArrowRight size={15}/></Link>}
    </main>
    <QuickMenu/>
  </div>;
}
