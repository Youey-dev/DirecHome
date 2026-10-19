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
// Page HTML built at publish time (scripts/prerender.mjs), keyed by path
import { PRERENDERED } from './lib/prerendered.ts';

type ListingRow = {
  headline: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  province: string;
  neighborhood?: string;
  property_type: string;
  sqft?: number;
  year_built?: number;
  property_taxes_annual?: number | null;
  neighborhood_highlights?: string | null;
  inclusions?: string[] | null;
  offers_cashback?: boolean;
  cashback_amount?: number;
  agents_welcome?: boolean;
  listing_photos?: { url: string; is_cover: boolean; sort_order: number | null }[];
};

/** Escapes text for HTML. */
const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The owner's description as simple HTML: paragraphs, line breaks and bulleted lists. */
function descriptionHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((para) => {
      const lines = para.split('\n').map((l) => l.replace(/\*\*/g, '').trim()).filter(Boolean);
      if (!lines.length) return '';
      const bullet = /^(?:[-*•]|\d+[.)])\s+/;
      // Runs of bulleted lines become lists; other lines stay together as a paragraph
      const out: string[] = [];
      let text: string[] = [];
      let items: string[] = [];
      const flush = () => {
        if (text.length) out.push(`<p>${text.map(esc).join('<br>')}</p>`);
        if (items.length) out.push(`<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`);
        text = [];
        items = [];
      };
      for (const line of lines) {
        if (bullet.test(line)) {
          if (text.length) flush();
          items.push(line.replace(bullet, ''));
        } else {
          if (items.length) flush();
          text.push(line);
        }
      }
      flush();
      return out.join('');
    })
    .join('');
}

const SIMPLE_HEADER = `<header style="border-bottom:1px solid #D5DED7"><div style="max-width:1240px;margin:0 auto;padding:18px 16px;display:flex;gap:24px;align-items:center;flex-wrap:wrap"><a href="/" style="font-weight:700;font-size:24px;color:#16261D;text-decoration:none">OwnersMarket</a><nav style="display:flex;gap:16px;flex-wrap:wrap"><a href="/browse">Browse homes</a><a href="/sell">List your home</a><a href="/how-it-works">How it works</a><a href="/about">About and contact</a></nav></div></header>`;

type LinkRow = { id: string; headline: string; city: string; province: string; price: number };

/** Plain links to the homes for sale right now, so crawlers can find every listing. */
async function listingLinksHtml(heading: string): Promise<string> {
  const rows = await readPublic<LinkRow[]>('listings?status=eq.live&select=id,headline,city,province,price&order=created_at.desc&limit=200');
  if (!rows || !rows.length) return '';
  const items = rows
    .map((r) => `<li><a href="/listing/${esc(r.id)}">${esc(r.headline)}</a>, ${esc(r.city)}, ${esc(r.province)}: ${esc(money(Number(r.price)))}</li>`)
    .join('');
  return `<section style="max-width:1240px;margin:0 auto;padding:24px 16px"><h2>${esc(heading)}</h2><ul>${items}</ul></section>`;
}

const LISTING_PATH = /^\/listing\/([0-9a-fA-F-]{36})$/;
// Example listings (not for sale): shown on the site, never indexed by search engines.
const EXAMPLE_PATH = /^\/example\/[a-z0-9-]{1,60}$/;

const money = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const shorten = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

