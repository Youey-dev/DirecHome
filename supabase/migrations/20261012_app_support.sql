-- ==============================================================================
-- DirectHome BC — Migration 003: App support
-- Run ONCE in Supabase Dashboard -> SQL Editor, AFTER 002_security_hardening.sql
--
-- What this does:
--   1. Records when each user accepted the Terms (and which version)
--   2. Adds the "delete my account" function used by the Privacy page (PIPEDA)
--   3. Fixes the cash-back sanity rule so percentage-style offers are accepted
--
-- Runs as one transaction: if anything fails, nothing is changed.
-- Safe to run more than once.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. TERMS ACCEPTANCE AUDIT TRAIL
-- ------------------------------------------------------------------------------
alter table public.users add column if not exists terms_accepted_at timestamptz;
alter table public.users add column if not exists terms_version text;

-- Same as before, but also stores terms acceptance sent at signup.
-- The role is STILL forced to buyer or seller: nobody can sign up as admin.
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
    case when new.raw_user_meta_data->>'role' = 'seller'
         then 'seller'::public.user_role
         else 'buyer'::public.user_role end,
    case when _terms is not null then now() end,
    _terms
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. SELF-SERVE ACCOUNT DELETION (PIPEDA / BC PIPA right to erasure)
-- Deleting the sign-in account cascades to the profile, listings, photos rows,
-- ownership-document records, messages, viewing requests and favourites.
-- The app removes the uploaded files from storage first.
-- ------------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  _uid uuid := auth.uid();
begin
  if _uid is null then
    raise exception 'You must be signed in to delete your account.';
  end if;

  if exists (select 1 from public.users where id = _uid and role = 'admin') then
    raise exception 'Administrator accounts must be removed by another administrator in the Supabase dashboard.';
  end if;

  delete from auth.users where id = _uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

-- ------------------------------------------------------------------------------
-- 3. FIX: cash-back is stored as a dollar amount (even when the seller picked a
--    percentage), so the earlier "percentage max 100" rule was too strict.
-- ------------------------------------------------------------------------------
alter table public.listings drop constraint if exists listing_cashback_sane;
alter table public.listings add constraint listing_cashback_sane
  check (cashback_amount >= 0 and cashback_amount <= price);

commit;
