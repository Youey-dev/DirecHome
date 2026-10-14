-- ==============================================================================
-- DirectHome BC — Migration 002: Security Hardening
-- Run ONCE in Supabase Dashboard -> SQL Editor, AFTER 20261010_initial_schema.sql
--
-- What this does:
--   1. Makes admin access safe (roles come from the database, never from the browser)
--   2. Auto-creates a profile row for every new signup (always buyer or seller, never admin)
--   3. Hides exact street address until the owner confirms a viewing
--   4. Stops sellers approving their own listings or editing billing/counters
--   5. Adds server-side rate limits (messages, viewings, reports)
--   6. Creates the two storage buckets and their access rules
--
-- The whole script runs as one transaction: if anything fails, nothing is changed.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. HELPER: is the current user an admin? (reads the database, not the JWT)
-- ------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------------------------------------
-- 2. NEW-USER PROFILE TRIGGER (role can only ever be buyer or seller)
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    case when new.raw_user_meta_data->>'role' = 'seller'
         then 'seller'::public.user_role
         else 'buyer'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for anyone who signed up before this trigger existed
insert into public.users (id, email, full_name, phone, role)
select
  au.id,
  au.email,
  coalesce(nullif(trim(au.raw_user_meta_data->>'full_name'), ''), split_part(au.email, '@', 1)),
  nullif(trim(au.raw_user_meta_data->>'phone'), ''),
  case when au.raw_user_meta_data->>'role' = 'seller'
       then 'seller'::public.user_role
       else 'buyer'::public.user_role end
from auth.users au
on conflict (id) do nothing;

-- ------------------------------------------------------------------------------
-- 3. USERS: privacy + nobody can promote themselves to admin
-- ------------------------------------------------------------------------------
drop policy if exists "Users can view their own profile or public info" on public.users;
drop policy if exists "Users can update only their own profile" on public.users;

-- Previously EVERYONE (even logged-out visitors) could read every email and phone number.
drop policy if exists "users_select_self_counterparty_admin" on public.users;
create policy "users_select_self_counterparty_admin"
  on public.users for select
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.conversations c
      where (c.buyer_id = auth.uid() and c.seller_id = users.id)
         or (c.seller_id = auth.uid() and c.buyer_id = users.id)
    )
  );

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.guard_user_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is NULL when run from the Supabase SQL Editor, so you can still
  -- promote an admin by hand. From the app (API calls) it is never NULL.
  if auth.uid() is not null then
    new.id := old.id;
    new.email := old.email;
    if new.role is distinct from old.role
       and (new.role = 'admin' or old.role = 'admin') then
      raise exception 'Admin access cannot be changed from the app.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_user_changes on public.users;
create trigger trg_guard_user_changes
  before update on public.users
  for each row execute function public.guard_user_changes();

-- ------------------------------------------------------------------------------
-- 4. HIDE EXACT ADDRESS: move it to a protected table
-- ------------------------------------------------------------------------------
create table if not exists public.listing_private_details (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  street_address text not null check (char_length(street_address) between 3 and 200),
  unit_number text,
  postal_code text not null,
  exact_lat double precision,
  exact_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings add column if not exists postal_fsa text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'street_address'
  ) then
    insert into public.listing_private_details
      (listing_id, street_address, unit_number, postal_code, exact_lat, exact_lng)
    select id, street_address, unit_number, postal_code, lat, lng
    from public.listings
    on conflict (listing_id) do nothing;

    update public.listings
    set postal_fsa = upper(left(replace(postal_code, ' ', ''), 3)),
        lat = round(lat::numeric, 2),
        lng = round(lng::numeric, 2);

    alter table public.listings
      drop column street_address,
      drop column unit_number,
      drop column postal_code;
  end if;
end $$;

alter table public.listing_private_details enable row level security;
revoke all on public.listing_private_details from anon;
grant select, insert, update, delete on public.listing_private_details to authenticated;

drop policy if exists "private_details_select" on public.listing_private_details;
drop policy if exists "private_details_insert" on public.listing_private_details;
drop policy if exists "private_details_update" on public.listing_private_details;
drop policy if exists "private_details_delete" on public.listing_private_details;

