-- ==============================================================================
-- Accurate view counts: admin corrections, and no counting of your own visits
-- ==============================================================================
-- 1. Admins can lower or reset a listing's view count (for test visits, bots and the like).
--    Every correction is logged with who made it, the old and new count and a reason.
--    Counts can't be raised: sellers rely on them to judge whether their listing is working.
-- 2. Views by OwnersMarket admins and by the listing's own owner are no longer counted.

create table if not exists public.listing_view_corrections (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  admin_id uuid references public.users(id) on delete set null,
  old_count integer not null,
  new_count integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists listing_view_corrections_listing_idx on public.listing_view_corrections (listing_id, created_at desc);

alter table public.listing_view_corrections enable row level security;
drop policy if exists "Admins read view corrections" on public.listing_view_corrections;
create policy "Admins read view corrections" on public.listing_view_corrections
  for select to authenticated using (public.is_admin());
-- No insert/update/delete policies: only admin_correct_views() writes here.

create or replace function public.admin_correct_views(_listing_id uuid, _new_count integer, _reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _old integer;
  _why text := btrim(coalesce(_reason, ''));
begin
  if not public.is_admin() then
    raise exception 'Only OwnersMarket admins can correct view counts.';
  end if;
  if length(_why) < 3 or length(_why) > 300 then
    raise exception 'Give a short reason for the correction (3 to 300 characters).';
  end if;

  select views_count into _old from public.listings where id = _listing_id for update;
  if not found then
    raise exception 'Listing not found.';
  end if;
  if _new_count is null or _new_count < 0 or _new_count > _old then
    raise exception 'The view count can only be lowered (to a number from 0 to %).', _old;
  end if;
  if _new_count = _old then
    return _old;
  end if;

  update public.listings set views_count = _new_count where id = _listing_id;
  insert into public.listing_view_corrections (listing_id, admin_id, old_count, new_count, reason)
  values (_listing_id, auth.uid(), _old, _new_count, _why);
  return _new_count;
end;
$$;

revoke all on function public.admin_correct_views(uuid, integer, text) from public, anon;
grant execute on function public.admin_correct_views(uuid, integer, text) to authenticated;

-- Don't count visits from admins or from the listing's owner
create or replace function public.increment_listing_views(_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.is_admin() then
    return;
  end if;
  perform set_config('app.view_bump', 'on', true);   -- true = this transaction only
  update public.listings set views_count = views_count + 1
  where id = _listing_id
    and public.listing_is_public(status, payment_status, past_due_since)
    and user_id is distinct from auth.uid();
  perform set_config('app.view_bump', '', true);
end;
$$;
