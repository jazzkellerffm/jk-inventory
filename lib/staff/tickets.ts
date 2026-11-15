import "server-only";

type EventRow = { id: string; name: string; status: string; start: { unix: number; date: string } };
type Ticket = { id: string; event_id: string; description: string; status: string; add_on_id?: string; created_at: number };
export type TicketNight = { id: string; name: string; start: number; guests: number; recent: number; unknown: number };
export type TicketFeed = { asOf: number; nights: TicketNight[] };

async function pages<T extends { id: string }>(resource: string, filters: Record<string,string>, auth: string) {
  const rows = new Map<string,T>();
  const query = new URLSearchParams({ ...filters, limit: "100" });
  while (true) {
    const response = await fetch("https://api.tickettailor.com/v1/" + resource + "?" + query, {
      headers: { Authorization: auth, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Ticket Tailor unavailable");
    const page: {data:T[]; links:{next:string|null}} = await response.json();
    for (const row of page.data) rows.set(row.id,row);
    if (!page.links.next) return [...rows.values()];
    const cursor = new URL(page.links.next, "https://api.tickettailor.com").searchParams.get("starting_after");
    if (!cursor || query.get("starting_after") === cursor) throw new Error("Incomplete ticket page");
    query.set("starting_after",cursor);
  }
}

async function collect(key: string): Promise<TicketFeed> {
  const now = Math.floor(Date.now()/1000);
  const today = new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Berlin"}).format(now*1000);
  const auth = "Basic " + Buffer.from(key + ":").toString("base64");
  const events = (await pages<EventRow>("events",{},auth))
    .filter(e => e.start?.date >= today && ["published","close_sales","sales_closed"].includes(e.status))
    .sort((a,b)=>a.start.unix-b.start.unix).slice(0,5);
  const nights = [];
  for (const event of events) {
    const tickets = await pages<Ticket>("issued_tickets",{event_id:event.id,status:"valid"},auth);
    let guests = 0, recent = 0, unknown = 0;
    for (const ticket of tickets) {
      if (ticket.event_id !== event.id || ticket.status !== "valid" || ticket.add_on_id) continue;
      const size = ticket.description?.match(/\b(\d+)\s*(?:guests?|gäste|personen)\b/i)?.[1] ??
        ticket.description?.match(/cr[eé]mant\s+(?:for|für)\s+(\d+)\b/i)?.[1];
      if (!size) { unknown++; continue; }
      guests += Number(size);
      if (ticket.created_at >= now - 86400) recent += Number(size);
    }
    nights.push({id:event.id,name:event.name,start:event.start.unix,guests,recent,unknown});
  }
  return {asOf:now,nights};
}

let cached: { until:number; data:Promise<TicketFeed> } | undefined;
export function readTicketFeed(key:string) {
  if (cached && cached.until > Date.now()) return cached.data;
  const data = collect(key);
  cached = { until:Date.now()+60000,data };
  data.catch(()=>{ if(cached?.data === data) cached = undefined; });
  return data;
}

type ServiceOrder = {
  id: string;
  status: string;
  buyer_details?: { name?: string; first_name?: string; last_name?: string };
  line_items: { type: string; description: string; quantity: number; event_summary?: { event_id: string } | null }[];
};
export type Booking = {
  id: string; name: string; tickets: string[]; extras: string[];
};

export async function readServicePlan(key: string, eventId: string): Promise<Booking[]> {
  const auth = "Basic " + Buffer.from(key + ":").toString("base64");
  const [orders, tickets] = await Promise.all([
    pages<ServiceOrder>("orders", {event_id:eventId}, auth),
    pages<Ticket & { order_id?: string }>("issued_tickets", {event_id:eventId,status:"valid"}, auth),
  ]);
  const packages = new Map<string,string[]>();
  for (const ticket of tickets) {
    if (ticket.event_id !== eventId || ticket.status !== "valid" || !ticket.order_id || ticket.add_on_id) continue;
    const group = packages.get(ticket.order_id) ?? [];
    group.push(ticket.description);
    packages.set(ticket.order_id, group);
  }
  const bookings: Booking[] = [];
  for (const order of orders) {
    if (!["completed","paid"].includes(order.status)) continue;
    const valid = packages.get(order.id) ?? [];
    const ids = new Set(order.line_items.map(line => line.event_summary?.event_id).filter(Boolean));
    const extras = order.line_items.filter(line =>
      ["product","add_on"].includes(line.type) && line.quantity > 0 &&
      (line.event_summary?.event_id === eventId || (!line.event_summary?.event_id && ids.size === 1 && ids.has(eventId)))
    ).map(line => line.quantity + " × " + line.description.replace(/^add-on:\s*/i,""));
    if (!valid.length && !extras.length) continue;
    const buyer = order.buyer_details;
    const name = buyer?.name?.trim() || [buyer?.first_name,buyer?.last_name].filter(Boolean).join(" ") || "Buchungsname fehlt";
    bookings.push({id:order.id,name,tickets:valid,extras});
  }
  return bookings.sort((a,b)=>a.name.localeCompare(b.name,"de"));
}
