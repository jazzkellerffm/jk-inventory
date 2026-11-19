import test from 'node:test';
import assert from 'node:assert/strict';
import {isCancelledEvent,partitionPerformanceEvents,eventFormat,summarizeBattleEvent,ranking,risingEvents,summarizeMix,latestCompletedPair} from '../lib/staff/battle-math.ts';
const now=Date.parse('2026-11-17T21:00:00Z')/1000;
const event={id:'ev_jam',name:'The Famous Jazz Jam Session',status:'published',start:{date:'2026-11-18',unix:now+86400}};
const ticket=(id,label,status='valid')=>({id,event_id:event.id,status,description:label});
const order=(id,tickets,age=1,method='STRIPE',amount=5000)=>({id,status:'completed',created_at:now-age*86400,transactions:[{amount,payment_method:method,pending:false}],line_items:tickets.map(t=>({type:'ticket',value:2000,quantity:1,description:t.description,event_summary:{event_id:t.event_id},fulfilments:[{reference_id:t.id}]}))});
test('formats require correct names and weekdays; Friday editions excluded',()=>{
 assert.equal(eventFormat(event),'jam');
 assert.equal(eventFormat({...event,name:'New York Jazz Bar',start:{date:'2026-11-19'}}),'nyjb');
 assert.equal(eventFormat({...event,name:'NYJB Friday Edition',start:{date:'2026-11-27'}}),null);
 assert.equal(eventFormat({...event,name:'Other concert'}),null);
});
test('packages vs guests vs entitlements; valid tickets only; weekly purchase windows',()=>{
 const ts=[ticket('a','Premium - 2 Guests'),ticket('b','Club - 3 Guests'),ticket('c','Club Plus - 4 Guests'),ticket('void','Premium - 2 Guests','voided')];
 const n=summarizeBattleEvent(event,ts,[order('a',[ts[0]],1),order('b',[ts[1]],8),order('c',[ts[2]],2),order('void',[ts[3]])],now);
 assert.equal(n.packages,3);assert.equal(n.guests,9);assert.equal(n.drinks,6);assert.equal(n.recent,6);assert.equal(n.previous,3);
});
test('free, offline, cancelled, pending and fully refunded payments do not rank',()=>{
 for(const kind of ['free','offline','cancelled','pending','refunded']){
  const t=ticket('a','Premium - 2 Guests');const o=order('a',[t]);
  if(kind==='free')o.line_items[0].value=0;
  if(kind==='offline')o.transactions[0].payment_method='OFFLINE';
  if(kind==='cancelled')o.status='cancelled';
  if(kind==='pending')o.transactions[0].pending=true;
  if(kind==='refunded')o.transactions.push({amount:-5000,payment_method:'STRIPE',pending:false});
  assert.equal(summarizeBattleEvent(event,[t],[o],now).packages,0,kind);
 }
});
test('duplicate fulfilments do not double count; missing schema prevents ranking',()=>{
 const t=ticket('a','Premium - 2 Guests'),o=order('a',[t]);o.line_items.push(o.line_items[0]);
 assert.equal(summarizeBattleEvent(event,[t],[o],now).packages,1);
 delete o.transactions;assert.equal(summarizeBattleEvent(event,[t],[o],now).complete,false);
});
test('monthly ranking averages nights and missing revenue is not zero',()=>{
 const t=ticket('a','Premium - 2 Guests');const n=summarizeBattleEvent(event,[t],[order('a',[t])],now);
 const stats=ranking([{...n,packages:10},{...n,id:'second',packages:20},{...n,format:'nyjb',packages:16,cents:50000}]);
 assert.equal(stats[0].packages,15);assert.equal(stats[1].packages,16);assert.equal(stats[0].cents,null);
 assert.equal(ranking([{...n,complete:false}])[0].packages,null);
 assert.equal(ranking([])[1].packages,null);
});
test('risers rank acceleration, exclude decline and tiny changes',()=>{
 const n=summarizeBattleEvent(event,[],[],now);
 const results=risingEvents([{...n,id:'large',recent:20,previous:19},{...n,id:'surprise',recent:12,previous:2},{...n,id:'tiny',recent:2,previous:0},{...n,id:'decline',recent:10,previous:12}]);
 assert.deepEqual(results.map(n=>n.id),['surprise','large']);
});

