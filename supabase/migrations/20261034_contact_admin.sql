-- ==============================================================================
-- Sellers can message the OwnersMarket team from their dashboard
-- ==============================================================================
-- Reuses the admin message threads (conversations.is_admin_thread): the admin is the
-- "buyer" side and shows as "Charles - Admin". Until now only the admin could start one
-- (admin_start_conversation); this lets the owner of a listing start (or reopen) theirs.
-- Admin threads are already left out of the new-conversation limit and the inquiry count,
-- and every message notifies the other side (in the bell and by email).
--
-- Safe to apply before the website that uses it is published: nothing calls it yet.

create or replace function public.contact_admin(_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _me uuid := auth.uid();
  _admin uuid;
  _id uuid;
begin
  if _me is null then
    raise exception 'Please sign in first.';
  end if;
  if not exists (select 1 from public.listings where id = _listing_id and user_id = _me) then
    raise exception 'Listing not found.';
  end if;
  select id into _admin from public.users where role = 'admin' order by created_at limit 1;
  if _admin is null then
    raise exception 'Our team can''t be reached here right now. Please email hello@ownersmarket.ca.';
  end if;
  if _admin = _me then
    raise exception 'This is your own listing.';
  end if;

  -- One thread per listing between the admin and its owner (the same one the admin uses)
  select id into _id from public.conversations where listing_id = _listing_id and buyer_id = _admin;
  if _id is null then
    insert into public.conversations (listing_id, buyer_id, seller_id, is_admin_thread)
    values (_listing_id, _admin, _me, true)
    returning id into _id;
  else
    update public.conversations set is_admin_thread = true where id = _id and not is_admin_thread;
  end if;
  return _id;
end;
$$;
revoke execute on function public.contact_admin(uuid) from public, anon;
grant execute on function public.contact_admin(uuid) to authenticated;
