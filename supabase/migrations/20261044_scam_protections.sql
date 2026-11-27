-- ==============================================================================
-- OwnersMarket — Scam protections
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 20261043). Safe to run twice.
-- The website works before and after this runs. One transaction.
--
--   1. Admin can stop an account from messaging ("suspend messaging"). A suspended account
--      can't send messages, start conversations, make offers or request viewings.
--   2. Report a person from a conversation. Reports go to Admin → Safety, and admins are notified.
--   3. Block a person. They can no longer message you, make offers on your listings or
--      request viewings. Either side of a conversation can block.
--   4. Lower limits for new accounts (first 24 hours): 2 new conversations per hour instead
--      of 5, and 20 messages per 10 minutes instead of 60.
--   5. Suspicious messages are held: a message that names another messaging app (Teams,
--      WhatsApp, Telegram, ...) AND contains an email address or phone number waits for an
--      admin to approve it. The sender sees it as "waiting for a safety check"; the other
--      person sees nothing (and gets no notification) until it's approved.
--   6. Admin → Safety: accounts sending the same text to many people, held messages,
--      reported people and suspended accounts, in one place.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 0. Text checks
-- ------------------------------------------------------------------------------
create or replace function public.mentions_offsite_app(_text text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(_text, '') ~* '\y(teams|what''?s\s*app|telegram|signal|zoom|skype|we\s*chat|viber|kik|discord|hangouts|google\s*chat|snap\s*chat|line\s+app)\y';
$$;

create or replace function public.has_contact_info(_text text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(_text, '') ~* '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+'
      or coalesce(_text, '') ~ '(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}';
$$;

-- ------------------------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------------------------
-- Admin: accounts that can't message anyone
create table if not exists public.messaging_suspensions (
  user_id uuid primary key references public.users(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 500),
  suspended_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.messaging_suspensions enable row level security;

drop policy if exists messaging_suspensions_select on public.messaging_suspensions;
create policy messaging_suspensions_select on public.messaging_suspensions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists messaging_suspensions_admin_insert on public.messaging_suspensions;
create policy messaging_suspensions_admin_insert on public.messaging_suspensions
  for insert to authenticated
  with check ((select public.is_admin()) and suspended_by = (select auth.uid()));
drop policy if exists messaging_suspensions_admin_delete on public.messaging_suspensions;
create policy messaging_suspensions_admin_delete on public.messaging_suspensions
  for delete to authenticated
  using ((select public.is_admin()));

revoke all on public.messaging_suspensions from anon, authenticated;
grant select, insert, delete on public.messaging_suspensions to authenticated;
grant all on public.messaging_suspensions to service_role;

-- People: "I don't want messages from this person"
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists idx_user_blocks_blocked on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;

drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists user_blocks_insert on public.user_blocks;
create policy user_blocks_insert on public.user_blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));
drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete on public.user_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant all on public.user_blocks to service_role;

-- People: "Report this person" from a conversation
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users(id) on delete set null,
  reported_user_id uuid not null references public.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason text not null check (reason in ('scam', 'off_platform', 'harassment', 'spam', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null
);
create index if not exists idx_user_reports_reported on public.user_reports (reported_user_id);
create index if not exists idx_user_reports_reporter_recent on public.user_reports (reporter_id, created_at desc);
alter table public.user_reports enable row level security;

-- You can report the other person in one of your own conversations
drop policy if exists user_reports_insert on public.user_reports;
create policy user_reports_insert on public.user_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'pending'
    and reported_user_id <> (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = user_reports.conversation_id
        and (select auth.uid()) in (c.buyer_id, c.seller_id)
        and user_reports.reported_user_id in (c.buyer_id, c.seller_id)
    )
  );
drop policy if exists user_reports_select_admin on public.user_reports;
create policy user_reports_select_admin on public.user_reports
  for select to authenticated
  using ((select public.is_admin()));
drop policy if exists user_reports_update_admin on public.user_reports;
create policy user_reports_update_admin on public.user_reports
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.user_reports from anon, authenticated;
grant select, insert on public.user_reports to authenticated;
grant update (status) on public.user_reports to authenticated;
grant all on public.user_reports to service_role;

create or replace function public.user_report_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.user_reports
        where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'You can submit up to 5 reports per hour.';
    end if;
  elsif new.status is distinct from old.status and new.status <> 'pending' then
    new.resolved_at := now();
    new.resolved_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_report_rules on public.user_reports;
create trigger trg_user_report_rules
  before insert or update on public.user_reports
  for each row execute function public.user_report_rules();

create or replace function public.notify_new_user_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _name text;
begin
  select coalesce(full_name, 'Someone') into _name from public.users where id = new.reported_user_id;
  insert into public.notifications (user_id, type, title, body, conversation_id)
  select u.id, 'new_user_report', 'A person was reported',
    _name || ': ' || replace(new.reason, '_', ' ') || coalesce(' — ' || left(new.details, 120), ''),
    new.conversation_id
  from public.users u where u.role = 'admin';
  return new;
end;
$$;

drop trigger if exists trg_notify_new_user_report on public.user_reports;
create trigger trg_notify_new_user_report
  after insert on public.user_reports
  for each row execute function public.notify_new_user_report();

-- ------------------------------------------------------------------------------
-- 2. Held messages
-- ------------------------------------------------------------------------------
alter table public.messages add column if not exists held boolean not null default false;
alter table public.messages add column if not exists held_reason text;
create index if not exists idx_messages_held on public.messages (created_at) where held;

-- Held messages are visible only to their sender and admins
drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          public.is_admin()
          or (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
             and (not messages.held or messages.sender_id = auth.uid())
        )
    )
  );

