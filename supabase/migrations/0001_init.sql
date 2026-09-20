-- ============================================================
-- Ticketing system schema
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- profiles: 1:1 extension of auth.users, phone is the identity
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text unique not null,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (new.id, new.phone, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- ticket_types: configurable ticket catalogue (replaces the old
-- hardcoded PRICES object)
-- ------------------------------------------------------------
create table ticket_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  price integer not null check (price > 0),
  unit_size integer not null default 1 check (unit_size > 0),
  band_colour text not null default 'Yellow',
  -- Dates this ticket type is offered for. For a single-day ticket the
  -- guest picks one of these at booking time. For a multi-day ticket
  -- (is_multi_day = true) the booking automatically covers all of them.
  valid_dates date[] not null,
  is_multi_day boolean not null default false,
  active boolean not null default true
);

-- ------------------------------------------------------------
-- event_settings: per-date capacity + check-in open/close gate
-- (replaces the old CHECK_IN_17/18_ENABLED script properties)
-- ------------------------------------------------------------
create table event_settings (
  event_date date primary key,
  checkin_enabled boolean not null default false,
  capacity integer not null default 1000 check (capacity > 0)
);

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  booking_code text unique not null,
  user_id uuid not null references profiles (id),
  ticket_type_id uuid not null references ticket_types (id),
  event_dates date[] not null,
  quantity integer not null check (quantity between 1 and 30),
  amount integer not null check (amount > 0),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  payment_status text not null default 'PENDING'
    check (payment_status in ('PENDING', 'PAID', 'FAILED')),
  created_at timestamptz not null default now()
);

create index orders_user_id_idx on orders (user_id);
create index orders_booking_code_idx on orders (booking_code);

-- ------------------------------------------------------------
-- tickets: one per paid order (user_id denormalized for simple RLS)
-- ------------------------------------------------------------
create table tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references orders (id),
  user_id uuid not null references profiles (id),
  ticket_token text unique not null,
  qr_type text not null check (qr_type in ('NORMAL', 'GROUP')),
  qr_image_path text,
  status text not null default 'READY',
  sms_status text not null default 'PENDING',
  sms_sent_at timestamptz,
  sms_error text,
  created_at timestamptz not null default now()
);

create index tickets_user_id_idx on tickets (user_id);
create index tickets_ticket_token_idx on tickets (ticket_token);

-- ------------------------------------------------------------
-- staff_codes: per-staff fixed login codes, inserted directly by
-- an admin (e.g. via the Supabase table editor / SQL)
-- ------------------------------------------------------------
create table staff_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  staff_name text not null,
  is_admin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- staff_sessions: custom session store for the fixed-code login
-- (staff are not Supabase Auth users)
-- ------------------------------------------------------------
create table staff_sessions (
  token text primary key,
  staff_code_id uuid not null references staff_codes (id),
  expires_at timestamptz not null
);

-- ------------------------------------------------------------
-- checkin_events: append-only audit log (replaces the old sheet's
-- overwritten "17 Oct Check-in" cell)
-- ------------------------------------------------------------
create table checkin_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets (id),
  event_date date not null,
  quantity integer not null check (quantity > 0),
  staff_code_id uuid not null references staff_codes (id),
  created_at timestamptz not null default now()
);

create index checkin_events_ticket_id_idx on checkin_events (ticket_id, event_date);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table ticket_types enable row level security;
alter table event_settings enable row level security;
alter table orders enable row level security;
alter table tickets enable row level security;
alter table staff_codes enable row level security;
alter table staff_sessions enable row level security;
alter table checkin_events enable row level security;

-- profiles: a user can read/update their own row only
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ticket_types / event_settings: public read-only catalogue
create policy "ticket_types_public_read" on ticket_types
  for select using (active = true);

create policy "event_settings_public_read" on event_settings
  for select using (true);

-- orders / tickets: a user can read only their own rows.
-- No insert/update/delete policies exist for any role except
-- service_role (which bypasses RLS) - all writes go through
-- Edge Functions.
create policy "orders_select_own" on orders
  for select using (auth.uid() = user_id);

create policy "tickets_select_own" on tickets
  for select using (auth.uid() = user_id);

-- staff_codes / staff_sessions / checkin_events: no client policies
-- at all. Reached exclusively through Edge Functions using the
-- service_role key, which bypasses RLS entirely.

