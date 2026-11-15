"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, ChevronDown, Clock3, ReceiptText } from "lucide-react";
import type { BarFeed, StaffBoard } from "@/lib/staff/types";
import { staffModules } from "./modules";
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
        setBoard(prior => next.feedState === "unavailable" ? { ...next, feed: prior?.feed ?? null } : next);
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
        <span className={i >= 9 ? "staff-bright" : ""} style={{ height: value ? `${value / max * 100}%` : "3px" }}/>
      </div>)}
    </div>
    <div className="staff-axis"><span>{tick(60)}</span><span>{tick(30)}</span><span>{tick(0)}</span></div>
  </figure>;
}

export function StaffDashboard({ example }: { example?: StaffBoard }) {
  const { board, error } = useBoard(example);
  const [showAll, setShowAll] = useState(false);
  const feed = board?.feed;
  const stale = error || board?.feedState === "unavailable";
  const status = example ? "Beispieldaten" : stale ? "Verbindung unterbrochen" : feed ? "Verbunden" : board ? "Einrichtung offen" : "Lädt …";
  const snapshot = feed ? new Date(feed.asOf) : undefined;
  const message = stale ? "SumUp ist gerade nicht erreichbar." : board?.feedState === "setup" ? "SumUp ist noch nicht verbunden." : "Zahlungen werden geladen …";
  return <div className="staff-shell">
    <Masthead signedIn={!example} demo={!!example}/>
    <main>
      <div className="staff-heading"><div><p className="staff-kicker">SCHICHTÜBERSICHT</p><h1>An der Bar<span>.</span></h1></div>
        {snapshot && <div className="staff-stamp"><span>{day.format(snapshot)}</span><b>{time.format(snapshot)} <small>Uhr</small></b></div>}
      </div>
      <div className="staff-grid">
        <section aria-labelledby="activity" className="staff-activity staff-panel">
          <div className="staff-section-head"><span className="staff-eyebrow"><Activity size={17}/> SumUp</span><span className={`staff-status ${stale ? "staff-warn" : ""}`} role="status"><i/>{status}</span></div>
          <h2 id="activity">Baraktivität</h2>
          <div className="staff-metric"><strong>{feed?.recentCount ?? "–"}</strong><span>Zahlungen<br/>in 15 Minuten</span></div>
          {feed ? <ActivityChart feed={feed}/> : <p className="staff-placeholder">{message}</p>}
          <p className="staff-note"><Clock3 size={14}/>{stale && snapshot ? "Letzter Stand · " + time.format(snapshot) + " Uhr" : example ? "Beispielabend · 60 Minuten" : "Aktualisierung alle 15 Sekunden"}</p>
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
      </div>
      <h2 className="staff-tools-title">Für die Schicht</h2>
      <div className="staff-modules">
        {staffModules.map(module => {
          const { id, title, hint, icon: Icon } = module;
          const label = <><span className="staff-tile-icon"><Icon size={22}/></span><span className="staff-tile-copy"><b>{title}</b><small>{hint}</small></span></>;
          return "href" in module ?
            <Link key={id} className="staff-tile" href={module.href}>{label}<ArrowUpRight size={20}/></Link> :
            <details key={id} className="staff-tile-detail"><summary className="staff-tile">{label}<ChevronDown size={20}/></summary>
              {module.render(board, error)}</details>;
        })}
      </div>
      {example && <Link className="staff-exit-demo" href="/staff">Zum Teamzugang <ArrowRight size={15}/></Link>}
    </main>
  </div>;
}
