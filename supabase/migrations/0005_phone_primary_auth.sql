-- Phone becomes the real identity again (login now goes through MSG91's
-- OTP Widget directly, verified server-side in verify-otp, never through
-- Supabase's own email-OTP or phone-OTP mechanisms). Email is now purely
-- a delivery address for tickets - no longer unique, since the same
-- email can be linked to multiple different phone-based accounts.
--
-- auth.users.email holds a synthetic, never-delivered address per user
-- (see _shared/authSession.ts's internalAuthEmail) purely to drive the
-- generateLink()-based session-minting trick - the real, non-unique
-- contact email lives only here in profiles.email.

alter table profiles drop constraint profiles_email_key;

-- Full name is now collected at signup time (see verify-otp), so it's
-- always present going forward. Pre-launch test data was wiped
-- separately before this migration so this can be added as NOT NULL
-- without a backfill.
alter table profiles alter column full_name set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Normalize defensively: it's ambiguous whether Supabase stores
  -- auth.users.phone with or without the leading "+" we passed to
  -- admin.createUser(), and profiles.phone's CHECK constraint requires
  -- exactly 10 bare digits - stripping non-digits and taking the last
  -- 10 works regardless of the stored format.
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'real_email',
    right(regexp_replace(new.phone, '[^0-9]', '', 'g'), 10),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;
