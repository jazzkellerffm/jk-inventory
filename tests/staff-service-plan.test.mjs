import {test} from 'node:test';
import assert from 'node:assert/strict';
import {includedSupply, combine} from '../lib/staff/entitlements.ts';

test('Worldstar VIP includes one Moët bottle per table, separately from regular VIP Crémant',()=>{
 const worldstar='VIP Table - World Star VIP · 2 Guests · Moët & Chandon';
 const vip='VIP Table - 2 Guests · incl. 1 Bottle Crémant';
 assert.deepEqual(includedSupply(worldstar),[{label:'Flasche Moët',quantity:1,kind:'included'}]);
 assert.deepEqual(combine([worldstar,'Worldstar VIP - 2 Guests',vip].flatMap(includedSupply)),[
  {label:'Flasche Moët',quantity:2,kind:'included'},
  {label:'Flasche Crémant',quantity:1,kind:'included'},
 ]);
 assert.deepEqual(includedSupply('Premium - 2 Guests · incl. 2 Drinks'),[]);
});
import {readServicePlan} from '../lib/staff/tickets.ts';
const order={id:'or_1',status:'completed',buyer_details:{name:'Test'},line_items:[
 {type:'ticket',description:'Club - Cremant for 2',quantity:2,event_summary:{event_id:'ev_1'}},
 {type:'product',description:'Add-on: Mediterranean Hummus Plate',quantity:1,event_summary:{event_id:'ev_1'}},
 {type:'product',description:'Bottle Lugana',quantity:1,event_summary:{event_id:'ev_2'}}]};
const tickets=[1,2].map(n=>({id:'it_'+n,event_id:'ev_1',status:'valid',order_id:'or_1',description:'Club - Cremant for 2'}));
const page=data=>Response.json({data,links:{next:null}});
test('service explicitly reads v2 products once per booking; tickets stay v1',async()=>{
 const original=globalThis.fetch;const urls=[];
 globalThis.fetch=async url=>{urls.push(String(url));if(String(url).includes('/v2/orders?'))return page([order]);if(String(url).includes('/v1/issued_tickets?'))return page(tickets);throw new Error('Wrong endpoint');};
 try {const rows=await readServicePlan('test','ev_1');assert.equal(urls.length,2);assert.equal(rows.length,1);assert.equal(rows[0].tickets.length,2);assert.deepEqual(rows[0].extras,[{label:'Hummus-Platte',quantity:1,kind:'food'}]);}finally{globalThis.fetch=original;}
});
test('missing listed order uses v2 detail; failed detail rejects',async()=>{
 const original=globalThis.fetch;let fail=false;
 globalThis.fetch=async url=>{if(String(url).includes('/v2/orders/or_1'))return fail?new Response('',{status:503}):Response.json(order);if(String(url).includes('/v2/orders?'))return page([]);if(String(url).includes('/v1/issued_tickets?'))return page(tickets);throw new Error('Wrong endpoint');};
 try {assert.equal((await readServicePlan('test','ev_1'))[0].extras.length,1);fail=true;await assert.rejects(readServicePlan('test','ev_1'));}finally{globalThis.fetch=original;}
});
test('unassigned product in single-event order works; multi-event ambiguity rejects',async()=>{
 const original=globalThis.fetch;let ambiguous=false;
 globalThis.fetch=async url=>String(url).includes('/v2/orders?')?page([{...order,line_items:[order.line_items[0],{...order.line_items[1],event_summary:null},...(ambiguous?[{...order.line_items[0],event_summary:{event_id:'ev_2'}}]:[])]}]):page(tickets);
 try {assert.equal((await readServicePlan('test','ev_1'))[0].extras[0].quantity,1);ambiguous=true;await assert.rejects(readServicePlan('test','ev_1'),/Ambiguous/);}finally{globalThis.fetch=original;}
});

import {serviceTicketSummary} from '../lib/staff/service-ticket-summary.ts';
test('evening summary distinguishes singles, packages and guests; hides unbooked categories',()=>{
 const result=serviceTicketSummary(['Club - 1 Guest','Club - 1 Guest','Club - 2 Guests','Club PLUS - 3 Guests','Premium - 2 Guests','Premium - 2 Guests']);
 assert.deepEqual(result.map(x=>[x.category,x.tickets,x.guests,x.singles]),[['Club',3,4,2],['Club Plus',1,3,0],['Premium',2,4,0]]);
 assert.deepEqual(result[0].packages,[{size:1,count:2},{size:2,count:1}]);
 assert.deepEqual(serviceTicketSummary([]),[]);
});
test('evening summary retains booked VIPs and unknown sizes without inventing guests',()=>{
 const result=serviceTicketSummary(['VIP Table - 2 Guests','Worldstar VIP - 2 Guests','Club - Cremant for 2','Premium size unknown']);
 assert.deepEqual(result.map(x=>[x.category,x.guests,x.unknown]),[['Club',2,0],['Premium',0,1],['VIP',2,0],['Worldstar VIP',2,0]]);
});

import {groupServiceBookings} from '../lib/staff/service-display-groups.ts';
test('separate orders with same buyer name and email share a display group; source orders remain separate',async()=>{
 const original=globalThis.fetch;
 const orders=[{...order,id:'or_a',buyer_details:{name:'Freya Example',email:'same@example.test'}},
 {...order,id:'or_b',buyer_details:{name:' FREYA  EXAMPLE ',email:'SAME@example.test'}},
 {...order,id:'or_c',buyer_details:{name:'Freya Example',email:'other@example.test'}},
 {...order,id:'or_d',buyer_details:{name:'Freya Example'}}];
 const issued=orders.map((o,i)=>({id:'it_'+i,event_id:'ev_1',status:'valid',order_id:o.id,description:i===1?'Club - 1 Guest (Single)':'Club - 2 Guests',checked_in:i===0}));
 globalThis.fetch=async url=>page(String(url).includes('/v2/orders?')?orders:issued);
 try {
  const rows=await readServicePlan('test','ev_1');assert.equal(rows.length,4);
  assert.equal(rows.find(r=>r.id==='or_a').displayGroupId,rows.find(r=>r.id==='or_b').displayGroupId);
  const grouped=groupServiceBookings(rows);assert.equal(grouped.length,3);
  const merged=grouped.find(r=>r.bookingCount===2);
  assert.deepEqual([...merged.tickets].sort(),['Club - 1 Guest (Single)','Club - 2 Guests']);
  assert.equal(merged.checkedIn,false);assert.equal(merged.checkedInBookings,1);
  assert.equal(merged.extras.length,2);assert.equal(rows[0].tickets.length,1);
  assert.ok(!JSON.stringify(rows).includes('@example.test'));
 } finally {globalThis.fetch=original;}
});
test('display groups never merge just by name and mark complete check-in only when all orders checked in',()=>{
 const base={name:'Example',tickets:['Club - 2 Guests'],extras:[],checkedIn:true};
 assert.equal(groupServiceBookings([{...base,id:'a'},{...base,id:'b'}]).length,2);
 const result=groupServiceBookings([{...base,id:'a',displayGroupId:'a'},{...base,id:'b',displayGroupId:'a'}]);
 assert.equal(result.length,1);assert.equal(result[0].checkedIn,true);assert.equal(result[0].bookingCount,2);
});
