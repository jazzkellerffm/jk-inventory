"use client";

import { useEffect, useRef, useState } from "react";
import { ReceiptText } from "lucide-react";
import styles from "./bar-evenings.module.css";

type Night = { date: string; payments: number; cents: number };
type Detail = { units: number; complete: boolean };
const amount = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const dateLabel = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const demo = [54400, 82200, 116500, 142300, 72600, 91400, 137500, 123700].map((cents, i) => ({
  date: "2026-11-" + ["04","05","06","07","11","12","13","14"][i], cents, payments: Math.round(cents / 1430)
}));

async function fetchData<T>(suffix: string, signal: AbortSignal): Promise<T> {
  const res = await fetch("/api/staff/bar-evenings" + suffix, { signal, cache: "no-store" });
  if (!res.ok) throw new Error("SumUp unavailable");
  return res.json();
}

export function BarEvenings({ example }: { example: boolean }) {
  const [nights, setNights] = useState<Night[] | null>(example ? demo : null);
  const [failed, setFailed] = useState(false);
  const [chosen, select] = useState("");
  const [detail, setDetail] = useState<{ date: string; value: Detail | null }>();
  const chart = useRef<HTMLDivElement>(null);
  const night = nights?.find(n => n.date === chosen) ?? nights?.at(-1);
  const date = night?.date;
  useEffect(() => {
    if (example) return;
    const abort = new AbortController();
    const refresh = () => fetchData<{ nights: Night[] }>("", abort.signal)
      .then(data => { setNights(data.nights); setFailed(false); })
      .catch(() => { if (!abort.signal.aborted) setFailed(true); });
    void refresh();
    const timer = setInterval(refresh, 600000);
    return () => { abort.abort(); clearInterval(timer); };
  }, [example]);
  useEffect(() => {
    if (!date || example) return;
    const abort = new AbortController();
    fetchData<Detail>("?day=" + date, abort.signal)
      .then(value => setDetail({ date, value }))
      .catch(() => { if (!abort.signal.aborted) setDetail({ date, value: null }); });
    return () => abort.abort();
  }, [date, example]);
  useEffect(() => {
    if (!chosen && chart.current) chart.current.scrollLeft = chart.current.scrollWidth;
  }, [nights, chosen]);
  const items = example && night ? { units: night.payments * 2, complete: true } : detail?.date === date ? detail?.value : undefined;
  const peak = Math.max(1, ...(nights ?? []).map(n => n.cents));
  return <section id="bar-evenings" className={`staff-panel ${styles.panel}`} aria-labelledby="bar-evenings-title">
    <div className="staff-section-head"><span className="staff-eyebrow"><ReceiptText size={16}/> SumUp</span><small>{example ? "Beispieldaten" : "Letzte 14 Tage"}</small></div>
    <h2 id="bar-evenings-title">Barumsatz im Vergleich</h2>
    {night && nights ? <>
      <div className={styles.summary} aria-live="polite"><b>{dateLabel.format(new Date(night.date))}</b><strong>{amount.format(night.cents / 100)}</strong></div>
      <div className={styles.chart} ref={chart} aria-label="Barabende auswählen">{nights.map(n =>
        <button type="button" key={n.date} aria-pressed={night.date === n.date} onClick={() => select(n.date)}
          aria-label={dateLabel.format(new Date(n.date)) + ", " + amount.format(n.cents / 100)}>
          <i style={{ height: Math.max(2, n.cents / peak * 80) }} />
          <small>{n.date.slice(8)}.{n.date.slice(5,7)}.</small>
        </button>)}</div>
      <p>{night.payments} {night.payments === 1 ? "Zahlung" : "Zahlungen"} · {items ? (items.complete ? "" : "mind. ") + items.units + " Artikel" : items === null ? "Artikelzahl nicht verfügbar" : "Artikelzahl lädt …"}</p>
      <small>Abgeschlossene Barabende · Tageswechsel um 03:00 Uhr</small>
    </> : <p>{failed ? "SumUp ist gerade nicht erreichbar." : nights ? "Keine Zahlungen in den letzten 14 abgeschlossenen Tagen." : "Barabende werden geladen …"}</p>}
  </section>;
}
