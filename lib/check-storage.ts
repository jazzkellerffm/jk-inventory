import type { StockStatus } from "@/lib/inventory-data";

const STORAGE_KEY = "jk-inventory-checks";
const MAX_CHECKS = 50;

export type SavedCheckItem = {
  id: string;
  section: string;
  name: string;
  unit: string;
  status: StockStatus;
  note: string;
};

export type SavedCheckRecord = {
  id: string;
  staffName: string;
  submittedAt: string;
  checkedCount: number;
  totalCount: number;
  counts: {
    ok: number;
    low: number;
    critical: number;
    unchecked: number;
  };
  generalNotes: string;
  items: SavedCheckItem[];
};

function safeParse(raw: string | null): SavedCheckRecord[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as SavedCheckRecord[]) : [];
  } catch {
    return [];
  }
}

export function loadSavedChecks(): SavedCheckRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function appendSavedCheck(
  record: Omit<SavedCheckRecord, "id">,
): SavedCheckRecord {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const full: SavedCheckRecord = { ...record, id };

  if (typeof window === "undefined") return full;

  try {
    const next = [...loadSavedChecks(), full].slice(-MAX_CHECKS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota or private mode — still return record for UI
  }

  return full;
}
