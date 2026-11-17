import { serviceDate, serviceStart } from "./service-day";

export type BestsellerPeriod = "evening" | "week" | "month";

export function bestsellerStart(now: number, period: BestsellerPeriod): number {
  if (period === "evening") return serviceStart(now);
  const date = new Date(serviceDate(now) + "T12:00:00Z");
  if (period === "week") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  else date.setUTCDate(1);
  return serviceStart(date.getTime());
}

export function defaultBestsellerPeriod(now: number): BestsellerPeriod {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin", hour: "2-digit", hourCycle: "h23",
  }).format(now));
  return hour >= 19 || hour < 3 ? "evening" : "week";
}
