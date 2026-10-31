-- ==============================================================================
-- Keep a listing live while the owner's edits are reviewed
-- ==============================================================================
-- Before: when the owner of a live (or paused) listing changed its words, address or photos,
-- the listing went back to "in review" and was hidden from buyers until approved.
--
-- Now: the website saves those changes here, in listing_pending_edits, and the listing stays
-- up exactly as it was. An admin approves (the changes replace the live version) or sends them
-- back with a reason (the live version stays; the owner can fix or discard the changes).
-- Price and home details still go live straight away, as before.
--
-- The old rules stay as a safety net: anything that changes a live listing's words, address or
-- photos directly (not through this table) still sends it back to review.
--
-- Safe to apply before the matching website is published: nothing writes to this table yet.

-- ------------------------------------------------------------------------------
-- 1. The pending changes (one set per listing)
-- ------------------------------------------------------------------------------
create table if not exists public.listing_pending_edits (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rejected')),
  review_notes text constraint pending_review_notes_len check (review_notes is null or char_length(review_notes) <= 500),

  -- The listing's reviewed fields, as the owner wants them
  -- (same limits as the listing itself, so problems show when the owner saves, not at approval)
  headline text not null constraint pending_headline_len check (char_length(headline) between 5 and 150),
  description text not null constraint pending_description_len check (char_length(description) between 20 and 10000),
  neighborhood text not null,
  neighborhood_highlights text,
  recent_upgrades jsonb not null default '[]'::jsonb,
  inclusions jsonb not null default '[]'::jsonb,
  city text not null,
  province text not null constraint pending_province_open check (province = any (array['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','SK','YT'])),
  postal_fsa text constraint pending_fsa_not_quebec check (postal_fsa is null or upper(left(postal_fsa, 1)) <> all (array['G','H','J'])),
  lat double precision not null,
  lng double precision not null,

  -- The exact address (private: owner and admins only, like listing_private_details)
  street_address text not null,
  unit_number text,
  postal_code text not null check (upper(left(trim(postal_code), 1)) not in ('G', 'H', 'J')),

  -- The photos in order: [{id, url, thumbnail_url, caption, is_cover, width, height, file_size}].
  -- An id that matches one of the listing's photos keeps that photo; anything else is a new
  -- photo already uploaded to the owner's folder.
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listing_pending_edits enable row level security;

drop policy if exists "pending edits: owner reads" on public.listing_pending_edits;
create policy "pending edits: owner reads" on public.listing_pending_edits
  for select using (user_id = auth.uid() or public.is_admin());

-- Owners can propose changes to their own approved listing (live or paused, not on admin hold)
drop policy if exists "pending edits: owner writes" on public.listing_pending_edits;
create policy "pending edits: owner writes" on public.listing_pending_edits
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.user_id = auth.uid() and l.status in ('live', 'paused') and not l.admin_hold
    )
  );

drop policy if exists "pending edits: owner updates" on public.listing_pending_edits;
create policy "pending edits: owner updates" on public.listing_pending_edits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pending edits: owner discards" on public.listing_pending_edits;
create policy "pending edits: owner discards" on public.listing_pending_edits
  for delete using (user_id = auth.uid() or public.is_admin());

-- Owners can't approve their own changes: a save always puts them back in the queue
create or replace function public.guard_pending_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if not public.is_admin() then
    new.status := 'pending';
    new.review_notes := null;
    if tg_op = 'UPDATE' then
      new.user_id := old.user_id;
      new.listing_id := old.listing_id;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_pending_edit on public.listing_pending_edits;
create trigger trg_guard_pending_edit
  before insert or update on public.listing_pending_edits
  for each row execute function public.guard_pending_edit();

-- Tell the admins (and the owner) when changes are waiting for review
create or replace function public.notify_pending_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _l record;
begin
  if new.status <> 'pending' then return new; end if;
  -- Only when changes arrive, or come back after being sent back; not on every save
  if tg_op = 'UPDATE' and old.status = 'pending' then return new; end if;

  select headline, city into _l from public.listings where id = new.listing_id;

  insert into public.notifications (user_id, type, title, body, listing_id)
  select u.id, 'listing_in_review', 'Edited listing awaiting review',
    '"' || _l.headline || '" in ' || _l.city || ' has changes waiting for review. The listing stays live meanwhile.', new.listing_id
  from public.users u where u.role = 'admin' and u.id <> new.user_id;

  insert into public.notifications (user_id, type, title, body, listing_id)
  values (new.user_id, 'listing_rereview', 'Your changes are being reviewed',
    '"' || _l.headline || '" stays live as it is until we approve your changes, usually within 1 business day.', new.listing_id);
  return new;
end;
$$;

drop trigger if exists trg_notify_pending_edit on public.listing_pending_edits;
create trigger trg_notify_pending_edit
  after insert or update on public.listing_pending_edits
  for each row execute function public.notify_pending_edit();

-- ------------------------------------------------------------------------------
-- 2. Photo files to delete
-- ------------------------------------------------------------------------------
-- Only the owner can delete files in their photo folder, so when an admin approves changes
-- that remove photos, the old files are listed here and the owner's browser deletes them the
-- next time they use the site.
create table if not exists public.listing_photo_cleanup (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);
alter table public.listing_photo_cleanup enable row level security;

drop policy if exists "photo cleanup: owner reads" on public.listing_photo_cleanup;
create policy "photo cleanup: owner reads" on public.listing_photo_cleanup
  for select using (user_id = auth.uid());
