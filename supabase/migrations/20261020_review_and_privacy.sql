-- ==============================================================================
-- OwnersMarket — Migration 011: Re-review on edits, contact privacy, Quebec rule
-- Run ONCE in Supabase Dashboard -> SQL Editor, AFTER migration 010 and AFTER the
-- matching website update (and the create-checkout function) are published.
-- Safe to run twice. One transaction.
--
--   1. Approved listings go back to review when the owner changes the text, photos
--      or address (hidden from buyers until approved again). Price and home details
--      (beds, baths, size, taxes, cash-back...) still update straight away.
--   2. People in a conversation see each other's NAME only, never email or phone.
--   3. The database refuses Quebec listings (province QC, postal codes G, H, J).
--   4. Billing and review-note fields of listings are no longer readable by the
--      public; owners and admins read them through my_listing_private_fields().
--   5. Once a viewing is confirmed, the buyer can't change its date, time or notes.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Re-review when an approved listing's text, photos or address change
-- ------------------------------------------------------------------------------
create or replace function public.protect_listing_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _is_admin boolean;
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
    end if;
    return new;
  end if;

  -- UPDATE
  if not _is_admin then
    new.user_id := old.user_id;
    new.subscription_tier := old.subscription_tier;
    new.monthly_fee_cad := old.monthly_fee_cad;
    new.billing_cycle := old.billing_cycle;
    new.next_billing_at := old.next_billing_at;
    new.payment_status := old.payment_status;
    new.past_due_since := old.past_due_since;
    new.cancel_at_period_end := old.cancel_at_period_end;
    new.review_notes := old.review_notes;
    new.views_count := old.views_count;
    new.saves_count := old.saves_count;
    new.inquiries_count := old.inquiries_count;

    if new.status is distinct from old.status then
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

    -- An approved listing whose words or location change goes back to review.
    -- Price, rooms, size, year, parking, fees, taxes and cash-back don't need it.
    if old.status in ('live', 'paused') and new.status = old.status and (
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
$$;

-- Photos added, removed, replaced or re-captioned on an approved listing -> review
create or replace function public.rereview_on_photo_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _listing uuid := coalesce(new.listing_id, old.listing_id);
begin
  if auth.uid() is null or public.is_admin() then
    return coalesce(new, old);
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
$$;

drop trigger if exists trg_rereview_on_photo_change on public.listing_photos;
create trigger trg_rereview_on_photo_change
  after insert or update or delete on public.listing_photos
  for each row execute function public.rereview_on_photo_change();

-- Street address, unit or postal code changed on an approved listing -> review
create or replace function public.rereview_on_address_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.street_address is distinct from old.street_address
     or new.unit_number is distinct from old.unit_number
     or upper(replace(new.postal_code, ' ', '')) is distinct from upper(replace(old.postal_code, ' ', '')) then
    update public.listings set status = 'in_review'
    where id = new.listing_id and status in ('live', 'paused');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rereview_on_address_change on public.listing_private_details;
create trigger trg_rereview_on_address_change
  after update on public.listing_private_details
  for each row execute function public.rereview_on_address_change();

-- Tell the owner (as well as the admins) when edits send a listing back to review
create or replace function public.notify_listing_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _reason text;
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'live' and old.status = 'in_review' then
    if new.payment_status in ('active', 'complimentary_launch') then
      insert into public.notifications (user_id, type, title, body, listing_id)
      values (new.user_id, 'listing_live', 'Your listing is live',
        '"' || new.headline || '" was approved and is now visible to buyers.', new.id);
    else
      insert into public.notifications (user_id, type, title, body, listing_id)
      values (new.user_id, 'listing_live', 'Approved: activate your listing',
        '"' || new.headline || '" was approved. Open your dashboard and tap "Activate listing" to publish it to buyers.', new.id);
    end if;

  elsif new.status = 'rejected' then
    _reason := new.review_notes;
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (new.user_id, 'listing_rejected', 'Your listing needs changes',
      '"' || new.headline || '": ' || coalesce(_reason, 'Please review your listing and resubmit.'), new.id);

  elsif new.status = 'in_review' then
    insert into public.notifications (user_id, type, title, body, listing_id)
    select u.id, 'listing_in_review',
      case when old.status in ('live', 'paused') then 'Edited listing awaiting review' else 'New listing awaiting review' end,
      '"' || new.headline || '" in ' || new.city || ' is waiting for review.', new.id
    from public.users u where u.role = 'admin';

    if old.status in ('live', 'paused') then
      insert into public.notifications (user_id, type, title, body, listing_id)
      values (new.user_id, 'listing_rereview', 'Your changes are being reviewed',
        '"' || new.headline || '" is hidden from buyers until we approve your changes, usually within 1 business day.', new.id);
    end if;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. Names only between people who talk to each other
-- ------------------------------------------------------------------------------
drop policy if exists "users_select_self_counterparty_admin" on public.users;
drop policy if exists "users_select_self_admin" on public.users;
create policy "users_select_self_admin"
  on public.users for select
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Display names of people you share a conversation or a viewing request with
create or replace function public.people_names(_ids uuid[])
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.full_name
  from public.users u
  where u.id = any(_ids)
    and (
      u.id = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.conversations c
        where (c.buyer_id = auth.uid() and c.seller_id = u.id)
           or (c.seller_id = auth.uid() and c.buyer_id = u.id)
      )
      or exists (
        select 1 from public.viewing_requests v
        join public.listings l on l.id = v.listing_id
        where (v.buyer_id = auth.uid() and l.user_id = u.id)
           or (l.user_id = auth.uid() and v.buyer_id = u.id)
      )
    );
