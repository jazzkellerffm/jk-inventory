import {hasSession} from "@/lib/staff/session";
import {readBarEvenings,readCocktailRange} from "@/lib/staff/sumup";
import {readIncludedCocktailRange} from "@/lib/staff/included-bestsellers";
import {serviceDate,serviceStart} from "@/lib/staff/service-day";
export const maxDuration=300;
let cache:{key:string;until:number;value:Promise<{date:string;total:number}|null>}|undefined;
export async function GET(){
  const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
  if(!(await hasSession()))return Response.json({}, {status:401,headers});
  const merchant=process.env.SUMUP_MERCHANT_CODE?.trim(),token=process.env.SUMUP_API_KEY?.trim();
  if(!merchant||!token)return Response.json({error:"Not configured"},{status:503,headers});
  const today=serviceDate(Date.now()),key=merchant+"/"+today;
  if(!cache||cache.key!==key||cache.until<Date.now()){
    const value=(async()=>{
      const evenings=await readBarEvenings(merchant,token);
      const last=evenings.nights.filter(n=>n.date<today).at(-1);
      if(!last)return null;
      const start=serviceStart(Date.parse(last.date+"T12:00:00Z"));
      const next=new Date(last.date+"T12:00:00Z");next.setUTCDate(next.getUTCDate()+1);
      const end=serviceStart(next.getTime());
      const [sumup,included]=await Promise.all([
        readCocktailRange(merchant,token,start,end),
        readIncludedCocktailRange(start,end)
      ]);
      return {date:last.date,total:sumup+included};
    })();
    cache={key,until:Date.now()+600000,value};
    value.catch(()=>{if(cache?.value===value)cache=undefined;});
  }
  try{return Response.json({last:await cache.value},{headers});}
  catch{return Response.json({error:"Previous cocktail evening unavailable"},{status:503,headers});}
}
