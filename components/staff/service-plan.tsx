"use client";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import type { Booking, TicketNight } from "@/lib/staff/tickets";

const date = new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",timeZone:"Europe/Berlin"});
const sample: Booking[] = [{id:"sample",name:"Meyer",tickets:["Club – 2 Guests"],extras:["1 × Flasche Crémant"]}];

function List({id,example}:{id:string;example:boolean}) {
  const [rows,setRows] = useState<Booking[] | null>(example ? (id === "0" ? sample : []) : null);
  const [error,setError] = useState(false);
  const [onlyExtras,setOnlyExtras] = useState(false);
  useEffect(()=>{
    if (example) return;
    const controller=new AbortController();
    let busy=false;
    async function update() {
      if (busy || document.hidden) return;
      busy=true;
      try {
        const res=await fetch("/api/staff/service?event="+encodeURIComponent(id),{cache:"no-store",signal:controller.signal});
        if(res.status===401) { window.location.replace("/staff"); return; }
        if(!res.ok) throw new Error();
        const data:Booking[]=await res.json();
        if(!controller.signal.aborted){setRows(data);setError(false);}
      } catch {if(!controller.signal.aborted)setError(true);}
      finally {busy=false;}
    }
    void update();
    const timer=setInterval(update,60000);
    document.addEventListener("visibilitychange",update);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener("visibilitychange",update);};
  },[id,example]);
  const visible=rows?.filter(row=>!onlyExtras || row.extras.length);
  return <><label><input type="checkbox" checked={onlyExtras} onChange={e=>setOnlyExtras(e.target.checked)}/> Nur separate Add-ons</label>
    {error && <p role="status">Aktualisierung fehlgeschlagen.</p>}
    {!rows && !error && <p>Buchungen werden geladen …</p>}
    {visible?.length===0 && <p>{onlyExtras ? "Keine separaten Add-ons." : "Keine Buchungen für diesen Termin."}</p>}
    {visible?.map(row=><article key={row.id}><strong>{row.name}</strong>
      {row.tickets.map((t,i)=><div key={i}>{t}</div>)}
      {row.extras.map((t,i)=><b key={i}>Add-on · {t}</b>)}</article>)}</>;
}

export function ServicePlan({nights,example}:{nights:TicketNight[];example:boolean}){
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState("");
  const id=nights.find(n=>n.id===selected)?.id ?? nights[0]?.id;
  return <details className="staff-panel staff-service" onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary><ClipboardList size={20}/> Service &amp; Door</summary>
    {open && id && <><label>Veranstaltung<select value={id} onChange={e=>setSelected(e.target.value)}>
      {nights.map(n=><option key={n.id} value={n.id}>{date.format(n.start*1000)} · {n.name}</option>)}</select></label>
      <List key={id} id={id} example={example}/></>}
    {open && !id && <p>Der Plan erscheint, sobald Termine aus Ticket Tailor vorliegen.</p>}
  </details>;
}
