-- ==============================================================================
-- New-listing alerts: "Email me new homes like these"
-- ==============================================================================
-- A signed-in buyer saves the search they're looking at (place or words, province, home type,
-- price range, bedrooms, bathrooms). Once a day, homes that became visible to buyers since the
-- last check and match the search are sent as one notice (bell + email). Nothing is sent when
-- nothing is new.
--
-- Safe to apply before the website that uses it is published: nothing calls it yet.

-- ---------------------------------------------------------------------------
-- When a listing was first shown to buyers (live and paid, or on a free period)
-- ---------------------------------------------------------------------------
alter table public.listings add column if not exists first_public_at timestamptz;

-- Listings already public count as shown when they were created, so they're never "new"
update public.listings
   set first_public_at = created_at
 where first_public_at is null
   and public.listing_is_public(status, payment_status, past_due_since);

create or replace function public.stamp_first_public()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only the database sets it, once
  if tg_op = 'UPDATE' then
    new.first_public_at := old.first_public_at;
  else
    new.first_public_at := null;
  end if;
  if new.first_public_at is null
     and public.listing_is_public(new.status, new.payment_status, new.past_due_since) then
    new.first_public_at := now();
  end if;
  return new;
end;
$$;
-- Named to run after trg_protect_listing_fields (BEFORE triggers run in name order)
drop trigger if exists trg_stamp_first_public on public.listings;
create trigger trg_stamp_first_public
  before insert or update on public.listings
  for each row execute function public.stamp_first_public();

-- ---------------------------------------------------------------------------
-- Saved searches
-- ---------------------------------------------------------------------------
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 200),
  query text check (query is null or char_length(query) between 1 and 80),
  province text check (province is null or province ~ '^[A-Z]{2}$'),
  property_type text check (property_type is null or char_length(property_type) <= 40),
  min_price numeric check (min_price is null or min_price >= 0),
  max_price numeric check (max_price is null or max_price > 0),
  min_beds integer check (min_beds is null or min_beds between 0 and 20),
  min_baths integer check (min_baths is null or min_baths between 0 and 20),
  last_checked_at timestamptz not null default now(),
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_user_idx on public.saved_searches(user_id);

alter table public.saved_searches enable row level security;
drop policy if exists saved_searches_own on public.saved_searches;
create policy saved_searches_own on public.saved_searches
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
revoke all on public.saved_searches from anon;
grant select, insert, delete on public.saved_searches to authenticated;

-- At most 10 alerts each, and no exact duplicates
create or replace function public.limit_saved_searches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.saved_searches where user_id = new.user_id) >= 10 then
    raise exception 'You can have up to 10 alerts. Stop one in your dashboard first.';
  end if;
  if exists (
    select 1 from public.saved_searches s
     where s.user_id = new.user_id
       and s.query is not distinct from new.query
       and s.province is not distinct from new.province
       and s.property_type is not distinct from new.property_type
       and s.min_price is not distinct from new.min_price
       and s.max_price is not distinct from new.max_price
       and s.min_beds is not distinct from new.min_beds
       and s.min_baths is not distinct from new.min_baths
  ) then
    raise exception 'You already have this alert.';
  end if;
  -- Starts from now: homes already up aren't sent
  new.last_checked_at := now();
  new.last_sent_at := null;
  return new;
end;
$$;
drop trigger if exists trg_limit_saved_searches on public.saved_searches;
create trigger trg_limit_saved_searches
  before insert on public.saved_searches
  for each row execute function public.limit_saved_searches();

-- ---------------------------------------------------------------------------
-- Daily: one notice per alert that has new matching homes
-- ---------------------------------------------------------------------------
create or replace function public.send_listing_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _s record;
  _n integer;
  _first uuid;
  _lines text;
  _sent integer := 0;
  _now timestamptz := now();
begin
  for _s in select * from public.saved_searches order by created_at loop
    select count(*),
           (array_agg(l.id order by l.first_public_at desc))[1],
           string_agg('• ' || to_char(l.price, 'FM$999,999,999') || ': ' || left(l.headline, 70) || ' (' || l.city || ')',
                      E'\n' order by l.first_public_at desc)
      into _n, _first, _lines
      from (
        select l.* from public.listings l
         where l.first_public_at > _s.last_checked_at
           and l.first_public_at <= _now
           and public.listing_is_public(l.status, l.payment_status, l.past_due_since)
           and l.user_id <> _s.user_id
           and (_s.province is null or l.province = _s.province)
           and (_s.property_type is null or l.property_type::text = _s.property_type)
           and (_s.min_price is null or l.price >= _s.min_price)
           and (_s.max_price is null or l.price <= _s.max_price)
           and (_s.min_beds is null or l.bedrooms >= _s.min_beds)
           and (_s.min_baths is null or l.bathrooms >= _s.min_baths)
           and (_s.query is null
                or l.city ilike '%' || _s.query || '%'
                or l.neighborhood ilike '%' || _s.query || '%'
                or coalesce(l.postal_fsa, '') ilike '%' || _s.query || '%'
                or l.headline ilike '%' || _s.query || '%')
         order by l.first_public_at desc
         limit 20
      ) l;

    update public.saved_searches set last_checked_at = _now where id = _s.id;
    if coalesce(_n, 0) = 0 then
      continue;
    end if;

    insert into public.notifications (user_id, type, title, body, listing_id)
    values (
      _s.user_id,
      case when _n = 1 then 'new_listing_match' else 'new_listings_match' end,
      case when _n = 1 then '1 new home for your alert' else _n || ' new homes for your alert' end,
      'Your alert: ' || _s.label || E'\n' || _lines,
      _first
    );
    update public.saved_searches set last_sent_at = _now where id = _s.id;
    _sent := _sent + 1;
  end loop;
  return _sent;
end;
$$;
revoke execute on function public.send_listing_alerts() from public, anon, authenticated;

-- Every day at 9:10 am Pacific (16:10 UTC; 17:10 UTC in winter is fine too)
select cron.unschedule('listing-alerts') where exists (select 1 from cron.job where jobname = 'listing-alerts');
select cron.schedule('listing-alerts', '10 16 * * *', 'select public.send_listing_alerts();');
