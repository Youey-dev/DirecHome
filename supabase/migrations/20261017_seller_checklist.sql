-- ==============================================================================
-- OwnersMarket — Migration 008: Seller checklist
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 007).
--
-- Saves which steps of the seller checklist each seller has ticked, per listing,
-- so the ticks follow them to any device. Only the listing's owner can see or
-- change their checklist. One transaction. Safe to run twice.
-- ==============================================================================

begin;

create table if not exists public.seller_checklists (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The ticked step keys, e.g. ["lawyer", "documents"]
  done text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint seller_checklist_size check (cardinality(done) <= 50)
);

alter table public.seller_checklists enable row level security;

-- Owner of the listing only (admins don't need it)
drop policy if exists "seller_checklists_select" on public.seller_checklists;
create policy "seller_checklists_select"
  on public.seller_checklists for select
  using (user_id = auth.uid());

drop policy if exists "seller_checklists_insert" on public.seller_checklists;
create policy "seller_checklists_insert"
  on public.seller_checklists for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  );

drop policy if exists "seller_checklists_update" on public.seller_checklists;
create policy "seller_checklists_update"
  on public.seller_checklists for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  );

drop policy if exists "seller_checklists_delete" on public.seller_checklists;
create policy "seller_checklists_delete"
  on public.seller_checklists for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.seller_checklists to authenticated;
grant all on public.seller_checklists to service_role;

commit;
