-- ==============================================================================
-- OwnersMarket — Block links in messages (anti-scam)
-- Run ONCE in Supabase Dashboard -> SQL Editor (after 20261042). Safe to run twice.
--
-- A scammer has been asking people to "continue on Teams" and sending a link that installs
-- software. From now on, messages between buyers and owners can't contain web links or web
-- addresses, including disguised ones ("example dot com", "example[.]com", "example . com",
-- "hxxp://", "www dot ..."). Email addresses are still allowed. Admins are not affected.
--
-- The same rule covers the notes buyers and owners exchange on offers and viewing requests.
-- The website checks first and shows a friendly error; this is the rule that can't be skipped.
-- KEEP IN SYNC with src/lib/linkGuard.ts (tests/linkGuard.cases.ts lists the shared examples).
--
-- Existing messages are not changed or deleted (they were never clickable on the site).
-- ==============================================================================

begin;

-- 1. Does this text contain a link or web address?
create or replace function public.text_has_link(_text text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  _endings constant text :=
    'com|ca|net|org|info|biz|io|co|app|xyz|online|site|top|shop|store|live|link|click|me|ly|gl|gg|cc|ws|tk|ml|ga|'
    'cf|gq|ru|cn|us|uk|tv|ai|dev|page|zip|mov|pro|vip|win|fun|icu|club|exe|apk|msi|dmg|bat|scr';
  _t text;
begin
  if _text is null or _text = '' then
    return false;
  end if;

  -- Look-alike dots become real dots; invisible characters are removed
  _t := translate(_text,
                  chr(12290) || chr(65294) || chr(65377) || chr(8203) || chr(8204) || chr(8205) || chr(8288) || chr(65279) || chr(173),
                  '...');
  -- Email addresses are allowed
  _t := regexp_replace(_t, '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+', ' ', 'gi');

  return
    -- http://, https://, hxxp://, ftp://
    _t ~* '\y(h[tx]{2}ps?|ftp)\s*:?\s*/\s*/'
    -- www. / www dot / www[.]
    or _t ~* '\ywww\s*(\.|[[({<]\s*(\.|dot)\s*[]})>]|\ydot\y)'
    -- example.com, teams.live, setup.exe
    or _t ~* ('\y[a-z0-9][a-z0-9-]*\.(' || _endings || ')\y')
    -- example dot com, example[.]com, example (dot) com
    or _t ~* ('\y[a-z0-9][a-z0-9-]*\s*([[({<]\s*(\.|dot)\s*[]})>]|\ydot\y)\s*(' || _endings || ')\y')
    -- example . com (lowercase only, so normal sentences aren't caught)
    or _t ~ '\y[a-z0-9][a-z0-9-]* +\. *(com|net|org|xyz|ru|ca)\y'
    or _t ~ '\y[a-z0-9][a-z0-9-]* *\. +(com|net|org|xyz|ru|ca)\y';
end;
$$;

-- 2. Trigger: refuse messages with links (admins excepted)
create or replace function public.block_links_in_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _found boolean := false;
begin
  if public.is_admin() then
    return new;
  end if;

  -- Separate branches: each table has different column names
  if tg_table_name = 'messages' then
    _found := public.text_has_link(new.content);
  elsif tg_table_name = 'offers' then
    _found := public.text_has_link(new.message) or public.text_has_link(new.reply);
  elsif tg_table_name = 'viewing_requests' then
    _found := public.text_has_link(new.notes);
  end if;

  if _found then
    raise exception using
      errcode = 'check_violation',
      message = 'For your safety, links and web addresses can''t be sent in OwnersMarket messages. Please remove it and describe things in words instead. Email addresses are fine.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_links_in_messages on public.messages;
create trigger trg_block_links_in_messages
  before insert or update of content on public.messages
  for each row execute function public.block_links_in_messages();

drop trigger if exists trg_block_links_in_offers on public.offers;
create trigger trg_block_links_in_offers
  before insert or update of message, reply on public.offers
  for each row execute function public.block_links_in_messages();

drop trigger if exists trg_block_links_in_viewings on public.viewing_requests;
create trigger trg_block_links_in_viewings
  before insert or update of notes on public.viewing_requests
  for each row execute function public.block_links_in_messages();

-- 3. Nobody calls these directly through the public API (triggers still run; see 20261018)
revoke execute on function public.text_has_link(text) from public, anon, authenticated;
grant execute on function public.text_has_link(text) to service_role;
revoke execute on function public.block_links_in_messages() from public, anon, authenticated;
grant execute on function public.block_links_in_messages() to service_role;

commit;
