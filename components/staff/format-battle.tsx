"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Crown, TrendingUp, ArrowUpRight } from "lucide-react";
import type { BattleFeed } from "@/lib/staff/battle";
import { ranking, risingEvents, type BattleNight } from "@/lib/staff/battle-math";
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
function duels(nights:BattleNight[]){
 return nights.filter(n=>n.format==="jam").flatMap(jam=>{
  const d=new Date(jam.date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+1);const nyjb=nights.find(n=>n.format==="nyjb"&&n.date===d.toISOString().slice(0,10));return nyjb?[[jam,nyjb]]:[];
 });
}
export function FormatBattle({example=false}:{example?:boolean}){
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
 const completed=shown?.nights.filter(n=>n.date<shown.today)??[];
 const last=duels(completed).at(-1)??[];
 const next=duels(shown?.upcoming??[])[0]??[];
 const rows=mode==="month"?completed:mode==="last"?last:next;
 const stats=ranking(rows);const canRank=stats.every(s=>s.count>0&&s.packages!==null);
 const lead=canRank&&stats[0].packages!==stats[1].packages?(stats[0].packages!>stats[1].packages!?"jam":"nyjb"):null;
 const peak=Math.max(1,...stats.map(s=>s.packages??0));
 const movers=risingEvents(shown?.upcoming??[]);
 return <div ref={root} className={styles.body}>
  <div className={styles.hero}><span className={styles.eyebrow}>THE MIDWEEK MATCHUP</span><h2 className={styles.battleTitle}>Jam vs. NYJB</h2><div className={styles.logoDuel}>
   <Image className={styles.jamLogo} src="/branding/jam-champagne.svg" width={257} height={227} alt="The Famous Jazz Jam Session" unoptimized/>
   <span className={styles.powerUp} aria-hidden="true"><svg viewBox="0 0 72 110" fill="none" focusable="false">
    <path d="M45 9 13 61h23l-8 39 33-54H39z" fill="#bd742b" stroke="#172f28" strokeWidth="7" strokeLinejoin="round" transform="translate(1 4)"/>
    <path d="M44 7 12 59h23l-8 39 33-54H38z" fill="#ffcf35" stroke="#172f28" strokeWidth="5" strokeLinejoin="round"/>
    <path d="m40 19-20 34h11" stroke="#fff3a2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="m10 24 1-5m-7 13-4-1m61 47 5 3m-8 6 1 5" stroke="#f9dc78" strokeWidth="2.5" strokeLinecap="round"/>
   </svg><b>VS</b></span>
   <Image className={styles.nyjbLogo} src="/branding/nyjb-white.svg" width={967} height={967} alt="New York Jazz Bar · Jazzkeller" unoptimized/>
  </div><p>Zwei Abende. Ein Keller.</p></div>
  <div className={styles.toolbar}><label>Ranking-Monat<select value={month} disabled={example} onChange={e=>{setMonth(e.target.value);setMode("month");}}>{months.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></label><button type="button" onClick={()=>setRetry(x=>x+1)} disabled={loading||example}>{loading?"Aktualisiert …":"Aktualisieren"}</button></div>
  <div className={styles.tabs} role="group" aria-label="Vergleich auswählen">{([['month','Monatsranking'],['last','Letztes Duell'],['next','Nächstes Duell']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>
  {failed&&<p role="status">Daten gerade nicht erreichbar. {shown?"Letzter geladener Stand bleibt sichtbar.":"Bitte erneut versuchen."}</p>}
  {!shown&&!failed?<TicketLoader label="Abende und Buchungen werden verglichen"/>:shown&&<>
   <div className={styles.scope}>{mode==="month"?"Abgeschlossene Abende · Durchschnitt je Abend":rows.length?date(rows[0].date)+" ↔ "+date(rows[1].date)+(mode==="next"?" · Buchungsstand, noch kein Ergebnis":" · Abgeschlossen"):"In diesem Zeitraum fehlt ein vollständiges Mittwoch–Donnerstag-Paar."}</div>
   <div className={styles.lead}><Crown size={20}/><span>{!canRank?"Ranking noch offen":!lead?"Gleichstand":names[lead]+(mode==="next"?" liegt im Vorverkauf vorn":" führt")}</span></div>
   <p className={styles.caption}>Ranking nach bezahlten Online-Ticketpaketen{mode==="month"?" pro Abend":""}.</p>
   <div className={styles.contenders}>{stats.map(s=><article key={s.format} data-format={s.format} data-leading={lead===s.format}>
    <div className={styles.cardTop}><span>{s.format==="jam"?"MITTWOCH":"DONNERSTAG"}</span>{lead===s.format&&<Crown size={18} aria-label="Führend"/>}</div><h3>{names[s.format]}</h3>
    <strong className={styles.big}>{s.packages===null?"–":number.format(s.packages)}</strong><small>{mode==="month"?"Ø Online-Pakete / Abend":"Online-Pakete"}</small>
    <div className={styles.track}><i style={{width:(s.packages??0)/peak*100+"%"}}/></div><small>{s.count} {s.count===1?"Abend":"Abende"} in der Wertung</small>
   </article>)}</div>
   <div className={styles.metrics}>{([{key:"guests",label:"Gebuchte Gäste"},{key:"drinks",label:"Gebuchte Included Drinks"},{key:"cents",label:"SumUp-Abendumsatz"}] as const).map(({key,label})=>{
    const values=stats.map(s=>mode==="next"&&key==="cents"?null:s[key]);const top=Math.max(1,...values.map(v=>v??0));return <section key={key}><h4>{label}{mode==="month"?" · Ø / Abend":""}</h4>{stats.map((s,i)=><div key={s.format} className={styles.metricRow} data-format={s.format}><span>{s.format==="jam"?"Jam":"NYJB"}</span><div className={styles.track}><i style={{width:(values[i]??0)/top*100+"%"}}/></div><b>{values[i]===null?"–":key==="cents"?euro.format(values[i]!/100):number.format(values[i]!)}</b></div>)}</section>;
   })}</div>
   <section className={styles.perGuest}><h4>SumUp pro gebuchtem Gast</h4><div>{stats.map(s=><span key={s.format}><small>{s.format==="jam"?"Jam":"NYJB"}</small><b>{mode!=="next"&&s.cents!==null&&s.guests!==null&&s.guests>0?new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(s.cents/s.guests/100):"–"}</b></span>)}</div></section>
   {mode==="month"&&<div className={styles.history}><h3>Duell für Duell</h3>{duels(completed).length?duels(completed).map(([a,b])=><div key={a.date}><span>{date(a.date)} / {date(b.date)}</span><b>{a.complete&&b.complete?`${a.packages} : ${b.packages}`:"– : –"}</b><small>Jam : NYJB · Online-Pakete</small></div>):<p>Noch kein abgeschlossenes Wochenpaar.</p>}</div>}
   <section className={styles.movers}><span className={styles.eyebrow}><TrendingUp size={16}/> BUCHUNGEN IN BEWEGUNG</span><h3>Aufsteiger der Woche</h3><p>Kommende sechs Wochen · letzte 7 Tage gegenüber den 7 Tagen davor.</p>{movers.length?movers.map((n,i)=><article key={n.id}><span className={styles.position}>{i+1}</span><div><small>{date(n.date)}{n.isNew?" · Neu angelegt":""}</small><h4>{n.name}</h4><p>+{n.recent} Gäste · davor +{n.previous}</p><small>{n.guests} Gäste insgesamt</small></div><strong><ArrowUpRight size={17}/>{n.recent-n.previous}</strong></article>):<p>Noch kein Aufsteiger mit mindestens drei neuen Gästen und einem Zuwachs gegenüber der Vorwoche.</p>}</section>
   <details className={styles.explanation}><summary>So wird gezählt</summary><p>Online-Pakete: gültige Tickets aus abgeschlossenen Bestellungen mit bezahlten Ticketpositionen und positiver Online-Zahlung. Kostenlose, stornierte und vollständig erstattete Bestellungen zählen nicht im Ranking. Ein Zweierpaket ist ein Paket, aber zwei Gäste.</p><p>Gäste und Included Drinks stammen wie in der bestehenden Übersicht aus gültigen Ticketpaketen. Included Drinks sind gebuchte Ansprüche, keine eingelösten Getränke. Unbekannte Paketgrößen sperren den betreffenden Vergleich.</p><p>Nur reguläre Mittwoch-Jams und Donnerstag-NYJB. Sondertermine bleiben außen vor. Monat: Durchschnitt aller abgeschlossenen Abende des jeweiligen Formats. „Duell für Duell“: vollständige Wochenpaare.</p><p>SumUp: erfolgreiche EUR-Zahlungen des Betriebsabends, Tageswechsel 03:00 Uhr. Bei mehreren Events am selben Datum oder fehlenden Daten steht „–“. Kommende Abende haben noch keinen Umsatzvergleich.</p><p>Aufsteiger: aktuell gültige Gäste, die in den letzten sieben Tagen gebucht wurden, abzüglich des Zuwachses der sieben Tage davor. Mindestens drei neue Gäste; nach zusätzlichem Zuwachs sortiert. Kein Vergleich tatsächlicher Anwesenheit.</p></details>
   <p className={styles.stamp}>{example?"Beispieldaten · keine echten Ergebnisse":"Stand "+new Intl.DateTimeFormat("de-DE",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Berlin"}).format(shown.asOf)}</p>
  </>}
 </div>;
}
