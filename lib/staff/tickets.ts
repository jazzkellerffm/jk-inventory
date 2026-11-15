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
