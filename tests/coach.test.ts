import { coachListing, type CoachInput } from '../src/lib/listingCoach';

export function runCoachTests() {
  console.log('🧪 Testing the listing coach...');
  const photo = (i: number, w = 2000, h = 1500) => ({ id: String(i), url: `p${i}.jpg`, thumbnailUrl: `p${i}.jpg`, isCover: i === 0, width: w, height: h });
  const complete: CoachInput = {
    propertyType: 'Single Family Detached',
    sqft: 1800,
    yearBuilt: 1998,
    lotSqft: 6000,
    strataFee: 0,
    propertyTaxesAnnual: 3900,
    photos: Array.from({ length: 18 }, (_, i) => photo(i)),
    headline: 'Updated rancher with a big fenced yard',
    description: 'A'.repeat(450),
    neighborhoodHighlights: 'Close to schools and parks',
    upgrades: 'Roof 2022',
    inclusions: 'Fridge, stove',
  };

  const none = coachListing(complete);
  if (none.length !== 0) throw new Error(`A complete listing should get no tips, got: ${none.map((t) => t.id).join(', ')}`);

  const condo = coachListing({ ...complete, propertyType: 'Condo / Apartment', lotSqft: undefined, strataFee: 0, propertyTaxesAnnual: 0 });
  for (const id of ['strata', 'taxes']) if (!condo.some((t) => t.id === id)) throw new Error(`Condo missing tip: ${id}`);
  if (condo.some((t) => t.id === 'lot')) throw new Error('Condos should not be asked for a lot size');
  if (condo[0].level !== 'important') throw new Error('Important tips should come first');

  const sparse = coachListing({ ...complete, photos: [photo(0, 800, 600), photo(1, 1000, 1400), photo(2, 1000, 1400), photo(3, 1000, 1400)], darkPhotos: 2, description: 'Call me 604-555-0199', headline: 'NICE HOUSE FOR SALE NOW' });
  for (const id of ['photo-count', 'photo-dark', 'photo-small', 'photo-portrait', 'contact', 'caps', 'description'])
    if (!sparse.some((t) => t.id === id)) throw new Error(`Sparse listing missing tip: ${id}`);

  const all = [...condo, ...sparse].map((t) => t.text.toLowerCase()).join(' ');
  if (/price|value|worth|asking/.test(all)) throw new Error('Coach tips must never talk about price');
  console.log('  ✅ Coach gives completeness and photo tips, important first, never about price\n');
}
