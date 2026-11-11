-- ==============================================================================
-- Promotions: free months without setting anything up in Stripe
-- ==============================================================================
-- * The admin creates promo codes (e.g. SPRING3 = 3 months free). A seller types the code on
--   their dashboard:
--     - "No card" codes make the listing live straight away, free until a set date
--       (payment_status 'complimentary_launch' + complimentary_until).
--     - "Card required" codes send the seller to Stripe checkout with a free trial
--       (create-checkout reads the code; Stripe charges nothing until the trial ends).
-- * The admin can also give one listing N free months from the admin console.
-- * Every hour, free periods that end within 7 days get one reminder (bell + email), and
--   ended ones go back to 'unpaid': the listing is hidden (never deleted) and the seller sees
--   "Activate listing" again.
-- * complimentary_until NULL on a 'complimentary_launch' listing = the old free listings with
--   no end date. They are left exactly as they are.
--
-- Safe to apply before the website that uses it is published: the current website never asks
-- for the new columns or functions, and my_listing_private_fields only gains a column.

-- ---------------------------------------------------------------------------
-- Listing columns
-- ---------------------------------------------------------------------------
alter table public.listings add column if not exists complimentary_until timestamptz;
alter table public.listings add column if not exists free_end_reminder_at timestamptz;

-- Only admins (and server work) may change them. Signed-in users have table-wide UPDATE on
-- listings, so the guard lives in the trigger, like the other billing columns.
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
  -- ...and for the one update redeem_promo makes on the seller's behalf (it sets this flag for
  -- that statement only; website visitors have no way to set it).
  if coalesce(current_setting('app.server_billing', true), '') = 'on' then
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
      new.complimentary_until := null;
      new.free_end_reminder_at := null;
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
    new.complimentary_until := old.complimentary_until;
    new.free_end_reminder_at := old.free_end_reminder_at;
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

