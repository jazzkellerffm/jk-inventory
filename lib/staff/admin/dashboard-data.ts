import 'server-only';
import { readSumUpRange, sumup, tickets } from './data';
import { berlinDay, summarizeSumUp } from './finance';
import { eveningDashboard, shiftMonth, type AdminHistory, type EveningEvent } from './dashboard';
import { serviceDate, serviceStart } from '../service-day';
import { privateMemo } from './private-cache';

async function events(date: string): Promise<EveningEvent[]> {
  const key = process.env.TICKET_TAILOR_API_KEY?.trim();
  if (!key) throw Error('Ticket Tailor unavailable');
  return privateMemo('evening-events:' + date, key, 60000, async () => {
    // Use the same complete event catalogue as the team dashboard. The provider's
    // date-filtered list can omit an occurrence that is present in this catalogue.
    // Filter the actual occurrence date below, after following every page.
    const query = new URLSearchParams({ limit: '100' });
    const result = new Map<string, EveningEvent>(), cursors = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const response = await fetch('https://api.tickettailor.com/v1/events?' + query, {
        headers: { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64') },
        cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('Events unavailable');
      const body = await response.json();
      if (!Array.isArray(body.data)) throw Error('Invalid events');
      for (const event of body.data) {
        if (event.start?.date !== date || !['published', 'close_sales', 'sales_closed'].includes(event.status) ||
          /cancelled|canceled|abgesagt|ausgefallen/i.test(event.unavailable_status ?? '')) continue;
        if (!event.id || typeof event.name !== 'string' || !Number.isFinite(event.start.unix)) throw Error('Invalid event');
        result.set(event.id, { id: event.id, name: event.name, date, start: event.start.unix });
      }
      if (!body.links?.next) return [...result.values()].sort((a, b) => a.start - b.start);
      const cursor = new URL(body.links.next, 'https://api.tickettailor.com').searchParams.get('starting_after');
      if (!cursor || cursors.has(cursor)) throw Error('Incomplete events');
      cursors.add(cursor); query.set('starting_after', cursor);
    }
    throw Error('Event page limit');
  });
}

export async function readAdminEvening() {
  const now = Date.now(), date = serviceDate(now), month = date.slice(0, 7);
  const identity = (process.env.SUMUP_MERCHANT_CODE ?? '') + (process.env.SUMUP_API_KEY ?? '');
  const [ev, tt, su] = await Promise.allSettled([events(date), tickets(month),
    privateMemo('evening:' + date, identity, 60000, async () => {
      const { rows, details } = await readSumUpRange(serviceStart(now), now);
      return summarizeSumUp(rows, month, details);
    })]);
  const current = eveningDashboard(ev.status === 'fulfilled' ? ev.value : null,
    tt.status === 'fulfilled' ? tt.value : null, su.status === 'fulfilled' ? su.value : null, now);
  // Same weekday, seven calendar days earlier; previous night is complete.
  // Share existing private monthly reads, never infer missing/uncertain figures as zero.
  const previousDate = new Date(date + 'T12:00:00Z');
  previousDate.setUTCDate(previousDate.getUTCDate() - 7);
  const previous = previousDate.toISOString().slice(0, 10);
  const previousMonth = previous.slice(0, 7);
  const [priorTickets, priorBar] = await Promise.allSettled([
    previousMonth === month && tt.status === 'fulfilled' ? Promise.resolve(tt.value) : tickets(previousMonth),
    previousMonth === month && su.status === 'fulfilled' ? Promise.resolve(su.value) : sumup(previousMonth),
  ]);
  const oldNights = priorTickets.status === 'fulfilled' ? priorTickets.value.nights.filter(night => night.date === previous) : [];
  const oldTicket = priorTickets.status === 'fulfilled' && priorTickets.value.eventIssues === 0 &&
    oldNights.length === 1 && !oldNights[0].uncertain
    ? oldNights[0].ticketCents + oldNights[0].feeCents + oldNights[0].addonCents : null;
  const oldSumup = priorBar.status === 'fulfilled' && priorBar.value.paymentIssues === 0 &&
    Object.hasOwn(priorBar.value.nights, previous) ? priorBar.value.nights[previous] : null;
  return { ...current, comparison: { date: previous, combinedCents: oldTicket !== null && oldSumup !== null ? oldTicket + oldSumup : null,
    sumupCents: oldSumup } };
}

async function firstSumUpMonth(): Promise<string | null> {
  const merchant = process.env.SUMUP_MERCHANT_CODE?.trim(), token = process.env.SUMUP_API_KEY?.trim();
  if (!merchant || !token) throw Error('SumUp unavailable');
  return privateMemo('first-sumup-month', merchant + token, 60000, async () => {
    const query = new URLSearchParams({ order: 'ascending', limit: '1', 'types[]': 'PAYMENT' });
    query.append('statuses[]', 'SUCCESSFUL'); query.append('statuses[]', 'REFUNDED');
    const response = await fetch(`https://api.sumup.com/v2.1/merchants/${encodeURIComponent(merchant)}/transactions/history?${query}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error('SumUp history unavailable');
    const body = await response.json();
    if (!Array.isArray(body.items)) throw Error('Invalid history');
    if (!body.items.length) return null;
    if (!Number.isFinite(Date.parse(body.items[0].timestamp))) throw Error('Invalid first date');
    return berlinDay(body.items[0].timestamp).slice(0, 7);
  });
}

// Load four months per request, with two provider reads at a time. The current
// evening is independent and never waits for the full archive to be fetched.
export async function readAdminHistory(before: string): Promise<AdminHistory> {
  const firstMonth = await firstSumUpMonth(), asOf = Date.now(), current = berlinDay(asOf).slice(0, 7);
  if (!firstMonth || before < firstMonth) return { firstMonth, asOf, points: [], nextBefore: null };
  const months = Array.from({ length: 4 }, (_, index) => shiftMonth(before, -index)).filter(month => month >= firstMonth);
  const points: AdminHistory['points'] = [];
  for (let index = 0; index < months.length; index += 2) {
    const batch = await Promise.allSettled(months.slice(index, index + 2).map(month => sumup(month)));
    batch.forEach((result, offset) => {
      const month = months[index + offset];
      points.push({ month, cents: result.status === 'fulfilled' ? result.value.netPayments : null, partial: month === current });
    });
  }
  const oldest = months[months.length - 1];
  return { firstMonth, asOf, points: points.sort((a, b) => a.month.localeCompare(b.month)),
    nextBefore: oldest > firstMonth ? shiftMonth(oldest, -1) : null };
}
