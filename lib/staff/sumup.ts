import "server-only";
import type { BarFeed, Payment, ReceiptItem } from "./types";

const minute = 60_000;
const api = "https://api.sumup.com";
const receiptCache = new Map<string, { until: number; items: ReceiptItem[] }>();
let lastFeed: { key: string; until: number; value: Promise<BarFeed> } | undefined;

type Transaction = {
  transaction_id?: string;
  transaction_code?: string;
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

async function receiptItems(merchant: string, id: string, token: string): Promise<ReceiptItem[]> {
  const key = merchant + "/" + id;
  const cached = receiptCache.get(key);
  if (cached && cached.until > Date.now()) return cached.items;
  try {
    const receipt = await read(`/v1.1/receipts/${encodeURIComponent(id)}?mid=${encodeURIComponent(merchant)}`, token);
    const products = receipt?.transaction_data?.products;
    const items: ReceiptItem[] = Array.isArray(products) ? products.flatMap(product => {
      const name = typeof product?.name === "string" ? product.name.trim() : "";
      const quantity = Number(product?.quantity);
      return name ? [{ name, quantity: quantity > 0 && Number.isFinite(quantity) ? quantity : null }] : [];
    }) : [];
    if (receiptCache.size >= 200) receiptCache.delete(receiptCache.keys().next().value!);
    receiptCache.set(key, { items, until: Date.now() + (items.length ? 60 : 1) * minute });
    return items;
  } catch {
    // The payment remains visible if the receipt has not arrived yet.
    return [];
  }
}

async function collect(merchant: string, token: string, now: number): Promise<BarFeed> {
  const since = now - 60 * minute;
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
      payments.set(id, { id, at: row.timestamp, amount: row.amount, currency: row.currency, items: [] });
    }
    const next = page.links?.find((link: { rel: string }) => link.rel === "next");
    cursor = next ? String(next.href).replace(/^\?/, "") : "";
  }
  const sorted = [...payments.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const buckets = Array<number>(12).fill(0);
  for (const payment of sorted) buckets[Math.floor((Date.parse(payment.at) - since) / (5 * minute))]++;
  const latest = sorted.slice(0, 8);
  await Promise.all(latest.map(async payment => {
    payment.items = await receiptItems(merchant, payment.id, token);
  }));
  return {
    asOf: new Date(now).toISOString(), buckets, payments: latest,
    recentCount: buckets.slice(-3).reduce((a, b) => a + b, 0),
  };
}

export function readBarFeed(merchant: string, token: string) {
  const now = Date.now();
  if (lastFeed?.key === merchant && now < lastFeed.until) return lastFeed.value;
  const value = collect(merchant, token, now);
  lastFeed = { key: merchant, until: now + 12_000, value };
  value.catch(() => { if (lastFeed?.value === value) lastFeed = undefined; });
  return value;
}