drop policy if exists "photo cleanup: owner deletes" on public.listing_photo_cleanup;
create policy "photo cleanup: owner deletes" on public.listing_photo_cleanup
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 3. Admin: approve or send back
-- ------------------------------------------------------------------------------
create or replace function public.admin_approve_listing_edit(_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _e public.listing_pending_edits;
  _owner uuid;
  _p jsonb;
  _i int;
  _has_cover boolean;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can do this.';
  end if;
  select * into _e from public.listing_pending_edits where listing_id = _listing_id and status = 'pending' for update;
  if not found then
    raise exception 'These changes are no longer waiting for review.';
  end if;
  select user_id into _owner from public.listings where id = _listing_id;

  -- The words and the area (the listing keeps its status: live stays live)
  update public.listings set
    headline = _e.headline,
    description = _e.description,
    neighborhood = _e.neighborhood,
    neighborhood_highlights = _e.neighborhood_highlights,
    recent_upgrades = _e.recent_upgrades,
    inclusions = _e.inclusions,
    city = _e.city,
    province = _e.province,
    postal_fsa = _e.postal_fsa,
    lat = _e.lat,
    lng = _e.lng
  where id = _listing_id;

  -- The exact address
  insert into public.listing_private_details (listing_id, street_address, unit_number, postal_code, exact_lat, exact_lng, updated_at)
  values (_listing_id, _e.street_address, _e.unit_number, _e.postal_code, _e.lat, _e.lng, now())
  on conflict (listing_id) do update set
    street_address = excluded.street_address,
    unit_number = excluded.unit_number,
    postal_code = excluded.postal_code,
    exact_lat = excluded.exact_lat,
    exact_lng = excluded.exact_lng,
    updated_at = now();

  -- Photos the owner removed: off the listing, and their files queued for the owner to delete
  insert into public.listing_photo_cleanup (user_id, url)
  select _owner, u from public.listing_photos ph, lateral (values (ph.url), (ph.thumbnail_url)) v(u)
  where ph.listing_id = _listing_id
    and u is not null
    and not exists (select 1 from jsonb_array_elements(_e.photos) x where x->>'id' = ph.id::text);
  delete from public.listing_photos ph
  where ph.listing_id = _listing_id
    and not exists (select 1 from jsonb_array_elements(_e.photos) x where x->>'id' = ph.id::text);

  -- Kept photos get their new order, cover and caption; new photos are added
  _has_cover := exists (select 1 from jsonb_array_elements(_e.photos) x where (x->>'is_cover')::boolean);
  for _p, _i in select x, (o - 1)::int from jsonb_array_elements(_e.photos) with ordinality as t(x, o) loop
    if exists (select 1 from public.listing_photos where listing_id = _listing_id and id::text = _p->>'id') then
      update public.listing_photos set
        sort_order = _i,
        is_cover = case when _has_cover then coalesce((_p->>'is_cover')::boolean, false) else _i = 0 end,
        caption = nullif(left(_p->>'caption', 120), '')
      where listing_id = _listing_id and id::text = _p->>'id';
    else
      insert into public.listing_photos (listing_id, url, thumbnail_url, caption, is_cover, sort_order, width, height, file_size)
      values (
        _listing_id,
        _p->>'url',
        coalesce(_p->>'thumbnail_url', _p->>'url'),
        nullif(left(_p->>'caption', 120), ''),
        case when _has_cover then coalesce((_p->>'is_cover')::boolean, false) else _i = 0 end,
        _i,
        nullif(_p->>'width', '')::int,
        nullif(_p->>'height', '')::int,
        nullif(_p->>'file_size', '')::int
      );
    end if;
  end loop;

  delete from public.listing_pending_edits where listing_id = _listing_id;

  insert into public.notifications (user_id, type, title, body, listing_id)
  values (_owner, 'listing_live', 'Your changes are live',
    '"' || _e.headline || '" now shows your changes to buyers.', _listing_id);
end;
$$;
revoke execute on function public.admin_approve_listing_edit(uuid) from public, anon;
grant execute on function public.admin_approve_listing_edit(uuid) to authenticated;

create or replace function public.admin_reject_listing_edit(_listing_id uuid, _reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _e public.listing_pending_edits;
  _reason_clean text := left(regexp_replace(coalesce(_reason, ''), '<[^>]*>', '', 'g'), 500);
begin
  if not public.is_admin() then
    raise exception 'Only administrators can do this.';
  end if;
  update public.listing_pending_edits
  set status = 'rejected', review_notes = nullif(_reason_clean, '')
  where listing_id = _listing_id and status = 'pending'
  returning * into _e;
  if not found then
    raise exception 'These changes are no longer waiting for review.';
  end if;

  insert into public.notifications (user_id, type, title, body, listing_id)
  select _e.user_id, 'listing_rejected', 'Your changes need a fix',
    '"' || l.headline || '" is still live as it was. ' || coalesce(nullif(_reason_clean, ''), 'Please review your changes and save them again.'),
    _listing_id
  from public.listings l where l.id = _listing_id;
end;
$$;
revoke execute on function public.admin_reject_listing_edit(uuid, text) from public, anon;
grant execute on function public.admin_reject_listing_edit(uuid, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 4. Table access (this project doesn't grant it automatically; row rules above still apply)
-- ------------------------------------------------------------------------------
revoke all on public.listing_pending_edits from anon;
revoke all on public.listing_photo_cleanup from anon;
grant select, insert, update, delete on public.listing_pending_edits to authenticated;
grant select, delete on public.listing_photo_cleanup to authenticated;
