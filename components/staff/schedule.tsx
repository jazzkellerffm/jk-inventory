"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, DoorOpen, HandPlatter, Martini, UsersRound, Utensils } from "lucide-react";
import type { Shift } from "@/lib/staff/types";

type View = "Woche" | "Monat";
const formatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("de-DE", { ...options, timeZone:"UTC" });
const dayMonth = formatter({day:"numeric",month:"short"});
const weekday = formatter({weekday:"long"});
const monthYear = formatter({month:"long",year:"numeric"});
const atNoon = (date:string) => new Date(date+"T12:00:00Z");

function roleIcon(role = "") {
  const key = role.toLowerCase();
  if (key.startsWith("bar")) return Martini;
  if (key.startsWith("backstage")) return Utensils;
  if (key.startsWith("service")) return HandPlatter;
  if (key.startsWith("door")) return DoorOpen;
  return UsersRound;
}

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

export function Schedule({ shifts, invalid, loading }: { shifts: Shift[]; invalid: boolean; loading: boolean }) {
  const [view,setView] = useState<View>("Woche");
  const [anchor,setAnchor] = useState("");
  const [name,setName] = useState("");
  if (invalid || !shifts.length) return <div id="dienstplan" className="staff-schedule-body"><p>
    {invalid ? "Dienstplan zurzeit nicht verfügbar." : loading ? "Dienstplan wird geladen …" : "Noch keine kommenden Schichten eingetragen."}
  </p></div>;

  const names = [...new Set(shifts.flatMap(s=>s.names))].sort((a,b)=>a.localeCompare(b,"de"));
  const activeName = names.includes(name) ? name : "";
  const filtered = shifts.filter(s=>!activeName || s.names.includes(activeName));
  const periods = [...new Set(filtered.map(s=>period(s.date,view)))].sort();
  const requested = period(anchor || filtered[0].date,view);
  const current = periods.includes(requested) ? requested : periods[0];
  const index = periods.indexOf(current);
  const visible = filtered.filter(s=>period(s.date,view)===current);
  const dates = [...new Set(visible.map(s=>s.date))].sort();

  return <div id="dienstplan" className="staff-schedule-body">
    <div className="service-switch" role="group" aria-label="Dienstplanansicht">
      {(["Woche","Monat"] as const).map(v=><button type="button" key={v} aria-pressed={v===view}
        onClick={()=>{setAnchor(dates[0]);setView(v);}}>{v}</button>)}
    </div>
    <div className="roster-period"><h3>{periodLabel(current,view)}</h3>
      {periods.length>1 && <div>{[{delta:-1,label:"Zurück",Icon:ChevronLeft},{delta:1,label:"Weiter",Icon:ChevronRight}].map(({delta,label,Icon})=>
        <button key={label} type="button" aria-label={label} disabled={!periods[index+delta]} onClick={()=>setAnchor(periods[index+delta])}><Icon size={18}/></button>)}</div>}
    </div>
    <label>Vorname<select value={activeName} onChange={e=>setName(e.target.value)}>
      <option value="">Ganzes Team</option>{names.map(n=><option key={n}>{n}</option>)}</select></label>
    {dates.map(date => {
      const day = atNoon(date);
      return <section key={date} className="roster-day">
        <h4><time dateTime={date}>
          <span className="roster-date-number">{day.getUTCDate()}</span>
          <span className="roster-date-copy"><span>{weekday.format(day)}</span><small>{monthYear.format(day)}</small></span>
        </time></h4>
        <dl>{visible.filter(shift => shift.date === date).map((shift, index) => {
          const Icon = roleIcon(shift.role);
          return <div key={index} className="roster-role">
            <dt><Icon size={15} aria-hidden="true"/><span>{shift.role || "Team"}</span></dt>
            <dd>
              {shift.start && <small>{shift.start} Uhr</small>}
              <span className="roster-names">{shift.names.map(person =>
                <span className="roster-name" key={person} data-match={person === activeName}>{person}</span>
              )}</span>
            </dd>
          </div>;
        })}</dl>
      </section>;
    })}
  </div>;
}
