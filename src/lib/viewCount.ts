/**
 * The public view count shown on listings ("51 views").
 *
 * It counts visits to the listing page (once per browser tab session, not the owner's own
 * visits), not unique people, so the wording is "views", never "people".
 * Brand-new listings with only a handful of views show nothing rather than "2 views",
 * which reads as "nobody is interested".
 */
export const PUBLIC_VIEWS_MIN = 10;

export function publicViewsLabel(listing: { viewsCount?: number; isExample?: boolean }): string | null {
  if (listing.isExample) return null;
  const n = Math.floor(Number(listing.viewsCount) || 0);
  if (n < PUBLIC_VIEWS_MIN) return null;
  return `${n.toLocaleString('en-CA')} views`;
}
