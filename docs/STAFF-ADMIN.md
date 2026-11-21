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
- Event value means valid bookings: cancelled orders and void lines are excluded, with their count disclosed. Their payments/refunds remain in the payment-month ledger. Active refunded, discounted/unbalanced or otherwise uncertain allocations are withheld; no proportional refund split is guessed.
- Ticket Tailor gesamt = ticket packages + actual customer booking fees + add-ons. Package value excludes those fees and add-ons; each remains separately visible. Booking fees come from each order line, multiplied by quantity once, rather than a fixed EUR 3/EUR 5 rate.
- Included drinks: agreed valuation EUR 15 per included drink. This is entitlement valuation, not redemption, cost or extra revenue. Known drink values remain visible even if a VIP bottle has no configured value. Unvalued entitlements are named with their quantities; the displayed amount is explicitly a partial value.
- Ticketanteil ohne Inklusivgetränke = ticket value minus included valuation. The remainder includes admission and seating advantages; it is not profit or a uniform base-ticket price.
- Base-ticket/Club upgrade comparison is omitted from the UI by owner decision (2026-11-21). Package discounts and Single prices do not define one universal baseline. Legacy optional server configuration is retained but not presented. Hide dependent ticket-remainder/combined valuation rows when included values are incomplete.
- SumUp evening allocation uses Berlin 03:00–03:00. Multiple events on one date or uncertain refund allocation produce no guessed event amount. Future service nights remain open.
- SumUp + included valuation is shown as a calculated sum, **not pure gastronomy revenue**, because SumUp can contain tips, admission or other products. TT add-ons are separately visible; they are not silently classified as food/drink.

Optional `STAFF_ADMIN_VALUATION_JSON` (integer euro cents):

```json
{"bottles":{},"clubPerGuest":{}}
```

Bottle keys are `Flasche Crémant` and `Flasche Moët`; Club keys are event IDs. Default values agreed by Philipp on 2026-11-21: Crémant EUR 50, Moët provisional EUR 129. These are sale-value allocations, not cost or added revenue. Environment values may override them. Other missing entitlement values (such as historic Crémant glasses) stay unknown. Historic Club baseline needs event-specific validation; do not use today's prices for past events.

## Verification and remaining work

- 99 automated tests: existing Staff behavior plus finance fixtures and API authorization gates.
- Production build, TypeScript, targeted ESLint.
- Read-only sample of 50 real Ticket Tailor v2 orders: zero payment/line reconciliation issues, eight November event groups. This does not certify a whole month.
- Actual database transaction verified wrong-secret denial, five-attempt limit, revision rejection, idle/absolute expiry, revocation and lack of anonymous table access. Test writes rolled back.
- Browser rendering check attempted but unavailable: installed Chromium cannot create its required process socket in this environment. Mobile visual review remains outstanding; do not claim Safari testing.
- Read-only live checks for November and October 2026 passed: complete provider pages, zero payment reconciliation issues, and Ticket Tailor, SumUp and combined net totals match independently summed source ledgers. An external accounting/export reconciliation remains separate.
- Next: confirm the provisional Moët valuation and any missing glass values. Club baseline comparisons are deferred. Later refine fee/discount/refund allocation and classify SumUp products for a true gastronomy share.
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

Philipp supplied bottle values during this correction: EUR 50 Crémant, EUR 129 Moët (provisional). Defaults live in `lib/staff/admin/data.ts`; both remain overridable through `STAFF_ADMIN_VALUATION_JSON`. UI discloses these assumptions. Cash totals are unaffected.

Verification: 99 automated tests, TypeScript and targeted ESLint passed. Read-only November and October 2026 checks both passed for payment/refund reconciliation and valid event package completeness. The production build passed in preview. Historic glass entitlements remain explicitly unvalued until a glass price is agreed.


## Compact admin month view — 2026-11-21

Checkpoint before change: `0581bd1338557834386870b37cc15f02e7a37580`.

- Month navigation uses the same swipe direction and 60 px / 1.5 horizontal-to-vertical threshold as the team month overview. A rightward swipe selects the previous month; leftward returns to newer months. June 2026 and the current calendar month remain the bounds. Plain arrows retain 44 px tap targets. Vertical scrolling, multi-touch, cancelled gestures and touches starting on buttons/links do not switch months. While a request runs, navigation is disabled.
- Reuse the team pill switch for Zahlungen / Veranstaltungen. No horizontal slide animation or new carousel.
- Compact rose month total; detailed definitions and cancellation counts are under Berechnung. Actual source/reconciliation failures stay visible.
- Events are collapsed rows showing date, full wrapping name and ticket value. Native details elements support keyboard access and one open event at a time. A month or mode change starts with collapsed details.
- Rename Eintritt & Platzkomfort to Ticketanteil ohne Inklusivgetränke. Omit the Club/base-ticket comparison entirely from the view.
- Included value breakdown now exposes every priced entitlement with quantity and the actual configured unit value, including bottles. The sum equals knownIncludedCents; unknown or invalid valuations remain explicitly unvalued. No cash or total valuation formula changed.
- Existing API authentication, private/no-store responses, provider reads and Safari event selector are unchanged. No new persistent storage of finance data.

Verification: 101 Staff tests, TypeScript and targeted ESLint passed. Synthetic render checks cover collapsed event rows, bottle/drink breakdown, omitted baseline comparison, partial/failed sources and empty months. Synthetic touch-handler checks cover both directions, range/loading boundaries and ignored vertical/cancelled/multitouch/control gestures. Local Chromium still cannot start because its process socket is unavailable, so these are not an iPhone/Safari visual test. Production build must pass before publishing.

