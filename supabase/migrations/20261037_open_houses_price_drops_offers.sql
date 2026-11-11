-- ==============================================================================
-- Seller tools: open houses, price drop alerts, offers inbox
-- ==============================================================================
-- Apply BEFORE publishing the website that uses it (the website reads the new tables and
-- columns). Safe for the current website, which never asks for them.
--
-- Open houses: an owner adds up to 3 upcoming open houses per listing. Signed-in buyers tap
--   "I'll come"; they get a confirmation and a reminder a few hours before, both with the
--   address (they need it to come). If the owner cancels, everyone coming is told.
-- Price drops: when an approved listing's price goes down by 1% or more, it shows
--   "Price reduced" for 14 days and everyone who saved it gets a notice (once a day at most).
-- Offers: a signed-in buyer sends a non-binding offer (price, deposit, conditions, dates); the
--   owner sees them side by side and accepts, counters or declines. Nothing here is a contract.

-- Policies can't read the private billing columns as the visitor, so they ask these helpers
create or replace function public.listing_is_public_by_id(_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.listings l where l.id = _listing_id
                 and public.listing_is_public(l.status, l.payment_status, l.past_due_since));
$$;
revoke execute on function public.listing_is_public_by_id(uuid) from public;
grant execute on function public.listing_is_public_by_id(uuid) to anon, authenticated;

