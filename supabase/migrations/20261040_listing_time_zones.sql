-- ==============================================================================
-- Times in notices use the home's own time zone
-- ==============================================================================
-- Open house times, offer deadlines and free-period end dates in notices and emails were shown
-- in the province's main zone (or Toronto time for offers and free periods). They now use the
-- home's own zone: its province, or its city where that keeps different time (Cranbrook and the
-- East Kootenay, Creston, Dawson Creek, Fort Nelson, Lloydminster, Kenora and northwestern
-- Ontario, Atikokan, the Magdalen Islands, Labrador, central and western Nunavut).
-- Kept in step with timeZoneFor() in src/lib/listingNews.ts.
--
-- Safe to apply any time: only the wording of new notices changes.

create or replace function public.listing_time_zone(_province text, _city text)
returns text
language sql
immutable
set search_path = public
as $$
  with c as (
    select regexp_replace(regexp_replace(lower(translate(coalesce(_city, ''),
             'ÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜÇàáâäèéêëìíîïòóôöùúûüç', 'AAAAEEEEIIIIOOOOUUUUCaaaaeeeeiiiioooouuuuc')),
             '[.]', '', 'g'), '[-\s]+', ' ', 'g') as city,
           upper(coalesce(_province, '')) as prov
  )
  select case
    when prov = 'BC' and city in ('cranbrook', 'kimberley', 'fernie', 'sparwood', 'elkford', 'invermere', 'golden',
                                  'radium hot springs', 'canal flats', 'jaffray', 'field') then 'America/Edmonton'
    when prov = 'BC' and city = 'creston' then 'America/Creston'
    when prov = 'BC' and city in ('dawson creek', 'pouce coupe', 'chetwynd', 'fort st john', 'fort saint john', 'taylor',
                                  'hudson''s hope', 'hudsons hope', 'tumbler ridge') then 'America/Dawson_Creek'
    when prov = 'BC' and city = 'fort nelson' then 'America/Fort_Nelson'
    when prov = 'SK' and city = 'lloydminster' then 'America/Edmonton'
    when prov = 'ON' and city in ('kenora', 'dryden', 'sioux lookout', 'fort frances', 'rainy river', 'red lake', 'emo',
                                  'keewatin', 'vermilion bay', 'ear falls', 'ignace') then 'America/Winnipeg'
    when prov = 'ON' and city = 'atikokan' then 'America/Atikokan'
    when prov = 'QC' and city in ('iles de la madeleine', 'magdalen islands', 'cap aux meules') then 'America/Halifax'
    when prov = 'NL' and city in ('happy valley goose bay', 'goose bay', 'happy valley', 'labrador city', 'wabush',
                                  'churchill falls', 'north west river', 'nain', 'hopedale', 'makkovik') then 'America/Goose_Bay'
    when prov = 'NU' and city in ('rankin inlet', 'arviat', 'baker lake', 'chesterfield inlet', 'naujaat', 'whale cove',
                                  'coral harbour') then 'America/Rankin_Inlet'
    when prov = 'NU' and city in ('cambridge bay', 'kugluktuk', 'gjoa haven', 'taloyoak', 'kugaaruk') then 'America/Cambridge_Bay'
    when prov = 'NU' and city = 'resolute' then 'America/Resolute'
    else case prov
      when 'BC' then 'America/Vancouver' when 'AB' then 'America/Edmonton' when 'SK' then 'America/Regina'
      when 'MB' then 'America/Winnipeg' when 'ON' then 'America/Toronto' when 'QC' then 'America/Toronto'
      when 'NB' then 'America/Moncton' when 'NS' then 'America/Halifax' when 'PE' then 'America/Halifax'
      when 'NL' then 'America/St_Johns' when 'YT' then 'America/Whitehorse' when 'NT' then 'America/Yellowknife'
      when 'NU' then 'America/Iqaluit' else 'America/Toronto' end
  end
  from c;
$$;

-- "Sat, Nov 15, 2:00 – 4:00 pm" in the home's own time zone (the city is looked up from the open house)
create or replace function public.open_house_when(_o public.open_houses, _province text)
returns text
language sql
stable
set search_path = public
as $$
  select to_char(_o.starts_at at time zone z, 'Dy, Mon FMDD, FMHH12:MI ')
         || lower(to_char(_o.starts_at at time zone z, 'am')) || ' – '
         || to_char(_o.ends_at at time zone z, 'FMHH12:MI ') || lower(to_char(_o.ends_at at time zone z, 'am'))
  from (
    select public.listing_time_zone(coalesce(l.province, _province), l.city) as z
      from (select 1) one
      left join public.listings l on l.id = _o.listing_id
  ) tz;
$$;

-- Offer deadlines and free-period dates: same functions, with the home's zone instead of Toronto's.
-- (Rewritten from their current definitions, so nothing else in them changes.)
do $$
declare
  _def text;
  _new text;
begin
  -- New offer notice: "It's open until Nov 18"
  _def := pg_get_functiondef('public.make_offer(uuid, numeric, numeric, date, timestamptz, text[], text, text)'::regprocedure);
  _new := replace(_def, '_open_until at time zone ''America/Toronto''', '_open_until at time zone public.listing_time_zone(_l.province, _l.city)');
  if _new = _def and position('listing_time_zone' in _def) = 0 then raise exception 'make_offer: text not found'; end if;
  execute _new;

  -- Promo code applied: "free until February 15, 2027"
  _def := pg_get_functiondef('public.redeem_promo(uuid, text, boolean)'::regprocedure);
  _new := replace(_def, '_until at time zone ''America/Toronto''', '_until at time zone public.listing_time_zone(_l.province, _l.city)');
  if _new = _def and position('listing_time_zone' in _def) = 0 then raise exception 'redeem_promo: text not found'; end if;
  execute _new;

  -- Admin gave free months
  _def := pg_get_functiondef('public.admin_give_free_months(uuid, integer)'::regprocedure);
  _new := replace(_def, '_until at time zone ''America/Toronto''', '_until at time zone public.listing_time_zone(_l.province, _l.city)');
  if _new = _def and position('listing_time_zone' in _def) = 0 then raise exception 'admin_give_free_months: text not found'; end if;
  execute _new;

  -- Free period ending reminder
  _def := pg_get_functiondef('public.process_free_periods()'::regprocedure);
  _new := replace(_def, 'select id, user_id, headline, complimentary_until from public.listings',
                        'select id, user_id, headline, complimentary_until, province, city from public.listings');
  _new := replace(_new, '_l.complimentary_until at time zone ''America/Toronto''',
                        '_l.complimentary_until at time zone public.listing_time_zone(_l.province, _l.city)');
  if _new = _def and position('listing_time_zone' in _def) = 0 then raise exception 'process_free_periods: text not found'; end if;
  execute _new;
end;
$$;
