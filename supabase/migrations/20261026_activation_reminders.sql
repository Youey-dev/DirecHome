-- ==============================================================================
-- OwnersMarket — Migration 016: Reminders to activate an approved listing
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 015). Safe to run twice.
-- The website works before and after this runs; no website deploy is needed for it.
--
-- When a listing is approved, the owner must tap "Activate listing" (Stripe checkout) before
-- buyers can see it. Some owners never do. Once a day this finds approved listings that were
-- never paid and gives the owner a reminder notification, which the existing email job
-- (migration 014) also emails, unless they switched those emails off.
--
--   * At most 3 reminders per listing: 2, 7 and 14 days after approval. Then it stops.
--   * Only listings that are live (approved), never paid ('unpaid'), not paused by an admin.
--     Free listings, paying ones, cancelled ones and listings back in review get nothing.
--   * Runs daily at 17:05 UTC (10:05 am in BC in summer, 9:05 am in winter).
--
-- To stop the reminders:   select cron.unschedule('activation-reminders');
-- ==============================================================================

create or replace function public.queue_activation_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _l record;
  _queued integer := 0;
  _title text;
  _body text;
begin
  for _l in
    select l.id, l.user_id, l.headline,
           coalesce(
             (select max(n.created_at) from public.notifications n
               where n.listing_id = l.id and n.type = 'listing_live'),
             l.updated_at
           ) as approved_at,
           (select count(*) from public.notifications n
             where n.listing_id = l.id and n.type = 'activation_reminder') as sent,
           (select max(n.created_at) from public.notifications n
             where n.listing_id = l.id and n.type = 'activation_reminder') as last_sent
    from public.listings l
    where l.status = 'live'
      and l.payment_status = 'unpaid'
      and not coalesce(l.admin_hold, false)
  loop
    -- Reminder 1 after 2 days, 2 after 7 days, 3 after 14 days (and never two within 3 days)
    if _l.sent >= 3 then continue; end if;
    if now() - _l.approved_at < (case _l.sent when 0 then interval '2 days' when 1 then interval '7 days' else interval '14 days' end) then
      continue;
    end if;
    if _l.last_sent is not null and now() - _l.last_sent < interval '3 days' then continue; end if;

    if _l.sent = 2 then
      _title := 'Last reminder: your listing isn’t showing yet';
      _body := '"' || _l.headline || '" was approved, but buyers still can’t see it. Open your dashboard and tap "Activate listing" to publish it: $24.99 a month, cancel any time. This is the last reminder we’ll send about it.';
    else
      _title := 'Your listing is approved and waiting';
      _body := '"' || _l.headline || '" was approved, but buyers can’t see it yet. Open your dashboard and tap "Activate listing" to publish it: $24.99 a month, cancel any time. Questions? Email hello@ownersmarket.ca.';
    end if;

    insert into public.notifications (user_id, type, title, body, listing_id)
    values (_l.user_id, 'activation_reminder', _title, _body, _l.id);
    _queued := _queued + 1;
  end loop;
  return _queued;
end;
$$;

-- Only the scheduler (and the SQL Editor) may run it
revoke execute on function public.queue_activation_reminders() from public, anon, authenticated;

-- Once a day (re-running this file replaces the job)
select cron.schedule('activation-reminders', '5 17 * * *', $job$ select public.queue_activation_reminders(); $job$);
