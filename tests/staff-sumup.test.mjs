import test from 'node:test';
import assert from 'node:assert/strict';
import { readBarFeed, readBestsellers, readBattleRevenue, readBarEvenings } from '../lib/staff/sumup.ts';
import { readSales } from '../lib/staff/sumup-sales.ts';
import { barLoadLevel, prepWeight, isFreshSnapshot } from '../lib/staff/bar-workload.ts';
import { serviceStart } from '../lib/staff/service-day.ts';
import { bestsellerStart } from '../lib/staff/bestseller-period.ts';

const now = Date.parse('2026-11-17T21:00:00Z');
const at = minutes => new Date(now - minutes * 60_000).toISOString();
const line = (name, quantity, extra = {}) => ({ type: 'CATALOG', name, quantity, ...extra });
const payment = (id, minutes = 1, extra = {}) => ({
  transaction_id: `uuid-${id}`, transaction_code: `code-${id}`, timestamp: at(minutes),
  amount: 15, currency: 'EUR', type: 'PAYMENT', status: 'SUCCESSFUL', product_summary: 'Caipirinha Magnifica', ...extra,
});
const sale = (id, refs, items, minutes = 1) => ({
  id, state: 'CLOSED', created_at: at(6000), closed_at: at(minutes), items,
  payments: refs.map(reference => ({ reference: `code-${reference}`, type: 'purchase', status: 'SUCCESSFUL' })),
});
function mockApi(t, { payments = [], sales = [], pageSize = 25, failSearch = false, repeatCursor = false, receipt = [], afterFirstPage = false } = {}) {
  const calls = [];
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async (input, init = {}) => {
    const url = new URL(String(input)); calls.push({ url, init });
    if (url.pathname.endsWith('/transactions/history')) return Response.json({ items: payments });
    if (url.pathname.endsWith('/sales/search')) {
      const body = JSON.parse(init.body);
      assert.equal(body.start_date, undefined, 'must include bills created before the period');
      if (failSearch || (afterFirstPage && body.pagination_token)) return new Response('', { status: 503 });
      const offset = Number(body.pagination_token ?? 0);
      return Response.json({ items: sales.slice(offset, offset + pageSize).map(s => ({ id: s.id, closed_at: s.closed_at })),
        ...(repeatCursor || offset + pageSize < sales.length ? { pagination_token: repeatCursor ? '1' : String(offset + pageSize) } : {}) });
    }
    if (url.pathname.includes('/sales/')) return Response.json(sales.find(s => s.id === decodeURIComponent(url.pathname.split('/').at(-1))));
    if (url.pathname.includes('/receipts/')) return Response.json({ transaction_data: { products: receipt } });
    if (url.pathname.endsWith('/transactions')) return Response.json({ products: receipt });
    throw new Error(`Unexpected API ${url.pathname}`);
  });
  return calls;
}

test('Sales lines restore evening/week/month rankings despite empty receipt products', async t => {
  const calls = mockApi(t, { payments: [payment('1')], sales: [sale('s1', ['1'], [line('Caipirinha Magnifica', 3)])] });
  for (const period of ['evening', 'week', 'month']) {
    const feed = await readBestsellers(`ranking-${period}`, 'test', period);
    assert.equal(feed.incomplete, 0);
    assert.deepEqual(feed.products, [{ name: 'Caipirinha Magnifica', quantity: 3 }]);
  }
  assert.equal(calls.filter(c => c.url.pathname.includes('receipts')).length, 0);
});

test('Busy bar includes ALL recent payments, even beyond eight visible cards and 25 sales', async t => {
  const payments = Array.from({ length: 30 }, (_, i) => payment(String(i)));
  const sales = payments.map((_, i) => sale(`busy-${i}`, [String(i)], [line('Caipirinha Magnifica', 2)]));
  const calls = mockApi(t, { payments, sales });
  const feed = await readBarFeed('busy', 'test');
  assert.equal(feed.payments.length, 8);
  assert.equal(feed.buckets.at(-1), 30);
  assert.equal(feed.paidEffort, 60);
  assert.equal(feed.missingReceiptDetails, false);
  assert.equal(feed.eveningCents, 45_000);
  assert.equal(barLoadLevel(feed.paidEffort, 0, true), 3);
  assert.equal(calls.filter(c => c.url.pathname.endsWith('/search')).length, 2);
});

