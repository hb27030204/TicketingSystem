# Ticketing System

Rebuild of `Old Code/` (a Google Apps Script + Sheets ticketing system) as
React + Vite + Supabase + Razorpay + MSG91, deployed on Vercel.

- `app/` — React/Vite/TypeScript frontend (see `app/README.md`)
- `supabase/` — Postgres schema, RLS, and Edge Functions (Supabase CLI project)
- `Old Code/` — the original Apps Script system, kept as reference only

## Architecture in one paragraph

Customers log in with phone + OTP (Supabase Auth, no passwords). Booking
and payment go through Supabase Edge Functions that talk to Razorpay
server-side. On a verified payment, an Edge Function generates a secure
ticket token, renders a QR PNG pointing at `/checkin?token=...`, **decodes
it back to confirm it's actually scannable**, and stores it in Supabase
Storage. MSG91 sends two kinds of SMS: the OTP (via Supabase Auth's Send
SMS hook) and a ticket link (a separate transactional send after
payment). Staff are a completely separate identity: no Supabase Auth
account, just a fixed per-staff code inserted directly into the
`staff_codes` table, which staff use to log into `/staff` or directly
into `/checkin` when they scan a ticket QR with their phone's camera.

## One-time setup

### 1. Supabase

1. Create a project at supabase.com, then install the CLI and link it:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
2. Push the schema:
   ```bash
   supabase db push
   ```
   This creates every table, RLS policy, the `perform_checkin` and
   `reserve_order` functions, and the public `qr-codes` storage bucket.
3. Deploy the Edge Functions:
   ```bash
   supabase functions deploy
   ```
4. Set function secrets from `supabase/functions/.env` (copy
   `.env.example` first and fill in Razorpay/MSG91 values below):
   ```bash
   supabase secrets set --env-file supabase/functions/.env
   ```
5. In the dashboard, go to **Authentication → Hooks → Send SMS hook**,
   enable it, point it at your deployed `send-sms-hook` function URL, and
   copy the generated secret into `SEND_SMS_HOOK_SECRET` (re-run step 4
   after).
6. In **Authentication → Providers → Phone**, enable Phone sign-in.

### 2. MSG91

1. Sign up at msg91.com and complete **TRAI DLT entity registration**
   (required for any SMS to Indian numbers — takes 1–3 business days,
   start this early).
2. Create two DLT-approved **Flow** templates, each with one variable
   named `VAR1`:
   - OTP template, e.g. `Your OTP is VAR1. Do not share it.`
   - Ticket-link template, e.g. `Your ticket is ready: VAR1`
3. Copy your auth key and both template IDs into
   `supabase/functions/.env`.

### 3. Razorpay

Copy your Key ID and Key Secret into `supabase/functions/.env`
(`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`), and the Key ID alone into
`app/.env.local` (`RAZORPAY_KEY_ID`) — the secret must never reach
the frontend.

### 4. Event configuration

`supabase/migrations/0001_init.sql` seeds two dates and six ticket types
matching the old event. Edit that seed (or update the `ticket_types` /
`event_settings` tables directly in the Supabase dashboard after your
first `db push`) for your actual event.

### 5. Staff codes

Insert one row per staff member directly in the `staff_codes` table
(Table Editor, or SQL):

```sql
insert into staff_codes (code, staff_name, is_admin) values
  ('482913', 'Riya', true),   -- admin: can open/close check-in per date
  ('117622', 'Karan', false);
```

Hand out the `code` values to staff. There's no signup flow for staff by
design.

### 6. Frontend

```bash
cd app
cp .env.example .env.local   # Supabase URL/anon key + Razorpay key ID
npm install
npm run dev
```

### 7. Deploy

Push to GitHub, import into Vercel with the project root set to `app/`,
and set the `VITE_*` env vars there. Set `SITE_URL` in
`supabase/functions/.env` to the resulting Vercel URL and re-run
`supabase secrets set`.

## Verifying end to end

1. Visit the deployed site, book a ticket with a test Indian mobile
   number — confirm the OTP SMS arrives and login works.
2. Complete a Razorpay **test-mode** payment — confirm the order flips to
   `PAID`, a `tickets` row appears with a `qr_image_path`, and the
   ticket-link SMS arrives.
3. Open the link from that SMS (or `/my-tickets` directly) and confirm
   the QR image renders.
4. Log into `/staff` with a staff code, confirm the dashboard shows the
   paid count, and use **Open** to enable check-in for a date.
5. Scan the ticket QR (or open its `/checkin?token=...` URL directly)
   from a different session, log in with a staff code, and check in
   fewer guests than the ticket allows — confirm the remaining count is
   right, then check in the rest and confirm `ALREADY_USED` on a third
   attempt.
