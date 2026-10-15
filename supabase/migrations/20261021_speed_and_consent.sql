-- ==============================================================================
-- OwnersMarket — Migration 012: Email consent record, indexes, tidy permissions
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 011). Safe to run twice.
-- The website works before and after this runs. One transaction.
--
--   1. Email preferences (CASL) are saved on the person's profile with the date they
--      last changed, so there is a record of who agreed to marketing email and when.
--   2. Indexes for the anti-spam limits and for the links Supabase flagged as unindexed.
--   3. Removes table permissions the website never uses (TRUNCATE, REFERENCES, TRIGGER).
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. CASL consent record (marketing and the weekly digest start OFF)
-- ------------------------------------------------------------------------------
alter table public.users add column if not exists email_marketing_opt_in boolean not null default false;
alter table public.users add column if not exists email_digest_opt_in boolean not null default false;
alter table public.users add column if not exists email_prefs_updated_at timestamptz;

create or replace function public.stamp_email_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_marketing_opt_in is distinct from old.email_marketing_opt_in
     or new.email_digest_opt_in is distinct from old.email_digest_opt_in then
    new.email_prefs_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_email_prefs on public.users;
create trigger trg_stamp_email_prefs
  before update on public.users
  for each row execute function public.stamp_email_prefs();

revoke execute on function public.stamp_email_prefs() from public, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. Indexes
-- ------------------------------------------------------------------------------
-- Anti-spam limits count each person's recent activity
create index if not exists idx_messages_sender_recent on public.messages (sender_id, created_at desc);
create index if not exists idx_conversations_buyer_recent on public.conversations (buyer_id, created_at desc);
create index if not exists idx_viewing_requests_buyer_recent on public.viewing_requests (buyer_id, created_at desc);
create index if not exists idx_reports_reporter_recent on public.reports (reporter_id, created_at desc);

-- Links Supabase's performance check flagged
create index if not exists idx_conversations_seller on public.conversations (seller_id);
create index if not exists idx_favourites_listing on public.favourites (listing_id);
create index if not exists idx_notifications_conversation on public.notifications (conversation_id);
create index if not exists idx_notifications_listing on public.notifications (listing_id);
create index if not exists idx_notifications_viewing on public.notifications (viewing_id);
create index if not exists idx_reports_listing on public.reports (listing_id);
create index if not exists idx_reports_resolved_by on public.reports (resolved_by);
create index if not exists idx_seller_checklists_user on public.seller_checklists (user_id);

-- Browse loads live listings newest first
create index if not exists idx_listings_status_created on public.listings (status, created_at desc);

-- ------------------------------------------------------------------------------
-- 3. Permissions the website never uses
-- ------------------------------------------------------------------------------
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

commit;
