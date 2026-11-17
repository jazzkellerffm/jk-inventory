// Manual, read-only verification. Run in a preview environment with SumUp keys.
// node --import ./tests/register-typescript.mjs tests/check-sumup-live.mjs
import { readBarFeed, readBestsellers } from "../lib/staff/sumup.ts";

const merchant = process.env.SUMUP_MERCHANT_CODE?.trim();
const token = process.env.SUMUP_API_KEY?.trim();
if (!merchant || !token) throw new Error("SumUp verification requires credentials");
const started = Date.now();
const bar = await readBarFeed(merchant, token);
console.log("SUMUP_VERIFY bar", JSON.stringify({
  missingReceiptDetails: bar.missingReceiptDetails, paidEffort: bar.paidEffort,
  visiblePayments: bar.payments.length,
  visiblePaymentsWithItems: bar.payments.filter(p => p.items.length > 0).length,
}));
for (const period of ["evening", "week", "month"]) {
  const feed = await readBestsellers(merchant, token, period);
  console.log("SUMUP_VERIFY ranking", JSON.stringify({
    period, incomplete: feed.incomplete, products: feed.products.length,
    ...(period === "evening" ? { leaders: feed.products.slice(0, 3) } : {}),
    elapsedSeconds: Math.round((Date.now() - started) / 1000),
  }));
}
