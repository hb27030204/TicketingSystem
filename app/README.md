# Ticketing system — frontend

React + Vite + TypeScript + Tailwind. See `../supabase/` for the database
schema and Edge Functions this app talks to, and the root of the repo for
overall setup.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project + Razorpay key ID
npm run dev
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Book a ticket (date, ticket type, quantity, Razorpay payment) |
| `/login` | Phone OTP login |
| `/my-tickets` | Authenticated: all paid tickets on this account, with QR |
| `/ticket/:bookingCode` | Deep link opened from the ticket-link SMS |
| `/checkout/success` | Landing point for the Razorpay redirect-checkout fallback (restricted in-app browsers) |
| `/staff` | Staff code login + open/close check-in dashboard |
| `/checkin?token=...` | What a guest's ticket QR points to — staff scans it to check guests in |

`api/razorpay-callback.ts` is a Vercel serverless function (not part of
the Vite app) that relays Razorpay's redirect-mode POST into a GET that
`/checkout/success` can read — see the comment in that file.

## Deploying on Vercel

Set the Vercel project root to this `app/` folder. Add the three
`VITE_*` env vars from `.env.example` in the Vercel project settings.
`vercel.json` here handles SPA client-side routing.
