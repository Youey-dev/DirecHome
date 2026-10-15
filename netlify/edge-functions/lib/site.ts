/**
 * Shared settings for the link-preview and sitemap edge functions.
 *
 * Link previews (Facebook, Messenger, iMessage, WhatsApp, Slack) and search engines read the
 * page's HTML before any JavaScript runs. The site is a single-page app, so without these
 * functions every address would share the homepage's title, description and image.
 */
import { SUPABASE_ANON_KEY as BUILD_KEY, SUPABASE_URL as BUILD_URL } from './config.ts';

// The address and key are written at build time; if the build couldn't see them, fall back to
// the site's environment variables at run time (when they are available to edge functions).
const runtimeEnv = (name: string): string => {
  try {
    // deno-lint-ignore no-explicit-any
    return ((globalThis as any).Netlify?.env?.get(name) as string | undefined) ?? '';
  } catch {
    return '';
  }
};
const SUPABASE_URL = (BUILD_URL || runtimeEnv('VITE_SUPABASE_URL')).trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, ''); // same clean-up as src/lib/supabase.ts
const SUPABASE_ANON_KEY = (BUILD_KEY || runtimeEnv('VITE_SUPABASE_ANON_KEY')).trim();

export const SITE_URL = 'https://ownersmarket.ca';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export interface PageMeta {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
  /** HTTP status to send (404 for addresses that don't exist). */
  status?: number;
  /** Structured data (schema.org) describing the page for search engines. */
  jsonLd?: Record<string, unknown>[];
}

const DEFAULT_DESCRIPTION =
  'List your home across Canada (Québec coming soon) for $24.99 a month with no commission. Buyers message you directly to book a viewing, and your own lawyer or notary handles the sale.';

/** Public pages. Keep the titles in step with TAB_TITLES in src/App.tsx. */
export const PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'For Sale by Owner in Canada, No Commission · OwnersMarket',
    description: DEFAULT_DESCRIPTION,
  },
  '/browse': {
    title: 'Homes for Sale by Owner in Canada · OwnersMarket',
    description: 'Homes for sale by their owners across Canada. Message the owner directly to book a viewing. No agents in the middle.',
  },
  '/how-it-works': {
    title: 'How Selling Your Home Privately Works · OwnersMarket',
    description: 'How selling and buying a home privately works on OwnersMarket: a flat $24.99 a month per listing, viewings you control, and your own lawyer for the sale.',
  },
  '/calculator': {
    title: 'Real Estate Commission Calculator · OwnersMarket',
    description: 'Free real estate commission calculator: estimate what a realtor would charge on your home, and what selling it yourself could save. Rates vary by province and are negotiable.',
  },
  '/guides/selling-your-home': {
    title: 'How to Sell Your House Without a Realtor in Canada · OwnersMarket',
    description: 'A free 9-step guide to selling your house without a realtor in Canada: hiring your lawyer, pricing research, disclosure, photos, safe viewings, offers and closing.',
  },
  '/guides/selling-without-a-realtor-bc': {
    title: 'How to Sell Your House Without a Realtor in BC · OwnersMarket',
    description: 'Selling your home privately in British Columbia: lawyer or notary, BC Assessment, disclosure, strata Form B, subjects, the 3-day rescission period and the BC home flipping tax.',
  },
  '/guides/buying-a-home': {
    title: 'How to Buy a House For Sale by Owner in Canada · OwnersMarket',
    description: 'A free 8-step guide to buying a house for sale by owner in Canada: budgeting, checking the title, inspections, making an offer through your lawyer and keeping your deposit safe.',
  },
  '/terms': { title: 'Terms of Use · OwnersMarket', description: 'The terms for using OwnersMarket, a Canadian advertising site for homes for sale by owner.' },
  '/privacy': { title: 'Privacy Policy · OwnersMarket', description: 'How OwnersMarket collects, uses and protects your personal information.' },
  '/rules': { title: 'Listing Rules · OwnersMarket', description: 'Standards for sellers and buyers on OwnersMarket across Canada.' },
  '/cashback': { title: 'Cash-Back Policy · OwnersMarket', description: 'How a seller’s optional buyer cash-back offer works, and what buyers must tell their lender.' },
};

