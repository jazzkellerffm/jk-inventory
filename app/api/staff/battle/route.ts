import { hasSession } from "@/lib/staff/session";
import { readBattle } from "@/lib/staff/battle";
import { serviceDate } from "@/lib/staff/service-day";
export const maxDuration=120;
export async function GET(request:Request){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
 if(!(await hasSession()))return Response.json({}, {status:401,headers});
 const today=serviceDate(Date.now());const month=new URL(request.url).searchParams.get("month")??today.slice(0,7);
 const earliest=new Date(today.slice(0,7)+"-01T12:00:00Z");earliest.setUTCMonth(earliest.getUTCMonth()-5);
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month>today.slice(0,7)||month<earliest.toISOString().slice(0,7))return Response.json({}, {status:400,headers});
 const key=process.env.TICKET_TAILOR_API_KEY;if(!key)return Response.json({}, {status:503,headers});
 try{return Response.json(await readBattle(key,month,process.env.SUMUP_MERCHANT_CODE?.trim(),process.env.SUMUP_API_KEY?.trim()),{headers});}
 catch{return Response.json({}, {status:503,headers});}
}