-- ------------------------------------------------------------------------------
-- 3. Who may contact whom (suspensions and blocks), and the hold
-- ------------------------------------------------------------------------------
create or replace function public.guard_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _sender uuid;
  _recipient uuid;
  _c record;
begin
  -- Admins, and server/SQL Editor work with no signed-in user, are not limited
  if auth.uid() is null or public.is_admin() then
    if tg_table_name = 'messages' then
      new.held := false;
      new.held_reason := null;
    end if;
    return new;
  end if;

  if tg_table_name = 'messages' then
    select buyer_id, seller_id, is_admin_thread into _c from public.conversations where id = new.conversation_id;
    _sender := new.sender_id;
    _recipient := case when new.sender_id = _c.buyer_id then _c.seller_id else _c.buyer_id end;
    if _c.is_admin_thread then
      _recipient := null; -- writing to the OwnersMarket team is always allowed
    end if;
  elsif tg_table_name = 'conversations' then
    if new.is_admin_thread then
      return new;
    end if;
    _sender := new.buyer_id;
    _recipient := new.seller_id;
  else -- offers, viewing_requests
    _sender := new.buyer_id;
    select user_id into _recipient from public.listings where id = new.listing_id;
  end if;

  if _recipient is not null and exists (select 1 from public.messaging_suspensions where user_id = _sender) then
    raise exception using
      errcode = 'check_violation',
      message = 'Your account can''t contact other people right now. If you think this is a mistake, email hello@ownersmarket.ca.';
  end if;

  if _recipient is not null and exists (
    select 1 from public.user_blocks where blocker_id = _recipient and blocked_id = _sender
  ) then
    raise exception using
      errcode = 'check_violation',
      message = 'This person isn''t accepting messages from you.';
  end if;

  if tg_table_name = 'messages' then
    new.held := _recipient is not null
                and public.mentions_offsite_app(new.content)
                and public.has_contact_info(new.content);
    new.held_reason := case when new.held
      then 'Mentions another messaging app and shares contact details' end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_contact on public.messages;
create trigger trg_guard_contact
  before insert on public.messages
  for each row execute function public.guard_contact();
drop trigger if exists trg_guard_contact on public.conversations;
create trigger trg_guard_contact
  before insert on public.conversations
  for each row execute function public.guard_contact();
drop trigger if exists trg_guard_contact on public.offers;
create trigger trg_guard_contact
  before insert on public.offers
  for each row execute function public.guard_contact();
drop trigger if exists trg_guard_contact on public.viewing_requests;
create trigger trg_guard_contact
  before insert on public.viewing_requests
  for each row execute function public.guard_contact();

-- New message notification: not while held; sent when an admin approves it
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
  if new.held then
    -- Tell the admins something is waiting (once per message)
    if tg_op = 'INSERT' then
      insert into public.notifications (user_id, type, title, body, conversation_id)
      select u.id, 'message_held', 'A message is waiting for a safety check',
        coalesce(new.held_reason, 'Held message') || ': ' || left(new.content, 100), new.conversation_id
      from public.users u where u.role = 'admin';
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and not old.held then
    return new; -- only an approval (held -> not held) notifies
  end if;

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

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message
  after insert or update of held on public.messages
  for each row execute function public.notify_new_message();

