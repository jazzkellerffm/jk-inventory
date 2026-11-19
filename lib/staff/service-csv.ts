import { packageSize, ticketCategory, ticketCategories } from './entitlements';

export type CsvTicket = {id:string;event_id:string;status:string;description:string;order_id?:string;full_name?:string;add_on_id?:string};
export type CsvOrder = {id:string;status?:string;buyer_details?:{name?:string;first_name?:string;last_name?:string};line_items:{type:string;description:string;quantity:number;event_id?:string;event_summary?:{event_id:string}|null}[]};
export function serviceCsv(event:{id:string;name:string;start:{date:string}},tickets:CsvTicket[],orders:CsvOrder[]){
 const byOrder=new Map(orders.map(o=>[o.id,o]));
 const seen=new Set<string>(), emitted=new Set<string>();
 const valid=tickets.filter(t=>t.event_id===event.id&&t.status==='valid'&&!t.add_on_id);
 const bookingName=(t:CsvTicket)=>{
  const b=t.order_id?byOrder.get(t.order_id)?.buyer_details:undefined;
  return b?.name?.trim()||[b?.first_name,b?.last_name].filter(Boolean).join(' ').trim()||t.full_name?.trim()||'Buchungsname fehlt';
 };
 valid.sort((a,b)=>ticketCategories.indexOf(ticketCategory(a.description))-ticketCategories.indexOf(ticketCategory(b.description))
  ||bookingName(a).localeCompare(bookingName(b),'de')||(a.order_id||a.id).localeCompare(b.order_id||b.id)||a.id.localeCompare(b.id));
 const rows:unknown[][]=[['Datum','Veranstaltung','Buchungsname','Ticketkategorie','Personenzahl','Vorbestellungen der Buchung']];
 for(const t of valid){
  if(seen.has(t.id))throw new Error('Doppelte Ticket-ID');seen.add(t.id);
  const size=packageSize(t.description);if(!size)throw new Error('Unbekannte Paketgröße');
  const o=t.order_id?byOrder.get(t.order_id):undefined;
  if(t.order_id&&!o)throw new Error('Bestellung fehlt');
  let extras='';
  if(o&&!emitted.has(o.id)){
   if(o.status && !['completed','paid'].includes(o.status) && o.line_items.some(l=>['product','add_on'].includes(l.type)&&l.quantity>0))throw new Error('Vorbestellung nach Erstattung muss geprüft werden');
   const ids=new Set(o.line_items.map(l=>l.event_summary?.event_id||l.event_id).filter(Boolean));
   extras=o.line_items.filter(l=>['product','add_on'].includes(l.type)&&l.quantity>0).filter(l=>{
    const id=l.event_summary?.event_id||l.event_id;
    if(id)return id===event.id;
    if(ids.size!==1||!ids.has(event.id))throw new Error('Vorbestellung nicht eindeutig zuordenbar');
    return true;
   }).map(l=>{if(!Number.isInteger(l.quantity))throw new Error('Ungültige Menge');return `${l.quantity} × ${l.description}`;}).join('; ');
   emitted.add(o.id);
  }
  rows.push([event.start.date,event.name,bookingName(t),t.description,size,extras]);
 }
 for(const o of orders){
  if(!emitted.has(o.id)&&o.line_items.some(l=>['product','add_on'].includes(l.type)&&l.quantity>0&&(l.event_summary?.event_id||l.event_id)===event.id))throw new Error('Vorbestellung ohne gültiges Ticket muss geprüft werden');
 }
 const escape=(v:unknown)=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 return '\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
}
export async function csvPages<T extends {id:string}>(resource:string,eventId:string,auth:string,request:typeof fetch=fetch):Promise<T[]>{
 const rows:T[]=[],ids=new Set<string>(),cursors=new Set<string>();let cursor='';
 for(let page=0;page<1000;page++){
  const q=new URLSearchParams({event_id:eventId,limit:'100',...(cursor?{starting_after:cursor}:{})});
  const r=await request(`https://api.tickettailor.com/${resource==='orders'?'v2':'v1'}/${resource}?${q}`,{headers:{Authorization:auth},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('Abruf fehlgeschlagen');
  const p=await r.json();if(!Array.isArray(p.data)||!p.links||!('next' in p.links))throw new Error('Unvollständige Antwort');
  for(const row of p.data){if(!row.id||ids.has(row.id))throw new Error('Überlappende Ergebnisseiten');ids.add(row.id);rows.push(row);}
  if(p.links.next===null)return rows;
  cursor=new URL(p.links.next,'https://api.tickettailor.com').searchParams.get('starting_after')||'';
  if(!cursor||cursors.has(cursor))throw new Error('Unvollständige Ergebnisseiten');cursors.add(cursor);
 }throw new Error('Zu viele Ergebnisseiten');
}
