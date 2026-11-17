// Manual, read-only verification in a preview environment with SumUp keys.
// Logs contain only test outcomes: no names, quantities, revenue or identifiers.
// node --import ./tests/register-typescript.mjs tests/check-sumup-live.mjs
import { readBarFeed, readBestsellers } from "../lib/staff/sumup.ts";

const merchant = process.env.SUMUP_MERCHANT_CODE?.trim();
const token = process.env.SUMUP_API_KEY?.trim();
if (!merchant || !token) throw new Error("SumUp verification requires credentials");
// Collect only enough metadata in memory to classify missing coverage.
// Neither identifiers nor business values are written to logs.
const seenTransactions = new Map();
const seenSales = new Map();
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const path = new URL(String(args[0])).pathname;
  if (response.ok && (path.endsWith("/transactions/history") || path.includes("/sales/"))) {
    const data = await response.clone().json();
    if (path.endsWith("/transactions/history")) {
      for (const row of data.items ?? []) seenTransactions.set(row.transaction_code, row);
    } else if (Array.isArray(data.payments)) seenSales.set(data.id, data);
  }
  return response;
};
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
  const references = new Map();
  for (const sale of seenSales.values()) for (const payment of sale.payments ?? []) {
    if (payment.status === "SUCCESSFUL" && payment.type === "purchase") {
      const key = /^urn:sumup:charge:([^:;\\s]+)(?:;\\d+)?$/.exec(payment.reference)?.[1] ?? payment.reference;
      references.set(key, sale);
    }
  }
  const classes = new Set();
  for (const transaction of seenTransactions.values()) {
    const sale = references.get(transaction.transaction_code) ?? references.get(transaction.transaction_id ?? transaction.id);
    if (!sale) {
      const client = transaction.client_transaction_id ?? "";
      const urn = /^urn:sumup:pos:sale:([^:]+):([^;]+)(?:;\\d+)?$/.exec(client);
      if (urn && urn[1] === merchant) classes.add(seenSales.has(urn[2]) ? "POS_SALE_ID_AVAILABLE" : "POS_SALE_NOT_FOUND");
      else classes.add(client.startsWith("pay_") ? "QR_SALE_NOT_FOUND" : "OTHER_SALE_NOT_FOUND");
    } else if (!(sale.items?.length)) classes.add("SALE_WITHOUT_LINES");
    else if (sale.items.some(i => typeof i.quantity !== "number")) classes.add("SALE_WITHOUT_QUANTITIES");
    else if (sale.items.some(i => /^(drinks?|getränke|custom amount|custom item|benutzerdefinierter betrag|freier betrag)$/i.test(i.name?.trim() ?? ""))) classes.add("GENERIC_ITEMS");
  }
  output("SUMUP_VERIFY coverage_classes " + [...classes].sort().join(","));
} catch {
  output("SUMUP_VERIFY ERROR");
  process.exitCode = 1;
}
