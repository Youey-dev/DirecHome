/**
 * Share links for a seller's own listing (dashboard → "Share your listing to reach more buyers").
 *
 * Only public details go in the message (city and the listing link), never the street
 * address or a phone number: buyers message the owner on OwnersMarket. Links carry UTM tags
 * so Google Analytics shows which channel brought each visit.
 */
import type { Listing } from '../types/listing';

export const SITE = 'https://ownersmarket.ca';

export type ShareChannel = 'facebook' | 'whatsapp' | 'sms' | 'email' | 'copy' | 'native';

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
