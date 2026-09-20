-- ============================================================
-- Auth rework: email is now the Supabase Auth identifier (OTP
-- delivered by email via MSG91 custom SMTP). Phone becomes a
-- separate, still-unique, profile field used only to look up
-- which email to send the login OTP to (see request-otp /
-- verify-otp Edge Functions). See the plan doc for the full
-- signup/login flow this supports.
-- ============================================================

alter table profiles
  add column email text unique not null,
  add constraint profiles_phone_format check (phone ~ '^[6-9][0-9]{9}$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;
