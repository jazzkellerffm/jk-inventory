"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Shift } from "@/lib/staff/types";

import { serviceDate } from "@/lib/staff/service-day";

import { StationCards } from "./station-cards";

type View = "Woche" | "Monat";
const formatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("de-DE", { ...options, timeZone:"UTC" });
const dayMonth = formatter({day:"numeric",month:"short"});
const weekday = formatter({weekday:"long"});
const monthYear = formatter({month:"long",year:"numeric"});
const atNoon = (date:string) => new Date(date+"T12:00:00Z");

function period(date:string, view:View) {
  if (view==="Monat") return date.slice(0,7)+"-01";
  const monday = atNoon(date);
  monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
  return monday.toISOString().slice(0,10);
}

function periodLabel(key:string, view:View) {
  const start = atNoon(key);
  if (view==="Monat") return monthYear.format(start);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate()+6);
  return dayMonth.formatRange(start,end);
}

export function Schedule({ shifts, invalid, loading, initialDate = '' }: { shifts: Shift[]; invalid: boolean; loading: boolean; initialDate?: string }) {
  const [today] = useState(() => serviceDate(Date.now()));
  const [view,setView] = useState<View>("Woche");
  const [anchor,setAnchor] = useState(initialDate);
  const [name,setName] = useState("");
  if (invalid || !shifts.length) return <div id="dienstplan" className="staff-schedule-body"><p>
    {invalid ? "Dienstplan zurzeit nicht verfügbar." : loading ? "Dienstplan wird geladen …" : "Noch keine kommenden Schichten eingetragen."}
  </p></div>;

  const names = [...new Set(shifts.flatMap(s=>s.names))].sort((a,b)=>a.localeCompare(b,"de"));
  const activeName = names.includes(name) ? name : "";
  const filtered = shifts.filter(s=>!activeName || s.names.includes(activeName));
  const periods = [...new Set([...filtered.map(s=>period(s.date,view)), ...(initialDate ? [period(initialDate,view)] : [])])].sort();
  const requested = period(anchor || today,view);
  const current = periods.includes(requested) ? requested : (periods.find(key => key >= requested) ?? periods[periods.length - 1]);
  const index = periods.indexOf(current);
  const visible = filtered.filter(s=>period(s.date,view)===current);
  const dates = [...new Set(visible.map(s=>s.date))].sort();

  return <div id="dienstplan" className="staff-schedule-body">
    <div className="service-switch" role="group" aria-label="Dienstplanansicht">
      {(["Woche","Monat"] as const).map(v=><button type="button" key={v} aria-pressed={v===view}
        onClick={()=>{setAnchor(dates[0] ?? anchor);setView(v);}}>{v}</button>)}
    </div>
    <div className="roster-period"><h3>{periodLabel(current,view)}</h3>
      {periods.length>1 && <div>{[{delta:-1,label:"Zurück",Icon:ChevronLeft},{delta:1,label:"Weiter",Icon:ChevronRight}].map(({delta,label,Icon})=>
        <button key={label} type="button" aria-label={label} disabled={!periods[index+delta]} onClick={()=>setAnchor(periods[index+delta])}><Icon size={18}/></button>)}</div>}
    </div>
    <label>Vorname<select value={activeName} onChange={e=>setName(e.target.value)}>
      <option value="">Ganzes Team</option>{names.map(n=><option key={n}>{n}</option>)}</select></label>
    {!dates.length && <p>Für diesen Zeitraum sind noch keine Schichten eingetragen.</p>}
    {dates.map(date => {
      const day = atNoon(date);
      return <section key={date} className="roster-day">
        <h4><time dateTime={date}>
          <span className="roster-date-number">{day.getUTCDate()}</span>
          <span className="roster-date-copy"><span>{weekday.format(day)}</span><small>{monthYear.format(day)}</small></span>
        </time></h4>
        <StationCards shifts={visible.filter(shift => shift.date === date)} activeName={activeName}/>
      </section>;
    })}
  </div>;
}