test('ticket mix includes VIP guests once, table units separately, and ignores add-ons and voids',()=>{
 const ts=[ticket('a','Club - 2 Guests'),ticket('b','Club Plus - 3 Guests'),ticket('c','Premium - 4 Guests'),ticket('d','VIP - 2 Guests'),ticket('e','Worldstar VIP - 4 Guests'),ticket('void','Premium - 2 Guests','voided'),{...ticket('addon','Premium - 2 Guests'),add_on_id:'addon'}];
 const n=summarizeBattleEvent(event,[...ts,ts[0]],[],now);
 assert.equal(n.guests,15);assert.equal(n.vipTables,1);assert.equal(n.worldstarTables,1);
 assert.deepEqual(n.mix,{Club:2,'Club Plus':3,Premium:4,VIP:2,'Worldstar VIP':4,'Weitere Tickets':0});
 assert.equal(Object.values(n.mix).reduce((a,b)=>a+b,0),n.guests);
 assert.equal(summarizeMix([n,n]).guests,30);
 assert.equal(summarizeMix([{...n,unknown:1}]),null);
});
test('comparison uses consecutive completed nights, rejects live or ambiguous pairs',()=>{
 const n=summarizeBattleEvent(event,[],[],now);
 const jam={...n,id:'j',date:'2026-11-11',format:'jam'};
 const nyjb={...n,id:'n',date:'2026-11-12',format:'nyjb'};
 assert.equal(latestCompletedPair([jam,nyjb],'2026-11-12'),null);
 assert.deepEqual(latestCompletedPair([jam,nyjb],'2026-11-13').map(n=>n.id),['j','n']);
 assert.equal(latestCompletedPair([jam,nyjb,{...nyjb,id:'duplicate'}],'2026-11-13'),null);
 assert.equal(latestCompletedPair([jam,{...nyjb,date:'2026-11-19'}],'2026-11-20'),null);
});

test('VIP breakdown preserves sizes and separate categories without duplicate or void packages',()=>{
 const a=ticket('a','VIP - 2 Guests');
 const n=summarizeBattleEvent(event,[a,a,ticket('b','VIP - 2 Guests'),ticket('c','VIP - 3 Guests'),ticket('d','VIP - 4 Guests'),ticket('e','Worldstar VIP - 2 Guests'),ticket('v','VIP - 4 Guests','voided')],[],now);
 assert.deepEqual(n.vipPackages,[{category:'VIP',size:2,count:2},{category:'VIP',size:3,count:1},{category:'VIP',size:4,count:1},{category:'Worldstar VIP',size:2,count:1}]);
 assert.equal(n.vipPackages.reduce((sum,p)=>sum+p.count,0),n.vipTables+n.worldstarTables);
 assert.equal(n.vipPackages.reduce((sum,p)=>sum+p.count*p.size,0),n.guests);
});

test('explicit cancellations and confirmed September exception are separated before all performance calculations',()=>{
 for(const label of ['Cancelled – sorry','CANCELLED','Canceled','Abgesagt','Ausgefallen'])assert.equal(isCancelledEvent({...event,unavailable_status:label}),true);
 for(const label of ['Sold out','FULLY BOOKED','Ticket sales closed',null])assert.equal(isCancelledEvent({...event,unavailable_status:label}),false);
 assert.equal(isCancelledEvent({...event,status:'close_sales'}),false);
 const sep={...event,id:'ev_8985314',start:{date:'2026-09-03'}};
 assert.equal(isCancelledEvent(sep),true);
 assert.equal(isCancelledEvent({...event,id:"ev_8170032",start:{date:"2026-06-11"},unavailable_status:"World Cup 1st Game"}),true);
 assert.equal(isCancelledEvent({...event,unavailable_status:"World Cup 1st Game"}),false);
 const result=partitionPerformanceEvents([event,sep,{...event,id:'cancel',unavailable_status:'CANCELLED'},{...event,id:'draft',status:'draft'}]);
 assert.deepEqual(result.active.map(e=>e.id),[event.id]);
 assert.deepEqual(result.cancelled.map(e=>e.id),[sep.id,'cancel']);
 const nights=result.active.map(e=>({...summarizeBattleEvent(e,[],[],now),guests:40,cents:100000}));
 assert.equal(ranking(nights)[0].count,1);
 assert.equal(ranking(nights)[0].cents,100000);
 assert.equal(summarizeMix(nights).guests,40);
});

