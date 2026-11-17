"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import type { TicketActivity } from "@/lib/staff/ticket-activity";

const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "UTC" });
const dateLabel = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const stamp = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const asDate = (date: string) => new Date(date + "T12:00:00Z");
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const packages = (count: number) => count.toLocaleString("de-DE") + (count === 1 ? " Ticketpaket" : " Ticketpakete");
const hourLabel = (hour: number) => hour + "–" + (hour + 1) + " Uhr";

export function TicketPurchaseMonitor({ activity }: { activity?: TicketActivity }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  if (!activity?.days.length) return <section className="ticket-purchases">
    <h3>Ticketkäufe</h3><p className="purchase-meta">Kaufzeiten derzeit nicht verfügbar.</p>
  </section>;

  const { days } = activity;
  const totals = days.map(day => sum(day.hours));
  const total = sum(totals);
  const maxDay = Math.max(...totals);
  const selected = days.find(day => day.date === selectedDate);
  const hours = selected?.hours ?? Array.from({ length: 24 }, (_, hour) =>
    days.reduce((count, day) => count + day.hours[hour], 0));
  const maxHour = Math.max(...hours);
  const peaks = hours.flatMap((count, hour) => count && count === maxHour ? [hour] : []);
  const bestDays = days.filter((_, index) => totals[index] === maxDay);
  const clockScope = selected
    ? weekday.format(asDate(selected.date)) + " " + dateLabel.format(asDate(selected.date))
    : "Alle 7 Tage";
  return <section className="ticket-purchases" aria-labelledby="purchase-title">
    <div className="purchase-head"><h3 id="purchase-title">Ticketkäufe</h3><strong>{packages(total)}</strong></div>
    <p className="purchase-meta">Letzte 7 Tage · {dateLabel.format(asDate(days[0].date))}–{dateLabel.format(asDate(days[days.length - 1].date))} · Stand {stamp.format(activity.asOf * 1000)} Uhr</p>
    {total > 0 ? <>
      <div className="purchase-days" role="group" aria-label="Stundenverlauf nach Kauftag filtern">
        {days.map((day, index) => <button type="button" key={day.date} aria-pressed={day === selected}
          aria-controls="purchase-hours" aria-label={weekday.format(asDate(day.date)) + " " + dateLabel.format(asDate(day.date)) + ", " + packages(totals[index])}
          onClick={() => setSelectedDate(day === selected ? null : day.date)}>
          <span className="purchase-column"><b>{totals[index]}</b><i className={totals[index] === maxDay ? "peak" : ""}
            style={{ height: (totals[index] / maxDay * 48) + "px" }}/></span>
          <span>{weekday.format(asDate(day.date))}</span>
        </button>)}
      </div>
      <p className="purchase-meta">{bestDays.length === 1
        ? "Stärkster Tag · " + weekday.format(asDate(bestDays[0].date)) + " " + dateLabel.format(asDate(bestDays[0].date)) + " · " + packages(maxDay)
        : bestDays.length + " Tage gleichauf · je " + packages(maxDay)}</p>
      <div id="purchase-hours" className="purchase-hour-block">
        <div className="purchase-head"><h4>Käufe nach Uhrzeit</h4>
          {selected ? <button type="button" className="purchase-reset" onClick={() => setSelectedDate(null)}><Undo2 size={14} aria-hidden="true"/>Alle Tage anzeigen</button> : <small>Alle 7 Tage</small>}
        </div>
        {selected && <small>{clockScope}</small>}
        <ol className="purchase-hours" aria-label={"Verkaufte Ticketpakete je Stunde · " + clockScope}>
          {hours.map((count, hour) => <li key={hour} title={hourLabel(hour) + " · " + packages(count)}>
            <span className="sr-only">{hourLabel(hour)} · {packages(count)}</span>
            <i aria-hidden="true" className={maxHour && count === maxHour ? "peak" : ""}
              style={{ height: (maxHour ? count / maxHour * 44 : 0) + "px" }}/>
          </li>)}
        </ol>
        <div aria-hidden="true" className="purchase-axis"><span>0 Uhr</span><span>6</span><span>12</span><span>18</span><span>24 Uhr</span></div>
        <p className="purchase-meta" aria-live="polite">{peaks.length === 1
          ? "Stärkste Stunde · " + hourLabel(peaks[0]) + " · " + packages(maxHour)
          : peaks.length > 1 ? peaks.length + " Stunden gleichauf · je " + packages(maxHour) : "An diesem Tag wurden keine Ticketpakete gekauft."}</p>
      </div>
    </> : <p className="purchase-meta">In diesen sieben Tagen wurden keine Ticketpakete gekauft.</p>}
  </section>;
}
