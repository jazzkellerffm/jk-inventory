"use client";

import { useState } from "react";
import type { Shift } from "@/lib/staff/types";

const shiftDay = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit" });

export function Schedule({ shifts, invalid, loading }: { shifts: Shift[]; invalid: boolean; loading: boolean }) {
  const [name, setName] = useState("");
  const names = [...new Set(shifts.flatMap(shift => shift.names))].sort();
  const active = names.includes(name) ? name : "";
  return <div className="staff-schedule-body">
    {names.length > 0 && <label>Vorname <select value={active} onChange={event => setName(event.target.value)}>
      <option value="">Ganzes Team</option>{names.map(n => <option key={n}>{n}</option>)}
    </select></label>}
    {invalid || !shifts.length ? <p>{invalid ? "Dienstplan zurzeit nicht verfügbar." : loading ? "Dienstplan wird geladen …" : "Noch keine kommenden Schichten eingetragen."}</p> :
      <ul>{shifts.filter(s => !active || s.names.includes(active)).map((s, i) => <li key={s.date + i}>
        <b>{shiftDay.format(new Date(s.date + "T12:00:00Z"))}{s.start && <small>{s.start} Uhr</small>}</b>
        <span>{s.names.join(" · ")}</span>
      </li>)}</ul>}
  </div>;
}
