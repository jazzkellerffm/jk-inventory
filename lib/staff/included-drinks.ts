import "server-only";
import type { DrinkFeed, DrinkOrder, FeedState } from "./types";

type OrderRow = {
  id: string;
  created_at: string;
  table_number: string;
  status: "open" | "served";
  items: { drinkName?: string; drinkId?: string; quantity: number }[];
};

function orderFromRow(row: OrderRow): DrinkOrder {
  if (!row.id || !Number.isFinite(Date.parse(row.created_at)) || !Array.isArray(row.items) ||
      (row.status !== "open" && row.status !== "served")) throw new Error("Invalid order");
  return {
    id: row.id, at: row.created_at, table: row.table_number, status: row.status,
    items: row.items.map(item => {
      const name = item.drinkName?.trim() || item.drinkId?.trim();
      if (!name || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Invalid drink");
      return { name, quantity: item.quantity };
    }),
  };
}

export async function readIncludedDrinks(): Promise<{ drinks: DrinkFeed | null; drinksState: FeedState }> {
  const origin = process.env.INCLUDED_DRINKS_SUPABASE_URL;
  const key = process.env.INCLUDED_DRINKS_PUBLISHABLE_KEY;
  if (!origin || !key) return { drinks: null, drinksState: "setup" };
  try {
    const now = Date.now();
    const url = new URL("/rest/v1/orders", origin);
    url.search = new URLSearchParams({
      select: "id,created_at,table_number,status,items",
      created_at: "gte." + new Date(now - 3_600_000).toISOString(),
      status: "in.(open,served)", order: "created_at.desc,id.desc", limit: "100",
    }).toString();
    url.searchParams.append("created_at", "lte." + new Date(now).toISOString());
    const orders: DrinkOrder[] = [];
    let newDrinks = 0;
    let openDrinks = 0;
    for (let offset = 0; ; offset += 100) {
      url.searchParams.set("offset", String(offset));
      const res = await fetch(url, {
        headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error("Included Drinks unavailable");
      const rows: OrderRow[] = await res.json();
      for (const row of rows) {
        const order = orderFromRow(row);
        const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
        if (Date.parse(order.at) >= now - 300_000) newDrinks += quantity;
        if (order.status === "open") openDrinks += quantity;
        if (orders.length < 8) orders.push(order);
      }
      if (rows.length < 100) break;
    }
    return { drinksState: "ready", drinks: { asOf: new Date(now).toISOString(), orders, newDrinks, openDrinks } };
  } catch {
    return { drinks: null, drinksState: "unavailable" };
  }
}
