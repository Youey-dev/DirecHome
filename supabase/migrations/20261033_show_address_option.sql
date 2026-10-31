-- ==============================================================================
-- Let an owner show their exact address to everyone (off by default)
-- ==============================================================================
-- By default the exact address (listing_private_details) is only readable by the owner, admins
-- and buyers with a confirmed viewing; the public map shows an approximate area. With
-- show_address on, anyone can read the address and exact map position of that listing while it
-- is public (live and paid, or on a free promo).
--
-- Apply BEFORE publishing the website that uses it: the website asks for show_address.
-- Safe for the current website, which never asks for it.

alter table public.listings add column if not exists show_address boolean not null default false;

-- listings uses column-level read access (billing columns are private): add the new column
grant select (show_address) on public.listings to anon, authenticated;

-- True when this listing is public AND its owner chose to show the address
create or replace function public.listing_address_is_public(_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.id = _listing_id
      and l.show_address
      and public.listing_is_public(l.status, l.payment_status, l.past_due_since)
  );
$$;
revoke execute on function public.listing_address_is_public(uuid) from public;
grant execute on function public.listing_address_is_public(uuid) to anon, authenticated;

-- Visitors (signed in or not) can read a shown address. The existing rule (owner, admins,
-- confirmed viewings) now applies to signed-in people only, so visitors are never checked
-- against tables they can't read.
alter policy private_details_select on public.listing_private_details to authenticated;

drop policy if exists private_details_shown_address on public.listing_private_details;
create policy private_details_shown_address on public.listing_private_details
  for select to anon, authenticated
  using (public.listing_address_is_public(listing_id));

-- Visitors only get the address columns (not created_at / updated_at)
grant select (listing_id, street_address, unit_number, postal_code, exact_lat, exact_lng)
  on public.listing_private_details to anon;
