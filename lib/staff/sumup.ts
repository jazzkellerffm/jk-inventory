import "server-only";
import { bestsellerStart, type BestsellerPeriod } from "./bestseller-period";
import { serviceDate, serviceStart } from "./service-day";
import { prepWeight } from "./bar-workload";
import type { BarFeed, Payment, ReceiptItem, BestsellerFeed } from "./types";

const minute = 60_000;
const api = "https://api.sumup.com";
const receiptCache = new Map<string, { until: number; items: ReceiptItem[] }>();
let lastFeed: { key: string; start: number; until: number; value: Promise<BarFeed> } | undefined;

type Transaction = {
  transaction_id?: string;
  transaction_code?: string;
  product_summary?: string;
  type?: string;
  status?: string;
  timestamp: string;
  amount: number;
  currency: string;
};

async function read(path: string, token: string) {
  const response = await fetch(api + path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`SumUp HTTP ${response.status}`);
  return response.json();
}

function parseItems(products: unknown): ReceiptItem[] {
  if (!Array.isArray(products)) return [];
  return products.flatMap(product => {
    const name = typeof product?.name === "string" ? product.name.trim() : "";
    const quantity = Number(product?.quantity);
    return name ? [{ name, quantity: quantity > 0 && Number.isFinite(quantity) ? quantity : null }] : [];
  });
}

async function receiptItems(merchant: string, payment: Payment, token: string): Promise<ReceiptItem[]> {
  const id = payment.id;
  const key = merchant + "/" + id;
  const cached = receiptCache.get(key);
  if (cached && cached.until > Date.now()) return cached.items;

  const mid = encodeURIComponent(merchant);
  const receipt = await read(`/v1.1/receipts/${encodeURIComponent(id)}?mid=${mid}`, token).catch(() => null);
  let items = parseItems(receipt?.transaction_data?.products);
  if (!items.length) {
    const field = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? "id" : "transaction_code";
    const query = new URLSearchParams({ [field]: id });
    const transaction = await read(`/v2.1/merchants/${mid}/transactions?${query}`, token).catch(() => null);
    items = parseItems(transaction?.products);
  }
  const recent = Date.now() - Date.parse(payment.at) < 5 * minute;
  const retryAfter = recent ? 12_000 : minute;
  if (receiptCache.size >= 2000) receiptCache.delete(receiptCache.keys().next().value!);
  receiptCache.set(key, { items, until: Date.now() + (items.length ? 24 * 60 * minute : retryAfter) });
  return items;
}

