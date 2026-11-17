import "server-only";
import type { ReceiptItem } from "./types";

export type ItemSale = { id: string; items: ReceiptItem[]; references: string[]; complete: boolean };
type RawLine = { name?: unknown; quantity?: unknown; type?: unknown; categories?: { name?: unknown }[] };
type RawSale = {
  id?: unknown;
  state?: unknown;
  items?: RawLine[];
  payments?: { reference?: unknown; status?: unknown; type?: unknown }[];
};
type SearchRow = { id: string; closed_at: string };
const api = "https://api.sumup.com/v1.0/merchants/";
const detailCache = new Map<string, { until: number; data: Promise<ItemSale> }>();
const excludedTypes = new Set(["FEE", "DEPOSIT", "GIFT_CARD"]);
const generic = /^(drinks?|getränke|custom amount|custom item|benutzerdefinierter betrag|freier betrag)$/i;

async function request(url: string, token: string, body?: object, deadline = Infinity) {
  if (Date.now() >= deadline) throw new Error("SumUp request budget exhausted");
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "JK-Staff-OS/1.0" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(Math.max(1, Math.min(6000, deadline - Date.now()))),
  });
  if (!response.ok) throw new Error(`SumUp HTTP ${response.status}`);
  return response.json();
}

// Keep only the fields needed for counting. Never cache card/customer information.
function normalizeSale(raw: RawSale, id: string): ItemSale {
  if (raw?.id !== id || raw.state !== "CLOSED" || !Array.isArray(raw.items) || !Array.isArray(raw.payments)) {
    throw new Error("Invalid SumUp sale");
  }
  const references = raw.payments.flatMap(payment =>
    payment?.status === "SUCCESSFUL" && payment.type === "purchase" && typeof payment.reference === "string" && payment.reference
      ? [payment.reference] : []);
  let complete = raw.items.length > 0;
  const items: ReceiptItem[] = [];
  for (const line of raw.items) {
    if (typeof line?.type === "string" && excludedTypes.has(line.type)) continue;
    if (line?.quantity === 0) continue;
    const name = typeof line?.name === "string" ? line.name.trim().replace(/\s+/g, " ") : "";
    const quantity = typeof line?.quantity === "number" && Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : null;
    if (!name || quantity === null || generic.test(name)) complete = false;
    if (!name) continue;
    const categories = Array.isArray(line.categories) ? line.categories.flatMap(category =>
      typeof category?.name === "string" ? [category.name] : []) : [];
    items.push({ name, quantity, categories });
  }
  if (!references.length) console.info("SumUp sale reference shape", { payments: raw.payments.length,
    successful: raw.payments.filter(payment => payment.status === "SUCCESSFUL").length,
    purchase: raw.payments.filter(payment => payment.type === "purchase").length,
    withReference: raw.payments.filter(payment => typeof payment.reference === "string" && payment.reference).length });
  return { id, items, references: [...new Set(references)], complete };
}

function saleDetail(merchant: string, token: string, id: string, deadline: number): Promise<ItemSale> {
  const key = merchant + "/" + id;
  const cached = detailCache.get(key);
  if (cached && cached.until > Date.now()) return cached.data;
  const data = request(api + encodeURIComponent(merchant) + "/sales/" + encodeURIComponent(id), token, undefined, deadline)
    .then(raw => normalizeSale(raw, id));
  // Short cache allows delayed line data to recover without a deployment.
  const entry = { until: Infinity, data };
  if (detailCache.size >= 4000) detailCache.delete(detailCache.keys().next().value!);
  detailCache.set(key, entry);
  data.then(sale => { entry.until = Date.now() + (sale.complete ? 60_000 : 12_000); })
    .catch(() => { if (detailCache.get(key) === entry) detailCache.delete(key); });
  return data;
}

export async function readSales(merchant: string, token: string, since: number, now: number, deadline = Date.now() + 240_000): Promise<ItemSale[]> {
  const base = api + encodeURIComponent(merchant) + "/sales";
  const sales: ItemSale[] = [];
  const seen = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;
  do {
    if (++pages > 400 || Date.now() > deadline) throw new Error("Incomplete SumUp sales");
    // Search is ordered by close date. A start_date filter uses creation time and
    // would omit a bill opened before the window but paid inside it (e.g. midnight).
    const page = await request(base + "/search", token, {
      end_date: new Date(now).toISOString(), payment_statuses: ["PAID"],
      pagination_limit: 25, pagination_token: cursor,
    }, deadline);
    if (!Array.isArray(page?.items)) throw new Error("Invalid SumUp sales page");
    if (pages === 1) console.info("SumUp sales window", {
      rows: page.items.length,
      withinWindow: page.items.filter((row: SearchRow) => Date.parse(row.closed_at) >= since).length,
      newestClosedDay: page.items[0]?.closed_at?.slice(0, 10) ?? null,
      windowStartDay: new Date(since).toISOString().slice(0, 10),
    });
    let reachedStart = false;
    const ids: string[] = [];
    for (const row of page.items as SearchRow[]) {
      const closed = Date.parse(row?.closed_at);
      if (typeof row?.id !== "string" || !row.id || !Number.isFinite(closed)) throw new Error("Invalid SumUp sale row");
      if (closed < since) { reachedStart = true; continue; }
      if (!seen.has(row.id)) { seen.add(row.id); ids.push(row.id); }
    }
    for (let i = 0; i < ids.length; i += 8) {
      sales.push(...await Promise.all(ids.slice(i, i + 8).map(id => saleDetail(merchant, token, id, deadline))));
    }
    if (reachedStart) break;
    cursor = page.pagination_token;
    if (cursor !== undefined && (typeof cursor !== "string" || !cursor || cursors.has(cursor))) {
      throw new Error("Repeated or invalid SumUp sales cursor");
    }
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return sales;
}
