"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import type { BattleFeed } from "@/lib/staff/battle";
import { ranking, risingEvents, type BattleNight, type Format } from "@/lib/staff/battle-math";
import { serviceDate } from "@/lib/staff/service-day";
import { TicketLoader } from "./ticket-loader";
import styles from "./format-battle.module.css";
const number=new Intl.NumberFormat("de-DE",{maximumFractionDigits:2});
const euro=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const date=(s:string)=>new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",timeZone:"UTC"}).format(new Date(s+"T12:00:00Z"));
const names={jam:"Famous Jazz Jam",nyjb:"New York Jazz Bar"};
type Mode="month"|"last"|"next";
function demoFeed():BattleFeed{
 const today=serviceDate(Date.now());const nights:BattleNight[]=[];
 for(let offset=-14;offset<=14;offset++){
  const d=new Date(today+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+offset);const day=d.getUTCDay();if(day!==3&&day!==4)continue;
  const jam=day===3;nights.push({id:"demo"+offset,name:names[jam?"jam":"nyjb"],date:d.toISOString().slice(0,10),format:jam?"jam":"nyjb",packages:jam?22:26,guests:jam?49:56,drinks:jam?17:6,unknown:0,recent:jam?18:10,previous:jam?6:7,cents:jam?64000:78000,complete:true,isNew:false});
 }return {month:today.slice(0,7),today,asOf:Date.now(),nights,upcoming:nights.filter(n=>n.date>=today),revenueAvailable:true};
}
export function FormatPerformance({format,example=false}:{format:Format;example?:boolean}){
 const root=useRef<HTMLDivElement>(null);
 const [active,setActive]=useState(false);
 const [month,setMonth]=useState(()=>serviceDate(Date.now()).slice(0,7));
 const [mode,setMode]=useState<Mode>("month");
 const [feed,setFeed]=useState<BattleFeed|null>(()=>example?demoFeed():null);
 const [loading,setLoading]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const [months]=useState(()=>{const d=new Date(serviceDate(Date.now()).slice(0,7)+"-01T12:00:00Z");return Array.from({length:6},(_,i)=>{const x=new Date(d);x.setUTCMonth(x.getUTCMonth()-i);return {value:x.toISOString().slice(0,7),label:new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric",timeZone:"UTC"}).format(x)};});});
 useEffect(()=>{const panel=root.current?.closest("details");if(!panel)return;const toggle=()=>setActive(panel.open);toggle();panel.addEventListener("toggle",toggle);return()=>panel.removeEventListener("toggle",toggle);},[]);
 useEffect(()=>{
  if(!active||example)return;const controller=new AbortController();
  async function refresh(){setLoading(true);setFailed(false);try{const res=await fetch("/api/staff/battle?month="+month,{signal:controller.signal,cache:"no-store"});if(!res.ok)throw Error();const value:BattleFeed=await res.json();if(!controller.signal.aborted)setFeed(value);}catch{if(!controller.signal.aborted)setFailed(true);}finally{if(!controller.signal.aborted)setLoading(false);}}
  void refresh();const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},300000);return()=>{controller.abort();clearInterval(timer);};
 },[active,example,month,retry]);
 const shown=feed&&(example||feed.month===month)?feed:null;
 const completed=(shown?.nights??[]).filter(n=>n.format===format&&n.date<shown!.today).sort((a,b)=>a.date.localeCompare(b.date));
 const upcoming=(shown?.upcoming??[]).filter(n=>n.format===format).sort((a,b)=>a.date.localeCompare(b.date));
 const rows=mode==="month"?completed:mode==="last"?completed.slice(-1):upcoming.slice(0,1);
 const stats=ranking(rows).find(s=>s.format===format)!;
 const [metric,setMetric]=useState<"guests"|"packages"|"drinks"|"cents">("guests");
 const title=format==="jam"?"Jazz Jam Session Performance":"New York Jazz Bar Performance";
 const labels={guests:"Gebuchte Gäste",packages:"Bezahlte Online-Pakete",drinks:"Gebuchte Included Drinks",cents:"SumUp-Abendumsatz"};
 const value=(n:BattleNight)=>metric==="packages"&&!n.complete?null:(metric==="guests"||metric==="drinks")&&n.unknown?null:n[metric];
 const peak=Math.max(1,...rows.map(n=>value(n)??0));
 const display=(v:number|null,key:string)=>v===null?"–":key==="cents"?euro.format(v/100):number.format(v);
 const movers=risingEvents(upcoming);
 return <div ref={root} className={styles.body}>
  <div className={styles.hero}>
   <Image className={styles.logo} src={format==="jam"?"/branding/jam-white.svg":"/branding/nyjb-white.svg"} width={format==="jam"?257:967} height={format==="jam"?227:967} alt={names[format]} unoptimized/>
   <h2>{title}</h2><p>{format==="jam"?"Mittwochs im Jazzkeller":"Donnerstags im Jazzkeller"}</p>
  </div>
  <div className={styles.toolbar}><label>Monat<select value={month} disabled={example} onChange={e=>{setMonth(e.target.value);setMode("month");}}>{months.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></label><button type="button" onClick={()=>setRetry(x=>x+1)} disabled={loading||example}>{loading?"Aktualisiert …":"Aktualisieren"}</button></div>
  <div className={styles.tabs} role="group" aria-label="Zeitraum auswählen">{([['month','Monat'],['last','Letzter Abend'],['next','Nächster Abend']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>
  {failed&&<p role="status">Daten gerade nicht erreichbar. {shown?"Letzter geladener Stand bleibt sichtbar.":"Bitte erneut versuchen."}</p>}
  {!shown&&!failed?<TicketLoader label="Abende und Buchungen werden geladen"/>:shown&&<>
   <p className={styles.scope}>{mode==="month"?`${rows.length} abgeschlossene Abende · Durchschnitt je Abend`:rows.length?date(rows[0].date)+(mode==="next"?" · Aktueller Buchungsstand":" · Abgeschlossen"):"In diesem Zeitraum ist noch kein Abend verfügbar."}</p>
   <dl className={styles.metrics}>{(["guests","packages","drinks","cents"] as const).map(key=><div key={key}><dt>{labels[key]}{mode==="month"?" · Ø / Abend":""}</dt><dd>{display(mode==="next"&&key==="cents"?null:stats[key],key)}</dd></div>)}</dl>
   {mode==="month"&&<section className={styles.history}>
    <div className={styles.chartHeading}><h3>Abend für Abend</h3><label><span className={styles.srOnly}>Kennzahl im Diagramm</span><select value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
    {rows.length?<div className={styles.chart} role="list" aria-label={labels[metric]+" je Abend"}>{rows.map(n=>{const v=value(n);return <div className={styles.column} key={n.id} role="listitem" aria-label={date(n.date)+": "+display(v,metric)}><strong>{display(v,metric)}</strong><div className={styles.barSpace}><span data-peak={v!==null&&v===peak} style={{height:v===null?0:`${v/peak*100}%`}}/></div><span>{date(n.date)}</span></div>;})}</div>:<p>Noch keine abgeschlossenen Abende in diesem Monat.</p>}
    <p className={styles.note}>Fehlende Daten erscheinen als „–“.</p>
   </section>}
   <div className={styles.perGuest}><span>SumUp pro gebuchtem Gast</span><strong>{mode!=="next"&&stats.cents!==null&&stats.guests!==null&&stats.guests>0?new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(stats.cents/stats.guests/100):"–"}</strong></div>
   <section className={styles.movers}><h3><TrendingUp size={20}/> Buchungen in Bewegung</h3><p>Die kommenden {format==="jam"?"Jam Sessions":"NYJB-Abende"} · letzte 7 Tage gegenüber den 7 Tagen davor.</p>{movers.length?movers.map(n=><article key={n.id}><div><h4>{date(n.date)} · {n.name}</h4><p>+{n.recent} Gäste · davor +{n.previous}</p><small>{n.guests} Gäste insgesamt</small></div><strong><ArrowUpRight size={17}/>{n.recent-n.previous}</strong></article>):<p>Noch kein Abend mit mindestens drei neuen Gästen und zusätzlichem Zuwachs gegenüber der Vorwoche.</p>}</section>
   <details className={styles.explanation}><summary>So wird gezählt</summary><p>Bezahlte Online-Pakete: gültige Tickets aus abgeschlossenen Bestellungen mit bezahlten Ticketpositionen und positiver Online-Zahlung. Kostenlose, stornierte und vollständig erstattete Bestellungen zählen nicht. Ein Zweierpaket ist ein Paket, aber zwei Gäste.</p><p>Gäste und Included Drinks stammen aus gültigen Ticketpaketen. Included Drinks sind gebuchte Ansprüche, keine eingelösten Getränke. Fehlende oder unbekannte Daten werden als „–“ angezeigt.</p><p>Nur reguläre {format==="jam"?"Mittwoch-Jams":"Donnerstag-NYJB-Abende"}. Sondertermine bleiben außen vor. Der Monat zeigt Durchschnittswerte abgeschlossener Abende; das Diagramm die einzelnen Abende. Kommende Abende zeigen den Buchungsstand ohne Umsatz.</p><p>SumUp: erfolgreiche EUR-Zahlungen des Betriebsabends, Tageswechsel 03:00 Uhr. Mehrere Events am selben Datum oder fehlende Daten verhindern eine eindeutige Zuordnung. Pro Gast = SumUp-Umsatz geteilt durch gebuchte Gäste, keine tatsächliche Anwesenheitszählung.</p></details>
   <p className={styles.stamp}>{example?"Beispieldaten · keine echten Ergebnisse":"Stand "+new Intl.DateTimeFormat("de-DE",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Berlin"}).format(shown.asOf)}</p>
  </>}
 </div>;
}
