import { ticketDay } from "./ticket-weeks";

const berlinHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin", hour: "2-digit", hourCycle: "h23",
});

type Order = {
  created_at: number | string;
  status: string;
  line_items: { type: string; quantity: number }[];
};

export type PurchaseDay = { date: string; hours: number[] };
export type TicketActivity = { days: PurchaseDay[]; asOf: number };

export function purchaseTime(order: Order) {
  const value = Number(order.created_at);
  return Number.isFinite(value) ? value : Date.parse(String(order.created_at)) / 1000;
}

export function purchasedTickets(order: Order) {
  if (order.status !== "completed" && order.status !== "paid") return 0;
  return order.line_items.reduce((sum, item) =>
    item.type === "ticket" && item.quantity > 0 ? sum + item.quantity : sum, 0);
}

export function purchaseWindow(now: number) {
  const today = ticketDay(now);
  // Step through calendar dates independently of the length of a Berlin day.
  const endDate = Date.parse(today + "T00:00:00Z");
  const dates = Array.from({ length: 7 }, (_, index) =>
    new Date(endDate - (6 - index) * 86400000).toISOString().slice(0, 10));
  const utc = Date.parse(dates[0] + "T00:00:00Z");
  const start = utc / 1000 - Number(berlinHour.format(utc)) * 3600;
  return { dates, start };
}

export function summarizePurchases(orders: Order[], dates: string[], asOf: number): TicketActivity {
  const days = dates.map(date => ({ date, hours: Array<number>(24).fill(0) }));
  const byDate = new Map(days.map(day => [day.date, day.hours]));
  for (const order of orders) {
    const quantity = purchasedTickets(order);
    const at = purchaseTime(order);
    if (!quantity || !Number.isFinite(at) || at > asOf) continue;
    const hours = byDate.get(ticketDay(at));
    if (hours) hours[Number(berlinHour.format(at * 1000))] += quantity;
  }
  return { days, asOf };
}
