import { includedDrinks, packageSize, ticketCategory, ticketCategories } from "./entitlements";
export type Format = "jam" | "nyjb";
export type BattleEvent = { id:string; name:string; status:string; created_at?:number; start:{date:string;unix:number} };
export type BattleTicket = {id:string;event_id:string;status:string;description:string;add_on_id?:string};
export type BattleOrder = {id:string;status:string;created_at:number|string;total?:number;transactions?:{amount:number;payment_method:string;pending:boolean}[];line_items:{type:string;value:number;quantity:number;description:string;event_summary?:{event_id:string};fulfilments?:{reference_id:string}[]}[]};
export type TicketMix = Record<typeof ticketCategories[number],number>;
export type BattleNight = {id:string;name:string;date:string;format:Format|null;packages:number;guests:number;drinks:number;unknown:number;recent:number;previous:number;cents:number|null;complete:boolean;isNew:boolean;mix:TicketMix;vipTables:number;worldstarTables:number};
export function eventFormat(event:BattleEvent):Format|null {
 const weekday=new Date(event.start.date+"T12:00:00Z").getUTCDay();
 if(weekday===3 && /\bjazz\s+jam\s+session\b/i.test(event.name))return "jam";
 if(weekday===4 && /new\s*york\s*jazz\s*bar|\bnyjb\b/i.test(event.name))return "nyjb";
 return null;
}
export function summarizeBattleEvent(event:BattleEvent,tickets:BattleTicket[],orders:BattleOrder[],now:number):BattleNight {
 const valid=new Map(tickets.filter(t=>t.event_id===event.id&&t.status==="valid"&&!t.add_on_id).map(t=>[t.id,t]));
 const mix=Object.fromEntries(ticketCategories.map(c=>[c,0])) as TicketMix;
 const result:BattleNight={id:event.id,name:event.name,date:event.start.date,format:eventFormat(event),packages:0,guests:0,drinks:0,unknown:0,recent:0,previous:0,cents:null,complete:true,mix,vipTables:0,worldstarTables:0,isNew:!!event.created_at&&event.created_at>now-14*86400};
 // Guest and entitlement counts match the existing valid-issued-ticket display.
 for(const t of valid.values()){const size=packageSize(t.description);result.guests+=size;const category=ticketCategory(t.description);result.mix[category]+=size;if(category==="VIP")result.vipTables++;if(category==="Worldstar VIP")result.worldstarTables++;result.drinks+=includedDrinks(t.description);if(!size)result.unknown++;}
 const counted=new Set<string>();
 for(const order of orders){
  if(!["completed","paid"].includes(order.status))continue;
  const at=Number(order.created_at)||Date.parse(String(order.created_at))/1000;
  // Only settled online payments; pending, offline and entirely refunded orders do not rank.
  if(!Array.isArray(order.transactions)){result.complete=false;continue;}
  const net=order.transactions.filter(t=>!t.pending&&["stripe","paypal","square"].includes(t.payment_method.toLowerCase())).reduce((s,t)=>s+t.amount,0);
  for(const line of order.line_items){
   if(line.type!=="ticket"||line.event_summary?.event_id!==event.id)continue;
   if(!Array.isArray(line.fulfilments)){result.complete=false;continue;}
   for(const ref of line.fulfilments){
    const ticket=valid.get(ref.reference_id);if(!ticket||counted.has(ticket.id))continue;counted.add(ticket.id);
    const size=packageSize(ticket.description);
    if(at<=now&&at>now-7*86400)result.recent+=size;
    else if(at<=now-7*86400&&at>now-14*86400)result.previous+=size;
    if(net>0&&line.value>0)result.packages++;
   }
  }
 }
 return result;
}
export function ranking(nights:BattleNight[]){
 return (["jam","nyjb"] as const).map(format=>{
  const rows=nights.filter(n=>n.format===format);const count=rows.length;
  const average=(key:"packages"|"guests"|"drinks")=>count?rows.reduce((s,n)=>s+n[key],0)/count:null;
  return {format,count,packages:rows.every(n=>n.complete)?average("packages"):null,guests:rows.every(n=>!n.unknown)?average("guests"):null,drinks:rows.every(n=>!n.unknown)?average("drinks"):null,cents:count&&rows.every(n=>n.cents!==null)?rows.reduce((s,n)=>s+n.cents!,0)/count:null};
 });
}
export function risingEvents(nights:BattleNight[]){return nights.filter(n=>!n.unknown&&n.complete&&n.recent>=3&&n.recent>n.previous).sort((a,b)=>(b.recent-b.previous)-(a.recent-a.previous)||b.recent-a.recent).slice(0,3);}

export function summarizeMix(nights:BattleNight[]){
 if(!nights.length||nights.some(n=>n.unknown||!n.mix))return null;
 const mix=Object.fromEntries(ticketCategories.map(c=>[c,nights.reduce((sum,n)=>sum+n.mix[c],0)])) as TicketMix;
 return {mix,guests:nights.reduce((sum,n)=>sum+n.guests,0),drinks:nights.reduce((sum,n)=>sum+n.drinks,0),vipTables:nights.reduce((sum,n)=>sum+n.vipTables,0),worldstarTables:nights.reduce((sum,n)=>sum+n.worldstarTables,0)};
}
export function latestCompletedPair(nights:BattleNight[],today:string){
 const completed=nights.filter(n=>n.date<today);
 for(const jam of completed.filter(n=>n.format==="jam").sort((a,b)=>b.date.localeCompare(a.date))){
  const next=new Date(jam.date+"T12:00:00Z");next.setUTCDate(next.getUTCDate()+1);
  const partners=completed.filter(n=>n.format==="nyjb"&&n.date===next.toISOString().slice(0,10));
  if(partners.length===1&&completed.filter(n=>n.format==="jam"&&n.date===jam.date).length===1)return [jam,partners[0]] as const;
 }
 return null;
}
