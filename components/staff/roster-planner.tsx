"use client";
import {useState} from "react";
import type {Shift} from "@/lib/staff/types";
import {weekDay} from "@/lib/staff/ticket-weeks";

const team=["Adri","Hamad","Joab","Adriano","Saven","Laura","Ana"];
const roles=["Bar","Backstage","Service","Door"];
const dayLabel=new Intl.DateTimeFormat("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",timeZone:"UTC"});
type Props={demo:boolean;shifts:Shift[];onPublish:(week:string,rows:Shift[])=>void};
export function RosterPlanner({demo,shifts,onPublish}:Props){
  const [week,setWeek]=useState(weekDay(demo?1794859200:Date.now()/1000,0));
  const [key,setKey]=useState("");
  const [draft,setDraft]=useState<Shift[]|null>(null);
  const [days,setDays]=useState<string[]>([]);
  const [version,setVersion]=useState("");
  const [person,setPerson]=useState("");
  const [custom,setCustom]=useState("");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [dirty,setDirty]=useState(false);
  const monday=Date.parse(week+"T12:00:00Z")/1000;
  const dates=Array.from({length:7},(_,i)=>weekDay(monday,i));
  const names=[...new Set([...team,...shifts.flatMap(s=>s.names),...(draft??[]).flatMap(s=>s.names),person].filter(Boolean))];
  async function request(action:string){
    const res=await fetch("/api/staff/roster",{method:"POST",headers:{"Content-Type":"application/json","x-planner-key":key},
      body:JSON.stringify({action,week,version,rows:draft})});
    if(!res.ok) throw new Error(res.status===409?"Woche zwischenzeitlich geändert. Bitte neu laden.":res.status===403?"Planungsschlüssel prüfen.":res.status===401?"Bitte erneut beim Teamzugang anmelden.":"Dienstplanspeicher derzeit nicht verfügbar.");
    return res.json();
  }
  async function load(){
    setBusy(true);setNote("");
    try {
      const data=demo?{rows:shifts.filter(s=>dates.includes(s.date)),version:""}:await request("read");
      const rows:Shift[]=data.rows;
      setVersion(data.version);setDraft(rows);setDirty(false);
      setDays([...new Set([...dates.slice(2,6),...rows.map(s=>s.date)])].sort());
    }catch(e){setNote((e as Error).message);}finally{setBusy(false);}
  }
  async function publish(){
    if(!draft)return;
    setBusy(true);
    try {
      if(!demo)setVersion((await request("publish")).version);
      onPublish(week,draft);setDirty(false);setNote(demo?"In dieser Browser-Demo veröffentlicht.":"Woche für das Team veröffentlicht.");
    }catch(e){setNote((e as Error).message);}finally{setBusy(false);}
  }
  function assign(date:string,role:string,name:string){
    if(!name || !names.includes(name))return;
    setDraft(rows=>{
      const list=rows??[];
      if(list.some(s=>s.date===date && s.role===role && s.names.includes(name)))return list;
      const target=list.find(s=>s.date===date && s.role===role);
      return target?list.map(s=>s===target?{...s,names:[...s.names,name]}:s):[...list,{date,role,names:[name]}];
    });setDirty(true);setNote("");
  }
  return <details id="wochenplanung" className="staff-panel roster-admin"><summary>Wochenplan bearbeiten</summary>
    <fieldset disabled={busy}><label>Planungswoche<input type="date" value={week} onChange={e=>{
      if(!e.target.value || (dirty && !window.confirm("Unveröffentlichte Änderungen verwerfen?")))return;
      setWeek(weekDay(Date.parse(e.target.value+"T12:00:00Z")/1000,0));setDraft(null);setNote("");setDirty(false);
    }}/></label>
    {!demo && <label>Planungsschlüssel<input type="password" value={key} onChange={e=>setKey(e.target.value)} autoComplete="off"/></label>}
    <button type="button" onClick={()=>{if(!dirty || window.confirm("Entwurf neu laden?"))void load();}}>Woche laden</button>
    {draft && <><h3>Team</h3><div className="planner-people">{names.map(n=><button type="button" key={n} draggable onDragStart={e=>e.dataTransfer.setData("text/plain",n)} aria-pressed={n===person} onClick={()=>setPerson(n)}>{n}</button>)}</div>
      <label>Weiterer Vorname<input value={custom} maxLength={50} onChange={e=>setCustom(e.target.value)}/></label>
      <button type="button" disabled={!custom.trim()} onClick={()=>{setPerson(custom.trim());setCustom("");}}>Namen auswählen</button>
      <p>Namen auf eine Rolle ziehen oder Namen und dann Rolle antippen.</p>
      <label>Zusätzlicher Tag<select value="" onChange={e=>{if(e.target.value)setDays([...days,e.target.value].sort());}}>
        <option value="">Tag hinzufügen</option>{dates.filter(d=>!days.includes(d)).map(d=><option key={d} value={d}>{dayLabel.format(new Date(d+"T12:00:00Z"))}</option>)}</select></label>
      {days.map(d=><section className="roster-day" key={d}><h4>{dayLabel.format(new Date(d+"T12:00:00Z"))}</h4>
        {[...new Set([...roles,...draft.filter(s=>s.date===d).map(s=>s.role??"Team")])].map(role=><div className="planner-slot" key={role}
          onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();assign(d,role,e.dataTransfer.getData("text/plain"));}}>
          <button type="button" disabled={!person} onClick={()=>assign(d,role,person)}>{role} +</button>
          {draft.filter(s=>s.date===d && (s.role??"Team")===role).map(s=>s.names.map(n=><button type="button" key={[d,role,s.start,n].join("-")} aria-label={n+" aus "+role+" entfernen"} onClick={()=>{
            setDraft(draft.map(row=>row===s?{...row,names:row.names.filter(v=>v!==n)}:row).filter(row=>row.names.length));setDirty(true);setNote("");
          }}>{n} ×</button>))}</div>)}</section>)}
      <button className="planner-save" type="button" disabled={!dirty} onClick={publish}>Woche veröffentlichen</button></>}
    </fieldset>{note && <p role="status">{note}</p>}</details>;
}
