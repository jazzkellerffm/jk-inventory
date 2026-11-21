import { berlinDay, ticketTotal, type NightFinance } from './finance';
import { serviceDate } from '../service-day';
import type { AdminSummary } from './data';

export type EveningEvent = { id: string; name: string; start: number; date: string };
export function eveningDashboard(events: EveningEvent[] | null, ticket: AdminSummary['ticket'], bar: AdminSummary['bar'], now: number) {
  const date = serviceDate(now);
  const selected = events?.filter(event => event.date === date) ?? [];
  const nights: NightFinance[] = ticket?.nights.filter(night => night.date === date) ?? [];
  const complete = events !== null && ticket !== null && ticket.eventIssues === 0 &&
    nights.every(night => !night.uncertain && selected.some(event => event.id === night.id));
  const sum = (field: 'ticketCents' | 'feeCents' | 'addonCents' | 'guests' | 'knownIncludedCents') =>
    complete ? nights.reduce((total, night) => total + night[field], 0) : null;
  const total = complete ? nights.reduce((value, night) => value + ticketTotal(night)!, 0) : null;
  const included = complete && nights.every(night => night.includedCents !== null)
    ? nights.reduce((value, night) => value + night.includedCents!, 0) : null;
  const sumup = bar && bar.paymentIssues === 0 ? Object.hasOwn(bar.nights, date) ? bar.nights[date] : 0 : null;
  const started = selected.some(event => event.start * 1000 <= now);
  const phase = berlinDay(now) > date ? 'ended' : selected.length ? started ? 'started' : 'upcoming' : 'none';
  return { date, asOf: now, events: selected, eventsAvailable: events !== null, phase,
    ticketTotal: total, ticketCents: sum('ticketCents'), feeCents: sum('feeCents'), addonCents: sum('addonCents'),
    guests: sum('guests'), includedCents: included, knownIncludedCents: sum('knownIncludedCents'),
    unvaluedSupplies: nights.flatMap(night => night.unvaluedSupplies),
    sumupCents: sumup, combinedCents: total !== null && sumup !== null ? total + sumup : null,
    barWithIncludedCents: sumup !== null && included !== null ? sumup + included : null };
}
export type EveningDashboard = ReturnType<typeof eveningDashboard> & { comparison?: { date: string; combinedCents: number | null; sumupCents: number | null } };
export type HistoryPoint = { month: string; cents: number | null; partial: boolean };
export type AdminHistory = { firstMonth: string | null; points: HistoryPoint[]; nextBefore: string | null; asOf: number };
export function shiftMonth(month: string, offset: number) {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + offset, 1)).toISOString().slice(0, 7);
}