-- ============================================================
-- Atomic check-in RPC
-- Replaces the old LockService-based script lock with a
-- per-ticket row lock inside a single transaction.
-- ============================================================
create function perform_checkin(
  p_ticket_token text,
  p_event_date date,
  p_quantity int,
  p_staff_code_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_order record;
  v_type record;
  v_total_guests int;
  v_checked int;
  v_remaining int;
begin
  select t.* into v_ticket from tickets t where t.ticket_token = p_ticket_token for update;
  if not found then
    return jsonb_build_object('result', 'INVALID');
  end if;

  select * into v_order from orders where id = v_ticket.order_id;
  if v_order.payment_status <> 'PAID' then
    return jsonb_build_object('result', 'NOT_PAID');
  end if;

  select * into v_type from ticket_types where id = v_order.ticket_type_id;

  if not (p_event_date = any (v_order.event_dates)) then
    return jsonb_build_object('result', 'WRONG_DATE');
  end if;

  if not coalesce((select checkin_enabled from event_settings where event_date = p_event_date), false) then
    return jsonb_build_object('result', 'CHECKIN_CLOSED');
  end if;

  v_total_guests := v_order.quantity * v_type.unit_size;

  select coalesce(sum(quantity), 0) into v_checked
  from checkin_events
  where ticket_id = v_ticket.id and event_date = p_event_date;

  v_remaining := v_total_guests - v_checked;

  if v_remaining <= 0 then
    return jsonb_build_object(
      'result', 'ALREADY_USED',
      'checkedIn', v_checked,
      'totalGuests', v_total_guests
    );
  end if;

  if p_quantity > v_remaining then
    return jsonb_build_object(
      'result', 'TOO_MANY',
      'remaining', v_remaining,
      'totalGuests', v_total_guests
    );
  end if;

  insert into checkin_events (ticket_id, event_date, quantity, staff_code_id)
  values (v_ticket.id, p_event_date, p_quantity, p_staff_code_id);

  return jsonb_build_object(
    'result', 'VALID',
    'checkedIn', v_checked + p_quantity,
    'remaining', v_remaining - p_quantity,
    'totalGuests', v_total_guests
  );
end;
$$;

-- ============================================================
-- Atomic capacity reservation RPC
--
-- The old Apps Script version only checked capacity against already-PAID
-- rows while holding a whole-sheet LockService lock, and never re-checked
-- at payment time - a burst of simultaneous checkouts could all pass the
-- check before any of them turned PAID, oversell ing the day. This locks
-- the relevant event_settings row(s) and counts PAID orders *plus recent
-- PENDING orders* (an abandoned Razorpay checkout stops reserving a seat
-- after 15 minutes) as a real reservation, atomically with the insert.
-- ============================================================
create function reserve_order(
  p_booking_code text,
  p_user_id uuid,
  p_ticket_type_id uuid,
  p_event_dates date[],
  p_quantity int,
  p_amount int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_capacity int;
  v_reserved int;
  v_order_id uuid;
begin
  -- Lock in a stable (sorted) order so two bookings spanning the same
  -- two dates can never deadlock against each other.
  perform 1 from event_settings where event_date = any (p_event_dates) order by event_date for update;

  foreach v_date in array p_event_dates loop
    select capacity into v_capacity from event_settings where event_date = v_date;
    if v_capacity is null then
      return jsonb_build_object('success', false, 'message', 'Invalid event date: ' || v_date);
    end if;

    select coalesce(sum(quantity), 0) into v_reserved
    from orders
    where v_date = any (event_dates)
      and (
        payment_status = 'PAID'
        or (payment_status = 'PENDING' and created_at > now() - interval '15 minutes')
      );

    if v_reserved + p_quantity > v_capacity then
      return jsonb_build_object(
        'success', false,
        'message', to_char(v_date, 'DD Mon YYYY') || ' is sold out. Only ' ||
          greatest(0, v_capacity - v_reserved) || ' ticket(s) remaining.'
      );
    end if;
  end loop;

  insert into orders (booking_code, user_id, ticket_type_id, event_dates, quantity, amount, payment_status)
  values (p_booking_code, p_user_id, p_ticket_type_id, p_event_dates, p_quantity, p_amount, 'PENDING')
  returning id into v_order_id;

  return jsonb_build_object('success', true, 'order_id', v_order_id);
end;
$$;

-- ============================================================
-- Seed data — adjust to your real event before going live.
-- Safe to delete/edit; the app reads entirely from these tables.
-- ============================================================
insert into event_settings (event_date, checkin_enabled, capacity) values
  ('2026-10-17', false, 1000),
  ('2026-10-18', false, 1000);

insert into ticket_types (label, price, unit_size, band_colour, valid_dates, is_multi_day) values
  ('Kids (<16)', 99, 1, 'Green', array['2026-10-17','2026-10-18']::date[], false),
  ('Adult', 499, 1, 'Yellow', array['2026-10-17','2026-10-18']::date[], false),
  ('Adult — 2 Days', 850, 1, 'Orange', array['2026-10-17','2026-10-18']::date[], true),
  ('Couple — 1 Day', 849, 2, 'Pink / Red', array['2026-10-17','2026-10-18']::date[], false),
  ('Couple — 2 Days', 1599, 2, 'Pink / Red', array['2026-10-17','2026-10-18']::date[], true),
  ('Group of 5 — 2 Days', 4149, 5, 'Orange', array['2026-10-17','2026-10-18']::date[], true);
