import test from 'node:test';
import assert from 'node:assert/strict';
import { shiftMonth, earliestNightMonth, validNightMonth } from '../lib/staff/night-history.ts';
import { readNightHistory } from '../lib/staff/tickets.ts';
const page = data => Response.json({ data, links: { next: null } });
test('month bounds include June and a rolling prior year, never future or malformed months', () => {
 assert.equal(shiftMonth('2027-01', -1), '2026-12');
 assert.equal(earliestNightMonth('2026-11'), '2026-06');
 assert.equal(earliestNightMonth('2027-08'), '2026-08');
 for (const m of ['2026-06', '2026-11']) assert.equal(validNightMonth(m, '2026-11'), true);
 for (const m of ['2026-05', '2026-12', '2026-00', '2026-13', '2026-6']) assert.equal(validNightMonth(m, '2026-11'), false);
});
test('history combines same-day events, counts people, omits addons/cancellations and caches complete months', async t => {
 t.mock.method(Date, 'now', () => Date.parse('2026-11-20T15:00:00Z'));
 const event = (id, day, extra={}) => ({ id, name:'Concert', status:'published', start:{date:`2026-10-${day}`,unix:1}, ...extra });
 const events = [event('a','01'),event('b','01'),event('sold','02',{unavailable:true, unavailable_status:'Sold out'}),event('unknown','03'),event('quiet','04'),event('cancel','05',{unavailable_status:'Cancelled'}),event('future','21',{start:{date:'2026-11-21',unix:1}})];
 let calls = 0;
 t.mock.method(globalThis,'fetch',async input => {
  calls++;
  const url = new URL(input);
  if(url.pathname.endsWith('/events')) return page(events);
  const id = url.searchParams.get('event_id');
  assert.ok(!['cancel','future'].includes(id));
  const ticket = (description, extra={}) => ({id:'t'+id,event_id:id,status:'valid',description,...extra});
  if(id==='a') return page(Array.from({length:10},(_,i)=>ticket('Club - 4 Guests',{id:'a'+i})));
  if(id==='b') return page([ticket('Club - 3 Guests'),ticket('Club - 2 Guests',{id:'b2'}),ticket('Club - 4 Guests',{id:'addon',add_on_id:'x'})]);
  if(id==='unknown') return page([ticket('Unrecognized admission')]);
  return page([]);
 });
 assert.deepEqual(await readNightHistory('history-test','2026-10'),{soldOut:1,busy:1,half:0,quiet:1,unclear:1});
 const before=calls; await readNightHistory('history-test','2026-10'); assert.equal(calls,before);
});
test('failed historical tickets are rejected and can be retried, not cached as empty',async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-11-20T15:00:00Z'));
 let fail=true;
 t.mock.method(globalThis,'fetch',async input=>new URL(input).pathname.endsWith('/events') ? page([{id:'e',name:'Concert',status:'published',start:{date:'2026-09-01',unix:1}}]) : fail ? new Response('',{status:503}) : page([]));
 await assert.rejects(readNightHistory('retry-test','2026-09'));
 fail=false;
 assert.equal((await readNightHistory('retry-test','2026-09')).quiet,1);
});
