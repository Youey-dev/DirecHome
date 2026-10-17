-- ==============================================================================
-- OwnersMarket — Migration 015: "Agents welcome" (buyer's agent commission offer)
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 014). Safe to run twice.
--
-- A seller can say they welcome buyers who have an agent, and what commission they would
-- pay that agent's brokerage: a percentage of the price, a fixed amount, or "to be negotiated".
-- It is the seller's own offer, agreed in writing with the brokerage. OwnersMarket is not part
-- of it and receives nothing (our fee stays a flat monthly listing fee).
-- No free text, so nothing here needs a content review.
-- ==============================================================================

begin;

alter table public.listings add column if not exists agents_welcome boolean not null default false;
alter table public.listings add column if not exists agent_commission_type text;
alter table public.listings add column if not exists agent_commission_value numeric;

alter table public.listings drop constraint if exists agent_commission_valid;
alter table public.listings add constraint agent_commission_valid check (
  (not agents_welcome and agent_commission_type is null and agent_commission_value is null)
  or (agents_welcome and agent_commission_type = 'percent' and agent_commission_value between 0.25 and 5)
  or (agents_welcome and agent_commission_type = 'fixed' and agent_commission_value between 500 and 100000)
  or (agents_welcome and agent_commission_type = 'negotiable' and agent_commission_value is null)
);

-- Public like the other listing details (only matters on listings the person can see)
grant select (agents_welcome, agent_commission_type, agent_commission_value) on public.listings to anon, authenticated;
grant insert (agents_welcome, agent_commission_type, agent_commission_value) on public.listings to authenticated;
grant update (agents_welcome, agent_commission_type, agent_commission_value) on public.listings to authenticated;

commit;
