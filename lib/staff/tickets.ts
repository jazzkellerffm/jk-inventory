import "server-only";
import { serviceDate } from "./service-day";
import {ticketDay, weekDay} from "./ticket-weeks";
import { ticketCategory, includedDrinks, packageSize, paidSupply, type Supply } from "./entitlements";

type EventRow = { id: string; name: string; status: string; unavailable?: boolean | string; unavailable_status?: string | null; start: { unix: number; date: string } };
type Ticket = { id: string; event_id: string; description: string; status: string; add_on_id?: string; created_at: number };
export type TicketNight = { soldOut?: boolean; id: string; name: string; start: number; guests: number; recent: number; drinks: number; unknown: number };
type NightCounts = { soldOut: number; busy: number; half: number; quiet: number; unclear: number };
export type TicketFeed = { monthlyNights?: NightCounts; foodPreorders?: number | null; asOf: number; nights: TicketNight[]; monthlyCategories: Record<ReturnType<typeof ticketCategory>, number>; monthlyTables: { vip: number; worldstar: number } };

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

async function collect(key: string, now: number, serviceDay: string): Promise<TicketFeed> {
  const start=weekDay(now,0), end=weekDay(now,28);
  const month = ticketDay(now).slice(0, 7);
  const monthlyCategories = { Club: 0, "Club Plus": 0, Premium: 0, VIP: 0, "Worldstar VIP": 0, "Weitere Tickets": 0 };
  const auth = "Basic " + Buffer.from(key + ":").toString("base64");
  const events = (await pages<EventRow>("events",{},auth))
    .filter(e => e.start?.date && (e.start.date.startsWith(serviceDay.slice(0, 7)) || e.start.date.startsWith(month) || (e.start.date >= start && e.start.date < end)) && ["published","close_sales","sales_closed"].includes(e.status))
    .sort((a,b)=>a.start.unix-b.start.unix);
  const nights = [];
  const completed = new Map<string, {soldOut: boolean; guests: number; unknown: number}>();
  for (const event of events) {
    const tickets = await pages<Ticket>("issued_tickets",{event_id:event.id,status:"valid"},auth);
    let guests = 0, recent = 0, drinks = 0, unknown = 0;
    for (const ticket of tickets) {
      if (ticket.event_id !== event.id || ticket.status !== "valid" || ticket.add_on_id) continue;
      if (event.start.date.startsWith(month)) monthlyCategories[ticketCategory(ticket.description ?? "")]++;
      const size = packageSize(ticket.description ?? "");
      drinks += includedDrinks(ticket.description ?? "");
      if (!size) { unknown++; continue; }
      guests += Number(size);
      if (ticket.created_at >= now - 86400) recent += Number(size);
    }
    const soldOut = (event.unavailable === true || event.unavailable === "true")
      && ["sold out", "fully booked"].includes(event.unavailable_status?.trim().toLowerCase() ?? "");
    if (event.start.date.startsWith(serviceDay.slice(0, 7)) && event.start.date < serviceDay) {
      const night = completed.get(event.start.date) ?? { soldOut: true, guests: 0, unknown: 0 };
      night.soldOut &&= soldOut;
      night.guests += guests;
      night.unknown += unknown;
      completed.set(event.start.date, night);
    }
    if (event.start.date >= start && event.start.date < end) nights.push({soldOut,id:event.id,name:event.name,start:event.start.unix,guests,recent,drinks,unknown});
  }
  let foodPreorders: number | null = 0;
  try {
    for (const event of events.filter(event => event.start.date === serviceDay)) {
      const bookings = await readServicePlan(key, event.id);
      for (const booking of bookings) {
        for (const item of booking.extras) {
          if (item.kind === "food" && item.label === "Hummus-Platte") foodPreorders += item.quantity;
        }
      }
    }
  } catch {
    foodPreorders = null;
  }
  const monthlyNights: NightCounts = { soldOut: 0, busy: 0, half: 0, quiet: 0, unclear: 0 };
  for (const night of completed.values()) {
    if (night.soldOut) monthlyNights.soldOut++;
    else if (night.guests >= 45) monthlyNights.busy++;
    else if (night.unknown) monthlyNights.unclear++;
    else if (night.guests >= 25) monthlyNights.half++;
    else monthlyNights.quiet++;
  }
  return {asOf:now,nights,monthlyNights,foodPreorders,monthlyCategories,monthlyTables:{vip:monthlyCategories.VIP,worldstar:monthlyCategories["Worldstar VIP"]}};
}

let cached: { day:string; until:number; data:Promise<TicketFeed> } | undefined;
export function readTicketFeed(key:string) {
  const now = Date.now();
  const day = serviceDate(now);
  if (cached?.day === day && cached.until > now) return cached.data;
  const data = collect(key, Math.floor(now / 1000), day);
  cached = { day, until:now+60000,data };
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
  id: string; name: string; tickets: string[]; extras: Supply[]; checkedIn: boolean;
};

export async function readServicePlan(key: string, eventId: string): Promise<Booking[]> {
  const auth = "Basic " + Buffer.from(key + ":").toString("base64");
  const [orders, tickets] = await Promise.all([
    pages<ServiceOrder>("orders", {event_id:eventId}, auth),
    pages<Ticket & { order_id?: string; full_name?: string; checked_in?: boolean|string }>("issued_tickets", {event_id:eventId,status:"valid"}, auth),
  ]);
  const byOrder = new Map(orders.map(order => [order.id,order]));
  const bookings = new Map<string,Booking>();
  for (const ticket of tickets) {
    if (ticket.event_id !== eventId || ticket.status !== "valid" || ticket.add_on_id) continue;
    const id = ticket.order_id || ticket.id;
    const order = byOrder.get(id);
    if (order && !["completed","paid"].includes(order.status)) continue;
    const existing = bookings.get(id);
    const description = ticket.description?.trim() || "Ticketkategorie offen";
    const checkedIn = ticket.checked_in === true || ticket.checked_in === "true";
    if (existing) { existing.tickets.push(description); existing.checkedIn ||= checkedIn; continue; }
    const buyer = order?.buyer_details;
    const name = buyer?.name?.trim() || [buyer?.first_name,buyer?.last_name].filter(Boolean).join(" ") || ticket.full_name?.trim() || "Buchungsname fehlt";
    const booking: Booking = {id,name,tickets:[description],extras:[],checkedIn};
    bookings.set(id,booking);
    if (!order) continue;
    const ids = new Set(order.line_items.map(line => line.event_summary?.event_id).filter(Boolean));
    booking.extras = order.line_items.filter(line =>
      ["product","add_on"].includes(line.type) && line.quantity > 0 &&
      (line.event_summary?.event_id === eventId || (!line.event_summary?.event_id && ids.size === 1 && ids.has(eventId)))
    ).map(line => paidSupply(line.description,line.quantity));
  }
  return [...bookings.values()].sort((a,b)=>a.name.localeCompare(b.name,"de"));
}
