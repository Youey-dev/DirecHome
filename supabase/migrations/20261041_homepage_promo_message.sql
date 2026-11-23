-- ==============================================================================
-- Editable homepage offer message
-- ==============================================================================
-- Admin → Promotions can write its own line for the homepage offer bar (e.g. "Spring special:
-- list free until June"). Empty means the default: "Your first 3 months are on us."
-- The message belongs to the code, so switching codes switches the message.

alter table public.promo_codes
  add column if not exists homepage_message text
  check (homepage_message is null or char_length(homepage_message) between 3 and 120);

-- homepage_promo() now also returns the message (its return type changes, so it's recreated)
drop function if exists public.homepage_promo();
create function public.homepage_promo()
returns table(code text, free_months integer, message text)
language sql
stable
security definer
set search_path = public
as $$
  select p.code, p.free_months, p.homepage_message from public.promo_codes p
   where p.featured and p.active
     and (p.valid_until is null or current_date <= p.valid_until)
     and (p.max_uses is null or (select count(*) from public.promo_redemptions r where r.code = p.code) < p.max_uses)
   limit 1;
$$;
revoke execute on function public.homepage_promo() from public;
grant execute on function public.homepage_promo() to anon, authenticated;
