-- ==============================================================================
-- OwnersMarket — Migration 009: Lock down database functions
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 008). Safe to run twice.
--
-- Supabase's security check flagged that internal helper functions could be called
-- directly through the public API. This removes that, keeping only the functions the
-- website actually calls:
--
--   Kept (called by the site or by security rules):
--     increment_listing_views  anyone (counts listing views)
--     is_admin                 anyone (used by the row-level security rules)
--     listing_is_public        anyone (used by the row-level security rules)
--     mark_conversation_read   signed-in users only
--     delete_my_account        signed-in users only
--
--   Locked (trigger functions; they still run automatically when data changes, because
--   PostgreSQL doesn't check EXECUTE permission when firing a trigger):
--     bump_listing_counter, guard_user_changes, guard_viewing_update, handle_new_user,
--     limit_message_flood, limit_new_conversations, limit_reports, limit_viewing_requests,
--     notify_listing_payment, notify_listing_status, notify_new_message, notify_new_report,
--     notify_viewing_requested, notify_viewing_status, protect_listing_fields,
--     stamp_report_resolution, touch_conversation
--
-- Also pins listing_is_public's search_path (security best practice).
-- ==============================================================================

begin;

-- 1. Trigger functions: nobody calls these directly
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- 2. Signed-in only
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 3. Anyone (unchanged, stated explicitly)
grant execute on function public.increment_listing_views(uuid) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- 4. Pin the search path of the one function missing it
alter function public.listing_is_public(public.listing_status, text, timestamptz) set search_path = public;

commit;
