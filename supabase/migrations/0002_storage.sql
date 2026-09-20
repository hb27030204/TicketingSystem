-- Public bucket for generated ticket QR PNGs. Public read is fine here:
-- the QR image itself is no more sensitive than the physical ticket
-- would be, and the filename is an unguessable 32-char ticket token.
-- Only service_role (used exclusively inside Edge Functions) can write.
insert into storage.buckets (id, name, public)
values ('qr-codes', 'qr-codes', true)
on conflict (id) do nothing;

create policy "qr_codes_public_read"
  on storage.objects for select
  using (bucket_id = 'qr-codes');
