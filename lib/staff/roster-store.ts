import "server-only";
import { createHash } from "node:crypto";
import type { Shift } from "./types";
import { upcomingShifts } from "./schedule";
import { weekDay } from "./ticket-weeks";

const hash="jk-staff:roster:weeks";
export const rosterConfigured=()=>Boolean(process.env.ROSTER_REDIS_URL && process.env.ROSTER_REDIS_TOKEN);
async function redis(command:string[]) {
  const res=await fetch(process.env.ROSTER_REDIS_URL!,{method:"POST",cache:"no-store",signal:AbortSignal.timeout(5000),
    headers:{Authorization:"Bearer "+process.env.ROSTER_REDIS_TOKEN,"Content-Type":"application/json"},body:JSON.stringify(command)});
  if(!res.ok) throw new Error("Roster storage unavailable");
  const reply=await res.json();
  if(reply.error) throw new Error("Roster command failed");
  return reply.result;
}
export function monday(date:string){return weekDay(Date.parse(date+"T12:00:00Z")/1000,0);}
function legacy(){return upcomingShifts(process.env.STAFF_SHIFTS_JSON,new Date("2000-01-01"));}
export async function publishedShifts(){
  if(!rosterConfigured()) return upcomingShifts();
  const entries:string[]=await redis(["HGETALL",hash]);
  const weeks=new Map<string,Shift[]>();
  for(let i=0;i<entries.length;i+=2) weeks.set(entries[i],JSON.parse(entries[i+1]).rows);
  const rows=legacy().filter(row=>!weeks.has(monday(row.date))).concat(...weeks.values());
  return upcomingShifts(JSON.stringify(rows),new Date(weekDay(Date.now()/1000,0)+"T12:00:00Z"));
}
export async function readWeek(week:string){
  const raw=await redis(["HGET",hash,week]);
  return raw ? JSON.parse(raw) : {version:"",rows:legacy().filter(row=>monday(row.date)===week)};
}
export async function saveWeek(week:string,version:string,rows:Shift[]){
  const next=createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  const script="local v=redis.call('HGET',KEYS[1],ARGV[1]); if (v and cjson.decode(v).version or '') ~= ARGV[2] then return 0 end; redis.call('HSET',KEYS[1],ARGV[1],ARGV[3]); return 1";
  const ok=await redis(["EVAL",script,"1",hash,week,version,JSON.stringify({version:next,rows})]);
  return ok ? next : null;
}
