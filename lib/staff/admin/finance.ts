import { includedDrinks, includedSupply, packageSize, ticketCategory } from '../entitlements';
import { serviceDate } from '../service-day';
import { reconcileSumUpRefunds, sumupId, type SumUpFinanceDetail, type SumUpFinanceRow } from './sumup-refunds';
export type { SumUpFinanceRow, SumUpFinanceDetail } from './sumup-refunds';

export type FinanceLine = { type: string; description: string; quantity: number; value: number;
  booking_fee: number; total: number; event_summary?: { event_id: string; name: string; start_date: string } };
export type FinanceOrder = { id: string; status: string; total: number; currency: { code: string; base_multiplier: number };
  line_items: FinanceLine[]; transactions: { transaction_id?: string; type: string; amount: number;
    currency: string; pending: boolean; created_at: string; payment_method: string }[] };
export type Valuation = { drinkCents: number; bottles: Record<string, number>;
  // Explicit baseline per event; never infer a historic price from today's catalogue.
  clubPerGuest: Record<string, number> };
export type IncludedValue = { label: string; quantity: number; unitCents: number };
export type NightFinance = { id: string; name: string; date: string; ticketCents: number;
  feeCents: number; addonCents: number; guests: number; includedCents: number | null;
  includedDrinkCount: number; knownIncludedCents: number; unvaluedSupplies: { label: string; quantity: number }[];
  includedItems: IncludedValue[];
  admissionCents: number | null; upgradeCents: number | null; uncertain: boolean };
export const berlinDay = (time: string | number) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(time));
const cents = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

// Included drinks are a portion of the ticket value, never an extra payment.
export function ticketTotal(night: NightFinance): number | null {
  return night.uncertain ? null : night.ticketCents + night.feeCents + night.addonCents;
}