-- Visible only to: the owner, admins, and a buyer whose viewing was CONFIRMED.
drop policy if exists "private_details_select" on public.listing_private_details;
create policy "private_details_select"
  on public.listing_private_details for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_private_details.listing_id and l.user_id = auth.uid()
    )
    or exists (
      select 1 from public.viewing_requests v
      where v.listing_id = listing_private_details.listing_id
        and v.buyer_id = auth.uid()
        and v.status = 'confirmed'
    )
  );

drop policy if exists "private_details_insert" on public.listing_private_details;
create policy "private_details_insert"
  on public.listing_private_details for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_private_details.listing_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "private_details_update" on public.listing_private_details;
create policy "private_details_update"
  on public.listing_private_details for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_private_details.listing_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "private_details_delete" on public.listing_private_details;
create policy "private_details_delete"
  on public.listing_private_details for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_private_details.listing_id and l.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 5. LISTINGS: policies + protection against self-approval and tampering
-- ------------------------------------------------------------------------------
drop policy if exists "Buyers see only live listings; owners and admins see all" on public.listings;
drop policy if exists "Sellers create their own listings" on public.listings;
drop policy if exists "Sellers edit only their own listings" on public.listings;
drop policy if exists "Sellers delete only their own listings" on public.listings;

drop policy if exists "listings_select" on public.listings;
create policy "listings_select"
  on public.listings for select
  using (status = 'live' or user_id = auth.uid() or public.is_admin());

drop policy if exists "listings_insert" on public.listings;
create policy "listings_insert"
  on public.listings for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('seller', 'admin')
    )
  );

drop policy if exists "listings_update" on public.listings;
create policy "listings_update"
  on public.listings for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "listings_delete" on public.listings;
create policy "listings_delete"
  on public.listings for delete
  using (user_id = auth.uid() or public.is_admin());

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
      new.payment_status := 'complimentary_launch';
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

drop trigger if exists trg_protect_listing_fields on public.listings;
create trigger trg_protect_listing_fields
  before insert or update on public.listings
  for each row execute function public.protect_listing_fields();

-- ------------------------------------------------------------------------------
-- 6. LISTING PHOTOS
-- ------------------------------------------------------------------------------
drop policy if exists "Photos visible if parent listing is visible" on public.listing_photos;
drop policy if exists "Listing owner manages photos" on public.listing_photos;

