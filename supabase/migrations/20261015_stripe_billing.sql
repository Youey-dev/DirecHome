-- ==============================================================================
-- DirectHome BC — Migration 006: Stripe billing ($25 CAD / month per listing)
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 005).
--
--   1. A listing is visible to buyers ONLY while its payment is active.
--      If a payment fails, it stays visible for 1 day, then hides itself.
--   2. If an owner cancels, it stays up until the end of the paid month.
--   3. Billing status is set only by the Stripe webhook, never by users.
--   4. Owners are notified of failed / successful payments and take-downs.
--
-- Existing listings marked 'complimentary_launch' stay visible (your test data).
-- One transaction. Safe to run twice.
-- ==============================================================================

begin;

alter table public.listings add column if not exists past_due_since timestamptz;
alter table public.listings add column if not exists cancel_at_period_end boolean not null default false;
alter table public.listings alter column payment_status set default 'unpaid';

-- Private Stripe ids (not readable by the public site; owners can read their own row)
create table if not exists public.listing_billing (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  updated_at timestamptz not null default now()
);
create index if not exists idx_listing_billing_user on public.listing_billing(user_id);
alter table public.listing_billing enable row level security;
drop policy if exists "billing_select_own" on public.listing_billing;
create policy "billing_select_own" on public.listing_billing for select using (user_id = auth.uid());
revoke all on public.listing_billing from anon, authenticated;
grant select on public.listing_billing to authenticated;
grant all on public.listing_billing to service_role;

-- The one rule that decides "can buyers see this listing?"
create or replace function public.listing_is_public(_status public.listing_status, _payment text, _past_due_since timestamptz)
returns boolean
language sql
stable
as $$
  select _status = 'live'
     and (
       _payment in ('active', 'complimentary_launch')
       or (_payment = 'past_due' and _past_due_since is not null and _past_due_since > now() - interval '1 day')
     );
$$;
grant execute on function public.listing_is_public(public.listing_status, text, timestamptz) to anon, authenticated;

drop policy if exists "listings_select" on public.listings;
create policy "listings_select"
  on public.listings for select
  using (
    public.listing_is_public(status, payment_status, past_due_since)
    or user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "photos_select" on public.listing_photos;
create policy "photos_select"
  on public.listing_photos for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and (public.listing_is_public(l.status, l.payment_status, l.past_due_since)
             or l.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert"
  on public.conversations for insert
  with check (
    buyer_id = auth.uid()
    and buyer_id <> seller_id
    and exists (
      select 1 from public.listings l
      where l.id = conversations.listing_id
        and public.listing_is_public(l.status, l.payment_status, l.past_due_since)
        and l.user_id = conversations.seller_id
    )
  );

drop policy if exists "viewings_insert" on public.viewing_requests;
create policy "viewings_insert"
  on public.viewing_requests for insert
  with check (
    buyer_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.listings l
      where l.id = viewing_requests.listing_id
        and public.listing_is_public(l.status, l.payment_status, l.past_due_since)
        and l.user_id <> auth.uid()
    )
  );

create or replace function public.increment_listing_views(_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings set views_count = views_count + 1
  where id = _listing_id and public.listing_is_public(status, payment_status, past_due_since);
$$;
grant execute on function public.increment_listing_views(uuid) to anon, authenticated;

-- Users can never set billing fields themselves; new listings start 'unpaid'
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

  -- Skip the rules below for SQL Editor work (no logged-in user) and for
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
        raise exception 'Sellers cannot change a listing from % to %. Only the compliance team can do that.',
          old.status, new.status;
      end if;

      if new.status = 'in_review' and not exists (
        select 1 from public.verifications v
        where v.listing_id = new.id and v.status in ('pending', 'verified')
      ) then
        raise exception 'Upload your ownership document before submitting for review.';
      end if;
    end if;
  end if;

  -- Applies to everyone coming through the app, admins included
  if new.status = 'live' and old.status is distinct from 'live' and not exists (
    select 1 from public.verifications v
    where v.listing_id = new.id and v.status = 'verified'
  ) then
    raise exception 'A listing cannot go live without a verified ownership document.';
  end if;

  return new;
end;
$$;

-- Owner notifications for billing events
create or replace function public.notify_listing_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status is not distinct from old.payment_status
     and new.cancel_at_period_end is not distinct from old.cancel_at_period_end then
    return new;
  end if;

  if new.payment_status = 'past_due' and old.payment_status is distinct from 'past_due' then
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (new.user_id, 'payment_failed', 'Payment failed',
      'We could not charge your card for "' || new.headline || '". Update your payment method within 24 hours or the listing will be hidden from buyers.', new.id);
  elsif new.payment_status = 'active' and old.payment_status in ('unpaid', 'canceled', 'past_due') then
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (new.user_id, 'payment_active', 'Payment received',
      '"' || new.headline || '" is now visible to buyers.', new.id);
  elsif new.payment_status = 'canceled' and old.payment_status is distinct from 'canceled' then
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (new.user_id, 'subscription_ended', 'Your listing was taken down',
      '"' || new.headline || '" is no longer visible because the subscription ended. You can reactivate it any time from your dashboard.', new.id);
  elsif new.cancel_at_period_end and not old.cancel_at_period_end then
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (new.user_id, 'subscription_cancelling', 'Subscription cancelled',
      '"' || new.headline || '" will stay live until the end of the month you paid for, then come down.', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_listing_payment on public.listings;
create trigger trg_notify_listing_payment
  after update on public.listings
  for each row execute function public.notify_listing_payment();

-- "Approved" message now tells unpaid owners to activate
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
        '"' || new.headline || '" passed ownership verification and is now visible to buyers.', new.id);
    else
      insert into public.notifications (user_id, type, title, body, listing_id)
      values (new.user_id, 'listing_live', 'Approved: activate your listing',
        '"' || new.headline || '" passed ownership verification. Open your dashboard and tap "Activate listing" to publish it to buyers.', new.id);
    end if;

  elsif new.status = 'rejected' then
    select rejection_reason into _reason
    from public.verifications
    where listing_id = new.id and status = 'rejected'
    order by updated_at desc limit 1;
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (new.user_id, 'listing_rejected', 'Your listing needs changes',
      '"' || new.headline || '": ' || coalesce(_reason, 'Please review your ownership document and resubmit.'), new.id);

  elsif new.status = 'in_review' then
    insert into public.notifications (user_id, type, title, body, listing_id)
    select u.id, 'listing_in_review', 'New listing awaiting verification',
      '"' || new.headline || '" in ' || new.city || ' is ready for ownership review.', new.id
    from public.users u where u.role = 'admin';
  end if;
  return new;
end;
$$;

commit;
