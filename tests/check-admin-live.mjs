// Manual, read-only verification in Vercel; never log customer data, secrets or amounts.
import assert from 'node:assert/strict';
import { readAdminSummary } from '../lib/staff/admin/data.ts';
const originalFetch = globalThis.fetch;
let orders, history;
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
  orders = new Map(); history = new Map();
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
  console.log('ADMIN_VERIFY '+month+' PASS: both sources complete; refunds and combined total reconciled');
}
} catch {
  console.error('ADMIN_VERIFY '+checkedMonth+' FAIL: '+stage);
  process.exitCode = 1;
} finally { globalThis.fetch = originalFetch; }
