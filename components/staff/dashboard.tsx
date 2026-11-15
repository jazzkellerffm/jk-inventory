"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, ChevronDown, Clock3, Eye, EyeOff, ReceiptText } from "lucide-react";
import type { BarFeed, StaffBoard } from "@/lib/staff/types";
import { IncludedDrinks } from "./included-drinks";
import { Bestsellers } from "./bestsellers";
import { Performance } from "./performance";
import { QuickMenu } from "./quick-menu";
import { NightDrinks, TicketSales, useTicketFeed } from "./ticket-sales";
import { staffModules } from "./modules";
import { ticketDay } from "@/lib/staff/ticket-weeks";
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
  const { board, error } = useBoard(example);
  const [showAll, setShowAll] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);
  useEffect(() => {
    if (!showRevenue) return;
    const hide = () => setShowRevenue(false);
    const timer = window.setTimeout(hide, 10000);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", hide);
    };
  }, [showRevenue]);
  const feed = board?.feed;
  const lastFive = feed?.buckets.at(-1);
  const preceding = feed?.buckets.slice(0,-1) ?? [];
  const typical = preceding.reduce((total,n)=>total+n,0) / (preceding.length || 1);
  const busy = lastFive !== undefined && lastFive >= 3 && lastFive >= 1.5 * typical;
  const stale = error || board?.feedState === "unavailable";
  const status = example ? "Beispieldaten" : stale ? "Verbindung unterbrochen" : feed ? "Verbunden" : board ? "Einrichtung offen" : "Lädt …";
  const timestamps = [feed?.asOf, board?.drinks?.asOf].filter((at): at is string => !!at);
  const snapshot = timestamps.length ? new Date(Math.max(...timestamps.map(at => Date.parse(at)))) : undefined;
  const rosterDay = ticketDay((example && snapshot ? snapshot.getTime() : Date.now()) / 1000);
  const tonight = board?.shifts.filter(shift => shift.date === rosterDay) ?? [];
  const message = stale ? "SumUp ist gerade nicht erreichbar." : board?.feedState === "setup" ? "SumUp ist noch nicht verbunden." : "Zahlungen werden geladen …";
  return <div className="staff-shell">
    <Masthead signedIn={!example} demo={!!example}/>
    <main>
      <div className="staff-heading"><div><h1>Bar-Monitor<span>.</span></h1></div>
        {snapshot && <div className="staff-stamp"><span>{day.format(snapshot)}</span><b>{time.format(snapshot)} <small>Uhr</small></b></div>}
      </div>
      <section aria-labelledby="activity" className="staff-activity staff-panel">
          <div className="staff-section-head"><span className="staff-eyebrow"><Activity size={17}/> SumUp</span><span className={`staff-status ${stale ? "staff-warn" : ""}`} role="status"><i/>{status}</span></div>
          <h2 id="activity">Baraktivität</h2>
          <div className="staff-metric"><strong>{lastFive ?? "–"}</strong><span>Zahlungen<br/>in 5 Minuten</span></div>
          {feed ? <ActivityChart feed={feed}/> : <p className="staff-placeholder">{message}</p>}
          {busy && !stale && <p className="bar-surge" role="status">Erhöhtes Aufkommen</p>}
          <p className="staff-note"><Clock3 size={14}/>{stale && feed ? "Letzter Stand · " + time.format(new Date(feed.asOf)) + " Uhr" : example ? "Beispielabend · 60 Minuten" : "Aktualisierung alle 15 Sekunden"}</p>
        </section>

      <section id="abendumsatz" className="staff-panel staff-turnover" aria-labelledby="turnover-title">
        <div className="staff-section-head"><span className="staff-eyebrow"><ReceiptText size={16}/> SumUp</span>
          <small>{example ? "Beispieldaten" : feed ? "Stand "+time.format(new Date(feed.asOf))+" Uhr" : "Geschäftstag"}</small></div>
        <h2 id="turnover-title">Abendumsatz</h2>
        {typeof feed?.eveningCents === "number" ? (
          <button type="button" onClick={() => setShowRevenue(!showRevenue)}
            aria-label={showRevenue ? "Abendumsatz " + money(feed.eveningCents / 100, "EUR") + " verbergen" : "Abendumsatz anzeigen"}
            className="inline-flex min-h-11 items-center gap-3 text-left">
            {showRevenue ? (
              <strong key="amount" aria-hidden="true">{money(feed.eveningCents / 100, "EUR")}</strong>
            ) : (
              <strong key="mask" aria-hidden="true" className="select-none"
                style={{ filter: "blur(0.12em)", opacity: 0.48 }}>
                2.738,65 €
              </strong>
            )}
            {showRevenue ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
          </button>
        ) : <strong>–</strong>}
        <p>{stale ? "Aktualisierung fehlgeschlagen." : "Erfolgreiche Zahlungen · seit 06:00 Uhr"}</p>
      </section>
        <section className="staff-feed staff-panel" aria-labelledby="payments">
          <div className="staff-section-head"><span className="staff-eyebrow"><ReceiptText size={17}/> SumUp</span><span className="staff-period">Letzte Stunde</span></div>
          <h2 id="payments">Letzte Zahlungen</h2>
          {!feed?.payments.length ? <p className="staff-placeholder">{!feed ? message : "In der letzten Stunde gab es keine bezahlten Verkäufe."}</p> :
            <ol>{feed.payments.slice(0, showAll ? 8 : 4).map(payment => <li key={payment.id}>
              <time dateTime={payment.at}>{time.format(new Date(payment.at))}</time>
              <div>{payment.items.length ? payment.items.map((item, index) => <span key={index}>{item.quantity !== null && <em>{item.quantity} × </em>}{item.name}</span>) : <span>Artikel nicht verfügbar</span>}</div>
              <strong>{money(payment.amount, payment.currency)}</strong>
            </li>)}</ol>}
          {feed && feed.payments.length > 4 && <button className="staff-more" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "Weniger anzeigen" : `Alle ${feed.payments.length} anzeigen`} <ChevronDown size={16}/></button>}
        </section>
      {board && <section className="shift-line" aria-labelledby="tonight-team">
        <h2 id="tonight-team">Team heute Abend</h2>
        {board.scheduleError || error ? <p>Dienstplan derzeit nicht verfügbar.</p> : tonight.length ?
          <dl>{tonight.map((shift,i)=><div key={i}><dt>{shift.role || "Team"}</dt><dd>{shift.names.map((name,index)=><span key={index}>{name}</span>)}</dd></div>)}</dl>
          : <p>Für heute ist keine Schicht eingetragen.</p>}
      </section>}
      <NightDrinks {...tickets} example={!!example}/>
      <IncludedDrinks feed={board?.drinks} state={error ? "unavailable" : board?.drinksState}/>
      <Bestsellers example={!!example}/>
      <Performance feed={tickets.feed} example={!!example}/>
      <TicketSales {...tickets} example={!!example}/>
      <h2 className="staff-tools-title">Für die Schicht</h2>
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
