-- ==============================================================================
-- "Recently sold by owners" on the browse page (at most 3, last 90 days)
-- ==============================================================================
-- Only real listings their owner marked sold, and only if the owner left "Show my home as
-- Sold" ticked. Never the sale price: just the asking price, the home's basics, the area,
-- the cover photo and the month it sold.
--
-- Apply BEFORE publishing the website that uses it (the site sets show_as_sold when a seller
-- marks a home sold). Safe for the current site, which doesn't use any of this.

alter table public.listings add column if not exists sold_at timestamptz;
alter table public.listings add column if not exists show_as_sold boolean not null default true;

-- listings uses column-level access: the owner can read and change their choice
grant select (sold_at, show_as_sold) on public.listings to authenticated;
grant update (show_as_sold) on public.listings to authenticated;

-- When a listing becomes sold, remember when (and forget it if it's ever un-sold)
create or replace function public.stamp_sold_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'sold' and old.status is distinct from 'sold' then
    new.sold_at := now();
  elsif new.status is distinct from 'sold' then
    new.sold_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_sold_at on public.listings;
create trigger trg_stamp_sold_at
  before update of status on public.listings
  for each row execute function public.stamp_sold_at();

-- The three most recent sales anyone may see
create or replace function public.recently_sold()
returns table (
  id uuid,
  headline text,
  property_type text,
  neighborhood text,
  city text,
  province text,
  bedrooms integer,
  bathrooms numeric,
  sqft integer,
  price numeric,
  sold_at timestamptz,
  photo_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.headline, l.property_type::text, l.neighborhood, l.city, l.province,
         l.bedrooms, l.bathrooms, l.sqft, l.price, l.sold_at,
         (select coalesce(p.thumbnail_url, p.url) from public.listing_photos p
           where p.listing_id = l.id order by p.is_cover desc, p.sort_order limit 1)
  from public.listings l
  where l.status = 'sold'
    and l.show_as_sold
    and l.sold_at > now() - interval '90 days'
  order by l.sold_at desc
  limit 3;
$$;
revoke execute on function public.recently_sold() from public;
grant execute on function public.recently_sold() to anon, authenticated;
