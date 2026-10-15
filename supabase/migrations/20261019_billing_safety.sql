-- ==============================================================================
-- OwnersMarket — Migration 010: Billing safety
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 009), AFTER the new edge
-- functions (delete-account, listing-action) are deployed and the matching
-- website update is published. Safe to run twice. One transaction.
--
--   1. One Stripe customer per person (billing_customers), so every subscription
--      a person has shows up in "Manage billing".
--   2. A listing with a running subscription can't be marked sold, taken down or
--      deleted straight from the browser. Those go through the listing-action
--      edge function, which ends the subscription in Stripe first.
--   3. Accounts are deleted only through the delete-account edge function, which
--      cancels the person's subscriptions and removes their photos first.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. One Stripe customer per person (private: only the server can read it)
-- ------------------------------------------------------------------------------
create table if not exists public.billing_customers (
  user_id uuid primary key references public.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
revoke all on public.billing_customers from anon, authenticated;
grant all on public.billing_customers to service_role;

-- Existing customers: keep the most recently used one per person
insert into public.billing_customers (user_id, stripe_customer_id)
select distinct on (user_id) user_id, stripe_customer_id
from public.listing_billing
order by user_id, updated_at desc
on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 2. Sold / take-down / delete must end billing first
-- ------------------------------------------------------------------------------
create or replace function public.guard_listing_billing_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _billing_running boolean;
begin
  -- The server (edge functions, SQL Editor) has no signed-in user and may proceed:
  -- the edge functions end the Stripe subscription before changing the listing.
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  _billing_running := old.payment_status in ('active', 'past_due') and not old.cancel_at_period_end;
  if not _billing_running then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'This listing has an active subscription. Use Delete in your dashboard so billing is stopped first.';
  end if;

  if new.status is distinct from old.status
     and old.status in ('live', 'paused')
     and new.status in ('sold', 'rejected') then
    raise exception 'This listing has an active subscription. Use the dashboard so billing is ended first.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_listing_billing_end on public.listings;
create trigger trg_guard_listing_billing_end
  before update of status or delete on public.listings
  for each row execute function public.guard_listing_billing_end();

revoke execute on function public.guard_listing_billing_end() from public, anon, authenticated;
grant execute on function public.guard_listing_billing_end() to service_role;

-- ------------------------------------------------------------------------------
-- 3. Account deletion only through the delete-account edge function
-- ------------------------------------------------------------------------------
revoke execute on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to service_role;

commit;
