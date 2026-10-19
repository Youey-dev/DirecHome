/**
 * Province, territory and city page addresses, shared by the app (src/) and the edge functions.
 * No imports, so both Vite and Netlify's edge bundler can use it as is.
 *
 * Province pages always exist (one for each province and territory, never Québec).
 * A city page only exists for search engines once the city has CITY_PAGE_MIN_LISTINGS live
 * listings: below that it would be a near-empty "doorway" page, which search engines penalise.
 */

export interface ProvincePage {
  code: string;
  slug: string;
  name: string;
  title: string;
  description: string;
}

export const PROVINCE_PAGE_BASE = '/for-sale-by-owner';

/** A city page is indexed, in the sitemap and linked from its province page from this many live listings. */
export const CITY_PAGE_MIN_LISTINGS = 3;

const page = (code: string, slug: string, name: string, short = name): ProvincePage => ({
  code,
  slug,
  name,
  title: `For Sale by Owner in ${short}: Sell Without a Realtor · OwnersMarket`,
  description: `Homes for sale by owner in ${name}, and how to sell yours without a realtor: closing, transfer tax and fees. $24.99 a month, no commission.`,
});

export const PROVINCE_PAGES: ProvincePage[] = [
  page('BC', 'british-columbia', 'British Columbia', 'BC'),
  page('AB', 'alberta', 'Alberta'),
  page('SK', 'saskatchewan', 'Saskatchewan'),
  page('MB', 'manitoba', 'Manitoba'),
  page('ON', 'ontario', 'Ontario'),
  page('NB', 'new-brunswick', 'New Brunswick'),
  page('NS', 'nova-scotia', 'Nova Scotia'),
  page('PE', 'prince-edward-island', 'Prince Edward Island', 'PEI'),
  page('NL', 'newfoundland-and-labrador', 'Newfoundland and Labrador', 'Newfoundland'),
  page('YT', 'yukon', 'Yukon'),
  page('NT', 'northwest-territories', 'Northwest Territories', 'NWT'),
  page('NU', 'nunavut', 'Nunavut'),
];

export const provinceBySlug = (slug: string) => PROVINCE_PAGES.find((p) => p.slug === slug);
export const provinceByCodeForPage = (code: string | null | undefined) => PROVINCE_PAGES.find((p) => p.code === code);

/** "St. John's" -> "st-johns", "Grand Forks" -> "grand-forks", "Montréal" -> "montreal". */
export function citySlug(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const provincePath = (slug: string) => `${PROVINCE_PAGE_BASE}/${slug}`;
export const cityPath = (provinceSlug: string, city: string) => `${PROVINCE_PAGE_BASE}/${provinceSlug}/${citySlug(city)}`;

export const PROVINCE_PATH_RE = /^\/for-sale-by-owner\/([a-z-]+)$/;
export const CITY_PATH_RE = /^\/for-sale-by-owner\/([a-z-]+)\/([a-z0-9-]{1,80})$/;

/** Live listings per city in one province: [{ city, slug, count }], largest first. */
export function countCities(rows: { city?: string | null }[]): { city: string; slug: string; count: number }[] {
  const map = new Map<string, { city: string; slug: string; count: number }>();
  for (const r of rows) {
    const city = (r.city ?? '').trim();
    const slug = citySlug(city);
    if (!slug) continue;
    const entry = map.get(slug) ?? { city, slug, count: 0 };
    entry.count += 1;
    map.set(slug, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

export const cityTitle = (city: string, province: ProvincePage) =>
  `Homes for Sale by Owner in ${city}, ${province.code} · OwnersMarket`;
export const cityDescription = (city: string, province: ProvincePage, count: number) =>
  `${count} home${count === 1 ? '' : 's'} for sale by owner in ${city}, ${province.name}. Message the owner directly to book a viewing. No agents in the middle.`;
