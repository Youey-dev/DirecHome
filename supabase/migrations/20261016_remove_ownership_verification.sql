-- ==============================================================================
-- DirectHome BC — Migration 007: Remove ownership verification
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 006).
--
-- New flow: owner submits -> admin does a quick content review (approve, or send
-- back with a reason) -> owner activates ($25/month) -> live.
-- DirectHome no longer collects or stores ownership documents.
--
--   1. Adds listings.review_notes (the reason shown when a listing is sent back)
--   2. Removes the "must have a verified document" rules
--   3. Deletes the ownership-document records and their table
--   4. Removes the document storage permissions
-- The stored FILES are deleted by hand afterwards (Storage -> private_verification_docs).
-- One transaction. Safe to run twice.
-- ==============================================================================

begin;

-- 1. Review notes (only admins can set them; owners can read their own)
alter table public.listings add column if not exists review_notes text;
alter table public.listings drop constraint if exists listing_review_notes_len;
alter table public.listings add constraint listing_review_notes_len
  check (review_notes is null or char_length(review_notes) <= 500);

-- 2. Listing rules, now without any document requirement
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
      new.payment_status := 'unpaid';
      new.past_due_since := null;
      new.cancel_at_period_end := false;
      new.review_notes := null;
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
    new.past_due_since := old.past_due_since;
    new.cancel_at_period_end := old.cancel_at_period_end;
    new.review_notes := old.review_notes;
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
        raise exception 'Sellers cannot change a listing from % to %. Only the DirectHome review team can do that.',
          old.status, new.status;
      end if;
    end if;
  end if;

  return new;
end;
$$;

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
    select u.id, 'listing_in_review', 'New listing awaiting review',
      '"' || new.headline || '" in ' || new.city || ' is waiting for review.', new.id
    from public.users u where u.role = 'admin';
  end if;
  return new;
end;
$$;

-- 3. Remove ownership-document records, rules and table
drop function if exists public.apply_verification_decision() cascade;
drop function if exists public.stamp_verification_audit() cascade;
drop table if exists public.verifications cascade;
drop type if exists public.verification_doc_type;
drop type if exists public.verification_status;

-- 4. Nobody can upload or read ownership documents any more
drop policy if exists "dh_docs_select" on storage.objects;
drop policy if exists "dh_docs_owner_insert" on storage.objects;
drop policy if exists "dh_docs_delete" on storage.objects;

commit;
