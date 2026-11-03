/**
 * The listing's view count. Shown only to the listing's owner and to admins (seller dashboard,
 * admin console, and the owner's own listing page), never to buyers.
 *
 * It counts visits to the listing page (once per browser tab session, not the owner's own
 * visits), not unique people, so the wording is "views", never "people".
 */
export function viewsLabel(listing: { viewsCount?: number }): string {
  const n = Math.max(0, Math.floor(Number(listing.viewsCount) || 0));
  return `${n.toLocaleString('en-CA')} ${n === 1 ? 'view' : 'views'}`;
}
