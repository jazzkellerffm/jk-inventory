import type { TicketNight } from './tickets';
import type { Shift } from './types';
import { serviceDate } from './service-day';
import { ticketDay } from './ticket-weeks';
import { stationFor, type Station } from './stations';

const clock = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
const date = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' });

// This is the venue's established reference, not Ticket Tailor's package inventory.
const referenceGuests = 60;

export function showtime(nights: TicketNight[], now: number) {
  if (!Number.isFinite(now) || now <= 0) return null;
  const today = serviceDate(now);
  const night = nights.filter(n => Number.isFinite(n.start) && n.start > 0 && ticketDay(n.start) >= today)
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))[0];
  if (!night) return null;
  const start = night.start * 1000;
  const doors = start - 3_600_000;
  const phase = now < doors ? 'doors' : now < start ? 'show' : ticketDay(now / 1000) > ticketDay(night.start) ? 'ended' : 'started';
  const target = phase === 'doors' ? doors : start;
  const minutes = Math.max(0, Math.ceil((target - now) / 60_000));
  const days = Math.round((Date.parse(ticketDay(target / 1000)) - Date.parse(ticketDay(now / 1000))) / 86_400_000);
  const value = phase === 'ended' ? '' : phase === 'started' ? clock.format(start)
    : days > 0 ? days === 1 ? 'morgen' : 'in ' + days + ' Tagen'
    : minutes >= 60 ? Math.floor(minutes / 60) + ' Std.' + (minutes % 60 ? ' ' + minutes % 60 + ' Min.' : '')
    : minutes + ' Min.';
  return {
    night, phase, value,
    label: phase === 'ended' ? 'Show ended' : phase === 'started' ? 'Showtime seit' : phase === 'doors' ? days > 0 ? 'Einlass' : 'Einlass in' : days > 0 ? 'Show' : 'Show in',
    date: date.format(start), doors: clock.format(doors), start: clock.format(start),
    percent: night.soldOut ? 100 : Math.max(0, Math.min(100, night.guests / referenceGuests * 100)),
  };
}

// Match the displayed event's Berlin date, never the device date or today's roster.
export function showtimeTeam(shifts: Shift[], start: number) {
  const date = ticketDay(start);
  const people = new Map<string, { name: string; tentative: boolean; station: Station; roles: string[] }>();
  for (const shift of shifts.filter(shift => shift.date === date)) {
    const tentative = shift.status === 'tentative';
    const station = stationFor(shift.role);
    const role = shift.role?.trim() || 'Team';
    for (const rawName of shift.names) {
      const name = rawName.trim();
      if (!name) continue;
      const key = name.normalize('NFC').toLocaleLowerCase('de-DE');
      const prior = people.get(key);
      // Prefer a confirmed assignment; among equal statuses, prefer a known
      // station. Multiple confirmed stations keep the first roster assignment.
      const useStation = !prior || (prior.tentative && !tentative)
        || (prior.tentative === tentative && prior.station === 'team');
      people.set(key, {
        name: prior?.name ?? name,
        tentative: (prior?.tentative ?? true) && tentative,
        station: useStation ? station : prior.station,
        roles: [...new Set([...(prior?.roles ?? []), role])],
      });
    }
  }
  return { date, people: [...people.values()] };
}