$$;
revoke execute on function public.people_names(uuid[]) from public, anon;
grant execute on function public.people_names(uuid[]) to authenticated;

-- ------------------------------------------------------------------------------
-- 3. No Quebec listings until the French site and the Law 25 assessment are done
-- ------------------------------------------------------------------------------
alter table public.listings drop constraint if exists listing_province_open;
alter table public.listings add constraint listing_province_open
  check (province in ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'SK', 'YT'));

alter table public.listings drop constraint if exists listing_fsa_not_quebec;
alter table public.listings add constraint listing_fsa_not_quebec
  check (postal_fsa is null or upper(left(postal_fsa, 1)) not in ('G', 'H', 'J'));

alter table public.listing_private_details drop constraint if exists private_postal_not_quebec;
alter table public.listing_private_details add constraint private_postal_not_quebec
  check (upper(left(trim(postal_code), 1)) not in ('G', 'H', 'J'));

-- ------------------------------------------------------------------------------
-- 4. Billing and review fields: owners and admins only
-- ------------------------------------------------------------------------------
-- Rules on OTHER tables can't read the hidden columns any more, so they ask this instead
create or replace function public.listing_id_is_public(_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.id = _listing_id
      and public.listing_is_public(l.status, l.payment_status, l.past_due_since)
  );
$$;
revoke execute on function public.listing_id_is_public(uuid) from public;
grant execute on function public.listing_id_is_public(uuid) to anon, authenticated;

drop policy if exists "photos_select" on public.listing_photos;
create policy "photos_select"
  on public.listing_photos for select
  using (
    public.listing_id_is_public(listing_photos.listing_id)
    or exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and (l.user_id = (select auth.uid()) or (select public.is_admin()))
    )
  );

drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert"
  on public.conversations for insert
  with check (
    buyer_id = (select auth.uid())
    and buyer_id <> seller_id
    and public.listing_id_is_public(conversations.listing_id)
    and exists (
      select 1 from public.listings l
      where l.id = conversations.listing_id and l.user_id = conversations.seller_id
    )
  );

drop policy if exists "viewings_insert" on public.viewing_requests;
create policy "viewings_insert"
  on public.viewing_requests for insert
  with check (
    buyer_id = (select auth.uid())
    and status = 'pending'
    and public.listing_id_is_public(viewing_requests.listing_id)
    and exists (
      select 1 from public.listings l
      where l.id = viewing_requests.listing_id and l.user_id <> (select auth.uid())
    )
  );

revoke select on public.listings from anon, authenticated;
grant select (
  id, user_id, status, city, province, neighborhood, postal_fsa, lat, lng,
  property_type, price, bedrooms, bathrooms, sqft, lot_sqft, lot_acres, year_built,
  parking_spaces, strata_fee, property_taxes_annual,
  offers_cashback, cashback_type, cashback_amount, estimated_commission_saved,
  headline, description, neighborhood_highlights, recent_upgrades, inclusions,
  views_count, saves_count, inquiries_count, created_at, updated_at
) on public.listings to anon, authenticated;

-- The hidden fields, for the owner's own listings (admins: every listing)
create or replace function public.my_listing_private_fields()
returns table (
  id uuid,
  payment_status text,
  past_due_since timestamptz,
  cancel_at_period_end boolean,
  next_billing_at timestamptz,
  subscription_tier text,
  billing_cycle text,
  monthly_fee_cad numeric,
  review_notes text
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.payment_status, l.past_due_since, l.cancel_at_period_end, l.next_billing_at,
         l.subscription_tier, l.billing_cycle, l.monthly_fee_cad, l.review_notes
  from public.listings l
  where l.user_id = auth.uid() or public.is_admin();
$$;
revoke execute on function public.my_listing_private_fields() from public, anon;
grant execute on function public.my_listing_private_fields() to authenticated;

-- ------------------------------------------------------------------------------
-- 5. Confirmed viewings: the buyer can't move them afterwards
-- ------------------------------------------------------------------------------
create or replace function public.guard_viewing_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _is_owner boolean;
begin
  new.updated_at := now();
  if auth.uid() is null then
    return new;
  end if;

  new.listing_id := old.listing_id;
  new.buyer_id := old.buyer_id;
  new.buyer_name := old.buyer_name;
  new.buyer_email := old.buyer_email;
  new.buyer_phone := old.buyer_phone;

  _is_owner := exists (
    select 1 from public.listings l
    where l.id = new.listing_id and l.user_id = auth.uid()
  );

  if not (_is_owner or public.is_admin()) then
    -- A buyer can cancel (decline) but can never confirm their own viewing
    if new.status is distinct from old.status and new.status <> 'declined' then
      raise exception 'Only the homeowner can confirm or reschedule a viewing.';
    end if;
    -- ...and can't move a viewing the homeowner already confirmed
    if old.status = 'confirmed' then
      new.preferred_date := old.preferred_date;
      new.preferred_time_slot := old.preferred_time_slot;
      new.notes := old.notes;
    end if;
  end if;

  return new;
end;
$$;

-- Trigger functions are never called directly
revoke execute on function public.rereview_on_photo_change() from public, anon, authenticated;
revoke execute on function public.rereview_on_address_change() from public, anon, authenticated;

commit;
