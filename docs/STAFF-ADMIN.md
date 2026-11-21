# Staff Administration — checkpoint 2026-11-21

## Scope

Separate `/staff/admin`, linked discreetly from Tools. Existing Service & Door, Safari select, public statistics and operational APIs are unchanged. No financial data is included in the public board or initial admin HTML.

First implementation: monthly payments and event-date views. This is an operational analysis, not accounting, profit, payout reconciliation or a verified pure gastronomy total.

## Access and setup

Requires the existing team session **and** a separate admin session. The server checks authorization before fetching finance and again before returning it. Responses are private/no-store. PIN attempts and session revocation survive server restarts.

- Six-digit PIN: server-only `STAFF_ADMIN_PIN_HASH`, salted scrypt.
- Run `npm run admin:pin` in a trusted local terminal. Input is hidden; the tool prints the hash only. Never send the PIN in chat, commit it, or pass it as a shell argument.
- Save that hash as a Sensitive Production environment variable in the Vercel project and redeploy.
- `STAFF_ADMIN_BACKEND_SECRET` has been configured in Production. Its hash alone is stored in the isolated Supabase config table.
- Existing `INCLUDED_DRINKS_SUPABASE_URL` / `INCLUDED_DRINKS_PUBLISHABLE_KEY` are reused solely to call the protected admin RPC.
- Five attempts per 15-minute window, globally for this small admin area. Failed attempts do not renew the window. Successful authentication resets the attempt counter.
- Idle expiration: 15 minutes since last authenticated API request. Absolute lifetime: 8 hours. Manual lock revokes the server session. PIN/team-key rotation invalidates the revision.
- Production cookie: `__Host-jk-admin`, Secure, HttpOnly, SameSite=Strict, path `/`. Random token; DB stores only its SHA-256 digest.
- The screen clears private data when hidden and checks the session again when restored.

Migration `migrations/20261121_staff_admin.sql` was applied to `jk-included-drinks` (`dospfulzjqyavqwfmcmm`). Private schema `jkos_admin_private` holds only authentication metadata. Existing Included Drinks tables were not altered. Anonymous clients have no schema/table access; RPC requires an independent 256-bit server secret. Database failure denies access.

Personal PIN configured in Production on 2026-11-21; owner confirmed successful access. No PIN or hash is stored in this repository.

## Financial definitions

### Payments

- Ticket Tailor: settled payment/refund transaction timestamps in Europe/Berlin, including purchases for future events. All v2 order ledgers are read because refunds can refer to older purchases.
- SumUp: transaction-history payment/refund timestamps in the selected calendar month. Monetary major units become integer euro cents.
- Combined = Ticket Tailor + SumUp, before provider fees and including any tips. Stripe is not added again.
- Unknown methods, currencies, incomplete pages or malformed data withhold trusted totals. Offline/gift-credit methods need separate reconciliation and cannot silently be added to SumUp.
- Ticket Tailor v2 refund amounts are negative integer cents. Subtract their magnitude once, using the refund transaction date. A malformed transaction outside the selected month does not block that month; an unknown date still does.
- SumUp refunds are reconciled against the original transaction detail and final refund event IDs. The original payment and separate history refund row are not counted twice. Cash totals use the refund date; evening totals attribute verified refunds to the original payment night. Missing or inconsistent detail withholds the total.
- The admin screen identifies which source failed or needs reconciliation and provides “Erneut laden”.

### Events

