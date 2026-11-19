import { packageSize } from './entitlements';
import { ticketDay } from './ticket-weeks';
import { eventFormat, isCancelledEvent, type BattleEvent } from './battle-math';
export const leadLabels = ['Am Veranstaltungstag', '1–3 Tage vorher', '4–7 Tage vorher', '8–14 Tage vorher', 'Mehr als 14 Tage vorher'];
export type LeadSummary = { bins: number[]; nights: number; excludedGuests: number; unknownPackages: number };
export type LeadFeed = { month: string; groups: Record<'all'|'jam'|'nyjb'|'weekend'|'friday'|'saturday', LeadSummary> };
export type LeadTicket = { id: string; event_id: string; status: string; description: string; order_id?: string; add_on_id?: string };
export type LeadOrder = { id: string; created_at: number|string };
export function emptyLead(): LeadSummary { return { bins: [0,0,0,0,0], nights: 0, excludedGuests: 0, unknownPackages: 0 }; }
export function addLeadEvent(feed: LeadFeed, event: BattleEvent, tickets: LeadTicket[], orders: LeadOrder[], today: string) {
  if (isCancelledEvent(event) || event.start.date >= today || !event.start.date.startsWith(feed.month)) return;
  const format = eventFormat(event);
  const groups = [feed.groups.all, ...(format ? [feed.groups[format]] : [])];
  const weekday = new Date(event.start.date + 'T12:00:00Z').getUTCDay();
  if (weekday === 5 || weekday === 6) groups.push(feed.groups.weekend, feed.groups[weekday === 5 ? 'friday' : 'saturday']);
  groups.forEach(g => g.nights++);
  const byOrder = new Map(orders.map(o => [o.id, o]));
  const seen = new Set<string>();
  for (const t of tickets) {
    if (t.event_id !== event.id || t.status !== 'valid' || t.add_on_id || seen.has(t.id)) continue;
    seen.add(t.id);
    const size = packageSize(t.description || '');
    if (!size) { groups.forEach(g => g.unknownPackages++); continue; }
    const order = t.order_id ? byOrder.get(t.order_id) : undefined;
    const at = order ? (Number(order.created_at) || Date.parse(String(order.created_at))/1000) : NaN;
    const days = Number.isFinite(at) && at > 0 ? Math.round((Date.parse(event.start.date) - Date.parse(ticketDay(at)))/86400000) : -1;
    if (days < 0) { groups.forEach(g => g.excludedGuests += size); continue; }
    const bin = days === 0 ? 0 : days <= 3 ? 1 : days <= 7 ? 2 : days <= 14 ? 3 : 4;
    groups.forEach(g => g.bins[bin] += size);
  }
}