test('Live revenue for Jam and NYJB belongs to today until 03:00, future nights stay empty', async t => {
 const {readBattle}=await import('../lib/staff/battle.ts');
 let clock=Date.parse('2026-11-18T22:08:00Z');
 t.mock.method(Date,'now',()=>clock);
 const events=[
  {...event,start:{date:'2026-11-18',unix:1795032000}},
  {...event,id:'ev_nyjb',name:'New York Jazz Bar',start:{date:'2026-11-19',unix:1795118400}}
 ];
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.pathname.endsWith('/events'))return Response.json({data:events});
  if(url.pathname.endsWith('/issued_tickets')||url.pathname.endsWith('/orders'))return Response.json({data:[]});
  if(url.pathname.endsWith('/transactions/history'))return Response.json({items:[
   {transaction_id:'jam',timestamp:'2026-11-18T22:00:00Z',type:'PAYMENT',status:'SUCCESSFUL',currency:'EUR',amount:100},
   {transaction_id:'late',timestamp:'2026-11-19T00:30:00Z',type:'PAYMENT',status:'SUCCESSFUL',currency:'EUR',amount:20},
   {transaction_id:'nyjb',timestamp:'2026-11-19T22:00:00Z',type:'PAYMENT',status:'SUCCESSFUL',currency:'EUR',amount:200}
  ]});
  throw Error('Unexpected '+url.pathname);
 });
 let feed=await readBattle('live-jam','2026-11','merchant','token');
 assert.equal(feed.nights.find(n=>n.format==='jam').cents,10000);
 assert.equal(feed.nights.find(n=>n.format==='nyjb').cents,null);
 clock=Date.parse('2026-11-19T01:00:00Z');
 feed=await readBattle('live-late','2026-11','merchant','token');
 assert.equal(feed.today,'2026-11-18');
 assert.equal(feed.nights.find(n=>n.format==='jam').cents,12000);
 clock=Date.parse('2026-11-19T02:00:00Z');
 feed=await readBattle('live-rollover','2026-11','merchant','token');
 assert.equal(feed.today,'2026-11-19');
 assert.equal(feed.upcoming.some(n=>n.format==='jam'),false);
 clock=Date.parse('2026-11-19T22:08:00Z');
 feed=await readBattle('live-nyjb','2026-11','merchant','token');
 assert.equal(feed.today,'2026-11-19');
 assert.equal(feed.nights.find(n=>n.format==='nyjb').cents,20000);
 assert.equal(feed.upcoming.some(n=>n.format==='jam'),false);
});


test('battle fetches v2 orders across pages for dated ticket fulfilments',async t=>{
 const {readBattle}=await import('../lib/staff/battle.ts');
 t.mock.method(Date,'now',()=>now*1000);
 const ts=[ticket('a','Club - 2 Guests'),ticket('b','Premium - 3 Guests')];
 const first=order('or_a',[ts[0]],1),second=order('or_b',[ts[1]],8);
 first.created_at=new Date(first.created_at*1000).toISOString();
 second.created_at=new Date(second.created_at*1000).toISOString();
 let orderPages=0;
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(String(input));
  if(url.pathname==='/v1/events')return Response.json({data:[event]});
  if(url.pathname==='/v1/issued_tickets')return Response.json({data:ts});
  if(url.pathname==='/v2/orders'){
   orderPages++;
   assert.equal(url.searchParams.get('event_id'),event.id);
   if(!url.searchParams.has('starting_after'))return Response.json({data:[first],links:{next:'/v2/orders?starting_after=or_a'}});
   assert.equal(url.searchParams.get('starting_after'),'or_a');
   return Response.json({data:[second],links:{next:null}});
  }
  throw Error('Unexpected provider endpoint: '+url.pathname);
 });
 const feed=await readBattle('v2-orders-regression','2026-11');
 assert.equal(orderPages,2);
 const n=feed.upcoming.find(n=>n.id===event.id);
 assert.equal(n.guests,5);assert.equal(n.recent,2);assert.equal(n.previous,3);assert.equal(n.complete,true);
});
