/**
 * /sitemap.xml: the public pages plus every public listing, read live from the database.
 * Submit https://ownersmarket.ca/sitemap.xml in Google Search Console once.
 */
import { SITE_URL, SITEMAP_PATHS, lastModified, lastReadStatus, readPublic } from './lib/site.ts';
import { CITY_PAGE_MIN_LISTINGS, PROVINCE_PAGES, cityPath, countCities } from './lib/regions.ts';

type Row = { id: string; updated_at: string | null; city: string | null; province: string | null };

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async () => {
  const listings = (await readPublic<Row[]>('listings?select=id,updated_at,city,province&order=updated_at.desc&limit=5000')) ?? [];

  // City pages that have enough live listings to be indexed (see CITY_PAGE_MIN_LISTINGS)
  const cityPages = PROVINCE_PAGES.flatMap((p) =>
    countCities(listings.filter((l) => l.province === p.code))
      .filter((c) => c.count >= CITY_PAGE_MIN_LISTINGS)
      .map((c) => cityPath(p.slug, c.city)),
  );

  const urls = [
    // Guides carry the date their content last changed; other pages change with the listings, so no date
    ...SITEMAP_PATHS.map((p) => {
      const mod = lastModified(p);
      return `  <url><loc>${xml(SITE_URL + p)}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</url>`;
    }),
    ...cityPages.map((p) => `  <url><loc>${xml(SITE_URL + p)}</loc></url>`),
    // No <lastmod> for listings: updated_at changes on every save, including each page view count,
    // so it would say "changed today" every day. Google stops trusting lastmod in a sitemap when
    // it's always today, and would then ignore the guides' real dates too.
    ...listings.map((l) => `  <url><loc>${xml(`${SITE_URL}/listing/${l.id}`)}</loc></url>`),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- listings: ${xml(lastReadStatus)}, ${listings.length} public -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};

export const config = { path: '/sitemap.xml' };