export function summarizeTickets(orders: FinanceOrder[], month: string, valuation: Valuation) {
  let payments = 0, refunds = 0, paymentIssues = 0, eventIssues = 0, excludedEventOrders = 0;
  const nights = new Map<string, NightFinance>();
  const seen = new Set<string>();
  for (const order of orders) {
    if (seen.has(order.id)) continue;
    seen.add(order.id);
    if (order.currency?.code !== 'EUR' || order.currency.base_multiplier !== 100 || !Array.isArray(order.transactions)) {
      paymentIssues++; eventIssues++; continue;
    }
    let settled = 0, refunded = 0, ledgerIssue = false;
    for (const tx of order.transactions) {
      if (tx.pending === true) continue;
      const validTime = Number.isFinite(Date.parse(tx.created_at));
      const selected = validTime && berlinDay(tx.created_at).startsWith(month);
      // v2 refunds are signed negative amounts, unlike non-negative line values.
      const validAmount = Number.isSafeInteger(tx.amount) &&
        (tx.type === 'refund' ? tx.amount <= 0 : tx.amount >= 0);
      if (!validAmount || tx.currency !== 'EUR' || tx.pending !== false || !validTime) {
        if (selected || !validTime) paymentIssues++;
        ledgerIssue = true; continue;
      }
      // Credits/gift cards are not a new cash inflow. Unknown methods need review.
      if (!['STRIPE', 'PAYPAL', 'SQUARE'].includes(tx.payment_method)) {
        if (tx.amount) { if (selected) paymentIssues++; ledgerIssue = true; }
        continue;
      }
      if (tx.type === 'payment') { settled += tx.amount; if (selected) payments += tx.amount; }
      else if (tx.type === 'refund') { refunded -= tx.amount; if (selected) refunds -= tx.amount; }
      else if (tx.amount) { if (selected) paymentIssues++; ledgerIssue = true; }
    }
    // Cash above retains all payments/refunds. Event value describes valid bookings:
    // cancelled orders and void ticket lines are not active event tickets or add-ons.
    const selectedLines = order.line_items.filter(line => line.event_summary?.start_date && berlinDay(line.event_summary.start_date).startsWith(month));
    if (order.status === 'cancelled') {
      if (selectedLines.length) excludedEventOrders++;
      continue;
    }
    if (order.line_items.some(line => line.type === 'ticket' && (!line.event_summary?.event_id || !line.event_summary.start_date))) eventIssues++;
    const lines = selectedLines.filter(line => line.type !== 'void');
    if (!lines.length) continue;
    // Refunded/discounted/cancelled or multi-source allocations must reconcile before splitting revenue.
    const balanced = !ledgerIssue && order.status === 'completed' && refunded === 0 && cents(order.total)
      && settled === order.total && order.line_items.every(l => cents(l.total))
      && order.line_items.reduce((sum, l) => sum + l.total, 0) === order.total;
    if (!balanced) eventIssues++;
    for (const line of lines) {
      const event = line.event_summary!;
      const night = nights.get(event.event_id) ?? { id: event.event_id, name: event.name, date: berlinDay(event.start_date),
        ticketCents: 0, feeCents: 0, addonCents: 0, guests: 0, includedCents: 0,
        includedDrinkCount: 0, knownIncludedCents: 0, unvaluedSupplies: [], includedItems: [],
        admissionCents: 0, upgradeCents: 0, uncertain: false };
      nights.set(event.event_id, night);
      if (!balanced || !Number.isSafeInteger(line.quantity) || line.quantity < 0 || !cents(line.value) || !cents(line.booking_fee)
        || (line.value + line.booking_fee) * line.quantity !== line.total) {
        if (balanced) eventIssues++;
        night.uncertain = true; continue;
      }
      night.feeCents += line.booking_fee * line.quantity;
      if (line.type !== 'ticket') { night.addonCents += line.value * line.quantity; continue; }
      const value = line.value * line.quantity;
      night.ticketCents += value;
      const guests = packageSize(line.description) * line.quantity;
      night.guests += guests;
      const drinkCount = includedDrinks(line.description) * line.quantity;
      let drinks = drinkCount * valuation.drinkCents;
      const valued: IncludedValue[] = drinkCount ? [{ label: 'Drink', quantity: drinkCount, unitCents: valuation.drinkCents }] : [];
      const missing: { label: string; quantity: number }[] = [];
      const supplies = includedSupply(line.description);
      for (const supply of supplies) {
        const price = valuation.bottles[supply.label];
        if (!cents(price)) missing.push({ label: supply.label, quantity: supply.quantity * line.quantity });
        else {
          const quantity = supply.quantity * line.quantity;
          drinks += quantity * price;
          if (quantity) valued.push({ label: supply.label, quantity, unitCents: price });
        }
      }
      // Old VIP labels may omit the entitlement. Do not invent a bottle or its price.
      if (ticketCategory(line.description) === 'VIP' && !supplies.length)
        missing.push({ label: 'VIP-Inklusivleistung', quantity: line.quantity });
      night.includedDrinkCount += drinkCount;
      if (drinks > value || !guests) missing.push({ label: 'Ticketbewertung zu prüfen', quantity: line.quantity });
      else {
        night.knownIncludedCents += drinks;
        for (const item of valued) {
          const existing = night.includedItems.find(other => other.label === item.label && other.unitCents === item.unitCents);
          if (existing) existing.quantity += item.quantity;
          else night.includedItems.push({ ...item });
        }
      }
      for (const supply of missing) {
        const existing = night.unvaluedSupplies.find(item => item.label === supply.label);
        if (existing) existing.quantity += supply.quantity;
        else night.unvaluedSupplies.push({ ...supply });
      }
      if (missing.length) {
        night.includedCents = null; night.admissionCents = null; night.upgradeCents = null;
        continue;
      }
      if (night.includedCents !== null) night.includedCents += drinks;
      if (night.admissionCents !== null) night.admissionCents += value - drinks;
      const base = valuation.clubPerGuest[event.event_id];
      if (!cents(base)) night.upgradeCents = null;
      else if (night.upgradeCents !== null) night.upgradeCents += value - drinks - base * guests;
    }
  }
  return { payments, refunds, netPayments: paymentIssues ? null : payments - refunds, paymentIssues, eventIssues, excludedEventOrders,
    nights: [...nights.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

export function summarizeSumUp(rows: SumUpFinanceRow[], month: string, details: SumUpFinanceDetail[] = []) {
  const ledger = reconcileSumUpRefunds(rows, details);
  let payments = 0, refunds = 0;
  const paymentIssues = ledger.issues;
  const nights: Record<string, number> = {};
  const seen = new Set<string>();
  for (const row of ledger.rows) {
    if (['FAILED', 'PENDING', 'CANCELLED'].includes(row.status)) continue;
    const id = sumupId(row);
    if (!id || !Number.isFinite(Date.parse(row.timestamp)) || row.currency !== 'EUR' ||
      !Number.isFinite(row.amount) || !['SUCCESSFUL', 'REFUNDED'].includes(row.status)) throw new Error('Unclear SumUp transaction');
    const key = row.refundEventId ? `event:${row.refundEventId}` : `${id}:${row.type}:${row.timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const amount = Math.round(Math.abs(row.amount) * 100);
    const selected = berlinDay(row.timestamp).startsWith(month);
    if (row.type === 'PAYMENT') {
      if (row.amount < 0) throw new Error('Negative SumUp payment');
      if (selected) payments += amount;
      const date = serviceDate(Date.parse(row.timestamp));
      if (date.startsWith(month)) nights[date] = (nights[date] ?? 0) + amount;
      // Event allocations of refunds require their original payment reference.
      if (!row.refundsReconciled && ((row.refunded_amount ?? 0) > 0 || row.status === 'REFUNDED')) {
        nights[date] = NaN;
      }
    } else if (row.type === 'REFUND' || row.type === 'CHARGE_BACK') {
      if (selected) refunds += amount;
      const date = serviceDate(Date.parse(row.originalPaymentAt ?? row.timestamp));
      if (date.startsWith(month)) nights[date] = row.originalPaymentAt ? (nights[date] ?? 0) - amount : NaN;
    } else throw new Error('Unknown SumUp type');
  }
  return { payments, refunds, paymentIssues, netPayments: paymentIssues ? null : payments - refunds,
    nights: Object.fromEntries(Object.entries(nights).map(([date, value]) => [date, Number.isFinite(value) ? value : null])) };
}
