
const merchant=process.env.SUMUP_MERCHANT_CODE?.trim(), token=process.env.SUMUP_API_KEY?.trim();
if (!merchant || !token) {console.log("SUMUP_VERIFY no preview credentials");process.exit(0);}
const base="https://api.sumup.com/v1.0/merchants/"+encodeURIComponent(merchant)+"/sales";
async function read(url,body) {const r=await fetch(url,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json","User-Agent":"JK-Staff-OS/1.0"},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error("HTTP "+r.status);return r.json();}
const list=await read(base+"?pagination_limit=25");
const filtered=await read(base+"/search",{payment_statuses:["PAID"],pagination_limit:25});
const unfiltered=await read(base+"/search",{pagination_limit:25});
const history=await read("https://api.sumup.com/v2.1/merchants/"+encodeURIComponent(merchant)+"/transactions/history?order=descending&limit=100&statuses[]=SUCCESSFUL&types[]=PAYMENT");
function shape(page) {const rows=page.items??[];return {rows:rows.length,newestClosedDay:rows[0]?.closed_at?.slice(0,10),withLines:rows.filter(r=>r.items?.length).length,paymentKeys:[...new Set(rows.flatMap(r=>(r.payments??[]).flatMap(p=>Object.keys(p))))],statuses:[...new Set(rows.flatMap(r=>(r.payments??[]).map(p=>p.status)))],types:[...new Set(rows.flatMap(r=>(r.payments??[]).map(p=>p.type)))]};}
console.log("SUMUP_VERIFY schema",JSON.stringify({list:shape(list),filtered:shape(filtered),unfiltered:shape(unfiltered)}));
const details=await Promise.all((filtered.items??[]).slice(0,10).map(r=>read(base+"/"+encodeURIComponent(r.id))));
const refs=new Set(details.flatMap(s=>(s.payments??[]).map(p=>p.reference)));
console.log("SUMUP_VERIFY details",JSON.stringify({...shape({items:details}),transactions:history.items.length,matchesByCode:history.items.filter(t=>refs.has(t.transaction_code)).length,matchesById:history.items.filter(t=>refs.has(t.transaction_id)||refs.has(t.id)).length,newestTransactionDay:history.items[0]?.timestamp?.slice(0,10),hasClientId:history.items.filter(t=>!!t.client_transaction_id).length}));
