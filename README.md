This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## JK Staff OS

The mobile staff dashboard lives at `/staff`. The existing inventory opens at
`/`. Use `/staff/demo` for an independent example evening with fictional
payments and shifts. The demo uses fixtures for both SumUp and Included Drinks.

Set the following server-side environment variables for the relevant Vercel
environment and redeploy. For local development use `.env.local`.

| Variable | Purpose |
| --- | --- |
| `STAFF_ACCESS_KEY` | A long random shared team password. Rotating it invalidates staff sessions. |
| `SUMUP_MERCHANT_CODE` | Jazzkeller's SumUp merchant code. |
| `INCLUDED_DRINKS_SUPABASE_URL` | Supabase URL of the Included Drinks menu. |
| `INCLUDED_DRINKS_PUBLISHABLE_KEY` | Publishable key for the same menu project. The Staff server reads order fields under its existing anonymous read policy. |
| `SUMUP_API_KEY` | SumUp API key for the venue's own merchant account. |
| `STAFF_SHIFTS_JSON` | Optional list of upcoming shifts, e.g. `[{"date":"2027-01-15","start":"19:00","names":["Alex","Sam"]}]`. Publish changes by redeploying. Dates and start times are local to Frankfurt. |

Keep real rosters and credentials in the deployment environment. Staff sign in
at `/staff` and can filter shifts by first name. The protected feed reads the
merchant transaction history and up to eight corresponding receipts every
15 seconds while visible. It shows successful payments from the last hour,
including those for which SumUp supplies no item details. Counts cover all
pages of that hour. The server discards customer and card details. To verify
the connection, compare a recent QR Order & Pay sale and a manually entered
item sale with their original receipts (time, items, quantities and amount).

The Included Drinks panel shows the latest eight orders placed in the last hour, newest first, with table, drink quantities and open/served status. It refreshes with the board every 15 seconds. Staff view access requires the team password. Order fulfilment stays in the Included Drinks app.

### Dienstplan veröffentlichen

In `data/dienstplan.json` stehen die freigegebenen Schichten für das Team.
Pro Einsatz Datum, Rolle und Vornamen eintragen. Eine Startzeit ist optional.

```json
[
  {"date":"2026-11-18","role":"Bar","names":["Adri","Hamad"]},
  {"date":"2026-11-18","role":"Backstage","names":["Joab"]}
]
```

Datei in GitHub oder Cursor bearbeiten und die Änderung auf dem Branch der Staff-App
speichern (Commit, bei Cursor zusätzlich Push). Nach dem Deployment sehen alle über
denselben Staff-Link den Plan. Die Ansicht startet bei der aktuellen Woche und erlaubt den Rückblick auf alle
erfassten Wochen und Monate. Einträge sind geplante Einsätze, keine Anwesenheitsnachweise. Die Demo hat eigene Beispieldaten. Bei leerer Datei
liest die App einen gegebenenfalls vorhandenen Altplan aus `STAFF_SHIFTS_JSON`.
