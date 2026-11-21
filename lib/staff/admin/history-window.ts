import type { AdminHistory, HistoryPoint } from './dashboard';

export const HISTORY_WINDOW_MONTHS = 12;
export function historyMonth(month: string, offset: number) {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + offset, 1)).toISOString().slice(0, 7);
}
export type HistoryWindow = { endMonth: string; firstMonth: string | null; points: HistoryPoint[]; asOf: number };

// Session-local page cache. Nothing is persisted in browser storage. Fetching is
// initiated only by the disclosure, and stops at the visible twelve-month window.
export async function loadHistoryWindow(endMonth: string, cache: Map<string, AdminHistory>, signal: AbortSignal,
  fetchPage: (before: string, signal: AbortSignal) => Promise<AdminHistory>,
  progress?: (value: HistoryWindow) => void): Promise<HistoryWindow> {
  const startMonth = historyMonth(endMonth, 1 - HISTORY_WINDOW_MONTHS);
  const points = new Map<string, HistoryPoint>(), seen = new Set<string>();
  let before: string | null = endMonth, firstMonth: string | null = null, asOf = Infinity;
  const result = (): HistoryWindow => ({ endMonth, firstMonth, asOf, points: [...points.values()].sort((a, b) => a.month.localeCompare(b.month)) });
  while (before && before >= startMonth) {
    signal.throwIfAborted();
    if (seen.has(before)) throw Error('Der Verlauf konnte nicht vollständig geladen werden.');
    seen.add(before);
    const page: AdminHistory = cache.get(before) ?? await fetchPage(before, signal);
    signal.throwIfAborted();
    cache.set(before, page);
    firstMonth = page.firstMonth;
    asOf = Math.min(asOf, page.asOf);
    for (const point of page.points) if (point.month >= startMonth && point.month <= endMonth) points.set(point.month, point);
    progress?.(result());
    if (page.nextBefore && page.nextBefore >= before) throw Error('Der Verlauf konnte nicht vollständig geladen werden.');
    before = page.nextBefore;
  }
  return result();
}

export function clearHistoryWindow(endMonth: string, cache: Map<string, AdminHistory>) {
  const start = historyMonth(endMonth, 1 - HISTORY_WINDOW_MONTHS);
  for (const key of cache.keys()) if (key >= start && key <= endMonth) cache.delete(key);
}
