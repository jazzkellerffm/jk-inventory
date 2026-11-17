import "server-only";
import type { Shift } from "./types";

import plan from "@/data/dienstplan.json";

export function upcomingShifts(raw = plan.length ? JSON.stringify(plan) : process.env.STAFF_SHIFTS_JSON): Shift[] {
  if (!raw) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error("Invalid schedule");
  return rows.map(row => {
    if ((row?.status !== undefined && row.status !== "confirmed" && row.status !== "tentative") ||
        typeof row?.date !== "string" || !/^\d{4}-\d\d-\d\d$/.test(row.date) ||
        !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date ||
        (row.role !== undefined && (typeof row.role !== "string" || !row.role.trim())) ||
        !Array.isArray(row.names) || !row.names.length ||
        !row.names.every((name: unknown) => typeof name === "string" && name.trim()) ||
        (row.start !== undefined && (typeof row.start !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start)))) {
      throw new Error("Invalid shift");
    }
    return { date: row.date, role: row.role?.trim(), names: row.names.map((name: string) => name.trim()), start: row.start, status: row.status };
  }).sort((a,b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? ""));
}
