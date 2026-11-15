"use client";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import type { Booking, TicketNight } from "@/lib/staff/tickets";

import { combine, includedSupply, packageSize, type Supply } from "@/lib/staff/entitlements";

const date = new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",timeZone:"Europe/Berlin"});
const categories = ["Club","Club Plus","Premium","VIP","Weitere Tickets"];
function category(ticket:string) {
  if (/vip/i.test(ticket)) return "VIP";
  if (/premium/i.test(ticket)) return "Premium";
  if (/club\s*(plus|\+)|standard\s*\+/i.test(ticket)) return "Club Plus";
  if (/club|standard/i.test(ticket)) return "Club";
  return "Weitere Tickets";
}

function demoBookings(night:TicketNight):Booking[] {
  const names = ["Meyer","Sommer","Klein","Berger","Roth","Winter","Graf","Fischer","König","Becker","Koch","Wolf","Braun","Weber","Lange"];
  const result:Booking[]=[];
  let drinks=night.drinks, other=night.guests-drinks;
  while (other>0 || drinks>0) {
    const i=result.length;
    const plus=drinks>0 && (other===0 || i%2===1);
    const size=Math.min(plus ? drinks : other, i===0 ? 2 : 4);
    const type=plus ? (i%4===1 ? "Club PLUS" : "Premium") : i===2 ? "VIP Table" : "Club";
    const ticket=type+" – "+size+" Guests"+(plus ? " · incl. "+size+" Drinks" : type==="VIP Table" ? " · incl. 1 Bottle Crémant" : "");
    result.push({id:"demo-"+i,name:names[i%names.length],tickets:[ticket],extras:i===0 ? [{label:"Hummus-Platte",quantity:2,kind:"food"},{label:"Flasche Crémant",quantity:1,kind:"wine"}] : []});
    if (plus) drinks-=size; else other-=size;
  }
  return result;
}

function guestCount(tickets:string[]) {
  const known=tickets.map(packageSize);
  const total=known.reduce((sum,n)=>sum+n,0);
  return known.includes(0) ? total+" Gäste + ungeklärte Paketgröße" : total+(total===1 ? " Gast" : " Gäste");
}

function GuestList({rows}:{rows:Booking[]}) {
  return <div className="door-guests"><h3>{guestCount(rows.flatMap(row=>row.tickets))} insgesamt</h3>
    {categories.map(label=>{
      const entries=rows.map(row=>({...row,tickets:row.tickets.filter(t=>category(t)===label)}))
        .filter(row=>row.tickets.length).sort((a,b)=>a.name.localeCompare(b.name,"de"));
      if (!entries.length) return null;
      return <section key={label}><header><strong>{label}</strong><span>{guestCount(entries.flatMap(row=>row.tickets))}</span></header>
        {entries.map(row=><article key={row.id}><div className="service-person"><strong>{row.name}</strong>
          <span>{guestCount(row.tickets)}</span></div><small>{row.tickets.join(" · ")}</small>
          {row.extras.length>0 && <><h4>Vorbestellungen der Buchung</h4><Pills items={row.extras}/></>}
          <Pills items={row.tickets.flatMap(includedSupply)}/></article>)}</section>;
    })}</div>;
}

function Pills({items}:{items:Supply[]}) {
  return <div className="service-pills">{combine(items).map(item =>
    <span key={item.kind+item.label} data-kind={item.kind}>{item.quantity} × {item.label}{item.kind==="included" ? " inklusive" : ""}</span>
  )}</div>;
}

function List({night,example,view,setView}:{night:TicketNight;example:boolean;view:string;setView:(v:string)=>void}) {
  const id=night.id;
  const [rows,setRows] = useState<Booking[] | null>(()=>example ? demoBookings(night) : null);
  const [error,setError] = useState(false);
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
    {view==="Gästeliste" && rows && rows.length>0 && <GuestList rows={rows}/>}
    {view==="Vorbestellungen" && visible?.map(row=>{
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
  const [view,setView] = useState("Vorbestellungen");
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState("");
  const night=nights.find(n=>n.id===selected) ?? nights[0];
  const id=night?.id;
  return <details id="service-door" className="staff-panel staff-service" onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary><ClipboardList size={20}/> Service &amp; Door</summary>
    {open && id && <><label>Veranstaltung<select value={id} onChange={e=>setSelected(e.target.value)}>
      {nights.map(n=><option key={n.id} value={n.id}>{date.format(n.start*1000)} · {n.name}</option>)}</select></label>
      <List key={id} night={night} example={example} view={view} setView={setView}/></>}
    {open && !id && <p>Der Plan erscheint, sobald Termine aus Ticket Tailor vorliegen.</p>}
  </details>;
}
