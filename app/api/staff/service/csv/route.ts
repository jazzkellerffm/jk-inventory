import {hasSession} from '@/lib/staff/session';
import {csvPages,serviceCsv,type CsvOrder,type CsvTicket} from '@/lib/staff/service-csv';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
 if(!await hasSession())return Response.json({error:'Bitte erneut anmelden.'},{status:401,headers});
 const id=new URL(request.url).searchParams.get('event')||'';
 if(!/^ev_\d+$/.test(id))return Response.json({error:'Bitte einen Veranstaltungstermin auswählen.'},{status:400,headers});
 try{
  const key=process.env.TICKET_TAILOR_API_KEY;if(!key)throw new Error();
  const auth='Basic '+Buffer.from(key+':').toString('base64');
  const response=await fetch('https://api.tickettailor.com/v1/events/'+id,{headers:{Authorization:auth},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error();const event=await response.json();if(event.id!==id||!event.start?.date||!event.name)throw new Error();
  const [tickets,orders]=await Promise.all([csvPages<CsvTicket>('issued_tickets',id,auth),csvPages<CsvOrder>('orders',id,auth)]);
  const csv=serviceCsv(event,tickets,orders,new Date().toISOString());
  return new Response(csv,{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="JK-Gaesteliste-${event.start.date}-${id}.csv"`}});
 }catch{return Response.json({error:'Die Gästeliste konnte nicht vollständig und eindeutig erstellt werden. Bitte erneut versuchen. Es wurde keine CSV ausgegeben.'},{status:503,headers});}
}
