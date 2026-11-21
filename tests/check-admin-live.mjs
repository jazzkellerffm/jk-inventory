// Manual read-only check inside Vercel; only structural diagnostics enter logs.
// No credentials, customer information, identifiers or monetary totals are logged.
import { readAdminSummary } from '../lib/staff/admin/data.ts';

const month = '2026-11';
const observations = { ticket: { requests: 0, rows: 0, statuses: {}, methods: {} }, sumup: { requests: 0, rows: 0, statuses: {}, types: {} } };
const count = (map, key) => { map[String(key)] = (map[String(key)] ?? 0) + 1; };
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const url = new URL(String(args[0]));
  const source = url.hostname === 'api.sumup.com' ? 'sumup' : url.hostname === 'api.tickettailor.com' ? 'ticket' : null;
  if (!source) return originalFetch(...args);
  const record = observations[source];
  record.requests++;
  try {
    const res = await originalFetch(...args);
    count(record.statuses, res.status);
    if (res.ok) {
      const body = await res.clone().json();
      const rows = source === 'ticket' ? body.data : body.items;
      record.rows += Array.isArray(rows) ? rows.length : 0;
      if (source === 'ticket') for (const row of rows ?? []) {
        for (const tx of row.transactions ?? []) count(record.methods, tx.payment_method);
      }
      else for (const row of rows ?? []) count(record.types, row.type + '/' + row.status);
    }
    return res;
  } catch (error) {
    count(record.statuses, error.name);
    throw error;
  }
};
const output = console.log.bind(console);
console.info = console.warn = () => {};
output('ADMIN_VERIFY config ' + JSON.stringify(Object.fromEntries(['SUMUP_API_KEY', 'SUMUP_MERCHANT_CODE', 'TICKET_TAILOR_API_KEY'].map(key => [key, { present: !!process.env[key], whitespace: process.env[key] !== process.env[key]?.trim() }]))));
try {
  const data = await readAdminSummary(month);
  output('ADMIN_VERIFY sources ' + JSON.stringify(observations));
  output('ADMIN_VERIFY result ' + JSON.stringify({
    ticketLoaded: !!data.ticket, sumupLoaded: !!data.bar,
    ticketIssues: data.ticket?.paymentIssues, eventIssues: data.ticket?.eventIssues,
    sumupIssues: data.bar?.paymentIssues, combinedAvailable: data.combinedPayments != null,
  }));
} catch (error) { output('ADMIN_VERIFY failed ' + error.name); process.exitCode = 1; }
