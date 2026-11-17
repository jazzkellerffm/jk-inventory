import { readBestsellers } from "../lib/staff/sumup.ts";
const merchant=process.env.SUMUP_MERCHANT_CODE?.trim(), token=process.env.SUMUP_API_KEY?.trim();
if (!merchant || !token) { console.log("SUMUP_VERIFY no credentials in build"); process.exit(0); }
const base="https://api.sumup.com/v1.0/merchants/"+encodeURIComponent(merchant)+"/sales";
async function read(url,body) { const r=await fetch(url,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json","User-Agent":"JK-Staff-OS/1.0"},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)}); if(!r.ok)throw Error("HTTP "+r.status); return r.json(); }
const list=await read(base+"?pagination_limit=25");
const filtered=await read(base+"/search",{payment_statuses:["PAID"],pagination_limit:25});
const unfiltered=await read(base+"/search",{pagination_limit:25});
function shape(page) {const rows=page.items??[];return {rows:rows.length, newestClosedDay:rows[0]?.closed_at?.slice(0,10),withLines:rows.filter(r=>r.items?.length).length, paymentKeys:[...new Set(rows.flatMap(r=>(r.payments??[]).flatMap(p=>Object.keys(p))))],statuses:[...new Set(rows.flatMap(r=>(r.payments??[]).map(p=>p.status)))],types:[...new Set(rows.flatMap(r=>(r.payments??[]).map(p=>p.type)))]};}
console.log("SUMUP_VERIFY schema",JSON.stringify({list:shape(list),filtered:shape(filtered),unfiltered:shape(unfiltered)}));
for (const period of ["evening","week","month"]) {try {const feed=await readBestsellers(merchant,token,period); console.log("SUMUP_VERIFY ranking",JSON.stringify({period,incomplete:feed.incomplete,products:feed.products.length}));} catch(e){console.log("SUMUP_VERIFY ranking failed",period,e.message);}}
