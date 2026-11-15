import "server-only";
import type { Shift } from "./types";

import plan from "@/data/dienstplan.json";
import { weekDay } from "./ticket-weeks";

export function upcomingShifts(raw = plan.length ? JSON.stringify(plan) : process.env.STAFF_SHIFTS_JSON, now = new Date()): Shift[] {
  if (!raw) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("Invalid schedule");
  const weekStart = weekDay(now.getTime()/1000,0);
  return rows.map(row => {
    if (typeof row?.date !== "string" || !/^\d{4}-\d\d-\d\d$/.test(row.date) ||
        !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date ||
        (row.role !== undefined && (typeof row.role !== "string" || !row.role.trim())) ||
        !Array.isArray(row.names) || !row.names.length ||
        !row.names.every((name: unknown) => typeof name === "string" && name.trim()) ||
        (row.start !== undefined && (typeof row.start !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start)))) {
      throw new Error("Invalid shift");
    }
    return { date: row.date, role: row.role?.trim(), names: row.names.map((name: string) => name.trim()), start: row.start };
  }).filter(row => row.date >= weekStart).sort((a,b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? ""));
}