async function history(merchant: string, token: string, since: number, now: number) {
  const path = `/v2.1/merchants/${encodeURIComponent(merchant)}/transactions/history`;
  const query = new URLSearchParams({
    oldest_time: new Date(since).toISOString(), newest_time: new Date(now).toISOString(),
    order: "descending", limit: "100", "statuses[]": "SUCCESSFUL", "types[]": "PAYMENT",
  });
  let cursor = query.toString();
  const seen = new Set<string>();
  const payments = new Map<string, Payment>();
  while (cursor) {
    if (seen.has(cursor) || seen.size >= 30) throw new Error("Incomplete SumUp history");
    seen.add(cursor);
    const page = await read(path + "?" + cursor, token);
    if (!Array.isArray(page?.items)) throw new Error("Invalid SumUp history");
    for (const row of page.items as Transaction[]) {
      const id = row.transaction_id || row.transaction_code;
      const time = Date.parse(row.timestamp);
      if (!id || row.type !== "PAYMENT" || row.status !== "SUCCESSFUL" ||
          !Number.isFinite(time) || time < since || time >= now ||
          !Number.isFinite(row.amount) || !/^[A-Z]{3}$/.test(row.currency)) continue;
      payments.set(id, { id, at: row.timestamp, amount: row.amount, currency: row.currency,
        summary: typeof row.product_summary === "string" ? row.product_summary.trim() : undefined, items: [] });
    }
    const next = page.links?.find((link: { rel: string }) => link.rel === "next");
    cursor = next ? new URL(next.href, api + path).searchParams.toString() : "";
  }
  return [...payments.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

async function collect(merchant: string, token: string, now: number, start: number): Promise<BarFeed> {
  const since = now - 60 * minute;
  const historyRows = await history(merchant,token,Math.min(since,start),now);
  const sorted = historyRows.filter(payment => Date.parse(payment.at) >= since);
  const eveningCents = historyRows.reduce((sum,payment) =>
    payment.currency === "EUR" && Date.parse(payment.at) >= start
      ? sum + Math.round(payment.amount * 100) : sum, 0);
  const buckets = Array<number>(12).fill(0);
  for (const payment of sorted) buckets[Math.floor((Date.parse(payment.at) - since) / (5 * minute))]++;
  const latest = sorted.slice(0, 8);
  const recent = sorted.filter(payment => Date.parse(payment.at) >= now - 5 * minute);
  const needsItems = sorted.slice(0, Math.max(latest.length, recent.length));
  for (let i = 0; i < needsItems.length; i += 8) {
    await Promise.all(needsItems.slice(i, i + 8).map(async payment => {
      payment.items = await receiptItems(merchant, payment, token);
    }));
  }
  let paidEffort = 0;
  let missingReceiptDetails = false;
  for (const payment of recent) {
    if (!payment.items.length) missingReceiptDetails = true;
    for (const item of payment.items) {
      if (item.quantity === null) missingReceiptDetails = true;
      paidEffort += prepWeight(item.name) * (item.quantity ?? 1);
    }
  }
  return {
    paidEffort, missingReceiptDetails,
    asOf: new Date(now).toISOString(), buckets, payments: latest, eveningCents,
    recentCount: buckets.slice(-3).reduce((a, b) => a + b, 0),
  };
}

export function readBarFeed(merchant: string, token: string) {
  const now = Date.now();
  const start = serviceStart(now);
  if (lastFeed?.key === merchant && lastFeed.start === start && now < lastFeed.until) return lastFeed.value;
  const value = collect(merchant, token, now, start);
  lastFeed = { key: merchant, start, until: now + 12_000, value };
  value.catch(() => { if (lastFeed?.value === value) lastFeed = undefined; });
  return value;
}

async function rankSales(merchant:string,token:string,start:number,now:number):Promise<BestsellerFeed> {
  const sales = await history(merchant,token,start,now);
  const totals = new Map<string,{name:string;quantity:number}>();
  let incomplete=0;
  for (let i=0;i<sales.length;i+=8) {
    const receipts=await Promise.all(sales.slice(i,i+8).map(p=>receiptItems(merchant,p,token)));
    for (const items of receipts) {
      // Generic terminal labels describe a payment, not a countable product.
      const generic = /^(drinks?|getränke|custom amount|custom item|benutzerdefinierter betrag|freier betrag)$/i;
      if (!items.length || items.some(item=>item.quantity===null || generic.test(item.name))) {
        incomplete++;
        continue;
      }
      for (const {name,quantity} of items) {
        if (quantity===null) continue;
        const key=name.normalize("NFC").toLocaleLowerCase("de");
        const entry=totals.get(key);
        if (entry) entry.quantity+=quantity;
        else totals.set(key,{name,quantity});
      }
    }
  }
  const products=[...totals.values()].sort((a,b)=>b.quantity-a.quantity || a.name.localeCompare(b.name,"de")).slice(0,10);
  return {products: incomplete ? [] : products,incomplete,asOf:new Date(now).toISOString()};
}

const rankings = new Map<string, { until: number; data: Promise<BestsellerFeed> }>();
export function readBestsellers(merchant: string, token: string, period: BestsellerPeriod = "evening") {
  const now = Date.now(), start = bestsellerStart(now, period);
  const key = merchant + "/" + period + "/" + start;
  const cached = rankings.get(key);
  if (cached && cached.until > now) return cached.data;
  const data = rankSales(merchant, token, start, now);
  if (rankings.size >= 12) rankings.delete(rankings.keys().next().value!);
  const entry = { until: Infinity, data };
  rankings.set(key, entry);
  data.then(() => { entry.until = Date.now() + (period === "evening" ? minute : 5 * minute); })
    .catch(() => { if (rankings.get(key) === entry) rankings.delete(key); });
  return data;
}

let eveningHistory: { merchant: string; end: number; expires: number; payments: Promise<Payment[]> } | undefined;

export async function readBarEvenings(merchant: string, token: string) {
  const end = serviceStart(Date.now());
  if (!eveningHistory || eveningHistory.merchant !== merchant || eveningHistory.end !== end || eveningHistory.expires <= Date.now()) {
    let start = end;
    for (let i = 0; i < 14; i++) start = serviceStart(start - 1);
    const payments = history(merchant, token, start, end);
    eveningHistory = { merchant, end, expires: Date.now() + 10 * minute, payments };
    payments.catch(() => { if (eveningHistory?.payments === payments) eveningHistory = undefined; });
  }
  const groups = new Map<string, Payment[]>();
  for (const payment of await eveningHistory.payments) {
    if (payment.currency !== "EUR" || payment.amount <= 0) continue;
    const date = serviceDate(Date.parse(payment.at));
    const rows = groups.get(date);
    if (rows) rows.push(payment);
    else groups.set(date, [payment]);
  }
  // The only sale on this service night was the confirmed €3 test.
  const testNight = groups.get("2026-11-16");
  if (testNight?.length === 1 && Math.round(testNight[0].amount * 100) === 300) {
    groups.delete("2026-11-16");
  }
  return { nights: [...groups.keys()].sort().map(date => {
    const rows = groups.get(date)!;
    return { date, payments: rows.length, cents: rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) };
  }) };
}