-- The owner's dashboard (and the admin console) read the end date with the other private fields
drop function if exists public.my_listing_private_fields();
create function public.my_listing_private_fields()
returns table(id uuid, payment_status text, past_due_since timestamptz, cancel_at_period_end boolean,
              next_billing_at timestamptz, subscription_tier text, billing_cycle text,
              monthly_fee_cad numeric, review_notes text, complimentary_until timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select l.id, l.payment_status, l.past_due_since, l.cancel_at_period_end, l.next_billing_at,
         l.subscription_tier, l.billing_cycle, l.monthly_fee_cad, l.review_notes, l.complimentary_until
  from public.listings l
  where l.user_id = auth.uid() or public.is_admin();
$$;
revoke execute on function public.my_listing_private_fields() from public, anon;
grant execute on function public.my_listing_private_fields() to authenticated;

-- ---------------------------------------------------------------------------
-- Promo codes and who used them
-- ---------------------------------------------------------------------------
create table if not exists public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{3,30}$'),
  free_months integer not null check (free_months between 1 and 24),
  card_required boolean not null default false,
  max_uses integer check (max_uses is null or max_uses > 0),
  valid_until date,
  active boolean not null default true,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.promo_codes(code) on update cascade,
  listing_id uuid not null unique references public.listings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  free_until timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists promo_redemptions_code_idx on public.promo_redemptions(code);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

drop policy if exists promo_codes_admin on public.promo_codes;
create policy promo_codes_admin on public.promo_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists promo_redemptions_read on public.promo_redemptions;
create policy promo_redemptions_read on public.promo_redemptions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

revoke all on public.promo_codes, public.promo_redemptions from anon;
grant select, insert, update on public.promo_codes to authenticated;  -- admins only (policy)
grant select on public.promo_redemptions to authenticated;             -- written by redeem_promo

-- ---------------------------------------------------------------------------
-- The code check shared by the dashboard (redeem_promo) and checkout (create-checkout)
-- Returns the code's free months and whether a card is needed, or raises a plain message.
-- ---------------------------------------------------------------------------
create or replace function public.check_promo(_code text, _listing_id uuid)
returns table(code text, free_months integer, card_required boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  _p public.promo_codes;
  _used integer;
begin
  select * into _p from public.promo_codes p where p.code = upper(trim(_code));
  if _p.code is null or not _p.active then
    raise exception 'That promo code isn''t valid. Check the spelling and try again.';
  end if;
  if _p.valid_until is not null and current_date > _p.valid_until then
    raise exception 'That promo code has expired.';
  end if;
  -- One promo per listing. The only repeat allowed: checking out again with the same
  -- card-required code shortly after starting (closed the checkout tab, card declined...).
  if exists (
    select 1 from public.promo_redemptions r
     where r.listing_id = _listing_id
       and not (r.code = _p.code and _p.card_required and r.created_at > now() - interval '2 days')
  ) then
    raise exception 'This listing has already used a promo code.';
  end if;
  select count(*) into _used from public.promo_redemptions r
   where r.code = _p.code and r.listing_id <> _listing_id;
  if _p.max_uses is not null and _used >= _p.max_uses then
    raise exception 'That promo code has been fully used.';
  end if;
  return query select _p.code, _p.free_months, _p.card_required;
end;
$$;
revoke execute on function public.check_promo(text, uuid) from public, anon, authenticated;
-- (service role only: create-checkout)

-- ---------------------------------------------------------------------------
-- Seller: use a code on one of their listings
-- _apply = false only checks the code and says what it gives (the dashboard shows that first).
-- No-card code: the listing goes live for free right away. Card-required code: nothing changes
-- here; the dashboard then opens checkout with the code (create-checkout checks it again).
-- ---------------------------------------------------------------------------
create or replace function public.redeem_promo(_listing_id uuid, _code text, _apply boolean default true)
returns table(code text, free_months integer, card_required boolean, free_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  _me uuid := auth.uid();
  _l public.listings;
  _c record;
  _until timestamptz;
begin
  if _me is null then
    raise exception 'Please sign in first.';
  end if;
  select * into _l from public.listings where id = _listing_id and user_id = _me for update;
  if _l.id is null then
    raise exception 'Listing not found.';
  end if;
  if _l.status not in ('live', 'paused') then
    raise exception 'Your listing must be approved by our review team before you can use a promo code.';
  end if;
  if _l.payment_status not in ('unpaid', 'canceled') then
    raise exception 'This listing is already active, so a promo code can''t be added to it.';
  end if;

  select * into _c from public.check_promo(_code, _listing_id);
  _until := now() + make_interval(months => _c.free_months);

  if _c.card_required or not _apply then
    return query select _c.code, _c.free_months, _c.card_required, _until;
    return;
  end if;

  -- Billing columns are locked for sellers (protect_listing_fields): this flag lets this one
  -- update through, then it is switched off again.
  perform set_config('app.server_billing', 'on', true);
  update public.listings
     set payment_status = 'complimentary_launch',
         past_due_since = null,
         complimentary_until = _until,
         free_end_reminder_at = null
   where id = _listing_id;
  perform set_config('app.server_billing', 'off', true);

  insert into public.promo_redemptions (code, listing_id, user_id, free_until)
  values (_c.code, _listing_id, _me, _until)
  on conflict (listing_id) do update set code = excluded.code, free_until = excluded.free_until, created_at = now();

  insert into public.notifications (user_id, type, title, body, listing_id)
  values (_me, 'promo_applied', 'Your listing is live for free',
    '"' || _l.headline || '" is now visible to buyers, free until ' || to_char(_until at time zone 'America/Toronto', 'FMMonth FMDD, YYYY')
    || '. We''ll remind you a week before the free period ends. No card is needed.', _listing_id);

  return query select _c.code, _c.free_months, false, _until;
end;
$$;
revoke execute on function public.redeem_promo(uuid, text, boolean) from public, anon;
grant execute on function public.redeem_promo(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: give one listing N free months (or end its free period with _months = 0)
-- ---------------------------------------------------------------------------
create or replace function public.admin_give_free_months(_listing_id uuid, _months integer)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  _l public.listings;
  _until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only the OwnersMarket team can do this.';
  end if;
  if _months is null or _months < 0 or _months > 24 then
    raise exception 'Choose between 1 and 24 months.';
  end if;
  select * into _l from public.listings where id = _listing_id for update;
  if _l.id is null then
    raise exception 'Listing not found.';
  end if;

  if _months = 0 then
    if _l.payment_status <> 'complimentary_launch' then
      raise exception 'This listing isn''t a free listing any more.';
    end if;
    update public.listings set payment_status = 'unpaid', complimentary_until = null, free_end_reminder_at = null
     where id = _listing_id;
    return null;
  end if;

  if _l.payment_status not in ('unpaid', 'canceled', 'complimentary_launch') then
    raise exception 'This listing already has billing set up, so it can''t be made free.';
  end if;
  _until := now() + make_interval(months => _months);
  update public.listings
     set payment_status = 'complimentary_launch', past_due_since = null,
         complimentary_until = _until, free_end_reminder_at = null
   where id = _listing_id;

  insert into public.notifications (user_id, type, title, body, listing_id)
  values (_l.user_id, 'promo_applied', 'Your listing is live for free',
    'OwnersMarket gave "' || _l.headline || '" ' || _months || case when _months = 1 then ' month' else ' months' end
    || ' free, until ' || to_char(_until at time zone 'America/Toronto', 'FMMonth FMDD, YYYY')
    || '. We''ll remind you a week before it ends. No card is needed.', _listing_id);
  return _until;
end;
$$;
revoke execute on function public.admin_give_free_months(uuid, integer) from public, anon;
grant execute on function public.admin_give_free_months(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Hourly: remind 7 days before a free period ends, and end it when it's over
-- ---------------------------------------------------------------------------
create or replace function public.process_free_periods()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _l record;
  _n integer := 0;
begin
  -- Reminder, once per free period
  for _l in
    select id, user_id, headline, complimentary_until from public.listings
     where payment_status = 'complimentary_launch'
       and complimentary_until is not null
       and complimentary_until > now()
       and complimentary_until <= now() + interval '7 days'
       and free_end_reminder_at is null
  loop
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (_l.user_id, 'free_period_ending', 'Your free period ends soon',
      'The free period for "' || _l.headline || '" ends on '
      || to_char(_l.complimentary_until at time zone 'America/Toronto', 'FMMonth FMDD, YYYY')
      || '. To keep it up after that, open your dashboard and tap "Activate listing" ($24.99 a month, cancel any time). You won''t be charged before the free period ends. If you do nothing, the listing is hidden from buyers but not deleted.',
      _l.id);
    update public.listings set free_end_reminder_at = now() where id = _l.id;
    _n := _n + 1;
  end loop;

  -- Free period over: hide the listing (status stays as it is; nothing is deleted)
  for _l in
    select id, user_id, headline from public.listings
     where payment_status = 'complimentary_launch'
       and complimentary_until is not null
       and complimentary_until <= now()
  loop
    update public.listings set payment_status = 'unpaid' where id = _l.id;
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (_l.user_id, 'free_period_ended', 'Your free period has ended',
      '"' || _l.headline || '" is now hidden from buyers. It hasn''t been deleted: open your dashboard and tap "Activate listing" to put it back up ($24.99 a month, cancel any time).',
      _l.id);
    _n := _n + 1;
  end loop;
  return _n;
end;
$$;
revoke execute on function public.process_free_periods() from public, anon, authenticated;

select cron.unschedule('free-periods') where exists (select 1 from cron.job where jobname = 'free-periods');
select cron.schedule('free-periods', '20 * * * *', 'select public.process_free_periods();');
