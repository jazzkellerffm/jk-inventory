export type ReceiptItem = { name: string; quantity: number | null };
export type Payment = { id: string; at: string; amount: number; currency: string; items: ReceiptItem[] };
export type BarFeed = {
  asOf: string;
  recentCount: number;
  buckets: number[];
  payments: Payment[];
};
export type DrinkOrder = {
  id: string;
  at: string;
  table: string;
  status: "open" | "served";
  items: { name: string; quantity: number }[];
};
export type DrinkFeed = { asOf: string; orders: DrinkOrder[] };
export type FeedState = "ready" | "setup" | "unavailable";
export type Shift = { date: string; names: string[]; role?: string; start?: string };
export type StaffBoard = {
  feed: BarFeed | null;
  feedState: FeedState;
  drinks: DrinkFeed | null;
  drinksState: FeedState;
  shifts: Shift[];
  scheduleError: boolean;
};
export type BestsellerFeed = { products:{name:string;quantity:number}[]; incomplete:number; asOf:string };
