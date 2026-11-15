export type ReceiptItem = { name: string; quantity: number | null };
export type Payment = { id: string; at: string; amount: number; currency: string; items: ReceiptItem[] };
export type BarFeed = {
  asOf: string;
  recentCount: number;
  buckets: number[];
  payments: Payment[];
};
export type Shift = { date: string; names: string[]; start?: string };
export type StaffBoard = {
  feed: BarFeed | null;
  feedState: "ready" | "setup" | "unavailable";
  shifts: Shift[];
  scheduleError: boolean;
};
