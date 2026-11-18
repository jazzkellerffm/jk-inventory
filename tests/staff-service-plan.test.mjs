import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readServicePlan} from '../lib/staff/tickets.ts';
test('service uses fresh order details for add-ons omitted by list, once per booking',async()=>{
 const original=globalThis.fetch;
 const order={id:'or_1',status:'completed',buyer_details:{name:'Test'},line_items:[{type:'ticket',description:'Club - Cremant for 2',quantity:2,event_summary:{event_id:'ev_1'}}]};
 const tickets=[1,2].map(n=>({id:'it_'+n,event_id:'ev_1',status:'valid',order_id:'or_1',description:'Club - Cremant for 2'}));
 let detailCalls=0;
 globalThis.fetch=async url=>{
  if(String(url).includes('/orders/or_1')){detailCalls++;return Response.json({...order,line_items:[...order.line_items,{type:'product',description:'Add-on: Mediterranean Hummus Plate',quantity:1,event_summary:{event_id:'ev_1'}},{type:'product',description:'Other evening',quantity:1,event_summary:{event_id:'ev_2'}}]});}
  return Response.json({data:String(url).includes('issued_tickets')?tickets:[order],links:{next:null}});
 };
 try{const rows=await readServicePlan('test','ev_1');assert.equal(detailCalls,1);assert.equal(rows.length,1);assert.equal(rows[0].tickets.length,2);assert.deepEqual(rows[0].extras,[{label:'Hummus-Platte',quantity:1,kind:'food'}]);
 globalThis.fetch=async url=>String(url).includes('/orders/or_1')?new Response('',{status:503}):Response.json({data:String(url).includes('issued_tickets')?tickets:[order],links:{next:null}});
 await assert.rejects(readServicePlan('test','ev_1'));
 }finally{globalThis.fetch=original;}
});
