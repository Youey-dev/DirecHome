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
}

const DEFAULT_DESCRIPTION =
  'List your home across Canada (Québec coming soon) for $24.99 a month with no commission. Buyers message you directly to book a viewing, and your own lawyer or notary handles the sale.';

/** Public pages. Keep the titles in step with TAB_TITLES in src/App.tsx. */
export const PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'OwnersMarket · Sell your home yourself, no commission',
    description: DEFAULT_DESCRIPTION,
  },
  '/browse': {
    title: 'Browse homes for sale by owner · OwnersMarket',
    description: 'Homes for sale by their owners across Canada. Message the owner directly to book a viewing. No agents in the middle.',
  },
  '/how-it-works': {
    title: 'How it works · OwnersMarket',
    description: 'How selling and buying a home privately works on OwnersMarket: a flat $24.99 a month per listing, viewings you control, and your own lawyer for the sale.',
  },
  '/calculator': {
    title: 'Savings estimator · OwnersMarket',
    description: 'Estimate what selling your home yourself could save, using an example commission rate. Rates vary by province and are negotiable.',
  },
  '/guides/selling-your-home': {
    title: 'How to sell your home yourself in Canada · OwnersMarket',
    description: 'A free 9-step guide to selling your home without an agent: hiring your lawyer, pricing research, disclosure, photos, safe viewings, offers and closing.',
  },
  '/guides/buying-a-home': {
    title: 'How to buy a home sold by owner in Canada · OwnersMarket',
    description: 'A free 8-step guide to buying a home directly from its owner: budgeting, checking the title, inspections, making an offer through your lawyer and keeping your deposit safe.',
  },
  '/terms': { title: 'Terms of Use · OwnersMarket', description: 'The terms for using OwnersMarket, a Canadian advertising site for homes for sale by owner.' },
  '/privacy': { title: 'Privacy Policy · OwnersMarket', description: 'How OwnersMarket collects, uses and protects your personal information.' },
  '/rules': { title: 'Listing Rules · OwnersMarket', description: 'Standards for sellers and buyers on OwnersMarket across Canada.' },
  '/cashback': { title: 'Cash-Back Policy · OwnersMarket', description: 'How a seller’s optional buyer cash-back offer works, and what buyers must tell their lender.' },
};

/** Pages for the sitemap (only those worth finding in search). */
export const SITEMAP_PATHS = ['/', '/browse', '/how-it-works', '/calculator', '/guides/selling-your-home', '/guides/buying-a-home'];

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
