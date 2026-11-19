import { packageSize, ticketCategories, ticketCategory } from "./entitlements";

// Each entry is one valid issued ticket/package, not one order or one guest.
export function serviceTicketSummary(tickets: string[]) {
  return ticketCategories.flatMap(category => {
    const entries = tickets.filter(ticket => ticketCategory(ticket) === category);
    if (!entries.length) return [];
    const sizes = entries.map(packageSize);
    return [{ category, tickets: entries.length,
      guests: sizes.reduce((sum, size) => sum + size, 0),
      singles: sizes.filter(size => size === 1).length,
      unknown: sizes.filter(size => size === 0).length,
      packages: [...new Set(sizes.filter(size => size > 0))].sort((a,b) => a-b)
        .map(size => ({ size, count: sizes.filter(value => value === size).length })) }];
  });
}
