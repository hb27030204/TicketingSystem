-- Rebrand (Raas Dandya -> Raas Garba / Dandiya) is purely display text in
-- the frontend, nothing to migrate here. This is the pricing side: the
-- four ticket categories now each come in a 1-day and 2-day variant
-- (Kids and Group of 5 previously only had one of the two), and prices
-- changed across the board.

-- Existing rows, updated in place so historical orders (ticket_type_id FK)
-- keep pointing at the same row with its new label/price.
update ticket_types set label = 'Kids (5 years below)', price = 99
  where label = 'Kids (<16)';

update ticket_types set label = 'Stag', price = 499
  where label = 'Adult';

update ticket_types set label = 'Stag — 2 Days', price = 899, band_colour = 'Yellow'
  where label = 'Adult — 2 Days';

update ticket_types set label = 'Couple', price = 799
  where label = 'Couple — 1 Day';

update ticket_types set price = 1499
  where label = 'Couple — 2 Days';

update ticket_types set price = 4699
  where label = 'Group of 5 — 2 Days';

-- New variants that didn't exist before.
insert into ticket_types (label, price, unit_size, band_colour, valid_dates, is_multi_day) values
  ('Kids (5 years below) — 2 Days', 149, 1, 'Green', array['2026-10-17','2026-10-18']::date[], true),
  ('Group of 5', 2450, 5, 'Orange', array['2026-10-17','2026-10-18']::date[], false);