test('Order & Pay charge URNs join actual quantities to transaction codes', async t => {
  const sales = [sale('qr-versioned', ['qr'], [line('Caipirinha Magnifica', 5)]),
    sale('qr-bare', ['plain'], [line('Tonic Water', 2)])];
  sales[0].payments[0].reference = 'urn:sumup:charge:code-qr;2';
  sales[1].payments[0].reference = 'urn:sumup:charge:code-plain';
  mockApi(t, { payments: [payment('qr'), payment('plain')], sales });
  const feed = await readBarFeed('qr-urn', 'test');
  assert.equal(feed.missingReceiptDetails, false);
  assert.equal(feed.paidEffort, 5.25);
  assert.equal(barLoadLevel(feed.paidEffort, 0, true), 3);
  for (const period of ['evening', 'week', 'month']) {
    const ranking = await readBestsellers('qr-urn', 'test', period);
    assert.equal(ranking.incomplete, 0);
    assert.equal(ranking.products.find(p => p.name === 'Caipirinha Magnifica').quantity, 5);
  }
});

test('Unknown namespaces and malformed charge URNs never match by suffix', async t => {
  const sales = [sale('qr-unknown', ['qr'], [line('Mojito', 50)]), sale('qr-malformed', ['plain'], [line('Mojito', 50)])];
  sales[0].payments[0].reference = 'urn:other:charge:code-qr;2';
  sales[1].payments[0].reference = 'urn:sumup:charge:code-plain;unexpected';
  mockApi(t, { payments: [payment('qr'), payment('plain')], sales });
  const feed = await readBarFeed('qr-invalid', 'test');
  assert.equal(feed.missingReceiptDetails, true);
  assert.equal(feed.paidEffort, 0);
});

test('Split payments count one sale once; fees/snacks do not inflate bar effort', async t => {
  mockApi(t, { payments: [payment('a'), payment('b')], sales: [sale('split', ['a', 'b'], [
    line('Caipirinha Magnifica', 3), line('Wasser', 8), line('Hummus Plate', 4, { categories: [{ name: 'Bar Snacks' }] }),
    line('Service fee', 1, { type: 'FEE' }), line('Pfand', 4, { type: 'DEPOSIT' }),
  ])] });
  const feed = await readBarFeed('split', 'test');
  assert.equal(feed.paidEffort, 4);
  assert.equal(feed.eveningCents, 3000);
  const ranking = await readBestsellers('split', 'test');
  assert.equal(ranking.products.find(p => p.name === 'Caipirinha Magnifica').quantity, 3);
  assert.equal(ranking.products.some(p => p.name === 'Service fee'), false);
});

test('Summary text never supplies invented quantities and incomplete feeds cannot read quiet', async t => {
  mockApi(t, { payments: [payment('unknown')] });
  const feed = await readBarFeed('unknown', 'test');
  assert.equal(feed.payments[0].summary, 'Caipirinha Magnifica');
  assert.equal(feed.paidEffort, 0);
  assert.equal(feed.missingReceiptDetails, true);
  assert.equal(barLoadLevel(feed.paidEffort, 0, !feed.missingReceiptDetails), 0);
  assert.equal(barLoadLevel(feed.paidEffort, 5, false), 3, 'known open Included Drinks can prove high load');
  assert.equal((await readBestsellers('unknown', 'test')).incomplete, 1);
});