drop policy if exists "photos_select" on public.listing_photos;
create policy "photos_select"
  on public.listing_photos for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and (l.status = 'live' or l.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "photos_insert" on public.listing_photos;
create policy "photos_insert"
  on public.listing_photos for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and (l.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "photos_update" on public.listing_photos;
create policy "photos_update"
  on public.listing_photos for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and (l.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "photos_delete" on public.listing_photos;
create policy "photos_delete"
  on public.listing_photos for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and (l.user_id = auth.uid() or public.is_admin())
    )
  );

-- ------------------------------------------------------------------------------
-- 7. VERIFICATIONS (ownership documents)
-- ------------------------------------------------------------------------------
drop policy if exists "Verification documents visible only to owner and admins" on public.verifications;
drop policy if exists "Owner can upload verification document" on public.verifications;
drop policy if exists "Admins audit and update verifications" on public.verifications;

drop policy if exists "verifications_select" on public.verifications;
create policy "verifications_select"
  on public.verifications for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = verifications.listing_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "verifications_insert" on public.verifications;
create policy "verifications_insert"
  on public.verifications for insert
  with check (
    status = 'pending'
    and exists (
      select 1 from public.listings l
      where l.id = verifications.listing_id and l.user_id = auth.uid()
    )
  );

drop policy if exists "verifications_admin_update" on public.verifications;
create policy "verifications_admin_update"
  on public.verifications for update
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.stamp_verification_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.audited_by := auth.uid();
    new.audited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_verification_audit on public.verifications;
create trigger trg_stamp_verification_audit
  before update on public.verifications
  for each row execute function public.stamp_verification_audit();

-- When an admin approves/rejects a document, the listing follows automatically
create or replace function public.apply_verification_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'verified' then
      update public.listings set status = 'live'
      where id = new.listing_id and status = 'in_review';
    elsif new.status = 'rejected' then
      update public.listings set status = 'rejected'
      where id = new.listing_id and status in ('in_review', 'live', 'paused');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_verification_decision on public.verifications;
create trigger trg_apply_verification_decision
  after update on public.verifications
  for each row execute function public.apply_verification_decision();

-- ------------------------------------------------------------------------------
-- 8. CONVERSATIONS & MESSAGES (+ server-side anti-spam)
-- ------------------------------------------------------------------------------
drop policy if exists "Conversations visible only to participating buyer, seller, or admin" on public.conversations;
drop policy if exists "Buyers initiate conversations" on public.conversations;
drop policy if exists "Messages visible only to conversation participants or admin" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select"
  on public.conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert"
  on public.conversations for insert
  with check (
    buyer_id = auth.uid()
    and buyer_id <> seller_id
    and exists (
      select 1 from public.listings l
      where l.id = conversations.listing_id
        and l.status = 'live'
        and l.user_id = conversations.seller_id
    )
  );

drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create or replace function public.limit_new_conversations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.conversations
      where buyer_id = new.buyer_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You can start up to 5 new conversations per hour. Please try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limit_new_conversations on public.conversations;
create trigger trg_limit_new_conversations
  before insert on public.conversations
  for each row execute function public.limit_new_conversations();

create or replace function public.limit_message_flood()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'You are sending messages too quickly. Please slow down.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limit_message_flood on public.messages;
create trigger trg_limit_message_flood
  before insert on public.messages
  for each row execute function public.limit_message_flood();

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Lets the app mark messages as read without allowing anyone to edit message text
create or replace function public.mark_conversation_read(_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
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
$$;

-- ------------------------------------------------------------------------------
-- 9. VIEWING REQUESTS
-- ------------------------------------------------------------------------------
drop policy if exists "Viewing requests visible only to buyer, seller, or admin" on public.viewing_requests;
drop policy if exists "Buyers can request viewings" on public.viewing_requests;
drop policy if exists "Listing owner and buyer can update viewing status" on public.viewing_requests;

drop policy if exists "viewings_select" on public.viewing_requests;
create policy "viewings_select"
  on public.viewing_requests for select
  using (
    buyer_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = viewing_requests.listing_id and l.user_id = auth.uid()
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
        and l.status = 'live'
        and l.user_id <> auth.uid()
    )
  );

drop policy if exists "viewings_update" on public.viewing_requests;
create policy "viewings_update"
  on public.viewing_requests for update
  using (
    buyer_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = viewing_requests.listing_id and l.user_id = auth.uid()
    )
  );

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

  -- A buyer can cancel (decline) but can never confirm their own viewing
  if not (_is_owner or public.is_admin())
     and new.status is distinct from old.status
     and new.status <> 'declined' then
    raise exception 'Only the homeowner can confirm or reschedule a viewing.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_viewing_update on public.viewing_requests;
create trigger trg_guard_viewing_update
  before update on public.viewing_requests
  for each row execute function public.guard_viewing_update();

create or replace function public.limit_viewing_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.viewing_requests
      where buyer_id = new.buyer_id and created_at > now() - interval '1 hour') >= 6 then
    raise exception 'You can request up to 6 viewings per hour. Please try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limit_viewing_requests on public.viewing_requests;
create trigger trg_limit_viewing_requests
  before insert on public.viewing_requests
  for each row execute function public.limit_viewing_requests();

-- ------------------------------------------------------------------------------
-- 10. REPORTS (logged-in users only, rate limited)
-- ------------------------------------------------------------------------------
drop policy if exists "Users can submit listing reports" on public.reports;
drop policy if exists "Only admins can view and resolve reports" on public.reports;
drop policy if exists "Only admins can update reports" on public.reports;

drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert"
  on public.reports for insert
  with check (reporter_id = auth.uid() and status = 'pending');

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin"
  on public.reports for select
  using (public.is_admin());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.limit_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You can submit up to 5 reports per hour.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limit_reports on public.reports;
create trigger trg_limit_reports
  before insert on public.reports
  for each row execute function public.limit_reports();

