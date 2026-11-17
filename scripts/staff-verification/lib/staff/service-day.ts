const timeZone = "Europe/Berlin";
const rolloverHour = 3;
const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone });
const localHour = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" });

export const serviceStartLabel = String(rolloverHour).padStart(2, "0") + ":00";

export function serviceDate(timestamp: number): string {
  const date = localDate.format(timestamp);
  if (Number(localHour.format(timestamp)) >= rolloverHour) return date;
  const previous = new Date(date + "T12:00:00Z");
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}

export function serviceStart(timestamp: number): number {
  const utc = Date.parse(serviceDate(timestamp) + "T" + serviceStartLabel + ":00Z");
  // At 03:00 UTC Berlin has already completed either seasonal clock change.
  const offsetHours = Number(localHour.format(utc)) - rolloverHour;
  return utc - offsetHours * 3_600_000;
}
