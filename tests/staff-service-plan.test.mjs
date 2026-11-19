import {test} from 'node:test';
import assert from 'node:assert/strict';
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