test('Incomplete recent items do not erase valid payment totals or claim a complete ranking', async t => {
  mockApi(t, { payments: [payment('good'), payment('bad')], sales: [
    sale('good', ['good'], [line('Mojito', 5)]), sale('bad', ['bad'], [line('Gin Tonic', null)]),
  ] });
  const feed = await readBarFeed('partial', 'test');
  assert.equal(feed.paidEffort, 5);
  assert.equal(feed.missingReceiptDetails, true);
  assert.equal(feed.eveningCents, 3000);
  assert.equal(barLoadLevel(feed.paidEffort, 0, false), 3);
  assert.deepEqual((await readBestsellers('partial', 'test')).products, []);
});

test('Sales failure preserves transactions and can fall back to actual receipt quantities', async t => {
  mockApi(t, { payments: [payment('fallback')], failSearch: true, receipt: [line('Negroni', 5)] });
  const feed = await readBarFeed('fallback', 'test');
  assert.equal(feed.paidEffort, 5);
  assert.equal(feed.missingReceiptDetails, false);
  assert.equal(feed.eveningCents, 1500);
});

test('Failed and refunded transactions, unsuccessful sale refs, and unrelated equal amounts are not counted', async t => {
  mockApi(t, { payments: [payment('ok'), payment('failed', 1, { status: 'FAILED' }), payment('refund', 1, { status: 'REFUNDED' })],
    sales: [sale('unrelated', ['other'], [line('Mojito', 50)]), { ...sale('failedref', ['ok'], [line('Mojito', 50)]),
      payments: [{ reference: 'code-ok', type: 'purchase', status: 'FAILED' }] }] });
  const feed = await readBarFeed('refs', 'test');
  assert.equal(feed.eveningCents, 1500);
  assert.equal(feed.paidEffort, 0);
  assert.equal(feed.missingReceiptDetails, true);
});

test('Repeated pagination fails closed, never returning a partial page as complete', async t => {
  const sales = [sale('r1', ['r1'], [line('Mojito', 1)]), sale('r2', ['r2'], [line('Mojito', 1)])];
  mockApi(t, { sales, pageSize: 1, repeatCursor: true });
  await assert.rejects(readSales('repeat', 'test', now - 60_000, now), /cursor/);
});

test('Business evening boundaries and workload thresholds are explicit', () => {
  assert.equal(barLoadLevel(0, 0, true), 1);
  assert.equal(barLoadLevel(2, 1, true), 2);
  assert.equal(barLoadLevel(3, 2, true), 3);
  assert.equal(barLoadLevel(0, 0, false), 0);
  assert.equal(prepWeight('Caipirinha Magnifica'), 1);
  assert.equal(prepWeight('Crémant'), 0.125);
  assert.equal(serviceStart(Date.parse('2026-11-18T01:59:00Z')), Date.parse('2026-11-17T02:00:00Z'));
  assert.equal(serviceStart(Date.parse('2026-11-18T02:00:00Z')), Date.parse('2026-11-18T02:00:00Z'));
  assert.equal(bestsellerStart(now, 'week'), Date.parse('2026-11-16T02:00:00Z'));
});


test('A second-page API failure rejects the whole sales window', async t => {
  mockApi(t, { sales: [sale('page1', ['p1'], [line('Mojito', 1)]), sale('page2', ['p2'], [line('Mojito', 2)])], pageSize: 1, afterFirstPage: true });
  await assert.rejects(readSales('pagefail', 'test', now - 60_000, now), /503/);
});

test('Expired API budgets terminate instead of blocking live updates', async t => {
  mockApi(t);
  await assert.rejects(readSales('timeout', 'test', now - 60_000, now, now - 1), /Incomplete SumUp sales/);
});


test('Stale snapshots cannot certify a quiet bar', () => {
  assert.equal(isFreshSnapshot(new Date(now - 45_000).toISOString(), now), true);
  assert.equal(isFreshSnapshot(new Date(now - 45_001).toISOString(), now), false);
  assert.equal(isFreshSnapshot('bad timestamp', now), false);
  assert.equal(isFreshSnapshot(undefined, now), false);
  assert.equal(barLoadLevel(0, 0, isFreshSnapshot(at(2), now)), 0);
});