create or replace function public.can_manage_listing(_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (public.is_admin()
         or exists (select 1 from public.listings l where l.id = _listing_id and l.user_id = auth.uid()));
$$;
revoke execute on function public.can_manage_listing(uuid) from public;
grant execute on function public.can_manage_listing(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Open houses
-- ---------------------------------------------------------------------------
create table if not exists public.open_houses (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text check (note is null or char_length(note) <= 300),
  going_count integer not null default 0,
  cancelled_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '8 hours')
);
create index if not exists open_houses_listing_idx on public.open_houses (listing_id, starts_at);

create table if not exists public.open_house_rsvps (
  open_house_id uuid not null references public.open_houses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (open_house_id, user_id)
);

alter table public.open_houses enable row level security;
alter table public.open_house_rsvps enable row level security;

-- Anyone sees open houses of public listings; owners and admins see their own (any state)
drop policy if exists open_houses_select on public.open_houses;
create policy open_houses_select on public.open_houses for select to anon, authenticated
using (public.listing_is_public_by_id(listing_id) or public.can_manage_listing(listing_id));
-- Owners (and admins) add, change and cancel them. Rules are checked by the trigger below.
drop policy if exists open_houses_owner_write on public.open_houses;
create policy open_houses_owner_write on public.open_houses for insert to authenticated
with check (public.can_manage_listing(listing_id));
drop policy if exists open_houses_owner_update on public.open_houses;
create policy open_houses_owner_update on public.open_houses for update to authenticated
using (public.can_manage_listing(listing_id));

revoke all on public.open_houses, public.open_house_rsvps from anon;
grant select on public.open_houses to anon;
grant select, insert on public.open_houses to authenticated;
grant update (starts_at, ends_at, note, cancelled_at) on public.open_houses to authenticated;

-- Buyers see their own "I'll come"; owners see who's coming through open_house_guests()
drop policy if exists open_house_rsvps_own on public.open_house_rsvps;
create policy open_house_rsvps_own on public.open_house_rsvps for select to authenticated
using (user_id = auth.uid() or public.is_admin());
grant select on public.open_house_rsvps to authenticated;

-- Rules for adding / changing an open house
create or replace function public.check_open_house()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _l public.listings;
begin
  if tg_op = 'UPDATE' then
    -- Counts and reminders (set by the database) pass straight through; sellers can only
    -- change the time, the note or cancel (column grants)
    if new.starts_at = old.starts_at and new.ends_at = old.ends_at
       and new.note is not distinct from old.note and new.cancelled_at is not distinct from old.cancelled_at then
      return new;
    end if;
    new.listing_id := old.listing_id;
    new.going_count := old.going_count;
    new.reminder_sent_at := case when new.starts_at is distinct from old.starts_at then null else old.reminder_sent_at end;
    new.created_at := old.created_at;
    if old.cancelled_at is not null then
      raise exception 'This open house was cancelled. Add a new one instead.';
    end if;
    if new.cancelled_at is not null then
      new.cancelled_at := now();
      return new; -- cancelling is always allowed
    end if;
  else
    new.going_count := 0;
    new.cancelled_at := null;
    new.reminder_sent_at := null;
  end if;

  select * into _l from public.listings where id = new.listing_id;
  if _l.status not in ('live', 'paused') then
    raise exception 'Open houses can be added once your listing is approved.';
  end if;
  if new.starts_at < now() + interval '1 hour' then
    raise exception 'Choose a time at least an hour from now.';
  end if;
  if new.starts_at > now() + interval '90 days' then
    raise exception 'Choose a date within the next 3 months.';
  end if;
  if tg_op = 'INSERT' and (
    select count(*) from public.open_houses o
     where o.listing_id = new.listing_id and o.cancelled_at is null and o.ends_at > now()
  ) >= 3 then
    raise exception 'You can have up to 3 upcoming open houses. Cancel one to add another.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_check_open_house on public.open_houses;
create trigger trg_check_open_house before insert or update on public.open_houses
for each row execute function public.check_open_house();

-- The exact address of a listing, as one line (for people coming to an open house)
create or replace function public.listing_address_line(_listing_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select trim(both ', ' from concat_ws(', ',
           nullif(concat_ws(' ', nullif(d.unit_number, '') || ' -', d.street_address), ''),
           l.city, l.province))
  from public.listings l
  left join public.listing_private_details d on d.listing_id = l.id
  where l.id = _listing_id;
$$;
revoke execute on function public.listing_address_line(uuid) from public, anon, authenticated;

-- "Sat, Nov 15, 2:00 – 4:00 pm" in the listing's province
create or replace function public.open_house_when(_o public.open_houses, _province text)
returns text
language sql
stable
set search_path = public
as $$
  select to_char(_o.starts_at at time zone z, 'Dy, Mon FMDD, FMHH12:MI ')
         || lower(to_char(_o.starts_at at time zone z, 'am')) || ' – '
         || to_char(_o.ends_at at time zone z, 'FMHH12:MI ') || lower(to_char(_o.ends_at at time zone z, 'am'))
  from (select case upper(coalesce(_province, ''))
    when 'BC' then 'America/Vancouver' when 'AB' then 'America/Edmonton' when 'SK' then 'America/Regina'
    when 'MB' then 'America/Winnipeg' when 'ON' then 'America/Toronto' when 'QC' then 'America/Toronto'
    when 'NB' then 'America/Moncton' when 'NS' then 'America/Halifax' when 'PE' then 'America/Halifax'
    when 'NL' then 'America/St_Johns' when 'YT' then 'America/Whitehorse' when 'NT' then 'America/Yellowknife'
    when 'NU' then 'America/Iqaluit' else 'America/Toronto' end as z) tz;
$$;

-- Buyer: "I'll come" (true) or "not coming any more" (false). Returns the number coming.
create or replace function public.rsvp_open_house(_open_house_id uuid, _going boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _me uuid := auth.uid();
  _o public.open_houses;
  _l public.listings;
  _n integer;
  _addr text;
begin
  if _me is null then
    raise exception 'Please sign in first.';
  end if;
  select * into _o from public.open_houses where id = _open_house_id for update;
  if _o.id is null or _o.cancelled_at is not null then
    raise exception 'This open house isn''t on any more.';
  end if;
  select * into _l from public.listings where id = _o.listing_id;
  if _l.user_id = _me then
    raise exception 'This is your own open house.';
  end if;

  if _going then
    if _o.ends_at < now() then
      raise exception 'This open house is over.';
    end if;
    if not public.listing_is_public(_l.status, _l.payment_status, _l.past_due_since) then
      raise exception 'This home isn''t available right now.';
    end if;
    insert into public.open_house_rsvps (open_house_id, user_id) values (_open_house_id, _me)
    on conflict do nothing;
    if found then
      _addr := public.listing_address_line(_l.id);
      insert into public.notifications (user_id, type, title, body, listing_id)
      values (_me, 'open_house_going', 'You''re going to an open house',
        '"' || _l.headline || '": ' || public.open_house_when(_o, _l.province) || '.'
        || case when _addr is not null then E'\nAddress: ' || _addr else '' end
        || coalesce(E'\nFrom the owner: ' || nullif(_o.note, ''), '')
        || E'\nWe''ll remind you a few hours before.', _l.id);
    end if;
  else
    delete from public.open_house_rsvps where open_house_id = _open_house_id and user_id = _me;
  end if;

  select count(*) into _n from public.open_house_rsvps where open_house_id = _open_house_id;
  update public.open_houses set going_count = _n where id = _open_house_id;
  return _n;
end;
$$;
revoke execute on function public.rsvp_open_house(uuid, boolean) from public, anon;
grant execute on function public.rsvp_open_house(uuid, boolean) to authenticated;

-- Owner (or admin): who's coming to an open house
create or replace function public.open_house_guests(_open_house_id uuid)
returns table(full_name text, email text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select u.full_name, u.email, r.created_at
  from public.open_house_rsvps r
  join public.open_houses o on o.id = r.open_house_id
  join public.listings l on l.id = o.listing_id
  join public.users u on u.id = r.user_id
  where r.open_house_id = _open_house_id and (l.user_id = auth.uid() or public.is_admin())
  order by r.created_at;
$$;
revoke execute on function public.open_house_guests(uuid) from public, anon;
grant execute on function public.open_house_guests(uuid) to authenticated;

-- Which open houses the signed-in buyer is going to
create or replace function public.my_open_house_rsvps()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select open_house_id from public.open_house_rsvps where user_id = auth.uid();
$$;
revoke execute on function public.my_open_house_rsvps() from public, anon;
grant execute on function public.my_open_house_rsvps() to authenticated;

-- Cancelled or moved: tell everyone who said they'd come
create or replace function public.notify_open_house_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _l public.listings;
begin
  if new.cancelled_at is not null and old.cancelled_at is null then
    select * into _l from public.listings where id = new.listing_id;
    insert into public.notifications (user_id, type, title, body, listing_id)
    select r.user_id, 'open_house_cancelled', 'Open house cancelled',
      'The owner cancelled the open house for "' || _l.headline || '" on ' || public.open_house_when(old, _l.province)
      || '. You can still message them or request a private viewing.', _l.id
    from public.open_house_rsvps r where r.open_house_id = new.id;
  elsif new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at then
    select * into _l from public.listings where id = new.listing_id;
    insert into public.notifications (user_id, type, title, body, listing_id)
    select r.user_id, 'open_house_changed', 'Open house time changed',
      'The open house for "' || _l.headline || '" is now ' || public.open_house_when(new, _l.province)
      || ' (it was ' || public.open_house_when(old, _l.province) || ').', _l.id
    from public.open_house_rsvps r where r.open_house_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notify_open_house_change on public.open_houses;
create trigger trg_notify_open_house_change after update on public.open_houses
for each row execute function public.notify_open_house_change();

-- Reminder a few hours before (run every 15 minutes)
create or replace function public.send_open_house_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _o record;
  _n integer := 0;
  _c integer;
  _addr text;
begin
  for _o in
    select o.*, l.headline, l.province, l.status, l.payment_status, l.past_due_since
    from public.open_houses o join public.listings l on l.id = o.listing_id
    where o.cancelled_at is null and o.reminder_sent_at is null
      and o.starts_at > now() and o.starts_at <= now() + interval '4 hours'
  loop
    update public.open_houses set reminder_sent_at = now() where id = _o.id;
    if not public.listing_is_public(_o.status, _o.payment_status, _o.past_due_since) then
      continue;
    end if;
    _addr := public.listing_address_line(_o.listing_id);
    insert into public.notifications (user_id, type, title, body, listing_id)
    select r.user_id, 'open_house_reminder', 'Open house today: ' || left(_o.headline, 90),
      public.open_house_when((select x from public.open_houses x where x.id = _o.id), _o.province) || '.'
      || case when _addr is not null then E'\nAddress: ' || _addr else '' end
      || coalesce(E'\nFrom the owner: ' || nullif(_o.note, ''), ''), _o.listing_id
    from public.open_house_rsvps r where r.open_house_id = _o.id;
    get diagnostics _c = row_count;
    _n := _n + _c;
  end loop;
  return _n;
end;
$$;
revoke execute on function public.send_open_house_reminders() from public, anon, authenticated;

select cron.unschedule('open-house-reminders') where exists (select 1 from cron.job where jobname = 'open-house-reminders');
select cron.schedule('open-house-reminders', '*/15 * * * *', 'select public.send_open_house_reminders();');

-- ---------------------------------------------------------------------------
-- Price drops
-- ---------------------------------------------------------------------------
alter table public.listings add column if not exists price_reduced_from numeric;
alter table public.listings add column if not exists price_reduced_at timestamptz;
grant select (price_reduced_from, price_reduced_at) on public.listings to anon, authenticated;

create or replace function public.track_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _recent boolean;
begin
  if tg_op = 'INSERT' then
    new.price_reduced_from := null;
    new.price_reduced_at := null;
    return new;
  end if;
  if new.price is not distinct from old.price then
    -- Only the database sets these (sellers can't fake a "Price reduced")
    new.price_reduced_from := old.price_reduced_from;
    new.price_reduced_at := old.price_reduced_at;
    return new;
  end if;
  _recent := old.price_reduced_at is not null and old.price_reduced_at > now() - interval '14 days';

  if old.status in ('live', 'paused') and new.price < old.price * 0.99 then
    -- Keep the highest recent price as the "was" price
    new.price_reduced_from := case when _recent then greatest(old.price_reduced_from, old.price) else old.price end;
    new.price_reduced_at := now();
    -- Tell people who saved it (once a day at most), only while buyers can see it
    if public.listing_is_public(new.status, new.payment_status, new.past_due_since)
       and not exists (select 1 from public.notifications n where n.listing_id = new.id and n.type = 'price_drop'
                        and n.created_at > now() - interval '1 day') then
      insert into public.notifications (user_id, type, title, body, listing_id)
      select f.user_id, 'price_drop',
        'Price drop: a home you saved is now ' || to_char(new.price, 'FM$999,999,990'),
        '"' || new.headline || '" in ' || new.city || ', ' || new.province || ' went from '
        || to_char(new.price_reduced_from, 'FM$999,999,990') || ' to ' || to_char(new.price, 'FM$999,999,990') || '.',
        new.id
      from public.favourites f
      where f.listing_id = new.id and f.user_id <> new.user_id;
    end if;
  elsif new.price >= coalesce(old.price_reduced_from, 'infinity'::numeric) or not _recent then
    new.price_reduced_from := null;
    new.price_reduced_at := null;
  else
    new.price_reduced_from := old.price_reduced_from;
    new.price_reduced_at := old.price_reduced_at;
  end if;
  return new;
end;
$$;
-- Runs after trg_protect_listing_fields (triggers run in name order)
drop trigger if exists trg_track_price_drop on public.listings;
create trigger trg_track_price_drop before insert or update on public.listings
for each row execute function public.track_price_drop();

-- ---------------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  amount numeric not null check (amount > 0 and amount < 100000000),
  deposit numeric check (deposit is null or (deposit >= 0 and deposit < 100000000)),
  possession_date date,
  open_until timestamptz not null,
  conditions text[] not null default '{}'
    check (conditions <@ array['financing', 'inspection', 'strata_documents', 'sale_of_home', 'appraisal', 'insurance']),
  financing text not null check (financing in ('pre_approved', 'cash', 'not_yet')),
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'open' check (status in ('open', 'accepted', 'countered', 'declined', 'withdrawn')),
  counter_amount numeric check (counter_amount is null or counter_amount > 0),
  reply text check (reply is null or char_length(reply) <= 1000),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists offers_listing_idx on public.offers (listing_id, created_at desc);
create index if not exists offers_buyer_idx on public.offers (buyer_id, created_at desc);

alter table public.offers enable row level security;
drop policy if exists offers_select on public.offers;
create policy offers_select on public.offers for select to authenticated
using (buyer_id = auth.uid() or public.is_admin()
       or public.can_manage_listing(listing_id));
revoke all on public.offers from anon;
grant select on public.offers to authenticated; -- written only through the functions below

-- Buyer: send (or replace) an offer. Returns its id.
create or replace function public.make_offer(
  _listing_id uuid, _amount numeric, _deposit numeric, _possession_date date, _open_until timestamptz,
  _conditions text[], _financing text, _message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _me uuid := auth.uid();
  _l public.listings;
  _id uuid;
  _recent integer;
begin
  if _me is null then
    raise exception 'Please sign in first.';
  end if;
  select * into _l from public.listings where id = _listing_id;
  if _l.id is null or not public.listing_is_public(_l.status, _l.payment_status, _l.past_due_since) then
    raise exception 'This home isn''t taking offers right now.';
  end if;
  if _l.user_id = _me then
    raise exception 'This is your own listing.';
  end if;
  if _amount is null or _amount < _l.price * 0.5 then
    raise exception 'Offers must be at least half the asking price.';
  end if;
  if _open_until is null or _open_until < now() + interval '2 hours' or _open_until > now() + interval '30 days' then
    raise exception 'Keep your offer open for between 2 hours and 30 days.';
  end if;
  if _possession_date is not null and (_possession_date < current_date or _possession_date > current_date + 730) then
    raise exception 'Choose a possession date within the next 2 years.';
  end if;
  select count(*) into _recent from public.offers where buyer_id = _me and created_at > now() - interval '1 day';
  if _recent >= 10 then
    raise exception 'You''ve sent a lot of offers today. Please try again tomorrow.';
  end if;

  -- One open offer per buyer per home: a new one replaces the old one
  update public.offers set status = 'withdrawn', responded_at = now()
   where listing_id = _listing_id and buyer_id = _me and status in ('open', 'countered');

  insert into public.offers (listing_id, buyer_id, amount, deposit, possession_date, open_until, conditions, financing, message)
  values (_listing_id, _me, round(_amount), round(_deposit), _possession_date, _open_until,
          coalesce(_conditions, '{}'), _financing, nullif(trim(_message), ''))
  returning id into _id;

  insert into public.notifications (user_id, type, title, body, listing_id)
  values (_l.user_id, 'new_offer', 'New offer: ' || to_char(round(_amount), 'FM$999,999,990'),
    'Someone sent an offer on "' || _l.headline || '" (asking ' || to_char(_l.price, 'FM$999,999,990')
    || '). It''s open until ' || to_char(_open_until at time zone 'America/Toronto', 'Mon FMDD') || '. Compare it with any others and reply from your dashboard.',
    _l.id);
  return _id;
end;
$$;
revoke execute on function public.make_offer(uuid, numeric, numeric, date, timestamptz, text[], text, text) from public, anon;
grant execute on function public.make_offer(uuid, numeric, numeric, date, timestamptz, text[], text, text) to authenticated;

-- Owner: accept, counter (with a price) or decline. Buyer: withdraw.
create or replace function public.respond_to_offer(_offer_id uuid, _action text, _counter_amount numeric, _reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _me uuid := auth.uid();
  _o public.offers;
  _l public.listings;
  _title text;
  _body text;
begin
  select * into _o from public.offers where id = _offer_id for update;
  if _o.id is null then
    raise exception 'Offer not found.';
  end if;
  select * into _l from public.listings where id = _o.listing_id;

  if _action = 'withdraw' then
    if _o.buyer_id <> _me then raise exception 'Offer not found.'; end if;
    if _o.status not in ('open', 'countered') then raise exception 'This offer is already closed.'; end if;
    update public.offers set status = 'withdrawn', responded_at = now() where id = _offer_id;
    insert into public.notifications (user_id, type, title, body, listing_id)
    values (_l.user_id, 'offer_withdrawn', 'An offer was withdrawn',
      'The ' || to_char(_o.amount, 'FM$999,999,990') || ' offer on "' || _l.headline || '" was withdrawn by the buyer.', _l.id);
    return;
  end if;

  if _l.user_id <> _me and not public.is_admin() then
    raise exception 'Offer not found.';
  end if;
  if _o.status <> 'open' then
    raise exception 'This offer is already closed.';
  end if;
  if _action not in ('accept', 'counter', 'decline') then
    raise exception 'Unknown reply.';
  end if;
  if _action = 'counter' and (_counter_amount is null or _counter_amount <= 0) then
    raise exception 'Enter the price you''d accept.';
  end if;

  update public.offers
     set status = case _action when 'accept' then 'accepted' when 'counter' then 'countered' else 'declined' end,
         counter_amount = case when _action = 'counter' then round(_counter_amount) end,
         reply = nullif(trim(_reply), ''),
         responded_at = now()
   where id = _offer_id;

  if _action = 'accept' then
    -- Open a conversation between them (if there isn't one), so they can agree next steps
    if not exists (select 1 from public.conversations c where c.listing_id = _l.id and c.buyer_id = _o.buyer_id) then
      begin
        insert into public.conversations (listing_id, buyer_id, seller_id) values (_l.id, _o.buyer_id, _l.user_id);
      exception when others then
        null; -- e.g. the buyer's hourly conversation limit: they can still message the owner themselves
      end;
    end if;
    _title := 'Your offer was accepted';
    _body := 'The owner of "' || _l.headline || '" accepted your ' || to_char(_o.amount, 'FM$999,999,990')
      || ' offer and wants to go ahead. Nothing is signed yet: message the owner to agree next steps, and have a lawyer, notary or realtor write the contract of purchase and sale.';
  elsif _action = 'counter' then
    _title := 'The owner countered your offer';
    _body := 'The owner of "' || _l.headline || '" would accept ' || to_char(round(_counter_amount), 'FM$999,999,990')
      || ' (you offered ' || to_char(_o.amount, 'FM$999,999,990') || '). You can send a new offer or message them.';
  else
    _title := 'Your offer was declined';
    _body := 'The owner of "' || _l.headline || '" declined your ' || to_char(_o.amount, 'FM$999,999,990')
      || ' offer. You can send a new offer or message them.';
  end if;
  if nullif(trim(_reply), '') is not null then
    _body := _body || E'\nThe owner says: ' || left(trim(_reply), 400);
  end if;
  insert into public.notifications (user_id, type, title, body, listing_id)
  values (_o.buyer_id, 'offer_' || case _action when 'accept' then 'accepted' when 'counter' then 'countered' else 'declined' end,
          _title, _body, _l.id);
end;
$$;
revoke execute on function public.respond_to_offer(uuid, text, numeric, text) from public, anon;
grant execute on function public.respond_to_offer(uuid, text, numeric, text) to authenticated;

-- Offers I sent and offers on my listings, with names and the listing headline
create or replace function public.my_offers()
returns table(
  id uuid, listing_id uuid, listing_headline text, listing_price numeric, buyer_id uuid, buyer_name text,
  is_mine boolean, amount numeric, deposit numeric, possession_date date, open_until timestamptz,
  conditions text[], financing text, message text, status text, counter_amount numeric, reply text,
  responded_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.listing_id, l.headline, l.price, o.buyer_id, u.full_name,
         o.buyer_id = auth.uid(), o.amount, o.deposit, o.possession_date, o.open_until,
         o.conditions, o.financing, o.message, o.status, o.counter_amount, o.reply, o.responded_at, o.created_at
  from public.offers o
  join public.listings l on l.id = o.listing_id
  left join public.users u on u.id = o.buyer_id
  where o.buyer_id = auth.uid() or l.user_id = auth.uid()
  order by o.created_at desc
  limit 500;
$$;
revoke execute on function public.my_offers() from public, anon;
grant execute on function public.my_offers() to authenticated;
