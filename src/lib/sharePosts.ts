/**
 * Ready-to-paste posts and share links that help a seller promote their own listing
 * (dashboard → "Share your listing").
 *
 * Only public details go in: city and neighbourhood, never the street address, and no phone
 * number (buyers message the owner on OwnersMarket). Links carry UTM tags so Google Analytics
 * shows which channel brought each visit.
 */
import type { Listing } from '../types/listing';
import { formatCAD } from './commissionCalc';

export const SITE = 'https://ownersmarket.ca';

export type ShareChannel = 'facebook' | 'marketplace' | 'whatsapp' | 'sms' | 'email' | 'copy' | 'native';

export function shareUrl(listingId: string, channel: ShareChannel): string {
  return `${SITE}/listing/${listingId}?utm_source=${channel}&utm_medium=share`;
}

const TYPE: Record<string, string> = {
  'Single Family Detached': 'house',
  Townhouse: 'townhouse',
  'Condo / Apartment': 'condo',
  'Duplex / Half-Duplex': 'duplex',
  'Acreage / Farm': 'acreage',
};

type L = Pick<
  Listing,
  'id' | 'headline' | 'price' | 'bedrooms' | 'bathrooms' | 'sqft' | 'propertyType' | 'city' | 'province' | 'neighborhood' | 'photos' | 'agentsWelcome'
>;

const place = (l: L) => (l.neighborhood && l.neighborhood !== l.city ? `${l.neighborhood}, ${l.city}` : l.city);

export function factsLine(l: L): string {
  const type = TYPE[l.propertyType] ?? (l.propertyType || 'home').toLowerCase();
  const parts = [formatCAD(l.price), `${l.bedrooms} bed, ${l.bathrooms} bath ${type}`];
  if (l.sqft > 0) parts.push(`${l.sqft.toLocaleString('en-CA')} sq ft`);
  return parts.join(' · ');
}

const photos = (l: L) => (l.photos.length > 1 ? `all ${l.photos.length} photos` : 'the photos');

/** A post for a local Facebook buy-and-sell or community group, or the seller's own page. */
export function groupPost(l: L): string {
  return [
    `🏡 For sale by owner in ${place(l)}, ${l.province}`,
    l.headline,
    factsLine(l),
    '',
    `See ${photos(l)} and message me to book a viewing:`,
    shareUrl(l.id, 'facebook'),
    '',
    l.agentsWelcome
      ? 'I’m selling it myself. Buyers with an agent are welcome too.'
      : 'I’m selling it myself, so you’ll be dealing with me directly.',
  ].join('\n');
}

/** Title and description for Facebook Marketplace or Kijiji (the seller adds photos there). */
export function marketplacePost(l: L): { title: string; body: string } {
  const type = TYPE[l.propertyType] ?? 'home';
  return {
    title: `${l.bedrooms} bed ${type} for sale by owner, ${l.city}`,
    body: [
      l.headline,
      factsLine(l),
      `Location: ${place(l)}, ${l.province}`,
      '',
      `Full listing with ${photos(l)}, details and viewing requests:`,
      shareUrl(l.id, 'marketplace'),
      '',
      'Selling privately. Please message me through the listing to book a viewing.',
    ].join('\n'),
  };
}

/** A short message for family, friends and neighbours (text, WhatsApp, email). */
export function friendMessage(l: L, channel: ShareChannel = 'sms'): string {
  return `Hi! We’re selling our home in ${l.city} ourselves. If you know anyone who’s looking, here it is: ${shareUrl(l.id, channel)}`;
}

/** Links that open each app's share screen with the post filled in. */
export function shareLinks(l: L) {
  const enc = encodeURIComponent;
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl(l.id, 'facebook'))}`,
    whatsapp: `https://wa.me/?text=${enc(friendMessage(l, 'whatsapp'))}`,
    sms: `sms:?&body=${enc(friendMessage(l, 'sms'))}`,
    email: `mailto:?subject=${enc(`For sale by owner: ${l.headline}`)}&body=${enc(friendMessage(l, 'email'))}`,
  };
}

/** Where to share, ticked off per listing. */
export const SHARE_PLACES: { key: string; label: string; tip?: string }[] = [
  { key: 'fb-groups', label: 'Post in 2–3 local Facebook buy-and-sell or community groups', tip: 'Search Facebook for “[your town] buy and sell” or “[your town] community”. Read each group’s rules first.' },
  { key: 'fb-own', label: 'Share it on your own Facebook or Instagram', tip: 'Friends of friends are often the first buyers.' },
  { key: 'marketplace', label: 'List it on Facebook Marketplace', tip: 'Add 5–10 of your best photos there and paste the Marketplace text below.' },
  { key: 'kijiji', label: 'Post it on Kijiji', tip: 'Use the same Marketplace text and photos.' },
  { key: 'neighbours', label: 'Tell neighbours, family and coworkers', tip: 'A text or WhatsApp message takes 10 seconds.' },
  { key: 'boards', label: 'Pin a feature sheet on community boards', tip: 'Grocery stores, libraries, community centres and workplaces.' },
];

// What the seller has shared, kept on this device (a convenience, not account data)
const key = (listingId: string) => `om-share-${listingId}`;

export interface ShareState {
  done: string[];
  lastSharedAt: string | null;
}

export function readShareState(listingId: string): ShareState {
  try {
    const raw = localStorage.getItem(key(listingId));
    const v = raw ? JSON.parse(raw) : null;
    return { done: Array.isArray(v?.done) ? v.done : [], lastSharedAt: typeof v?.lastSharedAt === 'string' ? v.lastSharedAt : null };
  } catch {
    return { done: [], lastSharedAt: null };
  }
}

export function writeShareState(listingId: string, state: ShareState) {
  try {
    localStorage.setItem(key(listingId), JSON.stringify(state));
  } catch {
    /* storage unavailable: works for this visit */
  }
}
