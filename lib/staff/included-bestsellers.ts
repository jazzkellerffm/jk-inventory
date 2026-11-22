import "server-only";
import { bestsellerStart, type BestsellerPeriod } from "./bestseller-period";

const cocktailIds = new Set([
  "basil-bliss","purple-rain","basil-gintonic","ginger-highball","imperial-aviation",
  "frankfurt-sour","goldstein-mule","the-artist","the-muse","purple-negroni",
  "pina-margarita","velvet-martini","caipirinha","coco-colada","espresso-martini",
  "margarita","negroni","pisco-sour","whiskey-sour","siberian-sour",
  "cuban-iced-tea","aperol-spritz","paloma","purple-no-rain",
  "crafted-lemonade","dubai-mule","the-artist-non-alc","free-jazzy-fizz","iced-tea",
]);
// Keep historical retired cocktail IDs countable; wine and beer are excluded.
const excludedIds = new Set(["1664-blanc","birra-moretti","tegernseer-hell","lugana","sauvignon-blanc","primitivo"]);
type Row = {id:string;status:string;items:{drinkId?:string;drinkName?:string;quantity?:number}[]};
export type IncludedRanking = {products:{name:string;quantity:number}[];cocktailTotal:number;asOf:string;incomplete:number};
const cache = new Map<string,{until:number;value:Promise<IncludedRanking>}>();
export function readIncludedRanking(period:BestsellerPeriod):Promise<IncludedRanking> {
  const now=Date.now(), start=bestsellerStart(now,period), key=period+"/"+start;
  const cached=cache.get(key);
  if(cached && cached.until>now)return cached.value;
  const value=(async()=>{
    const origin=process.env.INCLUDED_DRINKS_SUPABASE_URL, apiKey=process.env.INCLUDED_DRINKS_PUBLISHABLE_KEY;
    if(!origin||!apiKey)throw new Error("Included Drinks not configured");
    const url=new URL("/rest/v1/orders",origin);
    url.searchParams.set("select","id,status,items");
    url.searchParams.set("created_at","gte."+new Date(start).toISOString());
    url.searchParams.append("created_at","lt."+new Date(now).toISOString());
    url.searchParams.set("status","in.(open,served)");
    url.searchParams.set("order","created_at.desc,id.desc");
    url.searchParams.set("limit","500");
    const totals=new Map<string,{name:string;quantity:number}>();
    let cocktailTotal=0,incomplete=0;
    for(let offset=0;offset<10000;offset+=500){
      url.searchParams.set("offset",String(offset));
      const res=await fetch(url,{headers:{apikey:apiKey},cache:"no-store",signal:AbortSignal.timeout(10000)});
      if(!res.ok)throw new Error("Included Drinks history unavailable");
      const rows:Row[]=await res.json();
      if(!Array.isArray(rows))throw new Error("Invalid Included Drinks history");
      for(const row of rows){
        if(!Array.isArray(row.items)){incomplete++;continue;}
        for(const item of row.items){
          const id=typeof item.drinkId==="string"?item.drinkId.trim():"";
          const name=typeof item.drinkName==="string"?item.drinkName.trim():id;
          const quantity=item.quantity;
          if(!name||typeof quantity!=="number"||!Number.isFinite(quantity)||quantity<=0){incomplete++;continue;}
          const normalized=id||name.normalize("NFC").toLocaleLowerCase("de");
          const previous=totals.get(normalized);
          if(previous)previous.quantity+=quantity;else totals.set(normalized,{name,quantity});
          if(cocktailIds.has(id)||(!excludedIds.has(id)&&!id && !/^(birra moretti|tegernseer hell|lugana|sauvignon blanc|primitivo|1664 blanc)$/i.test(name)))cocktailTotal+=quantity;
        }
      }
      if(rows.length<500)return {products:[...totals.values()].sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name,"de")).slice(0,10),cocktailTotal,asOf:new Date(now).toISOString(),incomplete};
    }
    throw new Error("Included Drinks pagination limit reached");
  })();
  cache.set(key,{until:now+60000,value});
  if(cache.size>12)cache.delete(cache.keys().next().value!);
  value.catch(()=>{if(cache.get(key)?.value===value)cache.delete(key);});
  return value;
}
