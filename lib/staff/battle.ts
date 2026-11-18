import "server-only";
import { serviceDate, serviceStart } from "./service-day";
import { partitionPerformanceEvents, eventFormat, summarizeBattleEvent, type BattleEvent, type BattleTicket, type BattleOrder, type BattleNight } from "./battle-math";
import { readBattleRevenue } from "./sumup";
async function pages<T extends {id:string}>(resource:string,filters:Record<string,string>,auth:string){
 const rows=new Map<string,T>();const query=new URLSearchParams({...filters,limit:"100"});const cursors=new Set<string>();
 for(let page=0;page<150;page++){
  const response=await fetch("https://api.tickettailor.com/v1/"+resource+"?"+query,{headers:{Authorization:auth},cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error("Ticket data unavailable");const body=await response.json();
  if(!Array.isArray(body.data))throw Error("Invalid ticket data");for(const row of body.data)rows.set(row.id,row);
  if(!body.links?.next)return [...rows.values()];const cursor=new URL(body.links.next,"https://api.tickettailor.com").searchParams.get("starting_after");
  if(!cursor||cursors.has(cursor))throw Error("Incomplete ticket data");cursors.add(cursor);query.set("starting_after",cursor);
 }throw Error("Ticket page limit");
}
export type BattleFeed={month:string;today:string;asOf:number;nights:BattleNight[];upcoming:BattleNight[];revenueAvailable:boolean;cancelled?:{id:string;date:string;format:"jam"|"nyjb"}[]};
let cache:{key:string;month:string;until:number;data:Promise<BattleFeed>}|undefined;
export function readBattle(key:string,month:string,merchant?:string,token?:string){
 if(cache?.key===key&&cache.month===month&&cache.until>Date.now())return cache.data;
 const data=collect(key,month,merchant,token);cache={key,month,until:Date.now()+300000,data};data.catch(()=>{if(cache?.data===data)cache=undefined;});return data;
}
async function collect(key:string,month:string,merchant?:string,token?:string):Promise<BattleFeed>{
 const now=Date.now(),today=serviceDate(now),endDate=new Date(now+42*86400000).toISOString().slice(0,10);
 const auth="Basic "+Buffer.from(key+":").toString("base64");
 const {active:events,cancelled}=partitionPerformanceEvents((await pages<BattleEvent>("events",{},auth)).filter(e=>e.start?.date));
 const selected=events.filter(e=>(e.start.date.startsWith(month)&&!!eventFormat(e))||(e.start.date>=today&&e.start.date<endDate));
 const start=serviceStart(Date.parse(month+"-01T12:00:00Z"));
 const end=Math.min(serviceStart(now),serviceStart(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),1,12)));
 const revenuePromise=merchant&&token?readBattleRevenue(merchant,token,start,end).catch(error=>{console.warn("Staff format revenue unavailable",{month,reason:error instanceof Error?error.message:"Unknown error"});return null;}):Promise.resolve(null);
 const nights:BattleNight[]=[];
 // Bound provider concurrency; only the opened Tools module triggers this request.
 for(let i=0;i<selected.length;i+=3){await Promise.all(selected.slice(i,i+3).map(async event=>{
  const [tickets,orders]=await Promise.all([pages<BattleTicket>("issued_tickets",{event_id:event.id,status:"valid"},auth),pages<BattleOrder>("orders",{event_id:event.id},auth)]);
  nights.push(summarizeBattleEvent(event,tickets,orders,now/1000));
 }));}
 const revenue=await revenuePromise;
 for(const night of nights){
  // A whole-night SumUp total cannot be attributed to one event if dates overlap.
  if(revenue&&night.date<today&&night.date.startsWith(month)&&events.filter(e=>e.start.date===night.date).length===1)night.cents=revenue[night.date]??0;
 }
 nights.sort((a,b)=>a.date.localeCompare(b.date));
 return {month,today,asOf:now,cancelled:cancelled.filter(e=>e.start.date.startsWith(month)&&eventFormat(e)).map(e=>({id:e.id,date:e.start.date,format:eventFormat(e)!})),nights:nights.filter(n=>n.format&&n.date.startsWith(month)),upcoming:nights.filter(n=>n.date>=today),revenueAvailable:revenue!==null};
}
