/**
 * Open houses and price drops: what to show on cards and listing pages.
 * Pure functions (no database), so the test suite can check them.
 */
import type { Listing, OpenHouse, OfferCondition, OfferFinancing } from '../types/listing';

/** How long a price drop shows as "Price reduced" */
export const PRICE_DROP_DAYS = 14;

const TZ: Record<string, string> = {
  BC: 'America/Vancouver', AB: 'America/Edmonton', SK: 'America/Regina', MB: 'America/Winnipeg',
  ON: 'America/Toronto', QC: 'America/Toronto', NB: 'America/Moncton', NS: 'America/Halifax',
  PE: 'America/Halifax', NL: 'America/St_Johns', YT: 'America/Whitehorse', NT: 'America/Yellowknife',
  NU: 'America/Iqaluit',
};

/**
 * Places that keep a different time from the rest of their province (keyed "PROVINCE:city",
 * city lower case without accents). Kept in step with public.listing_time_zone in the database.
 */
const CITY_TZ: Record<string, string> = {
  // BC: East Kootenay is on Mountain time; Creston and the Peace region stay on UTC-7
  ...Object.fromEntries(
    ['cranbrook', 'kimberley', 'fernie', 'sparwood', 'elkford', 'invermere', 'golden', 'radium hot springs', 'canal flats', 'jaffray', 'field']
      .map((c) => [`BC:${c}`, 'America/Edmonton']),
  ),
  'BC:creston': 'America/Creston',
  ...Object.fromEntries(
    ['dawson creek', 'pouce coupe', 'chetwynd', 'fort st john', 'fort saint john', 'taylor', "hudson's hope", 'hudsons hope', 'tumbler ridge']
      .map((c) => [`BC:${c}`, 'America/Dawson_Creek']),
  ),
  'BC:fort nelson': 'America/Fort_Nelson',
  // Saskatchewan: Lloydminster keeps Alberta time
  'SK:lloydminster': 'America/Edmonton',
  // Northwestern Ontario on Central time (Atikokan stays on Eastern Standard)
  ...Object.fromEntries(
    ['kenora', 'dryden', 'sioux lookout', 'fort frances', 'rainy river', 'red lake', 'emo', 'keewatin', 'vermilion bay', 'ear falls', 'ignace']
      .map((c) => [`ON:${c}`, 'America/Winnipeg']),
  ),
  'ON:atikokan': 'America/Atikokan',
  // Quebec: Magdalen Islands on Atlantic time
  ...Object.fromEntries(['iles de la madeleine', 'magdalen islands', 'cap aux meules'].map((c) => [`QC:${c}`, 'America/Halifax'])),
  // Labrador (most of it) on Atlantic time
  ...Object.fromEntries(
    ['happy valley goose bay', 'goose bay', 'happy valley', 'labrador city', 'wabush', 'churchill falls', 'north west river', 'nain', 'hopedale', 'makkovik']
      .map((c) => [`NL:${c}`, 'America/Goose_Bay']),
  ),
  // Nunavut's other two zones
  ...Object.fromEntries(
    ['rankin inlet', 'arviat', 'baker lake', 'chesterfield inlet', 'naujaat', 'whale cove', 'coral harbour']
      .map((c) => [`NU:${c}`, 'America/Rankin_Inlet']),
  ),
  ...Object.fromEntries(['cambridge bay', 'kugluktuk', 'gjoa haven', 'taloyoak', 'kugaaruk'].map((c) => [`NU:${c}`, 'America/Cambridge_Bay'])),
  'NU:resolute': 'America/Resolute',
};

const cityKey = (city: string) =>
  city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.]/g, '').replace(/[-]/g, ' ').replace(/\s+/g, ' ').trim();

/** Where a home is: its province, and its city when that's known. */
export type Place = string | { province?: string; city?: string } | undefined;

/**
 * The time zone of the home (open house times and offer deadlines are in the home's local time):
 * the province's zone, or the city's when it differs (Cranbrook, Lloydminster, Kenora, Labrador…).
 */
export function timeZoneFor(place: Place): string {
  const province = (typeof place === 'string' ? place : place?.province ?? '').toUpperCase();
  const city = typeof place === 'string' ? '' : place?.city ?? '';
  return (city && CITY_TZ[`${province}:${cityKey(city)}`]) || TZ[province] || 'America/Toronto';
}

