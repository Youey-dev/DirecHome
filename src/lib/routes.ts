/**
 * Page addresses. Used for the browser's address bar and for real links (<a href>),
 * which search engines follow. Keep in step with PAGES in netlify/edge-functions/lib/site.ts.
 */
export const TAB_PATHS: Record<string, string> = {
  landing: '/',
  browse: '/browse',
  wizard: '/sell',
  dashboard: '/dashboard',
  admin: '/admin',
  saved: '/saved',
  'how-it-works': '/how-it-works',
  terms: '/terms',
  privacy: '/privacy',
  rules: '/rules',
  cashback: '/cashback',
  notifications: '/notifications',
  calculator: '/calculator',
  'guide-selling': '/guides/selling-your-home',
  'guide-buying': '/guides/buying-a-home',
  'guide-bc': '/guides/selling-without-a-realtor-bc',
  about: '/about',
};

export function pathFor(tab: string, listingId?: string | null): string {
  if (tab === 'detail' && listingId) return `/listing/${listingId}`;
  if (tab === 'example' && listingId) return `/example/${listingId.replace(/^example-/, '')}`;
  return TAB_PATHS[tab] ?? '/';
}
