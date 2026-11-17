/**
 * Share links for a seller's own listing (dashboard → "Share your listing to reach more buyers").
 *
 * Only public details go in the message (city and the listing link), never the street
 * address or a phone number: buyers message the owner on OwnersMarket. Links carry UTM tags
 * so Google Analytics shows which channel brought each visit.
 */
import type { Listing } from '../types/listing';

export const SITE = 'https://ownersmarket.ca';

export type ShareChannel = 'facebook' | 'community' | 'whatsapp' | 'sms' | 'email' | 'copy' | 'native';

export function shareUrl(listingId: string, channel: ShareChannel): string {
  return `${SITE}/listing/${listingId}?utm_source=${channel}&utm_medium=share`;
}

type L = Pick<Listing, 'id' | 'headline' | 'city'>;

/** A short message for family, friends and neighbours (text, WhatsApp, email). */
export function friendMessage(l: L, channel: ShareChannel = 'sms'): string {
  return `Hi! We’re selling our home in ${l.city} ourselves. If you know anyone who’s looking, here it is: ${shareUrl(l.id, channel)}`;
}

/** Links that open each app's share screen with the listing filled in. */
export function shareLinks(l: L) {
  const enc = encodeURIComponent;
  return {
    // Facebook builds the post (cover photo, price, headline) from the listing link itself
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl(l.id, 'facebook'))}`,
    whatsapp: `https://wa.me/?text=${enc(friendMessage(l, 'whatsapp'))}`,
    sms: `sms:?&body=${enc(friendMessage(l, 'sms'))}`,
    email: `mailto:?subject=${enc(`For sale by owner: ${l.headline}`)}&body=${enc(friendMessage(l, 'email'))}`,
  };
}

type PostListing = Pick<Listing, 'id' | 'headline' | 'city' | 'province' | 'price' | 'bedrooms' | 'bathrooms'>;

/** "argyle shore" → "Argyle Shore" (leaves "McBride" and "St. John's" alone) */
const titleCase = (s: string) => s.trim().replace(/(^|[\s-])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());

const PROVINCE_LABEL: Record<string, string> = { PE: 'PEI' };

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/**
 * A ready-to-paste post for local community groups, written from the listing's public details.
 * Never includes the street address or a phone number.
 */
export function communityPost(l: PostListing, channel: ShareChannel = 'community'): string {
  const place = `${titleCase(l.city)}, ${PROVINCE_LABEL[l.province] ?? l.province}`;
  const facts = [
    `$${Math.round(l.price).toLocaleString('en-CA')}`,
    l.bedrooms > 0 ? plural(l.bedrooms, 'bedroom') : '',
    l.bathrooms > 0 ? plural(Number(l.bathrooms), 'bathroom') : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return [
    `🏡 For sale by owner in ${place}`,
    '',
    facts,
    l.headline.trim(),
    '',
    'We’re selling it ourselves, so you can message us directly. Photos and details:',
    shareUrl(l.id, channel),
    '',
    'Please share if you know someone looking in the area!',
  ].join('\n');
}

/** Share links that carry the full community post (WhatsApp, text, email). */
export function postShareLinks(l: PostListing) {
  const enc = encodeURIComponent;
  return {
    whatsapp: `https://wa.me/?text=${enc(communityPost(l, 'whatsapp'))}`,
    sms: `sms:?&body=${enc(communityPost(l, 'sms'))}`,
    email: `mailto:?subject=${enc(`For sale by owner in ${titleCase(l.city)}`)}&body=${enc(communityPost(l, 'email'))}`,
  };
}

/** Where "Copy post & open Facebook" sends the seller: their groups, ready to paste. */
export const FACEBOOK_GROUPS_URL = 'https://www.facebook.com/groups/feed/';
