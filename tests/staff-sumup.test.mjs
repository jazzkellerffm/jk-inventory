import test from 'node:test';
import assert from 'node:assert/strict';
import { readBarFeed, readBestsellers } from '../lib/staff/sumup.ts';
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