test('A busy half-hour ago does not keep the current bar busy', async t => {
  mockApi(t, { payments: [payment('old-rush', 30)], sales: [sale('old-rush-sale', ['old-rush'], [line('Mojito', 60)], 30)] });
  const feed = await readBarFeed('old-rush', 'test');
  assert.equal(feed.paidEffort, 0);
  assert.equal(feed.missingReceiptDetails, false);
  assert.equal(feed.buckets.at(-1), 0);
  assert.equal(barLoadLevel(feed.paidEffort, 0, true), 1);
});


test('historical revenue splits months into contiguous windows and preserves night boundaries',async t=>{
 const start=Date.parse('2026-11-01T02:00:00Z'),end=Date.parse('2026-11-18T02:00:00Z');const calls=[];
 const rows=[payment('a',1,{timestamp:'2026-11-04T22:00:00Z',amount:12}),payment('b',1,{timestamp:'2026-11-05T01:00:00Z',amount:8}),payment('edge',1,{timestamp:'2026-11-08T02:00:00Z',amount:5})];
 t.mock.method(globalThis,'fetch',async input=>{const u=new URL(input);calls.push(u);return Response.json({items:rows});});
 assert.deepEqual(await readBattleRevenue('merchant','token',start,end),{'2026-11-04':2000,'2026-11-08':500});
 assert.equal(calls.length,3);
 assert.equal(calls[0].searchParams.get('newest_time'),calls[1].searchParams.get('oldest_time'));
});
test('failed historical window rejects partial revenue rather than treating it as zero',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>++calls===1?Response.json({items:[]}):new Response('',{status:503}));
 await assert.rejects(readBattleRevenue('merchant','token',Date.parse('2026-11-01Z'),Date.parse('2026-11-18Z')),/SumUp HTTP 503/);
});

for (const form of ['bare', 'question', 'absolute']) {
 test(`historical payments follow ${form} pagination links and count each payment once`, async t => {
  const start=Date.parse('2026-11-12T02:00:00Z'),end=Date.parse('2026-11-13T02:00:00Z');
  let calls=0;
  const a=payment('a',1,{timestamp:'2026-11-12T23:00:00Z',amount:17});
  const b=payment('b',1,{timestamp:'2026-11-13T01:00:00Z',amount:600});
  const query='limit=100&newest_ref=page2&order=descending';
  t.mock.method(globalThis,'fetch',async input=>{
   const url=new URL(input);calls++;
   if(!url.searchParams.has('newest_ref'))return Response.json({items:[a],links:[{rel:'next',href:form==='bare'?query:form==='question'?'?'+query:'https://api.sumup.com'+url.pathname+'?'+query}]});
   assert.equal(url.searchParams.get('newest_ref'),'page2');
   return Response.json({items:[a,b]});
  });
  assert.deepEqual(await readBattleRevenue('merchant','token',start,end),{'2026-11-12':61700});
  assert.equal(calls,2);
 });
}
test('failed or looping transaction pages never return partial revenue',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>++calls===1?Response.json({items:[payment('partial')],links:[{rel:'next',href:'newest_ref=page2'}]}):new Response('',{status:503}));
 await assert.rejects(readBattleRevenue('merchant','token',now-3600000,now),/503/);
});
test('repeated transaction cursor is rejected',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({items:[],links:[{rel:'next',href:'newest_ref=same'}]}));
 await assert.rejects(readBattleRevenue('merchant','token',now-3600000,now),/Incomplete SumUp history/);
});


