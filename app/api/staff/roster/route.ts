import { createHash,timingSafeEqual } from "node:crypto";
import { hasSession } from "@/lib/staff/session";
import { monday, readWeek, rosterConfigured, saveWeek } from "@/lib/staff/roster-store";
import { upcomingShifts } from "@/lib/staff/schedule";

export async function POST(request:Request){
  const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
  if(!await hasSession()) return reply({},401);
  const key=process.env.STAFF_PLANNER_KEY;
  if(!key || !rosterConfigured()) return reply({},503);
  const digest=(s:string)=>createHash("sha256").update(s).digest();
  if(!timingSafeEqual(digest(key),digest(request.headers.get("x-planner-key")??""))) return reply({},403);
  const body=await request.json().catch(()=>null);
  if(!body || typeof body.week!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.week) || !Number.isFinite(Date.parse(body.week)) || monday(body.week)!==body.week) return reply({},400);
  try {
    if(body.action==="read") return reply(await readWeek(body.week));
    if(body.action!=="publish" || typeof body.version!=="string" || !Array.isArray(body.rows) || body.rows.length>150) return reply({},400);
    let rows;
    try {rows=upcomingShifts(JSON.stringify(body.rows),new Date("2000-01-01"));}
    catch {return reply({},400);}
    if(rows.length!==body.rows.length || rows.some(s=>monday(s.date)!==body.week)) return reply({},400);
    const version=await saveWeek(body.week,body.version,rows);
    return version ? reply({version}) : reply({},409);
  } catch {return reply({},503);}
}
