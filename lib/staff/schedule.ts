import "server-only";
import type { Shift } from "./types";

const berlinDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });

export function upcomingShifts(raw = process.env.STAFF_SHIFTS_JSON, now = new Date()): Shift[] {
  if (!raw) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("Invalid schedule");
  const today = berlinDay.format(now);
  return rows.map(row => {
    if (typeof row?.date !== "string" || !/^\d{4}-\d\d-\d\d$/.test(row.date) ||
        !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date ||
        !Array.isArray(row.names) || !row.names.length ||
        !row.names.every((name: unknown) => typeof name === "string" && name.trim()) ||
        (row.start !== undefined && (typeof row.start !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start)))) {
      throw new Error("Invalid shift");
    }
    return { date: row.date, names: row.names.map((name: string) => name.trim()), start: row.start };
  }).filter(row => row.date >= today).sort((a,b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? ""));
}