test('Free payments never block catalogue rankings or disappear from revenue and stream', async t => {
  mockApi(t, { payments: [payment('catalog'), payment('custom'), payment('mixed')], sales: [
    sale('catalog', ['catalog'], [line('Mojito', 3)]),
    sale('custom', ['custom'], [line('Custom amount', 1, { type: 'CUSTOM' })]),
    sale('mixed', ['mixed'], [line('Nachos con Salsa', 2, { categories: [{ name: 'Bar Snacks' }] }),
      line('DRINKS', 1, { type: 'CUSTOM' }), line('drinks', 1, { type: 'CUSTOM' }),
      line('Bier', 1, { type: 'CUSTOM' }), line('Adrianos Sonderzahlung', 1, { type: 'CUSTOM' })]),
  ] });
  const ranking = await readBestsellers('free-payments', 'test');
  assert.equal(ranking.incomplete, 0);
  assert.equal(ranking.excluded, 2);
  assert.deepEqual(ranking.products, [{ name: 'Mojito', quantity: 3 }, { name: 'Nachos con Salsa', quantity: 2 }]);
  const feed = await readBarFeed('free-payments', 'test');
  assert.equal(feed.eveningCents, 4500);
  assert.equal(feed.missingReceiptDetails, false);
  assert.equal(feed.paidEffort, 3);
  assert.equal(feed.payments.length, 3);
  assert.ok(feed.payments.some(p => p.items.some(i => i.name === 'Custom amount')));
});

test('Only free payments produce an empty catalogue ranking, not an unavailable ranking', async t => {
  mockApi(t, { payments: [payment('free', 1, { product_summary: 'CUSTOM AMOUNT' })], receipt: [] });
  const ranking = await readBestsellers('only-free', 'test');
  assert.equal(ranking.incomplete, 0);
  assert.equal(ranking.excluded, 1);
  assert.deepEqual(ranking.products, []);
});

test('Free payments with arbitrary names and no quantity do not invent bar workload', async t => {
  mockApi(t, { payments: [payment('custom-only')], sales: [
    sale('custom-only', ['custom-only'], [line('Bier', null, {type:'CUSTOM'}), line('Sonderzahlung', 8, {type:'CUSTOM'})])
  ] });
  const feed = await readBarFeed('custom-workload', 'test');
  assert.equal(feed.missingReceiptDetails, false);
  assert.equal(feed.paidEffort, 0);
  assert.equal(feed.eveningCents, 1500);
});

test('Kitchen ignores free amounts but keeps genuine missing category warnings', async t => {
  const { readFood } = await import('../lib/staff/food.ts');
  t.mock.method(Date, 'now', () => now);
  let items = [line('Bier', 1, {type:'CUSTOM'}), line('Fee', 1, {type:'FEE'})];
  t.mock.method(globalThis, 'fetch', async input => Response.json(String(input).endsWith('/search')
    ? {items:[{id:'food'}]} : {id:'food',closed_at:at(1),currency:{code:'EUR',scale:2},items}));
  let feed = await readFood('food-custom','test');
  assert.equal(feed.recentIncomplete, false);
  assert.equal(feed.recentPortions, 0);
  items.push(line('Nachos', 2, {categories:[{name:'Bar Snacks'}],price:{total_gross_amount_final:1200}}));
  feed = await readFood('food-custom','test');
  assert.equal(feed.recentIncomplete, false);
  assert.equal(feed.recentPortions, 2);
  assert.equal(feed.totalCents, 1200);
  items.push(line('Unknown catalogue item', 1));
  feed = await readFood('food-custom','test');
  assert.equal(feed.recentIncomplete, true);
  assert.equal(feed.recentPortions, 2);
});


test('Evening comparison keeps midnight sales live until Berlin 03:00 and finalizes without duplicates', async t => {
  let clock = Date.parse('2026-11-19T00:30:00Z');
  t.mock.method(Date, 'now', () => clock);
  const rows = [
    payment('previous', 1, { timestamp: '2026-11-17T21:00:00Z', amount: 10 }),
    payment('evening', 1, { timestamp: '2026-11-18T21:00:00Z', amount: 20 }),
    payment('midnight', 1, { timestamp: '2026-11-19T00:00:00Z', amount: 5 }),
    payment('failed', 1, { timestamp: '2026-11-19T00:00:00Z', status: 'FAILED', amount: 99 }),
    payment('boundary', 1, { timestamp: '2026-11-19T02:00:00Z', amount: 3 }),
  ];
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(String(input));
    assert.ok(url.pathname.endsWith('/transactions/history'));
    // Include overlapping rows to verify defensive half-open range filtering.
    return Response.json({ items: rows });
  });
  let feed = await readBarEvenings('live-history-test', 'test');
  assert.deepEqual(feed.nights, [
    { date: '2026-11-17', live: false, payments: 1, cents: 1000 },
    { date: '2026-11-18', live: true, payments: 2, cents: 2500 },
  ]);
  clock = Date.parse('2026-11-19T02:01:00Z');
  feed = await readBarEvenings('live-history-test', 'test');
  assert.deepEqual(feed.nights, [
    { date: '2026-11-17', live: false, payments: 1, cents: 1000 },
    { date: '2026-11-18', live: false, payments: 2, cents: 2500 },
    { date: '2026-11-19', live: true, payments: 1, cents: 300 },
  ]);
});

