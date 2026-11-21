import 'server-only';
import { readOrders } from '../ticket-orders';
import { serviceStart } from '../service-day';
import { summarizeSumUp, summarizeTickets, type FinanceOrder, type SumUpFinanceRow, type Valuation } from './finance';

function valuation(): Valuation {
  const config: Valuation = { drinkCents: 1500, bottles: {}, clubPerGuest: {} };
  const raw = process.env.STAFF_ADMIN_VALUATION_JSON;
  if (!raw) return config;
  const data = JSON.parse(raw);
  for (const field of ['bottles', 'clubPerGuest'] as const) {
    if (data[field] && typeof data[field] === 'object' && !Array.isArray(data[field])) {
      for (const [key, value] of Object.entries(data[field])) {
        if (!Number.isSafeInteger(value) || (value as number) < 0) throw Error('Invalid valuation');
        config[field][key] = value as number;
      }
    }
  }
  return config;
}

async function sumup(month: string) {
  const merchant = process.env.SUMUP_MERCHANT_CODE, token = process.env.SUMUP_API_KEY;
  if (!merchant || !token) throw Error('SumUp not configured');
  // Cover both calendar month and the last service night up to 03:00 the next day.
  const from = Date.parse(month + '-01T00:00:00+02:00');
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 1, 12));
  const end = Math.min(Date.now(), serviceStart(next.getTime()));
  const path = `https://api.sumup.com/v2.1/merchants/${encodeURIComponent(merchant)}/transactions/history`;
  let query = new URLSearchParams({ oldest_time: new Date(from).toISOString(), newest_time: new Date(end).toISOString(),
    limit: '100', order: 'ascending' }).toString();
  const seen = new Set<string>(), rows: SumUpFinanceRow[] = [];
  while (query) {
    if (seen.has(query) || seen.size >= 150) throw Error('Incomplete SumUp history');
    seen.add(query);
    const response = await fetch(path + '?' + query, { headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error('SumUp unavailable');
    const body = await response.json();
    if (!Array.isArray(body.items)) throw Error('Invalid SumUp history');
    for (const row of body.items) {
      if (!Number.isFinite(Date.parse(row.timestamp))) throw Error('Invalid transaction time');
      if (Date.parse(row.timestamp) >= from && Date.parse(row.timestamp) < end) rows.push(row);
    }
    const nextLink = body.links?.find((link: {rel: string}) => link.rel === 'next');
    if (!nextLink) break;
    if (typeof nextLink.href !== 'string' || !nextLink.href) throw Error('Incomplete SumUp page');
    const href = nextLink.href;
    query = href.startsWith('?') ? href.slice(1) : href.startsWith('/') || /^https?:/.test(href)
      ? new URL(href, path).searchParams.toString() : new URLSearchParams(href).toString();
    if (!query) throw Error('Invalid SumUp cursor');
  }
  return summarizeSumUp(rows, month);
}

async function tickets(month: string) {
  const key = process.env.TICKET_TAILOR_API_KEY;
  if (!key) throw Error('Ticket Tailor not configured');
  // All order ledgers: a refund this month may belong to a much older purchase.
  const orders = await readOrders<FinanceOrder>({}, 'Basic ' + Buffer.from(key + ':').toString('base64'));
  return summarizeTickets(orders, month, valuation());
}

export async function readAdminSummary(month: string) {
  const [tt, su] = await Promise.allSettled([tickets(month), sumup(month)]);
  const ticket = tt.status === 'fulfilled' ? tt.value : null;
  const bar = su.status === 'fulfilled' ? su.value : null;
  return { month, asOf: Date.now(), ticket, bar,
    combinedPayments: ticket?.netPayments != null && bar?.netPayments != null ? ticket.netPayments + bar.netPayments : null };
}
export type AdminSummary = Awaited<ReturnType<typeof readAdminSummary>>;