/** Upcoming open houses (not cancelled, not over), soonest first */
export function upcomingOpenHouses(l: Pick<Listing, 'openHouses'>, now = Date.now()): OpenHouse[] {
  return (l.openHouses ?? [])
    .filter((o) => !o.cancelledAt && new Date(o.endsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

const part = (d: Date, tz: string, o: Intl.DateTimeFormatOptions) => d.toLocaleString('en-CA', { timeZone: tz, ...o });

/** "2 pm", "2:30 pm" */
function clock(d: Date, tz: string): string {
  const t = part(d, tz, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\./g, '').toLowerCase();
  return t.replace(':00', '').replace(/\s+/g, ' ');
}

/** "2–4 pm", "11 am – 1 pm" */
export function timeRange(o: Pick<OpenHouse, 'startsAt' | 'endsAt'>, place?: Place): string {
  const tz = timeZoneFor(place);
  const a = clock(new Date(o.startsAt), tz);
  const b = clock(new Date(o.endsAt), tz);
  const [aTime, aPart] = a.split(' ');
  const [bTime, bPart] = b.split(' ');
  return aPart === bPart ? `${aTime}–${bTime} ${bPart}` : `${a} – ${b}`;
}

/** "Sat Nov 15" */
export function shortDay(iso: string, place?: Place): string {
  const d = new Date(iso);
  const tz = timeZoneFor(place);
  return `${part(d, tz, { weekday: 'short' })} ${part(d, tz, { month: 'short' })} ${part(d, tz, { day: 'numeric' })}`.replace(/\./g, '');
}

/** "Saturday, November 15" */
export function longDay(iso: string, place?: Place): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: timeZoneFor(place), weekday: 'long', month: 'long', day: 'numeric' });
}

/** The price drop to show, if the price went down in the last 14 days */
export function priceDrop(
  l: Pick<Listing, 'price' | 'priceReducedFrom' | 'priceReducedAt'>,
  now = Date.now(),
): { from: number; amount: number } | null {
  if (!l.priceReducedFrom || !l.priceReducedAt) return null;
  if (now - new Date(l.priceReducedAt).getTime() > PRICE_DROP_DAYS * 86_400_000) return null;
  const amount = l.priceReducedFrom - l.price;
  return amount > 0 ? { from: l.priceReducedFrom, amount } : null;
}

/** True when a new price is a drop big enough to alert people who saved the home (1% or more) */
export const isAlertableDrop = (oldPrice: number, newPrice: number) => newPrice > 0 && newPrice < oldPrice * 0.99;

export const CONDITION_LABEL: Record<OfferCondition, string> = {
  financing: 'Financing',
  inspection: 'Inspection',
  strata_documents: 'Strata documents',
  sale_of_home: 'Sale of my home',
  appraisal: 'Appraisal',
  insurance: 'Insurance',
};

export const FINANCING_LABEL: Record<OfferFinancing, string> = {
  pre_approved: 'Pre-approved',
  cash: 'Cash',
  not_yet: 'Not yet',
};

/** Minutes the time zone is ahead of UTC at a moment (negative in Canada) */
function offsetMinutes(utcMs: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - utcMs) / 60000);
}

/** "2026-11-15" + "14:00" in the home's province → an exact moment (ISO, UTC) */
export function localToIso(date: string, time: string, place?: Place): string {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const tz = timeZoneFor(place);
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let utc = wall - offsetMinutes(wall, tz) * 60000;
  utc = wall - offsetMinutes(utc, tz) * 60000; // second pass settles daylight-saving changes
  return new Date(utc).toISOString();
}

/** An exact moment → "2026-11-15" and "14:00" in the home's province (for the edit form) */
export function isoToLocal(iso: string, place?: Place): { date: string; time: string } {
  const tz = timeZoneFor(place);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** A calendar file for an open house (opens in Apple, Google and Outlook calendars) */
export function openHouseIcs(o: OpenHouse, l: Pick<Listing, 'id' | 'headline' | 'city' | 'province'>, site = 'https://ownersmarket.ca'): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OwnersMarket//Open house//EN',
    'BEGIN:VEVENT',
    `UID:${o.id}@ownersmarket.ca`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(o.startsAt)}`,
    `DTEND:${stamp(o.endsAt)}`,
    `SUMMARY:${esc(`Open house: ${l.headline}`)}`,
    `LOCATION:${esc(`${l.city}, ${l.province}`)}`,
    `DESCRIPTION:${esc(`${o.note ? `${o.note}\n` : ''}${site}/listing/${l.id}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