test('Booking lead counts valid guests by Berlin calendar days and excludes cancelled or unfinished evenings', async () => {
  const { addLeadEvent, emptyLead } = await import('../lib/staff/booking-lead.ts');
  const feed = { month:'2026-11', groups:{all:emptyLead(),jam:emptyLead(),nyjb:emptyLead(),weekend:emptyLead(),friday:emptyLead(),saturday:emptyLead()} };
  const event = {id:'ev-lead', name:'The Famous Jazz Jam Session',status:'published',start:{date:'2026-11-18',unix:Date.parse('2026-11-18T20:00:00Z')/1000}};
  const days = [0,1,3,4,7,8,14,15];
  const orders = days.map((d,i)=>({id:'o'+i,created_at:Date.parse('2026-11-18T10:00:00Z')/1000-d*86400}));
  const tickets = orders.map((o,i)=>({id:'t'+i,event_id:event.id,status:'valid',description:'Premium 2 Guests',order_id:o.id}));
  tickets.push({...tickets[0]}, {...tickets[0],id:'void',status:'void'}, {...tickets[0],id:'addon',add_on_id:'a'}, {...tickets[0],id:'manual',order_id:'missing'});
  addLeadEvent(feed,event,tickets,orders,'2026-11-18');
  assert.equal(feed.groups.all.nights,0);
  addLeadEvent(feed,{...event,status:'cancelled'},tickets,orders,'2026-11-19');
  assert.equal(feed.groups.all.nights,0);
  addLeadEvent(feed,event,tickets,orders,'2026-11-19');
  assert.deepEqual(feed.groups.all.bins,[2,4,4,4,2]);
  assert.equal(feed.groups.all.excludedGuests,2);
  assert.deepEqual(feed.groups.jam,feed.groups.all);
  assert.equal(feed.groups.nyjb.nights,0);
});


test('Weekend booking lead combines Friday and Saturday, excluding Sunday and cancelled dates', async () => {
  const { addLeadEvent, emptyLead } = await import('../lib/staff/booking-lead.ts');
  const feed = { month:'2026-11', groups:Object.fromEntries(['all','jam','nyjb','weekend','friday','saturday'].map(k=>[k,emptyLead()])) };
  for (const [date,size,status] of [['2026-11-13',2,'published'],['2026-11-14',3,'published'],['2026-11-15',4,'published'],['2026-11-06',4,'cancelled']]) {
    const event={id:date,name:'Concert',status,start:{date,unix:Date.parse(date+'T20:00:00Z')/1000}};
    addLeadEvent(feed,event,[{id:'t'+date,event_id:date,status:'valid',description:'Premium '+size+' Guests',order_id:'o'}],[{id:'o',created_at:Date.parse(date+'T10:00:00Z')/1000}],'2026-11-19');
  }
  assert.deepEqual(feed.groups.weekend.bins,[5,0,0,0,0]);
  assert.equal(feed.groups.weekend.nights,2);
  assert.equal(feed.groups.friday.bins[0],2);
  assert.equal(feed.groups.saturday.bins[0],3);
  assert.equal(feed.groups.all.bins[0],9);
  assert.equal(feed.groups.all.nights,3);
});
