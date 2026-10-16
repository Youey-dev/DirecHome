-- ==============================================================================
-- OwnersMarket — Migration 013: Admin console
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 012). Safe to run twice.
-- The website works before and after this runs. One transaction.
--
--   1. Admin pause ("hold"): an admin can pause any listing with a reason. The owner sees
--      the reason and can't put it back up themselves; only an admin can resume it.
--   2. Admin messages: an admin can message the owner of any listing (any status). These
--      conversations are marked as admin threads, and the owner sees them from
--      "Charles - Admin". They don't count as buyer inquiries and skip the buyer limits.
--   3. Notifications to the owner when an admin pauses or resumes their listing.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. Columns
-- ------------------------------------------------------------------------------
alter table public.listings add column if not exists admin_hold boolean not null default false;
alter table public.conversations add column if not exists is_admin_thread boolean not null default false;

-- Readable like the other listing columns (only matters on listings the person can see)
grant select (admin_hold) on public.listings to anon, authenticated;
grant update (admin_hold) on public.listings to authenticated;

-- Buyers can never start a conversation marked as coming from the admin
drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert"
  on public.conversations for insert
  with check (
    buyer_id = (select auth.uid())
    and buyer_id <> seller_id
    and not is_admin_thread
    and public.listing_id_is_public(conversations.listing_id)
    and exists (
      select 1 from public.listings l
      where l.id = conversations.listing_id and l.user_id = conversations.seller_id
    )
  );

-- ------------------------------------------------------------------------------
-- 2. Listing rules: sellers can't lift an admin hold
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
      new.admin_hold := false;
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

    -- An approved listing whose words or location change goes back to review.
    -- Price, rooms, size, year, parking, fees, taxes and cash-back don't need it.
    -- (A listing on admin hold stays paused; the admin reviews it when lifting the hold.)
    if old.status in ('live', 'paused') and new.status = old.status and not old.admin_hold and (
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

-- ------------------------------------------------------------------------------
-- 3. Tell the owner when an admin pauses or resumes their listing
-- ------------------------------------------------------------------------------
create or replace function public.notify_listing_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _reason text;
begin
  -- Admin hold placed or lifted
  if new.admin_hold and not old.admin_hold then
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (new.user_id, 'listing_paused_admin', 'OwnersMarket paused your listing',
      '"' || new.headline || '": ' || coalesce(new.review_notes, 'Please message us from your dashboard.'), new.id);
    return new;
  elsif old.admin_hold and not new.admin_hold and new.status = 'live' then
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (new.user_id, 'listing_live', 'Your listing is back up',
      '"' || new.headline || '" is visible to buyers again.', new.id);
    return new;
  end if;

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
-- 4. Admin messages
-- ------------------------------------------------------------------------------
-- Starts (or reopens) the admin's conversation with the owner of a listing, any status.
create or replace function public.admin_start_conversation(_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _seller uuid;
  _id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can do this.';
  end if;
  select user_id into _seller from public.listings where id = _listing_id;
  if _seller is null then
    raise exception 'Listing not found.';
  end if;
  if _seller = auth.uid() then
    raise exception 'This is your own listing.';
  end if;

  select id into _id from public.conversations where listing_id = _listing_id and buyer_id = auth.uid();
  if _id is null then
    insert into public.conversations (listing_id, buyer_id, seller_id, is_admin_thread)
    values (_listing_id, auth.uid(), _seller, true)
    returning id into _id;
  else
    update public.conversations set is_admin_thread = true where id = _id;
  end if;
  return _id;
end;
$$;
revoke execute on function public.admin_start_conversation(uuid) from public, anon;
grant execute on function public.admin_start_conversation(uuid) to authenticated;

-- Admin threads skip the buyer limit of 5 new conversations an hour
create or replace function public.limit_new_conversations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin_thread then
    return new;
  end if;
  if (select count(*) from public.conversations
      where buyer_id = new.buyer_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You can start up to 5 new conversations per hour. Please try again later.';
  end if;
  return new;
end;
$$;

-- Admin threads aren't buyer inquiries
create or replace function public.bump_listing_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'favourites' then
    if tg_op = 'INSERT' then
      update public.listings set saves_count = saves_count + 1 where id = new.listing_id;
    else
      update public.listings set saves_count = greatest(0, saves_count - 1) where id = old.listing_id;
    end if;
  else
    if tg_table_name = 'conversations' then
      if new.is_admin_thread then
        return null;
      end if;
    end if;
    update public.listings set inquiries_count = inquiries_count + 1 where id = new.listing_id;
  end if;
  return null;
end;
$$;

-- Messages from the admin in an admin thread are sent as "Charles - Admin"
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _c record;
  _recipient uuid;
  _sender text;
  _headline text;
begin
  select buyer_id, seller_id, listing_id, is_admin_thread into _c
  from public.conversations where id = new.conversation_id;
  if not found then return new; end if;

  _recipient := case when new.sender_id = _c.buyer_id then _c.seller_id else _c.buyer_id end;
  if _recipient is null or _recipient = new.sender_id then return new; end if;

  if _c.is_admin_thread and new.sender_id = _c.buyer_id then
    _sender := 'Charles - Admin';
  else
    select coalesce(full_name, 'Someone') into _sender from public.users where id = new.sender_id;
  end if;
  select headline into _headline from public.listings where id = _c.listing_id;

  update public.notifications
  set title = 'New message from ' || _sender,
      body = 'About "' || coalesce(_headline, 'a home') || '": ' || left(new.content, 100),
      created_at = now()
  where user_id = _recipient
    and conversation_id = new.conversation_id
    and type = 'new_message'
    and read_at is null;

  if not found then
    insert into public.notifications (user_id, type, title, body, listing_id, conversation_id)
    values (
      _recipient,
      'new_message',
      'New message from ' || _sender,
      'About "' || coalesce(_headline, 'a home') || '": ' || left(new.content, 100),
      _c.listing_id,
      new.conversation_id
    );
  end if;
  return new;
end;
$$;

-- Trigger functions stay locked (migration 009)
revoke execute on function public.protect_listing_fields() from public, anon, authenticated;
revoke execute on function public.notify_listing_status() from public, anon, authenticated;
revoke execute on function public.limit_new_conversations() from public, anon, authenticated;
revoke execute on function public.bump_listing_counter() from public, anon, authenticated;
revoke execute on function public.notify_new_message() from public, anon, authenticated;

commit;
