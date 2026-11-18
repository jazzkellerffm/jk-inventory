"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { TrendingUp } from "lucide-react";
import type { BattleFeed } from "@/lib/staff/battle";
import { ranking, summarizeMix, latestCompletedPair, type BattleNight, type Format } from "@/lib/staff/battle-math";
import { ticketCategories } from "@/lib/staff/entitlements";
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
  const jam=day===3;nights.push({id:"demo"+offset,name:names[jam?"jam":"nyjb"],date:d.toISOString().slice(0,10),format:jam?"jam":"nyjb",packages:jam?22:26,guests:jam?49:56,drinks:jam?17:6,unknown:0,recent:jam?18:10,previous:jam?6:7,cents:jam?64000:78000,complete:true,isNew:false,mix:jam?{Club:26,"Club Plus":9,Premium:8,VIP:6,"Worldstar VIP":0,"Weitere Tickets":0}:{Club:42,"Club Plus":2,Premium:4,VIP:4,"Worldstar VIP":4,"Weitere Tickets":0},vipTables:jam?2:1,worldstarTables:jam?0:1,vipPackages:jam?[{category:"VIP",size:2,count:1},{category:"VIP",size:4,count:1}]:[{category:"VIP",size:4,count:1},{category:"Worldstar VIP",size:4,count:1}]});
 }return {month:today.slice(0,7),today,asOf:Date.now(),nights,upcoming:nights.filter(n=>n.date>=today),revenueAvailable:true};
}
export function FormatPerformance({example=false}:{example?:boolean}){
 const [format,setFormat]=useState<Format>("jam");
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
  async function refresh(){setLoading(true);try{const res=await fetch("/api/staff/battle?month="+month,{signal:controller.signal,cache:"no-store"});if(!res.ok)throw Error();const value:BattleFeed=await res.json();if(!controller.signal.aborted){setFeed(value);setFailed(false);}}catch{if(!controller.signal.aborted)setFailed(true);}finally{if(!controller.signal.aborted)setLoading(false);}}
  void refresh();const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},300000);return()=>{controller.abort();clearInterval(timer);};
 },[active,example,month,retry]);
 const shown=feed&&(example||feed.month===month)?feed:null;
 const completed=(shown?.nights??[]).filter(n=>n.format===format&&n.date<shown!.today).sort((a,b)=>a.date.localeCompare(b.date));
 const upcoming=(shown?.upcoming??[]).filter(n=>n.format===format).sort((a,b)=>a.date.localeCompare(b.date));
 const rows=mode==="month"?completed:mode==="last"?completed.slice(-1):upcoming.slice(0,1);
 const stats=ranking(rows).find(s=>s.format===format)!;
 const [metric,setMetric]=useState<"guests"|"drinks"|"cents">("guests");
 const title=format==="jam"?"Jazz Jam Session":"New York Jazz Bar";
 const labels={guests:"Gebuchte Gäste",drinks:"Gebuchte Included Drinks",cents:"SumUp-Abendumsatz"};
 const value=(n:BattleNight)=>(metric==="guests"||metric==="drinks")&&n.unknown?null:n[metric];
 const peak=Math.max(1,...rows.map(n=>value(n)??0));
 const display=(v:number|null,key:string)=>v===null?"–":key==="cents"?euro.format(v/100):number.format(v);
 const mix=summarizeMix(rows);
 const pair=shown?latestCompletedPair(shown.nights,shown.today):null;
 const vipNights=rows.filter(n=>n.vipTables||n.worldstarTables);
 return <div ref={root} className={styles.body} data-format={format}>
  <div className={`service-switch ${styles.formatTabs}`} role="group" aria-label="Format auswählen">{(["jam","nyjb"] as const).map(f=><button key={f} type="button" aria-pressed={format===f} onClick={()=>setFormat(f)}>{f==="jam"?"Jam Session":"New York Jazz Bar"}</button>)}</div>
  <header className={styles.hero}>
   <h2 className={styles.title}>{title}</h2>
   <div className={styles.artwork}>
    <Image className={styles.poster} src={format==="jam"?"/branding/jam-performance.png":"/branding/nyjb-performance.jpg"} fill sizes="(max-width: 640px) 90vw, 600px" alt={names[format]} unoptimized/>
   </div>
  </header>
  <div className={styles.toolbar}><label>Monat<select value={month} disabled={example} onChange={e=>{setMonth(e.target.value);setMode("month");}}>{months.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></label><button type="button" onClick={()=>setRetry(x=>x+1)} disabled={loading||example}>{loading?"Aktualisiert …":"Aktualisieren"}</button></div>
  <div className={`service-switch ${styles.tabs}`} role="group" aria-label="Zeitraum auswählen">{([['month','Monat'],['last','Letzter Abend'],['next','Nächster Abend']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>
  {failed&&<p role="status">Daten gerade nicht erreichbar. {shown?"Letzter geladener Stand bleibt sichtbar.":"Bitte erneut versuchen."}</p>}
  {!shown&&!failed?<TicketLoader label="Abende und Buchungen werden geladen"/>:shown&&<>
   <p className={styles.scope}>{mode==="month"?`${rows.length} abgeschlossene Abende · Durchschnitt je Abend`:rows.length?date(rows[0].date)+(mode==="next"?" · Aktueller Buchungsstand":" · Abgeschlossen"):"In diesem Zeitraum ist noch kein Abend verfügbar."}</p>
   {mode!=="next"&&!shown.revenueAvailable&&<p className={styles.note}>Historische SumUp-Umsätze konnten nicht geladen werden. Gäste und Drinks bleiben verfügbar.</p>}
   <dl className={styles.metrics}>{(["guests","drinks","cents"] as const).map(key=><div key={key}><dt>{labels[key]}{mode==="month"?" · Ø / Abend":""}</dt><dd>{display(mode==="next"&&key==="cents"?null:stats[key],key)}</dd></div>)}</dl>
   {mode==="month"&&<section className={styles.history}>
    <div className={styles.chartHeading}><h3>Abend für Abend</h3><label><span className={styles.srOnly}>Kennzahl im Diagramm</span><select value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
    {rows.length&&rows.every(n=>value(n)===null)?<p className={styles.emptyChart}>Für diese Abende sind derzeit keine zugeordneten SumUp-Umsätze verfügbar.</p>:rows.length?<div className={styles.chart} role="list" aria-label={labels[metric]+" je Abend"}>{rows.map(n=>{const v=value(n);return <div className={styles.column} key={n.id} role="listitem" aria-label={date(n.date)+": "+display(v,metric)}><strong>{display(v,metric)}</strong><div className={styles.barSpace}><span data-peak={v!==null&&v===peak} style={{height:v===null?0:`${v/peak*100}%`}}/></div><span>{date(n.date)}</span></div>;})}</div>:<p>Noch keine abgeschlossenen Abende in diesem Monat.</p>}
    <p className={styles.note}>„–“ bedeutet nicht verfügbar, nicht 0 €.</p>
   </section>}
   <div className={styles.perGuest}><span>SumUp pro gebuchtem Gast</span><strong>{mode!=="next"&&stats.cents!==null&&stats.guests!==null&&stats.guests>0?new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(stats.cents/stats.guests/100):"–"}</strong></div>
   <section className={styles.mix}><h3>Wer bucht welches Ticket?</h3><p className={styles.note}>{mode==="month"?"Gesamt im gewählten Monat · abgeschlossene Abende":"Ausgewählter Abend"} · gebuchte Gäste, inklusive VIP</p>
    {mix?<>{ticketCategories.filter(c=>mix.mix[c]>0||["Club","Club Plus","Premium","VIP"].includes(c)).map(c=><div className={styles.mixRow} key={c}><div><b>{c}</b><strong>{mix.mix[c]} <small>Gäste</small></strong></div><div className={styles.slimTrack}><span style={{width:mix.guests?`${mix.mix[c]/mix.guests*100}%`:"0%"}}/></div></div>)}<p className={styles.note}>{mix.guests} Gäste insgesamt · Gruppenpakete nach Personenzahl</p>
    <div className={styles.drinkShare}><div className={styles.ring} style={{background:`conic-gradient(var(--format-dark) ${mix.guests?Math.min(100,mix.drinks/mix.guests*100):0}%,var(--format-soft) 0)`}}><strong>{mix.guests?Math.round(mix.drinks/mix.guests*100)+"%":"–"}</strong></div><div><h4>Included Drinks</h4><p>{mix.drinks} gebuchte Drinks bei {mix.guests} Gästen</p></div></div></>:<p>Ticketmix noch nicht vollständig verfügbar.</p>}
   </section>
   <section className={styles.vip}><h3>VIP-Abende</h3><p className={styles.note}>VIP-Pakete als gebuchte Tische · Gäste bereits in der Gesamtzahl enthalten</p>{rows.length?vipNights.length?vipNights.map(n=><article key={n.id}><div className={styles.vipHeading}><b>{date(n.date)}</b><span>{n.vipTables+n.worldstarTables} {n.vipTables+n.worldstarTables===1?"Tisch":"Tische"}</span></div><div className={styles.vipPackages}>{n.vipPackages?.length?n.vipPackages.slice().sort((a,b)=>a.category.localeCompare(b.category)||a.size-b.size).map(p=><span key={p.category+p.size}><strong>{p.count} × {p.category}</strong> {p.size>0?`für ${p.size}`:"· Größe unbekannt"}</span>):<span>Paketgrößen noch nicht verfügbar</span>}</div><small>{n.vipPackages?.length&&!n.vipPackages.some(p=>!p.size)?`${n.vipPackages.reduce((sum,p)=>sum+p.size*p.count,0)} VIP-Gäste insgesamt`:"Gästezahl noch nicht vollständig verfügbar"}</small></article>):<p>Keine VIP-Tische für diese Auswahl gebucht.</p>:<p>Noch kein Abend in dieser Auswahl.</p>}</section>
   <section className={styles.movers}><h3><TrendingUp size={20}/> Buchungen in Bewegung</h3><p>Kommende Abende · dunkler Abschnitt: neu gebuchte Gäste in den letzten 7 Tagen.</p>{upcoming.length?upcoming.slice(0,6).map(n=><article key={n.id}><div className={styles.upcomingHeading}><h4>{date(n.date)}</h4><strong>{n.unknown?"–":n.guests}</strong></div><p>{n.name}</p><div className={styles.slimTrack}><span style={{width:`${Math.min(100,n.guests/Math.max(1,...upcoming.map(x=>x.guests))*100)}%`}}>{n.complete&&!n.unknown&&<i style={{width:`${n.guests?Math.min(100,n.recent/n.guests*100):0}%`}}/>}</span></div><small>{n.complete&&!n.unknown?`+${n.recent} Gäste in 7 Tagen · davor +${n.previous}`:"Buchungszuwachs noch nicht vollständig verfügbar"}</small></article>):<p>Noch keine kommenden Abende verfügbar.</p>}</section>
   <section className={styles.race}><h3>Jam <svg viewBox="0 0 72 110" aria-hidden="true"><path d="M44 7 12 59h23l-8 39 33-54H38z" fill="#ffcf35"/></svg> NYJB</h3><p className={styles.note}>Letztes abgeschlossenes Wochenpaar im gewählten Monat</p>{pair?<><p>{date(pair[0].date)} / {date(pair[1].date)}</p>{!pair.some(n=>n.unknown)&&<p className={styles.raceResult}>{pair[0].guests===pair[1].guests?"Gleich viele gebuchte Gäste":`${Math.abs(pair[0].guests-pair[1].guests)} gebuchte Gäste ${pair[format==="jam"?0:1].guests>pair[format==="jam"?1:0].guests?"mehr":"weniger"} als ${format==="jam"?"NYJB":"die Jam Session"}`}</p>}{(["guests","drinks","cents"] as const).map(key=>{const vals=pair.map(n=>(key!=="cents"&&n.unknown)?null:n[key]);const max=Math.max(1,...vals.map(v=>v??0));return <div className={styles.raceMetric} key={key}><h4>{labels[key]}</h4>{pair.map((n,i)=><div className={styles.raceRow} data-format={n.format} key={n.id}><span>{n.format==="jam"?"Jam":"NYJB"}</span><div className={styles.slimTrack}><span style={{width:`${(vals[i]??0)/max*100}%`}}/></div><b>{display(vals[i],key)}</b></div>)}</div>;})}<p className={styles.note}>VIP-Gäste zählen mit. Buchungen, keine gemessene Anwesenheit.</p></>:<p>Noch kein vollständiges abgeschlossenes Mittwoch-/Donnerstag-Paar verfügbar.</p>}</section>
   <details className={styles.explanation}><summary>So wird gezählt</summary><p>Ticketmix: gültige Tickets nach den bestehenden Kategorien Club, Club Plus, Premium, VIP und Worldstar VIP. Ein Paket für zwei zählt als zwei Gäste. VIP-Pakete werden zusätzlich als Tische ausgewiesen, ihre Gäste werden nicht doppelt gezählt. Unbekannte Kategorien bleiben unter „Weitere Tickets“ sichtbar.</p><p>Gäste und Included Drinks stammen aus gültigen Ticketpaketen. Included Drinks sind gebuchte Ansprüche, keine eingelösten Getränke. Fehlende oder unbekannte Daten werden als „–“ angezeigt.</p><p>Nur reguläre {format==="jam"?"Mittwoch-Jams":"Donnerstag-NYJB-Abende"}. Sondertermine bleiben außen vor. Der Monat zeigt Durchschnittswerte abgeschlossener Abende; das Diagramm die einzelnen Abende. Kommende Abende zeigen den Buchungsstand ohne Umsatz.</p><p>SumUp: erfolgreiche EUR-Zahlungen des Betriebsabends, Tageswechsel 03:00 Uhr. Mehrere Events am selben Datum oder fehlende Daten verhindern eine eindeutige Zuordnung. Pro Gast = SumUp-Umsatz geteilt durch gebuchte Gäste, keine tatsächliche Anwesenheitszählung.</p></details>
   <p className={styles.stamp}>{example?"Beispieldaten · keine echten Ergebnisse":"Stand "+new Intl.DateTimeFormat("de-DE",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Berlin"}).format(shown.asOf)}</p>
  </>}
 </div>;
}
