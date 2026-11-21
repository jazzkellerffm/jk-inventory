export const ticketCategories = ["Club", "Club Plus", "Premium", "VIP", "Worldstar VIP", "Weitere Tickets"] as const;

export function ticketCategory(name: string): typeof ticketCategories[number] {
  if (/vip/i.test(name)) return /world[\s-]*star/i.test(name) ? "Worldstar VIP" : "VIP";
  if (/premium/i.test(name)) return "Premium";
  if (/club\s*(plus|\+)|standard\s*\+/i.test(name)) return "Club Plus";
  if (/club|standard/i.test(name)) return "Club";
  return "Weitere Tickets";
}

export function packageSize(label: string) {
  const match = label.match(/\b(\d+)\s*(?:guests?|gäste|personen)\b/i)
    ?? label.match(/cr[eé]mant\s+(?:for|für)\s+(\d+)/i);
  return match ? Number(match[1]) : 0;
}

export function includedDrinks(label: string) {
  const explicit = label.match(/(?:incl\.?|inkl\.?)\s*(\d+)\s*drinks?\b/i);
  if (explicit) return Number(explicit[1]);
  return /club\s*(?:plus|\+)|premium|standard\s*\+/i.test(label) ? packageSize(label) : 0;
}

export type Supply = { label: string; quantity: number; kind: "food" | "wine" | "other" | "included" };

export function paidSupply(description: string, quantity: number): Supply {
  const label = description.replace(/^add-on:\s*/i, "").trim();
  if (/hummus/i.test(label)) return { label: "Hummus-Platte", quantity, kind: "food" };
  for (const wine of ["Crémant", "Lugana", "Primitivo"]) {
    if (/bottle|flasche/i.test(label) && label.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().includes(wine.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()))
      return { label: "Flasche " + wine, quantity, kind: "wine" };
  }
  return { label, quantity, kind: /snack|plate|bowl/i.test(label) ? "food" : "other" };
}

export function includedSupply(ticket: string): Supply[] {
  if (ticketCategory(ticket) === "Worldstar VIP") {
    return [{ label: "Flasche Moët", quantity: 1, kind: "included" }];
  }
  const bottle = ticket.match(/(\d+)\s*(?:bottles?|flaschen?)\s*(?:of\s+)?cr[eé]mant/i);
  if (bottle) return [{ label: "Flasche Crémant", quantity: Number(bottle[1]), kind: "included" }];
  if (/cr[eé]mant\s+(for|für)/i.test(ticket)) return [{ label: "Glas Crémant", quantity: packageSize(ticket), kind: "included" }];
  return [];
}

export function combine(items: Supply[]) {
  const totals = new Map<string, Supply>();
  for (const item of items) {
    const key = item.kind + item.label;
    const current = totals.get(key);
    if (current) current.quantity += item.quantity;
    else totals.set(key, { ...item });
  }
  return [...totals.values()];
}