async function listingMeta(id: string): Promise<(PageMeta & { body?: string }) | undefined> {
  const rows = await readPublic<ListingRow[]>(
    `listings?id=eq.${id}&select=headline,description,price,bedrooms,bathrooms,city,province,neighborhood,property_type,sqft,year_built,property_taxes_annual,neighborhood_highlights,inclusions,offers_cashback,cashback_amount,agents_welcome,listing_photos(url,is_cover,sort_order)`,
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
  const photos = (l.listing_photos ?? [])
    .slice()
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const photo = photos[0];
  const facts = `${money(Number(l.price))} · ${plural(Number(l.bedrooms), 'bed')} · ${plural(Number(l.bathrooms), 'bath')} · ${l.city}, ${l.province}`;
  const place = `${l.neighborhood ? `${l.neighborhood}, ` : ''}${l.city}, ${l.province}`;
  const factList = [
    ['Price', money(Number(l.price))],
    ['Bedrooms', l.bedrooms],
    ['Bathrooms', l.bathrooms],
    ['Home type', l.property_type],
    ['Interior size', l.sqft ? `${Number(l.sqft).toLocaleString('en-CA')} sq ft` : ''],
    ['Year built', l.year_built ?? ''],
    ['Property taxes', l.property_taxes_annual ? `${money(Number(l.property_taxes_annual))} a year` : ''],
    ['Cash back to the buyer', l.offers_cashback && Number(l.cashback_amount) > 0 ? money(Number(l.cashback_amount)) : ''],
    ['Agents welcome', l.agents_welcome ? 'Yes, the owner pays a buyer’s agent commission' : ''],
  ].filter(([, v]) => v !== '' && v !== null && v !== undefined);
  // The visible page, in plain HTML, for crawlers and link previews (the app replaces it in browsers)
  const body = [
    SIMPLE_HEADER,
    '<main style="max-width:1100px;margin:0 auto;padding:24px 16px">',
    '<p><a href="/browse">Back to homes for sale</a></p>',
    `<h1>${esc(l.headline)}</h1>`,
    `<p><strong>${esc(money(Number(l.price)))}</strong> · ${esc(place)} · For sale by owner</p>`,
    photos.slice(0, 6).map((ph, i) => `<img src="${esc(ph.url)}" alt="${esc(`${l.headline}, photo ${i + 1}`)}" loading="lazy" style="max-width:100%;height:auto">`).join(''),
    `<dl>${factList.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`,
    '<h2>From the owner</h2>',
    descriptionHtml(l.description ?? ''),
    l.inclusions?.length ? `<h2>Included in the sale</h2><ul>${l.inclusions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '',
    l.neighborhood_highlights ? `<h2>The neighbourhood</h2>${descriptionHtml(l.neighborhood_highlights)}` : '',
    '<p>Message the owner on OwnersMarket to ask a question or book a viewing. The exact address is shared once a viewing is confirmed.</p>',
    '</main>',
  ].join('');
  return {
    title: `${shorten(l.headline, 70)} · ${money(Number(l.price))} · OwnersMarket`,
    description: shorten(`${facts}. For sale by owner: message the owner to book a viewing. ${l.description}`, 200),
    image: photo?.url,
    body,
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
  let meta: (PageMeta & { body?: string }) | undefined;
  if (listingMatch) meta = await listingMeta(listingMatch[1]);
  else if (EXAMPLE_PATH.test(path))
    meta = {
      ...PAGES['/'],
      title: 'Example listing (not for sale) · OwnersMarket',
      description: 'An example of what a for-sale-by-owner listing looks like on OwnersMarket. Not a real home for sale.',
      noindex: true,
    };
  else if (PAGES[path]) meta = { ...PAGES[path], jsonLd: structuredData(path, PAGES[path]) };
  else if (PRIVATE_PATHS.includes(path)) meta = { ...PAGES['/'], noindex: true };
  // Any other address doesn't exist: say so with a real 404, so search engines don't index it.
  else meta = NOT_FOUND;
  if (!meta) return response;

  // The visible page as HTML, so search engines and link previews see the text without JavaScript
  let body = meta.body ?? (PRERENDERED[path] && !meta.noindex ? PRERENDERED[path] : undefined);
  if (path === '/' || path === '/browse') {
    const links = await listingLinksHtml('Homes for sale by owner');
    if (path === '/browse') {
      body = `${SIMPLE_HEADER}<main><h1 style="max-width:1240px;margin:0 auto;padding:24px 16px 0">Homes for sale by owner across Canada</h1>${links}</main>`;
    } else if (body && links) {
      body = body.includes('<footer') ? body.replace('<footer', `${links}<footer`) : body + links;
    }
  }

  let html = await response.text();
  if (body) html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${body}</div>`);
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
  excludedPath: ['/.netlify/*', '/assets/*', '/signs/*', '/sitemap.xml', '/robots.txt', '/*.png', '/*.ico', '/*.svg', '/*.jpg', '/*.webp', '/*.js', '/*.css', '/*.mjs', '/*.json', '/*.txt'],
};
