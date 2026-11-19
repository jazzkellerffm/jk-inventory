import test from 'node:test';
import assert from 'node:assert/strict';
import {readOrders,readOrder} from '../lib/staff/ticket-orders.ts';
import {readTicketFeed,readBookingLead} from '../lib/staff/tickets.ts';
const page=data=>Response.json({data,links:{next:null}});

test('central orders preserve filters and deduplicate pages; reject loops and invalid data',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async input=>{
  const u=new URL(input); assert.equal(u.pathname,'/v2/orders');assert.equal(u.searchParams.get('event_id'),'ev_test');
  calls++;
  if(calls===1)return Response.json({data:[{id:'a',line_items:[]}],links:{next:'/v2/orders?starting_after=a'}});
  assert.equal(u.searchParams.get('starting_after'),'a');
  return page([{id:'a',line_items:[]},{id:'b',line_items:[]}]);
 });
 assert.deepEqual((await readOrders({event_id:'ev_test'},'test')).map(o=>o.id),['a','b']);
 t.mock.method(globalThis,'fetch',async()=>Response.json({data:[],links:{next:'/v2/orders?starting_after=a'}}));
 await assert.rejects(readOrders({},'test'),/pagination/);
 t.mock.method(globalThis,'fetch',async()=>page([{id:'a'}]));
 await assert.rejects(readOrders({},'test'),/Incomplete order data/);
 t.mock.method(globalThis,'fetch',async()=>Response.json({id:'wrong',line_items:[]}));
 await assert.rejects(readOrder('a','test'),/Incomplete order details/);
});

test('rose cards, daily bookings and hourly activity keep ticket-only counts with v2 ISO dates and multi-event orders',async t=>{
 const now=Date.parse('2026-11-19T14:00:00Z');t.mock.method(Date,'now',()=>now);
 const make=(id,age,lines,status='completed')=>({id,status,created_at:new Date(now-age*3600000).toISOString(),line_items:lines});
 const line=(event,quantity=1)=>({type:'ticket',description:'Club - 2 Guests',quantity,event_summary:{event_id:event,name:'Concert '+event,start_date:'2026-12-03T21:00:00+01:00'}});
 const orders=[make('a',1,[line('ev_a',2),line('ev_b')]),make('b',2,[line('ev_b')]),make('c',3,[line('ev_a')]),make('d',4,[line('ev_a')]),make('product',1,[{type:'product',quantity:1,description:'Bottle'}]),make('cancelled',1,[line('ev_a')],'cancelled')];
 t.mock.method(globalThis,'fetch',async input=>{
  const u=new URL(input);
  if(u.pathname==='/v1/events')return page([]);
  assert.equal(u.pathname,'/v2/orders');
  const from=Number(u.searchParams.get('created_at_gte')),until=Number(u.searchParams.get('created_at_lte'));
  return page(orders.filter(o=>Date.parse(o.created_at)/1000>=from&&Date.parse(o.created_at)/1000<=until));
 });
 const feed=await readTicketFeed('rose-v2');
 assert.equal(feed.bookingDay.count,4);
 assert.deepEqual(feed.bookingDay.recent.map(o=>o.id),['a','b','c','d']);
 assert.deepEqual(feed.bookingDay.recent[0].lines.map(l=>l.eventId),['ev_a','ev_b']);
 assert.equal(feed.bookingDay.recent[0].lines[0].ticket,'2 × Club - 2 Guests');
 assert.equal(feed.bookingDay.recent[0].at,(now-3600000)/1000);
 assert.equal(feed.ticketActivity.days.reduce((sum,d)=>sum+d.hours.reduce((a,b)=>a+b,0),0),6);
});

test('booking lead matches numeric v1 and ISO v2 purchase times',async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-11-19T14:00:00Z'));
 const {emptyLead,addLeadEvent}=await import('../lib/staff/booking-lead.ts');
 const event={id:'ev_past',name:'The Famous Jazz Jam Session',status:'published',start:{date:'2026-11-18',unix:1795032000}};
 const ticket={id:'it_a',event_id:event.id,order_id:'or_a',status:'valid',description:'Club - 3 Guests'};
 const iso='2026-11-16T12:00:00Z';
 const old={month:'2026-11',groups:Object.fromEntries(['all','jam','nyjb','weekend','friday','saturday'].map(k=>[k,emptyLead()]))};
 addLeadEvent(old,event,[ticket],[{id:'or_a',created_at:Date.parse(iso)/1000}],'2026-11-19');
 t.mock.method(globalThis,'fetch',async input=>{
  const u=new URL(input);
  if(u.pathname==='/v1/events')return page([event]);
  if(u.pathname==='/v1/issued_tickets')return page([ticket]);
  assert.equal(u.pathname,'/v2/orders');
  return page([{id:'or_a',created_at:iso,line_items:[]}]);
 });
 const feed=await readBookingLead('lead-v2');
 assert.deepEqual(feed.groups,old.groups);assert.equal(feed.groups.jam.bins[1],3);
});
