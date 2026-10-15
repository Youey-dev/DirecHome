/**
 * Which edits send an approved listing back for review. Mirrors the database rule in
 * supabase/migrations/20261020_review_and_privacy.sql, so sellers are told before they save.
 *
 * Back to review: headline, description, neighbourhood, highlights, upgrades, inclusions,
 * city, province, street address, unit, postal code, and photos (added, removed or re-captioned).
 * Straight through: price and home details (rooms, size, year, parking, fees, taxes, cash-back),
 * and reordering photos or choosing a different cover.
 */
import type { Listing, PhotoItem } from '../types/listing';

export interface ReviewableEdit {
  headline: string;
  description: string;
  neighborhood: string;
  neighborhoodHighlights?: string;
  recentUpgrades: string[];
  inclusions: string[];
  city: string;
  province: string;
  streetAddress: string;
  unitNumber?: string;
  postalCode: string;
  photos: PhotoItem[];
}

const postal = (p: string | undefined) => (p ?? '').replace(/\s+/g, '').toUpperCase();
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const photoKey = (photos: PhotoItem[]) => photos.map((p) => `${p.url}|${p.caption ?? ''}`).sort();

export function editNeedsReview(input: ReviewableEdit, current: Listing | undefined): boolean {
  if (!current || !['live', 'paused'].includes(current.status)) return false;
  return !(
    same(input.headline, current.headline) &&
    same(input.description, current.description) &&
    same(input.neighborhood, current.neighborhood) &&
    same(input.neighborhoodHighlights || null, current.neighborhoodHighlights || null) &&
    same(input.recentUpgrades, current.recentUpgrades) &&
    same(input.inclusions, current.inclusions) &&
    same(input.city, current.city) &&
    same(input.province, current.province) &&
    same(input.streetAddress, current.streetAddress) &&
    same(input.unitNumber || null, current.unitNumber || null) &&
    same(postal(input.postalCode), postal(current.postalCode)) &&
    same(photoKey(input.photos), photoKey(current.photos))
  );
}
