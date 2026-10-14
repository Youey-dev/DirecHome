-- ==============================================================================
-- DirectHome BC — Migration 004: Table permissions for the website
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 003).
--
-- Why: newer Supabase projects do not automatically let the website's database
-- connection touch your tables, which shows up as "permission denied for table".
-- This grants ONLY what the app needs. The Row Level Security rules from earlier
-- scripts still decide which rows each person can see or change.
--
-- Safe to run more than once. Runs as one transaction.
-- ==============================================================================

begin;

grant usage on schema public to anon, authenticated, service_role;

-- Logged-out visitors: browse live listings and their photos only.
-- (Row rules limit this to listings with status = 'live'.)
grant select on public.listings to anon;
grant select on public.listing_photos to anon;

-- Signed-in people (buyers, homeowners, admin). Row rules decide who can do what.
grant select, update                 on public.users                   to authenticated;
grant select, insert, update, delete on public.listings                to authenticated;
grant select, insert, update, delete on public.listing_photos          to authenticated;
grant select, insert, update, delete on public.listing_private_details to authenticated;
grant select, insert, update         on public.verifications           to authenticated;
grant select, insert                 on public.conversations           to authenticated;
grant select, insert                 on public.messages                to authenticated;
grant select, insert, update         on public.viewing_requests        to authenticated;
grant select, insert, delete         on public.favourites              to authenticated;
grant select, insert, update         on public.reports                 to authenticated;

-- Server-side role used only by the Supabase dashboard / trusted tools
grant all on all tables in schema public to service_role;

-- Functions the app calls directly
grant execute on function public.increment_listing_views(uuid) to anon, authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

commit;
