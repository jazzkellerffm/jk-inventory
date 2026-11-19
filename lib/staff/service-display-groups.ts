import type { Booking } from "./tickets";

export type DisplayBooking = Booking & { bookingCount: number; checkedInBookings: number };

export function groupServiceBookings(rows: Booking[]): DisplayBooking[] {
  const groups = new Map<string,DisplayBooking>();
  for (const row of rows) {
    const key = row.displayGroupId ?? row.id;
    const current = groups.get(key);
    if (current) {
      current.tickets.push(...row.tickets);
      current.extras.push(...row.extras);
      current.bookingCount++;
      current.checkedInBookings += Number(row.checkedIn);
      current.checkedIn = current.checkedIn && row.checkedIn;
    } else {
      groups.set(key,{...row,id:key,tickets:[...row.tickets],extras:[...row.extras],
        bookingCount:1,checkedInBookings:Number(row.checkedIn)});
    }
  }
  return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,"de"));
}