-- Admin: approve a held message (to reject it, delete it)
create or replace function public.admin_release_message(_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve messages.';
  end if;
  update public.messages set held = false, held_reason = null where id = _message_id and held;
  if not found then
    raise exception 'This message is no longer waiting for review.';
  end if;
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. Lower limits for accounts less than a day old
-- ------------------------------------------------------------------------------
create or replace function public.limit_new_conversations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _new_account boolean;
begin
  if new.is_admin_thread then
    return new;
  end if;
  select created_at > now() - interval '24 hours' into _new_account from public.users where id = new.buyer_id;
  if coalesce(_new_account, false) then
    if (select count(*) from public.conversations
        where buyer_id = new.buyer_id and created_at > now() - interval '1 hour') >= 2 then
      raise exception 'New accounts can start up to 2 conversations per hour during their first day. Please try again later.';
    end if;
  elsif (select count(*) from public.conversations
         where buyer_id = new.buyer_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You can start up to 5 new conversations per hour. Please try again later.';
  end if;
  return new;
end;
$$;

create or replace function public.limit_message_flood()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _limit int := 60;
begin
  if exists (select 1 from public.users where id = new.sender_id and created_at > now() - interval '24 hours') then
    _limit := 20;
  end if;
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '10 minutes') >= _limit then
    raise exception 'You are sending messages too quickly. Please slow down.';
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. Admin → Safety: accounts that look like scammers
-- ------------------------------------------------------------------------------
-- One row per account with any warning sign in the last 7 days:
--   same_text_people: the most people they sent one identical message to
--   held_messages:    messages of theirs held for review
--   open_reports:     unresolved "report this person" reports about them
--   new_people_24h:   conversations they started in the last 24 hours
create or replace function public.admin_scam_signals()
returns table (
  user_id uuid,
  full_name text,
  email text,
  joined_at timestamptz,
  same_text_people int,
  held_messages int,
  open_reports int,
  new_people_24h int,
  messages_7d int,
  suspended boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can see this.';
  end if;
  return query
  with recent as (
    select m.sender_id, m.conversation_id, m.held,
           lower(regexp_replace(trim(m.content), '\s+', ' ', 'g')) as body
    from public.messages m
    where m.created_at > now() - interval '7 days'
  ),
  same_text as (
    select s.sender_id, max(s.n)::int as n
    from (select sender_id, body, count(distinct conversation_id) as n from recent group by sender_id, body) s
    group by s.sender_id
  ),
  per_sender as (
    select sender_id, count(*)::int as msgs, count(*) filter (where held)::int as held_n
    from recent group by sender_id
  ),
  convs as (
    select buyer_id, count(*)::int as n
    from public.conversations
    where created_at > now() - interval '24 hours' and not is_admin_thread
    group by buyer_id
  ),
  reps as (
    select reported_user_id, count(*)::int as n
    from public.user_reports where status = 'pending'
    group by reported_user_id
  )
  select u.id, u.full_name, u.email, u.created_at,
         coalesce(st.n, 0), coalesce(ps.held_n, 0), coalesce(r.n, 0), coalesce(c.n, 0), coalesce(ps.msgs, 0),
         exists (select 1 from public.messaging_suspensions ms where ms.user_id = u.id)
  from public.users u
  left join same_text st on st.sender_id = u.id
  left join per_sender ps on ps.sender_id = u.id
  left join convs c on c.buyer_id = u.id
  left join reps r on r.reported_user_id = u.id
  where u.role <> 'admin'
    and (coalesce(st.n, 0) >= 3 or coalesce(ps.held_n, 0) > 0 or coalesce(r.n, 0) > 0 or coalesce(c.n, 0) >= 4)
  order by coalesce(r.n, 0) * 3 + coalesce(ps.held_n, 0) * 2 + greatest(coalesce(st.n, 0) - 2, 0) + greatest(coalesce(c.n, 0) - 3, 0) desc,
           u.created_at desc
  limit 100;
end;
$$;

-- ------------------------------------------------------------------------------
-- 6. Function permissions (trigger functions locked, as in migration 009)
-- ------------------------------------------------------------------------------
revoke execute on function public.mentions_offsite_app(text) from public, anon, authenticated;
revoke execute on function public.has_contact_info(text) from public, anon, authenticated;
revoke execute on function public.guard_contact() from public, anon, authenticated;
revoke execute on function public.notify_new_message() from public, anon, authenticated;
revoke execute on function public.user_report_rules() from public, anon, authenticated;
revoke execute on function public.notify_new_user_report() from public, anon, authenticated;
revoke execute on function public.limit_new_conversations() from public, anon, authenticated;
revoke execute on function public.limit_message_flood() from public, anon, authenticated;
revoke execute on function public.admin_release_message(uuid) from public, anon;
grant execute on function public.admin_release_message(uuid) to authenticated;
revoke execute on function public.admin_scam_signals() from public, anon;
grant execute on function public.admin_scam_signals() to authenticated;

commit;
