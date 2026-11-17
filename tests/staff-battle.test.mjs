import test from 'node:test';
import assert from 'node:assert/strict';
import {eventFormat,summarizeBattleEvent,ranking,risingEvents} from '../lib/staff/battle-math.ts';
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
