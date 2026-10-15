/**
 * Gives every page its own title, description, image and canonical address in the HTML itself,
 * so link previews and search engines see the right page (not just the homepage).
 *
 * Listing pages are filled from the database: headline, price, rooms, city and cover photo.
 * Only public listings can be read (the database's own rules), so hidden, unpaid or removed
 * listings get a "not available" preview and are kept out of search.
 * The exact street address is never used here.
 */
import { DEFAULT_IMAGE, NOT_FOUND, PAGES, PRIVATE_PATHS, SITE_URL, readPublic, structuredData, type PageMeta } from './lib/site.ts';

type ListingRow = {
  headline: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  province: string;
  property_type: string;
  listing_photos?: { url: string; is_cover: boolean; sort_order: number | null }[];
};

const LISTING_PATH = /^\/listing\/([0-9a-fA-F-]{36})$/;

const money = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const shorten = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

async function listingMeta(id: string): Promise<PageMeta | undefined> {
  const rows = await readPublic<ListingRow[]>(
    `listings?id=eq.${id}&select=headline,description,price,bedrooms,bathrooms,city,province,property_type,listing_photos(url,is_cover,sort_order)`,
  );
  // Database not reachable (or not configured): leave the page as it is rather than guess.
  if (rows === null) return undefined;
  const l = rows[0];
  if (!l) {
    return {
      title: 'This listing isn’t available · OwnersMarket',
      description: 'It may have been sold, paused or removed by the owner. Browse other homes for sale by owner on OwnersMarket.',
      noindex: true,
    };
  }
  const photo = (l.listing_photos ?? [])
    .slice()
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
  const facts = `${money(Number(l.price))} · ${plural(Number(l.bedrooms), 'bed')} · ${plural(Number(l.bathrooms), 'bath')} · ${l.city}, ${l.province}`;
  return {
    title: `${shorten(l.headline, 70)} · ${money(Number(l.price))} · OwnersMarket`,
    description: shorten(`${facts}. For sale by owner: message the owner to book a viewing. ${l.description}`, 200),
    image: photo?.url,
  };
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inject(html: string, meta: PageMeta, canonical: string): string {
  const title = attr(meta.title);
  const description = attr(meta.description);
  const image = attr(meta.image ?? DEFAULT_IMAGE);
  const isDefaultImage = !meta.image;

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${description}" />`)
    // The page's default image tags are replaced by this page's own
    .replace(/\s*<meta property="og:image"[^>]*>/g, '')
    .replace(/\s*<meta name="twitter:image"[^>]*>/g, '')
    // Tags added by an earlier pass of this function (never twice)
    .replace(/<!-- page-meta -->[\s\S]*?<!-- \/page-meta -->/, '');

  const extra = [
    `<link rel="canonical" href="${attr(canonical)}" />`,
    `<meta property="og:url" content="${attr(canonical)}" />`,
    `<meta property="og:site_name" content="OwnersMarket" />`,
    `<meta property="og:locale" content="en_CA" />`,
    `<meta property="og:image" content="${image}" />`,
    ...(isDefaultImage ? ['<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />'] : []),
    `<meta property="og:image:alt" content="${title}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...(meta.noindex ? ['<meta name="robots" content="noindex" />'] : []),
    ...(meta.jsonLd && meta.jsonLd.length
      ? [
          `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': meta.jsonLd }).replace(/</g, '\\u003c')}</script>`,
        ]
      : []),
  ].join('\n    ');

  out = out.replace('</head>', `    <!-- page-meta -->\n    ${extra}\n    <!-- /page-meta -->\n  </head>`);
  return out;
}

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  const response = await context.next();
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response;

  const listingMatch = path.match(LISTING_PATH);
  let meta: PageMeta | undefined;
  if (listingMatch) meta = await listingMeta(listingMatch[1]);
  else if (PAGES[path]) meta = { ...PAGES[path], jsonLd: structuredData(path, PAGES[path]) };
  else if (PRIVATE_PATHS.includes(path)) meta = { ...PAGES['/'], noindex: true };
  // Any other address doesn't exist: say so with a real 404, so search engines don't index it.
  else meta = NOT_FOUND;
  if (!meta) return response;

  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('etag');
  return new Response(inject(html, meta, `${SITE_URL}${path === '/' ? '/' : path}`), {
    status: meta.status ?? response.status,
    headers,
  });
};

export const config = {
  path: '/*',
  excludedPath: ['/assets/*', '/signs/*', '/sitemap.xml', '/robots.txt', '/*.png', '/*.ico', '/*.svg', '/*.jpg', '/*.webp', '/*.js', '/*.css', '/*.mjs', '/*.json', '/*.txt'],
};
