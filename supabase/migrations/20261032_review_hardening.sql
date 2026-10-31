-- Review hardening (site review 2026-10-30: H1, L1, L2)
-- Safe to run more than once.

-- H1. A seller must not be able to edit the words or location of a PAUSED listing without it
--     going back to review. The old rule only looked at a status that did not change; the
--     pause/resume change itself could carry the edit through. Now: if the listing was live or
--     paused and the new status is live or paused, any change to the reviewed fields sends it
--     to review. (Everything else in this function is unchanged.)
create or replace function public.protect_listing_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    -- Only the view counter (public.increment_listing_views) may change views_count.
    if coalesce(current_setting('app.view_bump', true), '') <> 'on' then
      new.views_count := old.views_count;
    end if;
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

    -- An approved listing whose words or location change goes back to review, including
    -- when the same save pauses or resumes it.
    -- Price, rooms, size, year, parking, fees, taxes and cash-back don't need it.
    -- (A listing on admin hold stays paused; the admin reviews it when lifting the hold.)
    if old.status in ('live', 'paused') and new.status in ('live', 'paused') and not old.admin_hold and (
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
$function$;

-- L1. The two edit-review tables only need normal read/write for signed-in users (row rules
--     still apply). Remove TRUNCATE, REFERENCES, TRIGGER and MAINTAIN, and stop new tables
--     from receiving them automatically.
revoke truncate, references, trigger, maintain on table public.listing_pending_edits from anon, authenticated;
revoke truncate, references, trigger, maintain on table public.listing_photo_cleanup from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate, references, trigger, maintain on tables from anon, authenticated;
alter default privileges for role postgres revoke truncate, references, trigger, maintain on tables from anon, authenticated;

-- L2. Trigger functions are not meant to be called directly. Triggers keep working.
revoke execute on function public.guard_pending_edit() from public, anon, authenticated;
revoke execute on function public.notify_pending_edit() from public, anon, authenticated;
