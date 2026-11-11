-- ==============================================================================
-- Sold listings are locked (site review 2026-11-10, H1)
-- ==============================================================================
-- Before: once a listing was sold its owner could still change its words, place and photos
-- without review, and "Recently sold by owners" showed them to everyone. A listing taken down
-- by an admin, or approved but never paid for, could also be marked sold and appear there.
--
-- Now: a sold listing can't be changed by its owner (only the "show as sold" choice), its
-- photos can't be changed, only the database sets the sold date, and "Recently sold" skips
-- admin-hold listings and listings that were never paid for or on a free promo.
-- Safe to run more than once. No website change needed.

create or replace function public.protect_listing_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _is_admin boolean;
  _show boolean;
begin
  -- Public map shows ~1 km accuracy only
  new.lat := round(new.lat::numeric, 2);
  new.lng := round(new.lng::numeric, 2);
  new.updated_at := now();

  -- Skip the rules below for SQL Editor / server work (no logged-in user) and for
  -- updates made by our own server-side triggers (depth > 1).
  if auth.uid() is null or pg_trigger_depth() > 1 then
    return new;
  end if;

  _is_admin := public.is_admin();

  if tg_op = 'INSERT' then
    if not _is_admin then
      new.status := 'draft';
      new.subscription_tier := 'free_launch';
      new.monthly_fee_cad := 0;
      new.billing_cycle := 'free_launch';
      new.next_billing_at := null;
      new.payment_status := 'unpaid';
      new.past_due_since := null;
      new.cancel_at_period_end := false;
      new.review_notes := null;
      new.views_count := 0;
      new.saves_count := 0;
      new.inquiries_count := 0;
      new.admin_hold := false;
      new.sold_at := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if not _is_admin then
    -- A sold listing is finished: its owner can only choose whether it shows under
    -- "Recently sold by owners". Nothing else changes (words, place, price, dates).
    if old.status = 'sold' then
      _show := new.show_as_sold;
      new := old;
      new.show_as_sold := _show;
      new.updated_at := now();
      return new;
    end if;
    -- Only the database sets the sold date (trg_stamp_sold_at, which runs after this).
    new.sold_at := old.sold_at;
    new.user_id := old.user_id;
    new.subscription_tier := old.subscription_tier;
    new.monthly_fee_cad := old.monthly_fee_cad;
    new.billing_cycle := old.billing_cycle;
    new.next_billing_at := old.next_billing_at;
    new.payment_status := old.payment_status;
    new.past_due_since := old.past_due_since;
    new.cancel_at_period_end := old.cancel_at_period_end;
    new.review_notes := old.review_notes;
    -- Only the view counter (public.increment_listing_views) may change views_count.
    if coalesce(current_setting('app.view_bump', true), '') <> 'on' then
      new.views_count := old.views_count;
    end if;
    new.saves_count := old.saves_count;
    new.inquiries_count := old.inquiries_count;
    new.admin_hold := old.admin_hold;

    if new.status is distinct from old.status then
      if old.admin_hold and new.status = 'live' then
        raise exception 'OwnersMarket paused this listing. Please message us from your dashboard to have it put back up.';
      end if;
      if not (
           (old.status = 'draft'     and new.status = 'in_review')
        or (old.status = 'in_review' and new.status = 'draft')
        or (old.status = 'live'      and new.status in ('paused', 'sold'))
        or (old.status = 'paused'    and new.status in ('live', 'sold'))
        or (old.status = 'rejected'  and new.status = 'draft')
      ) then
        raise exception 'Sellers cannot change a listing from % to %. Only the OwnersMarket review team can do that.',
          old.status, new.status;
      end if;
    end if;

    -- An approved listing whose words or location change goes back to review, including
    -- when the same save pauses or resumes it.
    -- Price, rooms, size, year, parking, fees, taxes and cash-back don't need it.
    -- (A listing on admin hold stays paused; the admin reviews it when lifting the hold.)
    if old.status in ('live', 'paused') and new.status in ('live', 'paused') and not old.admin_hold and (
         new.headline                is distinct from old.headline
      or new.description             is distinct from old.description
      or new.neighborhood            is distinct from old.neighborhood
      or new.neighborhood_highlights is distinct from old.neighborhood_highlights
      or new.recent_upgrades         is distinct from old.recent_upgrades
      or new.inclusions              is distinct from old.inclusions
      or new.city                    is distinct from old.city
      or new.province                is distinct from old.province
      or new.postal_fsa              is distinct from old.postal_fsa
      or new.lat                     is distinct from old.lat
      or new.lng                     is distinct from old.lng
    ) then
      new.status := 'in_review';
    end if;
  end if;

  return new;
end;
$function$;

-- Photos of a sold listing can't be added, changed or removed by the owner.
create or replace function public.rereview_on_photo_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _listing uuid := coalesce(new.listing_id, old.listing_id);
begin
  if auth.uid() is null or public.is_admin() then
    return coalesce(new, old);
  end if;
  if exists (select 1 from public.listings where id = _listing and status = 'sold') then
    raise exception 'This home is marked sold, so its photos can no longer be changed.';
  end if;
  if tg_op = 'UPDATE'
     and new.url is not distinct from old.url
     and new.caption is not distinct from old.caption then
    return new; -- reordering or picking a new cover doesn't need review
  end if;
  update public.listings set status = 'in_review'
  where id = _listing and status in ('live', 'paused');
  return coalesce(new, old);
end;
$function$;
revoke execute on function public.rereview_on_photo_change() from public, anon, authenticated;

-- "Recently sold": never a listing on admin hold, never one that was never public
create or replace function public.recently_sold()
returns table (
  id uuid,
  headline text,
  property_type text,
  neighborhood text,
  city text,
  province text,
  bedrooms integer,
  bathrooms numeric,
  sqft integer,
  price numeric,
  sold_at timestamptz,
  photo_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.headline, l.property_type::text, l.neighborhood, l.city, l.province,
         l.bedrooms, l.bathrooms, l.sqft, l.price, l.sold_at,
         (select coalesce(p.thumbnail_url, p.url) from public.listing_photos p
           where p.listing_id = l.id order by p.is_cover desc, p.sort_order limit 1)
  from public.listings l
  where l.status = 'sold'
    and l.show_as_sold
    and not l.admin_hold
    and l.payment_status <> 'unpaid'
    and l.sold_at > now() - interval '90 days'
    and l.sold_at <= now()
  order by l.sold_at desc
  limit 3;
$$;
revoke execute on function public.recently_sold() from public;
grant execute on function public.recently_sold() to anon, authenticated;

-- Trigger function, not meant to be called directly
revoke execute on function public.stamp_sold_at() from public, anon, authenticated;