- Ticket lines are attributed by event date, independent of purchase date.
- Unit value and unit booking fee multiply by quantity once. Paid ledger, order total and line totals must reconcile.
- Event value means valid ticket packages: cancelled orders and void lines are excluded, with their count disclosed. Their payments/refunds remain in the payment-month ledger. Active refunded, discounted/unbalanced or otherwise uncertain allocations are withheld; no proportional refund split is guessed.
- Ticket value excludes booking fees and add-ons. Add-ons remain separately visible.
- Included drinks: agreed valuation EUR 15 per included drink. This is entitlement valuation, not redemption, cost or extra revenue. Known drink values remain visible even if a VIP bottle has no configured value. Unvalued entitlements are named with their quantities; the displayed amount is explicitly a partial value.
- Entry & seating = ticket value minus included valuation.
- Upgrade comparison = entry & seating minus explicitly configured historic Club value per guest. It is incremental revenue, not profit. Hide this row until the needed baseline and entitlement values exist. Likewise hide dependent admission/combined valuation rows when incomplete.
- SumUp evening allocation uses Berlin 03:00–03:00. Multiple events on one date or uncertain refund allocation produce no guessed event amount. Future service nights remain open.
- SumUp + included valuation is shown as a calculated sum, **not pure gastronomy revenue**, because SumUp can contain tips, admission or other products. TT add-ons are separately visible; they are not silently classified as food/drink.

Optional `STAFF_ADMIN_VALUATION_JSON` (integer euro cents):

```json
{"bottles":{},"clubPerGuest":{}}
```

Bottle keys are `Flasche Crémant` and `Flasche Moët`; Club keys are event IDs. Values are agreed integer euro cents. Missing values stay unknown. Agree real valuation amounts with Philipp before configuring. Historic Club baseline needs event-specific validation; do not use today's prices for past events.

## Verification and remaining work

- 99 automated tests: existing Staff behavior plus finance fixtures and API authorization gates.
- Production build, TypeScript, targeted ESLint.
- Read-only sample of 50 real Ticket Tailor v2 orders: zero payment/line reconciliation issues, eight November event groups. This does not certify a whole month.
- Actual database transaction verified wrong-secret denial, five-attempt limit, revision rejection, idle/absolute expiry, revocation and lack of anonymous table access. Test writes rolled back.
- Browser rendering check attempted but unavailable: installed Chromium cannot create its required process socket in this environment. Mobile visual review remains outstanding; do not claim Safari testing.
- Read-only live checks for November and October 2026 passed: complete provider pages, zero payment reconciliation issues, and Ticket Tailor, SumUp and combined net totals match independently summed source ledgers. An external accounting/export reconciliation remains separate.
- Next: agree bottle valuations and historic baselines. Then refine fee/discount/refund allocation and classify SumUp products for a true gastronomy share.
- Public drink mix/seasonal curve, weekly finance and payout builder are not part of this change.

## Rollback

Previous production code checkpoint: `9824500ed26661240b8aa1e7938ba491d236a569` (Worldstar Moët).
Restore that deployment or revert this feature commit. The isolated private auth schema can remain unused; no removal of shared data is necessary. Removing `STAFF_ADMIN_PIN_HASH` disables admin authorization immediately on the next deployment.

## Refund correction — 2026-11-21

Observed after PIN activation: monthly payment figures were withheld even though both provider APIs returned complete pages. Ticket Tailor negative refund amounts failed the original non-negative validator; SumUp refund reconciliation had been intentionally left incomplete.

Correction adds signed Ticket Tailor refund handling, SumUp transaction-event reconciliation, duplicate event protection, cross-month fixtures and a read-only live verifier (`tests/check-admin-live.mjs`). The verifier checks November and October against independently summed provider transaction history. It logs only pass/fail stages, never amounts, customer data or secrets. Read-only preview verification passed for both months on 2026-11-21. TypeScript, targeted ESLint and all 94 Staff tests passed. Event allocations with credits, refunds or missing valuation inputs remain explicitly incomplete; payment totals are independently available.

Pre-correction production checkpoint: `e11abe56dfe06fed79c5b36694727a02bc36f5bd`. Existing PIN/session configuration and Safari select are unchanged.

## Event values and loading feedback — 2026-11-21

Checkpoint before change: `388df42d2a0b97ee6009f41dac445f16e0e81fe4`. Reuse the existing rose/green TicketLoader for admin session and finance loading. Disclose SumUp figures as before provider fees and credit repayment. No provider payouts, repayment deductions or invented bottle/Club valuation values are introduced.

Five new regression tests cover known drink portions beside unknown bottles, configured bottle values, cancelled bookings with refunds or retained credit, and void lines not becoming add-ons. Cash calculations are unchanged.
