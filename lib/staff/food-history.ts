import "server-only";
import { serviceDate } from "./service-day";

export type FoodHistory = { days:{date:string;weekday:number;portions:number}[]; strongest:{date:string;portions:number}|null; total:number };
const cache=new Map<string,{until:number;value:Promise<FoodHistory>}>();

export async function readFoodHistory(merchant:string,token:string):Promise<FoodHistory>{
  const now=Date.now(),today=serviceDate(now),key=merchant+"/"+today;
  const hit=cache.get(key);
  if(hit && hit.until>now)return hit.value;
  const promise=(async()=>{
    const dayMap=new Map<string,number>();
    const base="https://api.sumup.com/v1.0/merchants/"+encodeURIComponent(merchant)+"/sales";
    const headers={Authorization:"Bearer "+token,"Content-Type":"application/json"};
    const seen=new Set<string>(),cursors=new Set<string>();
    let cursor:string|undefined, pages=0;
    const deadline=Date.now()+50000;
    do{
      if(++pages>200||Date.now()>deadline)throw Error("Incomplete food history");
      const res=await fetch(base+"/search",{method:"POST",headers,cache:"no-store",signal:AbortSignal.timeout(8000),
        body:JSON.stringify({end_date:new Date(now).toISOString(),payment_statuses:["PAID"],pagination_limit:25,pagination_token:cursor})});
      if(!res.ok)throw Error("SumUp history search unavailable");
      const page:{items:{id:string;closed_at:string}[];pagination_token?:string}=await res.json();
      if(!Array.isArray(page.items))throw Error("Invalid history page");
      // The search is newest first. Keep the latest sixteen distinct service days
      // with paid SumUp sales, even when no snacks were sold on a given day.
      let reachedStart=false;
      const ids:{id:string;closed:number}[]=[];
      for(const row of page.items){
        const closed=Date.parse(row.closed_at);
        if(!row.id||!Number.isFinite(closed))throw Error("Invalid history row");
        const day=serviceDate(closed);
        if(dayMap.size>=16 && !dayMap.has(day)){reachedStart=true;continue;}
        if(!dayMap.has(day))dayMap.set(day,0);
        if(closed>now||seen.has(row.id))continue;
        seen.add(row.id);ids.push({id:row.id,closed});
      }
      for(let i=0;i<ids.length;i+=8){
        const results=await Promise.all(ids.slice(i,i+8).map(async entry=>{
          const response=await fetch(base+"/"+encodeURIComponent(entry.id),{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
          if(!response.ok)throw Error("SumUp sale detail unavailable");
          return {entry,sale:await response.json() as {id:string;closed_at:string;currency?:{code:string};items?:{type?:string;name?:string;quantity?:number;categories?:{name:string}[]}[]}};
        }));
        for(const {entry,sale} of results){
          if(sale.id!==entry.id||sale.currency?.code!=="EUR"||!Array.isArray(sale.items))throw Error("Incomplete SumUp sale");
          const day=serviceDate(entry.closed);
          if(!dayMap.has(day))continue;
          let portions=0;
          for(const item of sale.items){
            if(["CUSTOM","FEE","DEPOSIT","GIFT_CARD"].includes(item.type??"")||item.quantity===0)continue;
            if(!item.categories?.some(c=>c.name?.trim().toLowerCase()==="bar snacks"))continue;
            if(!Number.isSafeInteger(item.quantity)||!item.quantity||item.quantity<0)throw Error("Invalid snack quantity");
            portions+=item.quantity;
          }
          dayMap.set(day,dayMap.get(day)!+portions);
        }
      }
      if(reachedStart)break;
      cursor=page.pagination_token;
      if(cursor && cursors.has(cursor))throw Error("Repeated sales cursor");
      if(cursor)cursors.add(cursor);
    }while(cursor);
    const days=[...dayMap].sort(([a],[b])=>a.localeCompare(b)).map(([d,portions])=>({date:d,weekday:(new Date(d+"T12:00:00Z").getUTCDay()+6)%7,portions}));
    const strongest=days.reduce<{date:string;portions:number}|null>((best,d)=>!best||d.portions>best.portions?{date:d.date,portions:d.portions}:best,null);
    return {days,strongest:strongest?.portions?strongest:null,total:days.reduce((n,d)=>n+d.portions,0)};
  })();
  cache.set(key,{until:now+600000,value:promise});
  if(cache.size>8)cache.delete(cache.keys().next().value!);
  promise.catch(()=>{if(cache.get(key)?.value===promise)cache.delete(key);});
  return promise;
}
