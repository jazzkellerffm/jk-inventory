import "server-only";
import { serviceStart } from "./service-day";

type Sale = {
  id: string; closed_at: string; currency: {code: string; scale: number};
  items: {type?: string; name: string; quantity: number; categories?: {name: string}[]; price: {total_gross_amount_final: number}}[];
};
export type FoodOrder = {id: string; at: string; description: string; cents: number};
type SnackCount = {name: string; quantity: number};
export type FoodFeed = {recentPortions: number; recentHummus: number; recentIncomplete: boolean; orders: FoodOrder[]; bestsellers: SnackCount[]; totalCents: number; uncategorized: boolean};

export async function readFood(merchant: string, key: string): Promise<FoodFeed> {
  const now = Date.now();
  const start = serviceStart(now);
  const recentStart = now - 10 * 60_000;
  const visibleStart = now - 60 * 60_000;
  const base = "https://api.sumup.com/v1.0/merchants/" + encodeURIComponent(merchant) + "/sales";
  const headers = {Authorization: "Bearer " + key, "Content-Type": "application/json"};
  const orders: FoodOrder[] = [];
  const snackCounts = new Map<string, SnackCount>();
  const seen = new Set<string>();
  const tokens = new Set<string>();
  let recentPortions = 0;
  let recentHummus = 0;
  let recentIncomplete = false;
  let cursor: string | undefined;
  let uncategorized = false;
  do {
    const response = await fetch(base + "/search", {method:"POST", headers, cache:"no-store", signal:AbortSignal.timeout(6000),
      body: JSON.stringify({start_date:new Date(Math.min(start, recentStart)).toISOString(), end_date:new Date(now).toISOString(),
        payment_statuses:["PAID"], pagination_limit:25, pagination_token:cursor})});
    if (!response.ok) {
      console.warn("SumUp food sales search HTTP", response.status);
      throw new Error("SumUp sales unavailable");
    }
    const page: {items:{id:string}[]; pagination_token?:string} = await response.json();
    const ids = page.items.map(row => row.id).filter(id => !seen.has(id));
    for (let i=0; i<ids.length; i+=5) {
      const sales = await Promise.all(ids.slice(i,i+5).map(async id => {
        const res = await fetch(base + "/" + encodeURIComponent(id), {headers, next:{revalidate:60}, signal:AbortSignal.timeout(6000)});
        if (!res.ok) {
          console.warn("SumUp food sale detail HTTP", res.status);
          throw new Error("SumUp sale unavailable");
        }
        return await res.json() as Sale;
      }));
      for (const sale of sales) {
        if (seen.has(sale.id)) continue;
        seen.add(sale.id);
        if (sale.currency.code !== "EUR") continue;
        const productItems = sale.items.filter(item => !["CUSTOM", "FEE", "DEPOSIT", "GIFT_CARD"].includes(item.type ?? "") && item.quantity !== 0);
        const snacks = productItems.filter(item => item.categories?.some(c => c.name.trim().toLowerCase() === "bar snacks"));
        const missingCategory = !sale.items.length || productItems.some(item => !item.categories?.length || !Number.isFinite(item.quantity) || item.quantity <= 0);
        const paidAt = Date.parse(sale.closed_at);
        if (!Number.isFinite(paidAt)) throw new Error("Missing sale timestamp");
        if (paidAt > recentStart && paidAt <= now) {
          if (missingCategory) recentIncomplete = true;
          for (const snack of snacks) {
            recentPortions += snack.quantity;
            if (/h[ou]mm?[ou]s/i.test(snack.name)) recentHummus += snack.quantity;
          }
        }
        if (paidAt < start || paidAt > now) continue;
        if (missingCategory) uncategorized = true;
        if (!snacks.length) continue;
        for (const snack of snacks) {
          const name = snack.name?.trim().replace(/\s+/g, " ");
          if (!name || !Number.isSafeInteger(snack.quantity) || snack.quantity <= 0) continue;
          const key = name.toLocaleLowerCase("de");
          const entry = snackCounts.get(key);
          if (entry) entry.quantity += snack.quantity;
          else snackCounts.set(key, {name, quantity:snack.quantity});
        }
        const amount = snacks.reduce((sum,item) => sum + item.price.total_gross_amount_final, 0);
        if (!Number.isSafeInteger(amount)) throw new Error("Missing line amount");
        orders.push({id:sale.id, at:sale.closed_at, description:snacks.map(item => item.quantity+" × "+item.name).join(" · "),
          cents:Math.round(amount * 100 / 10 ** sale.currency.scale)});
      }
    }
    cursor = page.pagination_token;
    if (cursor && tokens.has(cursor)) throw new Error("Repeated sale page");
    if (cursor) tokens.add(cursor);
  } while (cursor);
  orders.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  const bestsellers = [...snackCounts.values()]
    .sort((a,b) => b.quantity - a.quantity || a.name.localeCompare(b.name, "de"))
    .slice(0, 5);
  return {recentPortions, recentHummus, recentIncomplete, totalCents:orders.reduce((sum,order)=>sum+order.cents,0), orders:orders.filter(order => Date.parse(order.at) >= visibleStart).slice(0,5), bestsellers, uncategorized};
}