create or replace function public.stamp_report_resolution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status <> 'pending' then
    new.resolved_at := now();
    new.resolved_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_report_resolution on public.reports;
create trigger trg_stamp_report_resolution
  before update on public.reports
  for each row execute function public.stamp_report_resolution();

-- ------------------------------------------------------------------------------
-- 11. COUNTERS maintained by the server (sellers can no longer edit them)
-- ------------------------------------------------------------------------------
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
    update public.listings set inquiries_count = inquiries_count + 1 where id = new.listing_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_count_saves on public.favourites;
create trigger trg_count_saves
  after insert or delete on public.favourites
  for each row execute function public.bump_listing_counter();

drop trigger if exists trg_count_inquiries_viewing on public.viewing_requests;
create trigger trg_count_inquiries_viewing
  after insert on public.viewing_requests
  for each row execute function public.bump_listing_counter();

drop trigger if exists trg_count_inquiries_conversation on public.conversations;
create trigger trg_count_inquiries_conversation
  after insert on public.conversations
  for each row execute function public.bump_listing_counter();

create or replace function public.increment_listing_views(_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings set views_count = views_count + 1
  where id = _listing_id and status = 'live';
$$;

grant execute on function public.increment_listing_views(uuid) to anon, authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ------------------------------------------------------------------------------
-- 12. FIELD-LENGTH & SANITY LIMITS
-- ------------------------------------------------------------------------------
alter table public.messages drop constraint if exists messages_content_len;
alter table public.messages add constraint messages_content_len
  check (char_length(content) between 1 and 5000);

alter table public.viewing_requests drop constraint if exists viewing_notes_len;
alter table public.viewing_requests add constraint viewing_notes_len
  check (notes is null or char_length(notes) <= 1000);

alter table public.reports drop constraint if exists report_details_len;
alter table public.reports add constraint report_details_len
  check (char_length(details) between 5 and 2000);

alter table public.listings drop constraint if exists listing_headline_len;
alter table public.listings add constraint listing_headline_len
  check (char_length(headline) between 5 and 150);

alter table public.listings drop constraint if exists listing_description_len;
alter table public.listings add constraint listing_description_len
  check (char_length(description) between 20 and 10000);

alter table public.listings drop constraint if exists listing_year_built_sane;
alter table public.listings add constraint listing_year_built_sane
  check (year_built between 1800 and 2100);

alter table public.listings drop constraint if exists listing_cashback_sane;
alter table public.listings add constraint listing_cashback_sane
  check (cashback_amount >= 0 and cashback_amount <= price);

-- ------------------------------------------------------------------------------
-- 13. STORAGE BUCKETS + ACCESS RULES
-- File path convention used by the app: <user_id>/<listing_id>/<filename>
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public_listing_photos', 'public_listing_photos', true, 5242880,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('private_verification_docs', 'private_verification_docs', false, 10485760,
     array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "dh_photos_owner_select" on storage.objects;
drop policy if exists "dh_photos_owner_insert" on storage.objects;
drop policy if exists "dh_photos_owner_update" on storage.objects;
drop policy if exists "dh_photos_owner_delete" on storage.objects;
drop policy if exists "dh_docs_select" on storage.objects;
drop policy if exists "dh_docs_owner_insert" on storage.objects;
drop policy if exists "dh_docs_delete" on storage.objects;

-- Public photos: anyone can VIEW via the public URL; only the owner can change them
drop policy if exists "dh_photos_owner_select" on storage.objects;
create policy "dh_photos_owner_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'public_listing_photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dh_photos_owner_insert" on storage.objects;
create policy "dh_photos_owner_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'public_listing_photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dh_photos_owner_update" on storage.objects;
create policy "dh_photos_owner_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'public_listing_photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dh_photos_owner_delete" on storage.objects;
create policy "dh_photos_owner_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'public_listing_photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Private ownership documents: owner + admins only. Never public.
drop policy if exists "dh_docs_select" on storage.objects;
create policy "dh_docs_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'private_verification_docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "dh_docs_owner_insert" on storage.objects;
create policy "dh_docs_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'private_verification_docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "dh_docs_delete" on storage.objects;
create policy "dh_docs_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'private_verification_docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

commit;
