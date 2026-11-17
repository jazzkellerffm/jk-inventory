// Manual, read-only verification in a preview environment with SumUp keys.
// Logs contain only test outcomes: no names, quantities, revenue or identifiers.
// node --import ./tests/register-typescript.mjs tests/check-sumup-live.mjs
import { readBarFeed, readBestsellers } from "../lib/staff/sumup.ts";

const merchant = process.env.SUMUP_MERCHANT_CODE?.trim();
const token = process.env.SUMUP_API_KEY?.trim();
if (!merchant || !token) throw new Error("SumUp verification requires credentials");
const output = console.log.bind(console);
console.log = console.info = console.warn = () => {};
try {
  const bar = await readBarFeed(merchant, token);
  const barComplete = !bar.missingReceiptDetails && bar.payments.every(p => p.items.length > 0);
  output("SUMUP_VERIFY bar " + (barComplete ? "PASS" : "INCOMPLETE"));
  for (const period of ["evening", "week", "month"]) {
    const feed = await readBestsellers(merchant, token, period);
    output("SUMUP_VERIFY " + period + " " + (feed.incomplete === 0 && feed.products.length > 0 ? "PASS" : "INCOMPLETE"));
  }
} catch {
  output("SUMUP_VERIFY ERROR");
  process.exitCode = 1;
}
