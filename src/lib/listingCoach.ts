/**
 * Listing coach: friendly tips shown before a seller submits their listing.
 *
 * Tips are only about completeness and photos. Never about price: OwnersMarket does not
 * value homes or advise on pricing (legal guardrail).
 */
import type { PhotoItem, PropertyType } from '../types/listing';

export interface CoachInput {
  propertyType: PropertyType;
  sqft: number;
  yearBuilt: number;
  lotSqft?: number;
  lotAcres?: number;
  strataFee: number;
  propertyTaxesAnnual: number;
  photos: PhotoItem[];
  headline: string;
  description: string;
  neighborhoodHighlights: string;
  upgrades: string;
  inclusions: string;
  /** How many photos look dark (measured separately, see measureDarkPhotos). */
  darkPhotos?: number;
}

export interface CoachTip {
  id: string;
  /** 'important' = buyers will ask for it; 'suggestion' = makes the listing stronger. */
  level: 'important' | 'suggestion';
  text: string;
  /** Wizard step that fixes it. */
  step: number;
}

const STRATA_TYPES: PropertyType[] = ['Townhouse', 'Condo / Apartment'];
const CONTACT_PATTERN = /(\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;

export function coachListing(l: CoachInput): CoachTip[] {
  const tips: CoachTip[] = [];
  const add = (id: string, level: CoachTip['level'], text: string, step: number) => tips.push({ id, level, text, step });

  // Details buyers always ask about
  if (!l.sqft) add('sqft', 'important', 'Add the floor area (square feet). It’s one of the first things buyers filter by.', 2);
  if (!l.yearBuilt) add('year', 'important', 'Add the year the home was built.', 2);
  if (!l.propertyTaxesAnnual) add('taxes', 'important', 'Add your annual property taxes. Buyers use them to work out their monthly costs.', 2);
  if (STRATA_TYPES.includes(l.propertyType) && !l.strataFee)
    add('strata', 'important', 'Add your monthly strata or condo fee. Buyers of townhouses and condos always ask for it.', 2);
  if (['Single Family Detached', 'Acreage / Farm', 'Duplex / Half-Duplex'].includes(l.propertyType) && !l.lotSqft && !l.lotAcres)
    add('lot', 'suggestion', 'Add the lot size. Buyers of houses want to know how much yard comes with it.', 2);

  // Photos
  const n = l.photos.length;
  if (n < 10) add('photo-count', 'important', `You have ${n} ${n === 1 ? 'photo' : 'photos'}. Add at least 10 so buyers can see every main room: the front, kitchen, living areas, bedrooms, bathrooms and yard.`, 3);
  else if (n < 15) add('photo-rooms', 'suggestion', 'Check your photos cover the front of the home, kitchen, living areas, every bedroom and bathroom, and the yard or balcony.', 3);
  if (l.darkPhotos && l.darkPhotos > 0)
    add('photo-dark', 'suggestion', `${l.darkPhotos} ${l.darkPhotos === 1 ? 'photo looks' : 'photos look'} dark. Retake ${l.darkPhotos === 1 ? 'it' : 'them'} in daylight with the lights on and blinds open.`, 3);
  const small = l.photos.filter((p) => p.width && p.width < 1200).length;
  if (small > 0) add('photo-small', 'suggestion', `${small} ${small === 1 ? 'photo is' : 'photos are'} small (under 1200 pixels wide) and may look blurry on a big screen.`, 3);
  const upright = l.photos.filter((p) => p.width && p.height && p.height > p.width).length;
  if (upright >= 3) add('photo-portrait', 'suggestion', `${upright} photos were taken upright. Sideways (landscape) photos fill the listing better and show more of each room.`, 3);

  // Words
  const headline = l.headline.trim();
  if (headline.length < 20) add('headline', 'suggestion', 'Make your headline a little longer: say what makes the home special, like “Updated rancher with a big fenced yard”.', 4);
  else if (headline === headline.toUpperCase() && /[A-Z]/.test(headline)) add('caps', 'suggestion', 'Your headline is all capital letters. Normal sentence case is easier to read.', 4);
  if (l.description.trim().length < 400)
    add('description', 'suggestion', 'Your description is short. Mention the layout, recent updates, storage, and what you’ve loved about living there.', 4);
  if (CONTACT_PATTERN.test(`${l.headline} ${l.description} ${l.neighborhoodHighlights}`))
    add('contact', 'important', 'Remove your phone number or email from the text. Buyers message you through OwnersMarket, which keeps your contact details private.', 4);
  if (!l.neighborhoodHighlights.trim()) add('area', 'suggestion', 'Add neighbourhood highlights: nearby schools, parks, transit and shopping.', 4);
  if (!l.upgrades.trim()) add('upgrades', 'suggestion', 'List recent upgrades with their year, like a new roof, furnace or kitchen.', 4);
  if (!l.inclusions.trim()) add('inclusions', 'suggestion', 'List what’s included in the sale, like appliances and window coverings.', 4);

  return tips.sort((a, b) => (a.level === b.level ? a.step - b.step : a.level === 'important' ? -1 : 1));
}

/**
 * Counts photos that look dark, by sampling each photo's average brightness in the browser.
 * Photos that can't be read (for example, blocked by the image host) are skipped.
 */
export async function measureDarkPhotos(photos: PhotoItem[], threshold = 0.32): Promise<number> {
  const results = await Promise.all(
    photos.map(
      (p) =>
        new Promise<boolean>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const size = 32;
              const canvas = document.createElement('canvas');
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(false);
              ctx.drawImage(img, 0, 0, size, size);
              const { data } = ctx.getImageData(0, 0, size, size);
              let sum = 0;
              for (let i = 0; i < data.length; i += 4) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
              resolve(sum / (size * size) / 255 < threshold);
            } catch {
              resolve(false);
            }
          };
          img.onerror = () => resolve(false);
          img.src = p.thumbnailUrl || p.url;
        }),
    ),
  );
  return results.filter(Boolean).length;
}
