"use client";

import { TicketLoader } from "./ticket-loader";

import { useEffect, useRef, useState } from "react";
import { ReceiptText } from "lucide-react";
import styles from "./bar-evenings.module.css";

type Night = { date: string; payments: number; cents: number };
const amount = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const dateLabel = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const demo = [54400, 82200, 116500, 142300, 72600, 91400, 137500, 123700].map((cents, i) => ({
  date: "2026-11-" + ["04","05","06","07","11","12","13","14"][i], cents, payments: Math.round(cents / 1430)
}));

async function fetchNights(signal: AbortSignal): Promise<{ nights: Night[] }> {
  const res = await fetch("/api/staff/bar-evenings", { signal, cache: "no-store" });
  if (!res.ok) throw new Error("SumUp unavailable");
  return res.json();
}

export function BarEvenings({ example }: { example: boolean }) {
  const [nights, setNights] = useState<Night[] | null>(example ? demo : null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(!example);
  const [chosen, select] = useState("");
  const chart = useRef<HTMLDivElement>(null);
  const night = nights?.find(n => n.date === chosen) ?? nights?.at(-1);
  useEffect(() => {
    if (example) return;
    const abort = new AbortController();
    const refresh = () => { setLoading(true); return fetchNights(abort.signal)
      .then(data => { setNights(data.nights); setFailed(false); })
      .catch(() => { if (!abort.signal.aborted) setFailed(true); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); }); };
    void refresh();
    const timer = setInterval(refresh, 600000);
    return () => { abort.abort(); clearInterval(timer); };
  }, [example]);
  useEffect(() => {
    if (!chosen && chart.current) chart.current.scrollLeft = chart.current.scrollWidth;
  }, [nights, chosen]);
  const peak = Math.max(1, ...(nights ?? []).map(n => n.cents));
  return <section id="bar-evenings" className={`staff-panel ${styles.panel}`} aria-labelledby="bar-evenings-title">
    <div className="staff-section-head"><span className="staff-eyebrow"><ReceiptText size={16}/> SumUp</span><small>{example ? "Beispieldaten · 14 Tage" : loading && nights ? "Wird aktualisiert …" : "Letzte 14 Tage"}</small></div>
    <h2 id="bar-evenings-title">Barumsatz im Vergleich</h2>
    {failed && nights && <p role="status">Aktualisierung fehlgeschlagen. Letzter geladener Stand.</p>}
    {!nights && loading && !failed ? <TicketLoader label="Barabende werden geladen"/> : night && nights ? <>
      <div className={styles.summary} aria-live="polite"><b>{dateLabel.format(new Date(night.date))}</b><strong>{amount.format(night.cents / 100)}</strong></div>
      <div className={styles.chart} ref={chart} aria-label="Barabende auswählen">{nights.map(n =>
        <button type="button" key={n.date} aria-pressed={night.date === n.date} onClick={() => select(n.date)}
          aria-label={dateLabel.format(new Date(n.date)) + ", " + amount.format(n.cents / 100)}>
          <i style={{ height: Math.max(2, n.cents / peak * 80) }} />
          <small>{n.date.slice(8)}.{n.date.slice(5,7)}.</small>
        </button>)}</div>
      <p>{night.payments} {night.payments === 1 ? "Zahlung" : "Zahlungen"}</p>
      <small>Abgeschlossene Barabende · Tageswechsel um 03:00 Uhr</small>
    </> : <p>{failed ? "SumUp ist gerade nicht erreichbar." : nights ? "Keine Zahlungen in den letzten 14 abgeschlossenen Tagen." : "Barabende werden geladen …"}</p>}
  </section>;
}