/** Pages for the sitemap (only those worth finding in search). */
export const SITEMAP_PATHS = [
  '/',
  '/browse',
  '/how-it-works',
  '/calculator',
  '/guides/selling-your-home',
  '/guides/selling-without-a-realtor-bc',
  '/guides/buying-a-home',
];

/** Signed-in pages: real app pages, but never shown in search. */
export const PRIVATE_PATHS = ['/sell', '/dashboard', '/admin', '/saved', '/notifications'];

export const hasDatabase = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 30;

/** What happened on the last database read: shown in the sitemap as a comment, to help troubleshooting. */
export let lastReadStatus = 'not tried';

/** Reads from the database as an anonymous visitor, so only public (live, paid) listings come back. */
export async function readPublic<T>(pathAndQuery: string): Promise<T | null> {
  if (!hasDatabase) {
    lastReadStatus = 'no database address';
    return null;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      lastReadStatus = `database answered ${res.status}`;
      return null;
    }
    lastReadStatus = 'ok';
    return (await res.json()) as T;
  } catch (err) {
    lastReadStatus = `database not reachable (${err instanceof Error ? err.name : 'error'})`;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Structured data (schema.org JSON-LD). Describes the business and the guides to search
// engines. Only facts that are true and visible on the page go here.
// ---------------------------------------------------------------------------
const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'OwnersMarket',
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon-512.png`,
  description: 'A Canadian advertising site for homes for sale by owner. Not a real estate brokerage.',
  areaServed: { '@type': 'Country', name: 'Canada' },
};

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: 'OwnersMarket',
  url: `${SITE_URL}/`,
  inLanguage: 'en-CA',
  publisher: { '@id': `${SITE_URL}/#organization` },
};

/** First published and last changed, for each guide. Update dateModified when a guide changes. */
const GUIDE_DATES: Record<string, { published: string; modified: string }> = {
  '/guides/selling-your-home': { published: '2026-10-14', modified: '2026-10-15' },
  '/guides/buying-a-home': { published: '2026-10-14', modified: '2026-10-15' },
  '/guides/selling-without-a-realtor-bc': { published: '2026-10-15', modified: '2026-10-15' },
};

const breadcrumbs = (items: { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.path}`,
  })),
});

const shortTitle = (title: string) => title.replace(/ · OwnersMarket$/, '');

export function structuredData(path: string, meta: PageMeta): Record<string, unknown>[] {
  if (path === '/') return [ORGANIZATION, WEBSITE];
  const dates = GUIDE_DATES[path];
  if (dates) {
    const headline = shortTitle(meta.title);
    return [
      {
        '@type': 'Article',
        headline,
        description: meta.description,
        url: `${SITE_URL}${path}`,
        mainEntityOfPage: `${SITE_URL}${path}`,
        image: DEFAULT_IMAGE,
        datePublished: dates.published,
        dateModified: dates.modified,
        inLanguage: 'en-CA',
        author: { '@id': `${SITE_URL}/#organization` },
        publisher: ORGANIZATION,
      },
      breadcrumbs([
        { name: 'Home', path: '/' },
        { name: headline, path },
      ]),
    ];
  }
  if (PAGES[path]) return [breadcrumbs([{ name: 'Home', path: '/' }, { name: shortTitle(meta.title), path }])];
  return [];
}

export const NOT_FOUND: PageMeta = {
  title: 'Page not found · OwnersMarket',
  description: 'This page doesn’t exist. Browse homes for sale by owner, or read our guides to selling and buying without a realtor.',
  noindex: true,
  status: 404,
};
