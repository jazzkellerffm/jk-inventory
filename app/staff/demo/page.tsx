import { StaffDashboard } from "@/components/staff/dashboard";
import type { StaffBoard } from "@/lib/staff/types";

const asOf = "2026-11-14T21:00:00Z";
const minutesAgo = [59, 54, 53, 41, 39, 36, 35, 27, 26, 22, 21, 19, 18, 17, 16, 14, 12, 11, 9, 8, 6, 4, 3, 2, 1];
const products: [string, number, number][] = [
  ["Caipirinha", 2, 24], ["Pils", 1, 5], ["Gin Tonic", 2, 24], ["Mineralwasser", 1, 4],
  ["Negroni", 1, 12], ["Weißwein", 2, 16], ["Espresso", 1, 3], ["Whisky Sour", 1, 12],
];
const buckets = Array<number>(12).fill(0);
for (const ago of minutesAgo) buckets[Math.floor((60 - ago) / 5)]++;
const example: StaffBoard = {
  feedState: "ready", scheduleError: false,
  feed: {
    asOf, buckets, recentCount: buckets.slice(-3).reduce((a,b) => a+b, 0),
    payments: minutesAgo.toReversed().slice(0, 8).map((ago, index) => {
      const [name, quantity, amount] = products[index];
      return { id: "demo-" + index, at: new Date(Date.parse(asOf) - ago * 60_000).toISOString(), amount, currency: "EUR", items: [{ name, quantity }] };
    }),
  },
  shifts: [
    { date: "2026-11-14", start: "19:30", names: ["Alex", "Sam", "Lou"] },
    { date: "2026-11-18", start: "19:00", names: ["Lou", "Kim"] },
    { date: "2026-11-19", start: "19:00", names: ["Sam", "Alex"] },
  ],
};

export default function DemoPage() {
  return <StaffDashboard example={example} />;
}
