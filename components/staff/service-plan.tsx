"use client";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import type { Booking, TicketNight } from "@/lib/staff/tickets";

import { combine, includedSupply, packageSize, type Supply } from "@/lib/staff/entitlements";

const date = new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",timeZone:"Europe/Berlin"});
const sample: Booking[] = [
  {id:"sample",name:"Meyer",tickets:["Club – 2 Guests"],extras:[{label:"Hummus-Platte",quantity:2,kind:"food"},{label:"Flasche Crémant",quantity:1,kind:"wine"}]},
  {id:"vip",name:"Sommer",tickets:["VIP Table – 2 Guests · incl. 1 Bottle Crémant"],extras:[]},
];

function Pills({items}:{items:Supply[]}) {
  return <div className="service-pills">{combine(items).map(item =>
    <span key={item.kind+item.label} data-kind={item.kind}>{item.quantity} × {item.label}{item.kind==="included" ? " inklusive" : ""}</span>
  )}</div>;
}

function List({id,example}:{id:string;example:boolean}) {
  const [rows,setRows] = useState<Booking[] | null>(example ? (id === "0" ? sample : []) : null);
  const [error,setError] = useState(false);
  const [view,setView] = useState("Vorbestellungen");
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
  const supplies = rows?.flatMap(row => [...row.extras,...row.tickets.flatMap(includedSupply)]) ?? [];
  const visible = rows?.filter(row => view === "Gästeliste" || row.extras.length || row.tickets.some(ticket=>includedSupply(ticket).length));
  const bottles = supplies.reduce((total,item) => total + (item.label.startsWith("Flasche ") ? item.quantity : 0),0);
  return <>
    <div className="service-switch" role="group" aria-label="Ansicht">{["Vorbestellungen","Gästeliste"].map(label =>
      <button type="button" key={label} aria-pressed={view===label} onClick={()=>setView(label)}>{label}</button>)}</div>
    {error && <p role="status">Aktualisierung fehlgeschlagen.</p>}
    {!rows && !error && <p>Buchungen werden geladen …</p>}
    {view === "Vorbestellungen" && supplies.length > 0 && <div className="service-prep">
      <h3>Für die Vorbereitung</h3><Pills items={supplies}/>
      {bottles > 0 && <small>{bottles} {bottles===1 ? "Flasche" : "Flaschen"} insgesamt bereitstellen</small>}</div>}
    {visible?.length===0 && <p>{view === "Vorbestellungen" ? "Keine Vorbestellungen oder Flaschen- und Glasleistungen für diesen Abend." : "Keine Buchungen für diesen Termin."}</p>}
    {visible?.map(row=>{
      const included = row.tickets.flatMap(includedSupply);
      const sizes = row.tickets.map(packageSize);
      return <article key={row.id}><div className="service-person"><strong>{row.name}</strong>
        {sizes.length>0 && sizes.every(Boolean) && <span>{sizes.reduce((a,b)=>a+b,0)} Gäste</span>}</div>
        <small>{row.tickets.join(" · ")}</small>
        {row.extras.length>0 && <><h4>Bezahlte Vorbestellungen</h4><Pills items={row.extras}/></>}
        {included.length>0 && <><h4>Inklusivleistung</h4><Pills items={included}/></>}
      </article>;
    })}</>;

}

export function ServicePlan({nights,example}:{nights:TicketNight[];example:boolean}){
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState("");
  const id=nights.find(n=>n.id===selected)?.id ?? nights[0]?.id;
  return <details id="service-door" className="staff-panel staff-service" onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary><ClipboardList size={20}/> Service &amp; Door</summary>
    {open && id && <><label>Veranstaltung<select value={id} onChange={e=>setSelected(e.target.value)}>
      {nights.map(n=><option key={n.id} value={n.id}>{date.format(n.start*1000)} · {n.name}</option>)}</select></label>
      <List key={id} id={id} example={example}/></>}
    {open && !id && <p>Der Plan erscheint, sobald Termine aus Ticket Tailor vorliegen.</p>}
  </details>;
}
