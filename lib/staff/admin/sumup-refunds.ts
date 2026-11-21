export type SumUpFinanceRow = { transaction_id?: string; id?: string; transaction_code?: string; type: string;
  status: string; timestamp: string; amount: number; currency: string; refunded_amount?: number };
type RefundEvent = { id: number | string; transaction_id?: string; type?: string; event_type?: string;
  status: string; timestamp: string; amount: number };
export type SumUpFinanceDetail = { id: string; timestamp: string; amount: number; currency: string;
  events?: RefundEvent[]; transaction_events?: RefundEvent[] };
export type SumUpLedgerRow = SumUpFinanceRow & { refundEventId?: string; originalPaymentAt?: string; refundsReconciled?: boolean };
export const sumupId = (row: SumUpFinanceRow) => row.transaction_id || row.id || row.transaction_code;
const final = (status: string) => ['SUCCESSFUL', 'REFUNDED'].includes(status);
const money = (amount: number) => Math.round(Math.abs(amount) * 100);
const validMoney = (amount: number) => Number.isFinite(amount) && Number.isSafeInteger(money(amount));
const validTime = (time: string) => Number.isFinite(Date.parse(time));
export const needsRefundDetail = (row: SumUpFinanceRow) => final(row.status) &&
  (row.type === 'REFUND' || row.type === 'CHARGE_BACK' || (row.refunded_amount ?? 0) > 0 || row.status === 'REFUNDED');

// History includes both the original payment and a separate refund row. Resolve
// refund event IDs, timestamps and the original payment before counting once.
export function reconcileSumUpRefunds(rows: SumUpFinanceRow[], details: SumUpFinanceDetail[]) {
  const affected = new Set(rows.filter(needsRefundDetail).map(sumupId));
  const normalized: SumUpLedgerRow[] = rows.filter(row => !affected.has(sumupId(row)));
  let issues = 0;
  for (const id of affected) {
    const related = rows.filter(row => sumupId(row) === id);
    const detail = details.find(item => item.id === id || related.some(row => row.transaction_code === item.id));
    const payments = related.filter(row => row.type === 'PAYMENT' && final(row.status));
    const historyRefunds = related.filter(row => ['REFUND', 'CHARGE_BACK'].includes(row.type) && final(row.status));
    let valid = !!id && !!detail && detail.currency === 'EUR' && validTime(detail.timestamp) &&
      validMoney(detail.amount) && detail.amount >= 0;
    const source = detail?.events ?? detail?.transaction_events;
    if (!Array.isArray(source)) valid = false;
    const events = new Map<string, RefundEvent>();
    for (const event of source ?? []) {
      const type = event.type ?? event.event_type;
      if (!['REFUND', 'CHARGE_BACK'].includes(type ?? '') || ['FAILED', 'PENDING', 'SCHEDULED'].includes(event.status)) continue;
      const key = String(event.id ?? '');
      if (!key || !final(event.status) || !validMoney(event.amount) || !validTime(event.timestamp) ||
        (event.transaction_id && event.transaction_id !== detail?.id)) { valid = false; continue; }
      const previous = events.get(key);
      if (previous && (previous.amount !== event.amount || previous.timestamp !== event.timestamp || previous.type !== type)) valid = false;
      events.set(key, { ...event, type });
    }
    const refunds = [...events.values()];
    for (const payment of payments) {
      if (payment.currency !== detail?.currency || payment.amount !== detail?.amount ||
        Date.parse(payment.timestamp) !== Date.parse(detail?.timestamp ?? '')) valid = false;
      const totalRefunded = refunds.filter(event => event.type === 'REFUND').reduce((sum, event) => sum + money(event.amount), 0);
      if (payment.refunded_amount != null && (!validMoney(payment.refunded_amount) || payment.refunded_amount < 0 ||
        money(payment.refunded_amount) !== totalRefunded)) valid = false;
      if (payment.status === 'REFUNDED' && !refunds.length) valid = false;
    }
    for (const row of historyRefunds) {
      if (row.currency !== detail?.currency || !refunds.some(event => event.type === row.type &&
        Date.parse(event.timestamp) === Date.parse(row.timestamp) && money(event.amount) === money(row.amount))) valid = false;
    }
    if (!valid || !detail) {
      issues++;
      normalized.push(...related);
      continue;
    }
    normalized.push(...related.filter(row => !['REFUND', 'CHARGE_BACK'].includes(row.type)).map(row => ({ ...row, refundsReconciled: true })));
    for (const event of refunds) normalized.push({ transaction_id: id, type: event.type!, status: event.status,
      timestamp: event.timestamp, amount: event.amount, currency: detail.currency,
      refundEventId: String(event.id), originalPaymentAt: detail.timestamp });
  }
  return { rows: normalized, issues };
}