## Current evening and SumUp history — 2026-11-21

Rollback checkpoint before this extension: `504fe036bb661f4483af1dc024b4aef8bb3cd96f`.

- The compact green current-evening panel sits above the existing month view and uses the incumbent Staff palette, fonts, loading feedback and numeric alignment. Its service date is independent of the selected month. It refreshes every 60 seconds while visible, shows “Abend abgeschlossen” after Berlin midnight and changes to the next service evening at 03:00 Europe/Berlin.
- Gesamtwert des Abends = Ticket Tailor gesamt + SumUp. Event rows and the event-month total also include actual customer booking fees and add-ons. SumUp + Inklusivgetränke is a separate calculated allocation; EUR 15 drinks, EUR 50 Crémant and provisional EUR 129 Moët are already contained in the ticket packages and are never added to cash again. Unknown glass values stay unknown and withhold dependent calculated sums.
- The SumUp history is collapsed by default and makes no history request until opened. It shows a twelve-month window, loading existing four-month API pages only for that window. Plain arrows move twelve months at a time back to the first available payment month. Session-local page caching avoids repeated requests when reopening or returning to a loaded window. Monthly bars replace the line: sage green with the selected month in rose. The current month is labelled “bisher” and has a dotted bar edge; missing or unreconciled months remain null and show a dash, distinct from zero. Exact values remain available through the month selector and accessible bar buttons. The history is independent of the evening panel.
- The existing Zahlungen / Veranstaltungen switch, month bounds, swipe gestures and collapsed event details are preserved. Finance stays in the protected admin area; no public board data is added.
- Repeated provider reads share a private module-memory cache, keyed by a hash of provider credentials: 60 seconds for current data and 10 minutes for historic SumUp months. There is no disk, browser-storage or CDN persistence. Both new API routes check the admin session before reading and again before returning data, with private/no-store responses. Locking, hiding or expiry unmounts the dashboard and aborts its requests, clearing client-held finance state.
- Conservative limitation: unresolved Ticket Tailor allocation elsewhere in the service month's data can withhold the current evening's Ticket Tailor total. The panel discloses the incomplete source rather than guessing a total.

Verification before publication: 112 Staff tests, TypeScript and targeted ESLint passed. Synthetic server-render checks covered totals and fees, midnight state, included-value allocation, missing chart months, the partial current month, and loading/empty/error states. Static finish review found no blocking issue in the scoped code; its only detector finding was an existing unrelated width transition. Chromium still failed to create its process socket, so screenshot, mobile and Safari visual approval remain outstanding.

Read-only preview validation passed for October and November payment/refund ledgers, valid event totals including actual fees/add-ons, the current evening's metadata and combined source values, and discovery of the first SumUp payment month with the first four-month archive batch. Owner screenshot references reconciled exactly: Friday Night Club Band 2026-11-06 EUR 2,853 (packages 2,727 + add-ons 30 + fees 96); New York Jazz Bar 2026-11-05 EUR 1,200 (packages 1,067 + add-ons 55 + fees 78). Older archive months load progressively and were not individually live-certified in this check. The preview production build passed at commit `8cdfacdff6fd9a5e38a2700612664f02bf3cee6e`.

Live validation found that the provider's date-filtered event list omitted an existing current occurrence. The evening reader now follows the complete event catalogue, then filters actual occurrence dates locally, as the team dashboard already does. Pagination, status exclusions, cursor-cycle detection and fail-closed limits are covered by regression tests. No provider data was changed.


## Quiet history and prominent guests — 2026-11-21

Rollback checkpoint before this refinement: `c00b8db14bbdcee14acb84bc4c976be9730b16b5`.

- Guest count now appears directly below the event name in the green evening panel, rather than in the small footer. It remains a booked guest count, not a check-in count. Large financial values and the existing source split remain; some vertical spacing is reduced.
- History has its own disclosure below the evening panel. It starts closed; historical provider work begins only after opening. A single loader covers the requested window. Loaded data remains when collapsed and is reused on reopening within the same unlocked, visible session.
- Twelve months are shown at a time. Older/newer windows use unframed arrows with 44 px tap areas, limited by the actual first payment month and the current month. The native selector and tappable bars select an exact month. Missing, zero and negative refund months remain distinct; incomplete current months carry “bisher”.
- The client page cache exists only in component memory. Locking, expiry or hiding the protected panel clears it. Collapse/window changes abort pending requests, and late aborted results cannot update the cache. No localStorage, IndexedDB, disk or CDN storage was added.
- The history shows the oldest page timestamp in its visible window. Its refresh button explicitly refreshes that window; already loaded historic windows stay cached. Existing server provider-cache lifetimes still apply. The current-evening poll remains every 60 seconds and the service-day rollover remains 03:00 Europe/Berlin.
- All financial formulas, PIN/session guards, public team views, month swipe controls and event details remain unchanged.

Verification: 117 Staff tests passed, including request-count/cache, abort, retry, cursor and disclosure lifecycle coverage. TypeScript, targeted ESLint and local server-render checks passed. Rendering fixtures cover prominent guests, initially closed history, bar/null/partial states, existing fee totals and midnight behavior. These checks do not substitute for an iPhone/Safari visual test. Local Chromium cannot start in this environment; an optional external fixture upload was blocked by automatic approval review and was not retried. Deployment build status is recorded in Vercel for the published commit.

Human-readable continuation context: `docs/JKOS-Staff-Administration.md`, also saved under `/JKOS/DOCUMENTATION/CONTEXT` in Dropbox.
