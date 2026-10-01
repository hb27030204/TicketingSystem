-- The event moved two nights earlier: 17th/18th Oct -> 16th/17th Oct.
-- Migrates every table that stores these dates in place (rather than
-- wiping test data) since there's real test-booking/check-in history
-- worth keeping for the admin dashboard.
--
-- Order matters for the plain `date` columns (event_settings,
-- checkin_events): update 17->16 FIRST so no row is left pointing at
-- 17 when the second statement claims it for the old 18. Array columns
-- (ticket_types.valid_dates, orders.event_dates) don't have this
-- collision risk - array_replace transforms a copy in one pass, so both
-- replacements can run in a single statement per column.

update event_settings set event_date = '2026-10-16' where event_date = '2026-10-17';
update event_settings set event_date = '2026-10-17' where event_date = '2026-10-18';

update checkin_events set event_date = '2026-10-16' where event_date = '2026-10-17';
update checkin_events set event_date = '2026-10-17' where event_date = '2026-10-18';

update ticket_types set valid_dates = array_replace(
  array_replace(valid_dates, '2026-10-17'::date, '2026-10-16'::date),
  '2026-10-18'::date, '2026-10-17'::date
);

update orders set event_dates = array_replace(
  array_replace(event_dates, '2026-10-17'::date, '2026-10-16'::date),
  '2026-10-18'::date, '2026-10-17'::date
);
