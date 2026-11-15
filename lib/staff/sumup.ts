import "server-only";
import { prepWeight } from "./bar-workload";
import type { BarFeed, Payment, ReceiptItem, BestsellerFeed } from "./types";

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
    if (receiptCache.size >= 2000) receiptCache.delete(receiptCache.keys().next().value!);
    receiptCache.set(key, { items, until: Date.now() + (items.length ? 24 * 60 : 1) * minute });
    return items;
  } catch {
    // The payment remains visible if the receipt has not arrived yet.
    return [];
  }
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
      payments.set(id, { id, at: row.timestamp, amount: row.amount, currency: row.currency, items: [] });
    }
    const next = page.links?.find((link: { rel: string }) => link.rel === "next");
    cursor = next ? new URL(next.href, api + path).searchParams.toString() : "";
  }
  return [...payments.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

async function collect(merchant: string, token: string, now: number): Promise<BarFeed> {
  const since = now - 60 * minute;
  const start = serviceStart(now);
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
      payment.items = await receiptItems(merchant, payment.id, token);
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
  if (lastFeed?.key === merchant && now < lastFeed.until) return lastFeed.value;
  const value = collect(merchant, token, now);
  lastFeed = { key: merchant, until: now + 12_000, value };
  value.catch(() => { if (lastFeed?.value === value) lastFeed = undefined; });
  return value;
}

const berlinDate = new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin"});
const berlinHour = new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Berlin",hour:"2-digit",hourCycle:"h23"});

function serviceStart(now:number) {
  const day = new Date(berlinDate.format(now)+"T06:00:00Z");
  if (Number(berlinHour.format(now))<6) day.setUTCDate(day.getUTCDate()-1);
  return day.getTime()-(Number(berlinHour.format(day))-6)*60*minute;
}

async function rankSales(merchant:string,token:string,start:number,now:number):Promise<BestsellerFeed> {
  const sales = await history(merchant,token,start,now);
  const totals = new Map<string,{name:string;quantity:number}>();
  let incomplete=0;
  for (let i=0;i<sales.length;i+=8) {
    const receipts=await Promise.all(sales.slice(i,i+8).map(p=>receiptItems(merchant,p.id,token)));
    for (const items of receipts) {
      if (!items.length || items.some(item=>item.quantity===null)) incomplete++;
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
  return {products,incomplete,asOf:new Date(now).toISOString()};
}

let ranking:{merchant:string;start:number;until:number;data:Promise<BestsellerFeed>} | undefined;
export function readBestsellers(merchant:string,token:string) {
  const now=Date.now(), start=serviceStart(now);
  if (ranking?.merchant===merchant && ranking.start===start && ranking.until>now) return ranking.data;
  const data=rankSales(merchant,token,start,now);
  ranking={merchant,start,until:now+minute,data};
  data.catch(()=>{if(ranking?.data===data) ranking=undefined;});
  return data;
}
