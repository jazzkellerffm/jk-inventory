import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const state=globalThis.adminDashboardDataTest={months:[],active:0,maxActive:0};
registerHooks({resolve(s,c,next){
 if(s==='./data'&&c.parentURL?.endsWith('/admin/dashboard-data.ts'))return {url:'data:text/javascript,'+encodeURIComponent(`
 export const readSumUpRange=async()=>({rows:[],details:[]});
 export const tickets=async()=>({nights:[],eventIssues:0});
 export const sumup=async(month)=>{const s=globalThis.adminDashboardDataTest;s.months.push(month);s.active++;s.maxActive=Math.max(s.active,s.maxActive);await new Promise(r=>setTimeout(r,0));s.active--;return {netPayments:month===s.missing?null:10000};};
 `),shortCircuit:true};
 return next(s,c);
}});
const {readAdminEvening,readAdminHistory}=await import('../lib/staff/admin/dashboard-data.ts');
const json=(data)=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
async function isolated(name,fn){
 const fetch=globalThis.fetch,now=Date.now;
 const original={TICKET_TAILOR_API_KEY:process.env.TICKET_TAILOR_API_KEY,SUMUP_API_KEY:process.env.SUMUP_API_KEY,SUMUP_MERCHANT_CODE:process.env.SUMUP_MERCHANT_CODE};
 Date.now=()=>Date.parse('2026-11-21T12:00:00Z');
 process.env.TICKET_TAILOR_API_KEY='test-'+name;process.env.SUMUP_API_KEY='test-'+name;process.env.SUMUP_MERCHANT_CODE='test';
 try{await fn();}finally{globalThis.fetch=fetch;Date.now=now;for(const [k,v] of Object.entries(original)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
}
test('evening uses dotted Ticket Tailor filters and follows event pagination',()=>isolated('events',async()=>{
 let pages=0;
 globalThis.fetch=async(input)=>{
  const url=new URL(input);pages++;assert.equal(url.pathname,'/v1/events');
  assert.ok(url.searchParams.has('start_at.gte'));assert.ok(url.searchParams.has('start_at.lt'));
  assert.equal(url.searchParams.has('start_at_gte'),false);
  const event={id:'ev_today',name:'Test',status:'published',start:{date:'2026-11-21',unix:Date.parse('2026-11-21T20:30:00Z')/1000}};
  if(pages===1)return json({data:[{...event,id:'yesterday',start:{...event.start,date:'2026-11-20'}}],links:{next:'/v1/events?starting_after=yesterday'}});
  assert.equal(url.searchParams.get('starting_after'),'yesterday');
  return json({data:[event,{...event,id:'draft',status:'draft'},{...event,id:'cancel',unavailable_status:'Abgesagt'}],links:{next:null}});
 };
 const result=await readAdminEvening();assert.equal(pages,2);assert.equal(result.eventsAvailable,true);
 assert.deepEqual(result.events.map(e=>e.id),['ev_today']);assert.equal(result.phase,'upcoming');
 assert.equal(result.sumupCents,0);assert.equal(result.ticketTotal,0);
}));
test('history stops at first payment month and preserves missing values',()=>isolated('history',async()=>{
 state.months=[];state.maxActive=0;state.missing='2023-05';
 globalThis.fetch=async(input)=>{const q=new URL(input).searchParams;assert.equal(q.get('order'),'ascending');assert.equal(q.get('limit'),'1');return json({items:[{timestamp:'2023-04-15T18:00:00Z'}]});};
 const result=await readAdminHistory('2023-06');
 assert.equal(result.firstMonth,'2023-04');assert.equal(result.nextBefore,null);
 assert.deepEqual(result.points.map(p=>p.month),['2023-04','2023-05','2023-06']);assert.equal(result.points[1].cents,null);
 assert.equal(state.maxActive,2);assert.equal(state.months.includes('2023-03'),false);
 state.missing=null;
 const latest=await readAdminHistory('2026-11');assert.equal(latest.nextBefore,'2026-07');
 assert.equal(latest.points.length,4);assert.equal(latest.points.at(-1).partial,true);assert.equal(latest.points[0].partial,false);
}));
test('private memo shares pending reads, isolates credentials and evicts failures',async()=>{
 const {privateMemo}=await import('../lib/staff/admin/private-cache.ts');
 let reads=0,release;const pending=new Promise(resolve=>release=resolve);
 const a=privateMemo('fixture','one',60000,()=>{reads++;return pending;});
 const b=privateMemo('fixture','one',60000,()=>{throw Error('should share');});assert.equal(a,b);
 assert.equal(await privateMemo('fixture','two',60000,async()=>2),2);
 release(1);assert.equal(await a,1);assert.equal(reads,1);
 let failures=0;
 for(let i=0;i<2;i++)await assert.rejects(privateMemo('failure','one',60000,async()=>{failures++;throw Error('offline');}));
 assert.equal(failures,2);
});
