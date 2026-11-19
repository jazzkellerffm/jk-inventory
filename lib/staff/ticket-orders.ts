import "server-only";

// All Ticket Tailor order consumers use v2. Events and issued tickets remain v1.
const endpoint = "https://api.tickettailor.com/v2/orders";
type OrderRow = { id: string; line_items?: unknown[] };

async function request(url: string, auth: string) {
  const response = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Order data unavailable: HTTP " + response.status);
  return response.json();
}

export async function readOrders<T extends { id: string }>(filters: Record<string, string>, auth: string): Promise<T[]> {
  const query = new URLSearchParams({ ...filters, limit: "100" });
  const rows = new Map<string, T>();
  const cursors = new Set<string>();
  for (let page = 0; page < 150; page++) {
    const body = await request(endpoint + "?" + query, auth);
    if (!Array.isArray(body.data)) throw new Error("Invalid order page");
    for (const row of body.data) {
      if (typeof row?.id !== "string" || !Array.isArray(row.line_items)) throw new Error("Incomplete order data");
      rows.set(row.id, row);
    }
    if (!body.links?.next) return [...rows.values()];
    const cursor = new URL(body.links.next, endpoint).searchParams.get("starting_after");
    if (!cursor || cursors.has(cursor)) throw new Error("Incomplete order pagination");
    cursors.add(cursor);
    query.set("starting_after", cursor);
  }
  throw new Error("Order page limit reached");
}

export async function readOrder<T extends OrderRow>(id: string, auth: string): Promise<T> {
  const order = await request(endpoint + "/" + encodeURIComponent(id), auth);
  if (order?.id !== id || !Array.isArray(order.line_items)) throw new Error("Incomplete order details");
  return order;
}
