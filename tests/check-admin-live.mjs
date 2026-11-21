// Manual, read-only verification in Vercel; never log customer data, secrets or amounts.
import assert from 'node:assert/strict';
import { readAdminSummary } from '../lib/staff/admin/data.ts';
import { ticketTotal } from '../lib/staff/admin/finance.ts';
import { readAdminEvening, readAdminHistory } from '../lib/staff/admin/dashboard-data.ts';
const originalFetch = globalThis.fetch;
const orders = new Map();
let history = new Map();
globalThis.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const url = new URL(String(args[0]));
  if (response.ok && url.hostname === 'api.tickettailor.com') {
    const body = await response.clone().json();
    for (const row of body.data ?? []) orders.set(row.id, row);
  }
  if (response.ok && url.pathname.endsWith('/transactions/history')) {
    const body = await response.clone().json();
    for (const row of body.items ?? []) history.set([row.transaction_id ?? row.id ?? row.transaction_code,row.type,row.timestamp].join(':'),row);
  }
  return response;
};
const inMonth = (timestamp, month) => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date(timestamp)).startsWith(month);
let checkedMonth = '', stage = '';
try {
for (const month of ['2026-11','2026-10']) {
  checkedMonth = month; stage = 'fetch and completeness';
  history = new Map();
  const result = await readAdminSummary(month);
  assert.ok(result.ticket, 'Ticket Tailor source unavailable');
  assert.ok(result.bar, 'SumUp source unavailable');
  assert.equal(result.ticket.paymentIssues, 0, 'Ticket Tailor ledger incomplete');
  assert.equal(result.bar.paymentIssues, 0, 'SumUp refunds not reconciled');
  let ticketNet=0, barNet=0;
  for (const order of orders.values()) for (const tx of order.transactions ?? []) {
    if (!tx.pending && inMonth(tx.created_at,month) && ['STRIPE','PAYPAL','SQUARE'].includes(tx.payment_method)) ticketNet += tx.amount;
  }
  for (const row of history.values()) {
    if (!['SUCCESSFUL','REFUNDED'].includes(row.status) || !inMonth(row.timestamp,month)) continue;
    const cents=Math.round(Math.abs(row.amount)*100);
    barNet += row.type === 'PAYMENT' ? cents : -cents;
  }
  stage = 'Ticket Tailor signed ledger';
  assert.equal(result.ticket.netPayments,ticketNet,'Ticket Tailor signed ledger mismatch');
  stage = 'SumUp payment and refund history';
  assert.equal(result.bar.netPayments,barNet,'SumUp payment/refund history mismatch');
  stage = 'combined total';
  assert.equal(result.combinedPayments,ticketNet+barNet,'Combined total mismatch');
  stage = 'active event packages';
  assert.equal(result.ticket.eventIssues,0);
  assert.ok(result.ticket.nights.some(night=>night.includedDrinkCount>0));
  for (const night of result.ticket.nights) {
    assert.ok(Number.isSafeInteger(night.knownIncludedCents) && night.knownIncludedCents>=0);
    if (night.unvaluedSupplies.length) { assert.equal(night.includedCents,null); assert.equal(night.admissionCents,null); }
  }
  stage = 'event fee/add-on reconciliation';
  for (const night of result.ticket.nights) {
    let expected = 0;
    for (const order of orders.values()) {
      if (order.status === 'cancelled') continue;
      for (const line of order.line_items ?? []) if (line.type !== 'void' && line.event_summary?.event_id === night.id) expected += line.total;
    }
    assert.equal(ticketTotal(night), expected);
  }
  if (month === '2026-11') {
    const friday = result.ticket.nights.find(n => n.date === '2026-11-06' && /Friday Night Club Band/i.test(n.name));
    assert.ok(friday, 'Reference event absent');
    assert.equal(ticketTotal(friday), 285300, 'Owner Ticket Tailor screenshot mismatch');
    assert.equal(friday.feeCents, 9600, 'Reference fees mismatch');
    const nyjb = result.ticket.nights.find(n => n.date === '2026-11-05' && /New York Jazz Bar/i.test(n.name));
    assert.ok(nyjb, 'Second reference event absent');
    assert.equal(ticketTotal(nyjb), 120000, 'Second owner Ticket Tailor screenshot mismatch');
    assert.equal(nyjb.feeCents, 7800, 'Second reference fees mismatch');
    console.log('ADMIN_REFERENCE PASS: event total matches owner Ticket Tailor screenshot; actual fees reconciled');
  }
  console.log('ADMIN_EVENTS '+month+' PASS: valid packages reconciled; known drinks retained; cancelled orders excluded');
  console.log('ADMIN_VERIFY '+month+' PASS: both sources complete; refunds and combined total reconciled');
}
stage = 'current evening';
const evening = await readAdminEvening();
stage = 'current evening event metadata';
assert.equal(evening.eventsAvailable,true);
stage = 'current evening Ticket Tailor reconciliation';
assert.notEqual(evening.ticketTotal,null);
stage = 'current evening SumUp reconciliation';
assert.notEqual(evening.sumupCents,null);
assert.equal(evening.combinedCents,evening.ticketTotal+evening.sumupCents);
console.log('ADMIN_EVENING PASS: sources complete; date-bound sum reconciled');
stage = 'SumUp archive';
const archive = await readAdminHistory('2026-11');
assert.ok(archive.firstMonth);assert.ok(archive.points.length);
assert.ok(archive.points.every(p=>p.cents!==null));
console.log('ADMIN_HISTORY PASS: first available month discovered; first archive batch reconciled');
} catch {
  console.error('ADMIN_VERIFY '+checkedMonth+' FAIL: '+stage);
  process.exitCode = 1;
} finally { globalThis.fetch = originalFetch; }
