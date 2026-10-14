-- ==============================================================================
-- DirectHome BC — Migration 005: One account type + notifications
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 004).
--
-- What this does:
--   1. One kind of account: anyone signed in can browse, message, request viewings
--      AND list their own home. (Admin stays separate and can only be granted by you.)
--   2. Notifications, created automatically by the database so they cannot be missed:
--        - a new message arrives
--        - a viewing is requested / confirmed / declined / cancelled
--        - your listing goes live or needs changes
--        - (admins) a listing is waiting for review, or a report was filed
--
-- Runs as one transaction: if anything fails, nothing is changed. Safe to run twice.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. ONE ACCOUNT TYPE
-- ------------------------------------------------------------------------------
drop policy if exists "listings_insert" on public.listings;
create policy "listings_insert"
  on public.listings for insert
  with check (user_id = auth.uid());

-- New sign-ups are all the same kind of member. The role can still never be admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _terms text := nullif(trim(new.raw_user_meta_data->>'terms_version'), '');
begin
  insert into public.users (id, email, full_name, phone, role, terms_accepted_at, terms_version)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    'buyer'::public.user_role,
    case when _terms is not null then now() end,
    _terms
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  listing_id uuid references public.listings(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  viewing_id uuid references public.viewing_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_user_recent
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- People can read their notifications and mark them read. Only the database creates them.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- ------------------------------------------------------------------------------
-- 3. NOTIFICATION TRIGGERS
-- ------------------------------------------------------------------------------

-- 3a. A new message -> notify the other person in the conversation.
--     Several unread messages in one conversation collapse into one notification.
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
  select buyer_id, seller_id, listing_id into _c
  from public.conversations where id = new.conversation_id;
  if not found then return new; end if;

  _recipient := case when new.sender_id = _c.buyer_id then _c.seller_id else _c.buyer_id end;
  if _recipient is null or _recipient = new.sender_id then return new; end if;

  select coalesce(full_name, 'Someone') into _sender from public.users where id = new.sender_id;
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

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- 3b. A viewing is requested -> notify the homeowner.
create or replace function public.notify_viewing_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner uuid;
  _headline text;
begin
  select user_id, headline into _owner, _headline from public.listings where id = new.listing_id;
  if _owner is null then return new; end if;

  insert into public.notifications (user_id, type, title, body, listing_id, viewing_id)
  values (
    _owner,
    'viewing_requested',
    'New viewing request',
    new.buyer_name || ' would like to view "' || coalesce(_headline, 'your home') || '" on '
      || to_char(new.preferred_date, 'Mon DD, YYYY') || ' (' || new.preferred_time_slot::text || ').',
    new.listing_id,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_viewing_requested on public.viewing_requests;
create trigger trg_notify_viewing_requested
  after insert on public.viewing_requests
  for each row execute function public.notify_viewing_requested();

-- 3c. A viewing changes status -> notify the buyer (confirmed / declined / rescheduled),
--     or the homeowner if the buyer cancelled.
create or replace function public.notify_viewing_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _owner uuid;
  _headline text;
  _when text;
begin
  if new.status is not distinct from old.status then return new; end if;

  select user_id, headline into _owner, _headline from public.listings where id = new.listing_id;
  _when := to_char(new.preferred_date, 'Mon DD, YYYY');

  if auth.uid() is not null and auth.uid() = new.buyer_id then
    if new.status = 'declined' and _owner is not null then
      insert into public.notifications (user_id, type, title, body, listing_id, viewing_id)
      values (_owner, 'viewing_cancelled', 'Viewing request cancelled',
        new.buyer_name || ' cancelled their viewing of "' || coalesce(_headline, 'your home') || '" on ' || _when || '.',
        new.listing_id, new.id);
    end if;
    return new;
  end if;

  if new.status = 'confirmed' then
    insert into public.notifications (user_id, type, title, body, listing_id, viewing_id)
    values (new.buyer_id, 'viewing_confirmed', 'Your viewing was confirmed',
      'The homeowner confirmed your viewing of "' || coalesce(_headline, 'the home') || '" on ' || _when
        || '. The exact address is now shown on the listing page.',
      new.listing_id, new.id);
  elsif new.status = 'declined' then
    insert into public.notifications (user_id, type, title, body, listing_id, viewing_id)
    values (new.buyer_id, 'viewing_declined', 'Your viewing request was declined',
      'The homeowner could not accommodate your request for "' || coalesce(_headline, 'the home') || '" on '
        || _when || '. You are welcome to request another time or send a message.',
      new.listing_id, new.id);
  elsif new.status = 'rescheduled' then
    insert into public.notifications (user_id, type, title, body, listing_id, viewing_id)
    values (new.buyer_id, 'viewing_rescheduled', 'Your viewing request was updated',
      'The homeowner updated your request for "' || coalesce(_headline, 'the home') || '". Please check the details.',
      new.listing_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_viewing_status on public.viewing_requests;
create trigger trg_notify_viewing_status
  after update on public.viewing_requests
  for each row execute function public.notify_viewing_status();

-- 3d. Listing status changes -> tell the owner (live / needs changes), tell admins (waiting for review).
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
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (new.user_id, 'listing_live', 'Your listing is live',
      '"' || new.headline || '" passed ownership verification and is now visible to buyers.', new.id);

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

drop trigger if exists trg_notify_listing_status on public.listings;
create trigger trg_notify_listing_status
  after update on public.listings
  for each row execute function public.notify_listing_status();

-- 3e. A report is filed -> notify admins.
create or replace function public.notify_new_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _headline text;
begin
  select headline into _headline from public.listings where id = new.listing_id;
  insert into public.notifications (user_id, type, title, body, listing_id)
  select u.id, 'new_report', 'A listing was reported',
    '"' || coalesce(_headline, 'A listing') || '": ' || replace(new.reason::text, '_', ' '), new.listing_id
  from public.users u where u.role = 'admin';
  return new;
end;
$$;

drop trigger if exists trg_notify_new_report on public.reports;
create trigger trg_notify_new_report
  after insert on public.reports
  for each row execute function public.notify_new_report();

-- ------------------------------------------------------------------------------
-- 4. Opening a conversation also clears its notification
-- ------------------------------------------------------------------------------
create or replace function public.mark_conversation_read(_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages m
  set read_at = now()
  where m.conversation_id = _conversation_id
    and m.sender_id <> auth.uid()
    and m.read_at is null
    and exists (
      select 1 from public.conversations c
      where c.id = _conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    );

  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and conversation_id = _conversation_id
    and read_at is null;
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. Live updates: let the website hear about new notifications instantly
-- ------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;
