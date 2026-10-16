/**
 * Example listings: six made-up homes that show how a listing looks on OwnersMarket while the
 * site is new. They are NOT real homes and NOT for sale.
 *
 * Honesty rules (Competition Act: no misleading advertising):
 *  - Every card and page says "Example" and "not for sale"; no message, viewing or save buttons.
 *  - No street address and no map pin; neighbourhood and city only.
 *  - Never stored in the database, never counted as homes for sale, never in the sitemap,
 *    and the pages are marked noindex (netlify/edge-functions).
 *  - Shown only to fill empty spots: once 6 real homes are live, they disappear on their own.
 *
 * Photos: free to use under the Unsplash License (https://unsplash.com/license), served through
 * Netlify Image CDN from images.unsplash.com (see [images] in netlify.toml). Credited on each page.
 * Prices are illustrative, rounded and roughly in line with the area.
 */
import type { Listing, PhotoItem, PropertyType } from '../types/listing';
import { calculateBCCommission } from '../lib/commissionCalc';

/** How many example cards to show at most; also the number of real homes that hides them. */
export const EXAMPLE_LIMIT = 6;

const unsplash = (photoId: string, width: number) =>
  `/.netlify/images?url=${encodeURIComponent(`https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=2400&q=80`)}&w=${width}&q=75`;

const photos = (slug: string, ids: string[]): PhotoItem[] =>
  ids.map((id, i) => ({
    id: `${slug}-${i}`,
    url: unsplash(id, 1600),
    thumbnailUrl: unsplash(id, 800),
    isCover: i === 0,
    width: 1600,
    height: 1067,
  }));

interface ExampleInput {
  slug: string;
  headline: string;
  propertyType: PropertyType;
  neighborhood: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSqft?: number;
  lotAcres?: number;
  yearBuilt: number;
  parkingSpaces: number;
  strataFee?: number;
  propertyTaxesAnnual: number;
  offersCashback?: boolean;
  cashbackAmount?: number;
  description: string;
  neighborhoodHighlights: string;
  recentUpgrades: string[];
  inclusions: string[];
  photoIds: string[];
  photoCredits: string[];
}

const make = (e: ExampleInput): Listing => ({
  id: `example-${e.slug}`,
  userId: 'example',
  sellerName: 'Example owner',
  sellerEmail: '',
  sellerPhone: '',
  status: 'live',
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
  city: e.city,
  province: 'BC',
  neighborhood: e.neighborhood,
  lat: 0,
  lng: 0,
  propertyType: e.propertyType,
  price: e.price,
  bedrooms: e.bedrooms,
  bathrooms: e.bathrooms,
  sqft: e.sqft,
  lotSqft: e.lotSqft,
  lotAcres: e.lotAcres,
  yearBuilt: e.yearBuilt,
  parkingSpaces: e.parkingSpaces,
  strataFee: e.strataFee,
  propertyTaxesAnnual: e.propertyTaxesAnnual,
  offersCashback: !!e.offersCashback,
  cashbackType: 'fixed',
  cashbackAmount: e.cashbackAmount ?? 0,
  estimatedCommissionSaved: calculateBCCommission(e.price, false).traditionalTotalCommission,
  photos: photos(e.slug, e.photoIds),
  headline: e.headline,
  description: e.description,
  neighborhoodHighlights: e.neighborhoodHighlights,
  recentUpgrades: e.recentUpgrades,
  inclusions: e.inclusions,
  viewsCount: 0,
  savesCount: 0,
  inquiriesCount: 0,
  paymentStatus: 'complimentary_launch',
  isExample: true,
  photoCredits: e.photoCredits,
});

export const EXAMPLE_LISTINGS: Listing[] = [
  make({
    slug: 'abbotsford-rancher',
    headline: 'Updated 3-bed rancher with a fenced yard',
    propertyType: 'Single Family Detached',
    neighborhood: 'Clearbrook',
    city: 'Abbotsford',
    price: 1089000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1640,
    lotSqft: 7200,
    yearBuilt: 1986,
    parkingSpaces: 3,
    propertyTaxesAnnual: 4150,
    offersCashback: true,
    cashbackAmount: 5000,
    description:
      'Everything on one level: three bedrooms, two bathrooms and an open kitchen and living area that looks out to a big, fully fenced backyard. The kitchen was redone with quartz counters and new appliances, and the covered patio is ready for barbecue season.\n\nA double garage plus room for another car on the driveway, a garden shed, and a quiet street close to schools and parks.',
    neighborhoodHighlights: 'Walk to elementary and secondary schools, Mill Lake Park and shopping. Quick access to Highway 1.',
    recentUpgrades: ['Kitchen with quartz counters (2022)', 'Roof (2020)', 'Furnace and heat pump (2021)'],
    inclusions: ['Fridge, stove, dishwasher', 'Washer and dryer', 'Window coverings', 'Garden shed'],
    photoIds: ['photo-1713789327173-fe5450ec66d3', 'photo-1556911220-bff31c812dba', 'photo-1583847268964-b28dc8f51f92', 'photo-1616486029423-aaa4789e8c9a'],
    photoCredits: ['Roger Starnes Sr', 'Jason Briscoe', 'Minh Pham', 'Spacejoy'],
  }),
  make({
    slug: 'chilliwack-townhouse',
    headline: 'Bright end-unit townhouse with mountain views',
    propertyType: 'Townhouse',
    neighborhood: 'Sardis',
    city: 'Chilliwack',
    price: 629000,
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 1480,
    yearBuilt: 2012,
    parkingSpaces: 2,
    strataFee: 285,
    propertyTaxesAnnual: 2780,
    description:
      'An end unit means extra windows and light on three sides. The main floor has an open kitchen with an island, a living room with a gas fireplace and a powder room; upstairs are three bedrooms, including a primary with its own ensuite and walk-in closet.\n\nThe fenced patio backs onto green space with views of the mountains. Side-by-side garage, pets welcome with strata approval.',
    neighborhoodHighlights: 'Close to Vedder River trails, Garrison Crossing shops and cafés, and schools.',
    recentUpgrades: ['Interior paint (2024)', 'Laminate flooring on main (2023)'],
    inclusions: ['Fridge, stove, dishwasher, microwave', 'Washer and dryer', 'Blinds'],
    photoIds: ['photo-1698362695891-8628b6ff6802', 'photo-1602028915047-37269d1a73f7', 'photo-1605774337664-7a846e9cdf17', 'photo-1633948393301-d43e3ec0e5cd'],
    photoCredits: ['Stacie Ong', 'Lotus Design N Print', 'Katja Rooke', 'laura adai'],
  }),
  make({
    slug: 'mission-family-home-suite',
    headline: '4-bed family home with a 2-bed basement suite',
    propertyType: 'Single Family Detached',
    neighborhood: 'Cedar Valley',
    city: 'Mission',
    price: 1149000,
    bedrooms: 6,
    bathrooms: 4,
    sqft: 3120,
    lotSqft: 6050,
    yearBuilt: 2008,
    parkingSpaces: 4,
    propertyTaxesAnnual: 4620,
    description:
      'Room for a big family upstairs, with four bedrooms and a bright kitchen that opens to a family room with a fireplace. Downstairs, a two-bedroom suite with its own entrance and laundry can help with the mortgage or house extended family.\n\nDouble garage, fenced backyard and a quiet street in a family neighbourhood.',
    neighborhoodHighlights: 'Near Cedar Valley schools, parks and the West Coast Express station.',
    recentUpgrades: ['Hot water tank (2023)', 'Main-floor carpet replaced with hardwood (2021)', 'Exterior paint (2022)'],
    inclusions: ['Two sets of appliances (main and suite)', 'Two washers and dryers', 'Window coverings'],
    photoIds: ['photo-1573208078429-16e423f5f1e3', 'photo-1556912173-3bb406ef7e77', 'photo-1632829882891-5047ccc421bc', 'photo-1600210491305-7396500b5b31'],
    photoCredits: ['K. Mitch Hodge', 'roam in color', 'Spacejoy', 'Collov Home Design'],
  }),
  make({
    slug: 'langley-condo',
    headline: '2-bed corner condo near shops and transit',
    propertyType: 'Condo / Apartment',
    neighborhood: 'Willoughby',
    city: 'Langley',
    price: 559000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 905,
    yearBuilt: 2017,
    parkingSpaces: 1,
    strataFee: 410,
    propertyTaxesAnnual: 2240,
    description:
      'A corner unit with windows on two sides and a covered balcony. Two bedrooms on opposite sides of the living area for privacy, each with its own bathroom. The kitchen has a breakfast bar, stainless appliances and plenty of storage.\n\nComes with one secure parking stall and a storage locker. The building has a gym and a rooftop patio.',
    neighborhoodHighlights: 'Walk to Willoughby Town Centre shops, restaurants and bus routes; easy access to Highway 1.',
    recentUpgrades: ['New washer and dryer (2024)'],
    inclusions: ['Fridge, stove, dishwasher, microwave', 'Washer and dryer', 'Blinds', 'Parking stall and storage locker'],
    photoIds: ['photo-1643297551340-19d8ad4f20ad', 'photo-1757924461488-ef9ad0670978', 'photo-1565183928294-7063f23ce0f8', 'photo-1616594039964-ae9021a400a0'],
    photoCredits: ['Ferdinand Asakome', 'Aalo Lens', 'Lotus Design N Print', 'Spacejoy'],
  }),
  make({
    slug: 'maple-ridge-half-duplex',
    headline: 'Half-duplex with a garage workshop, no strata fees',
    propertyType: 'Duplex / Half-Duplex',
    neighborhood: 'West Central',
    city: 'Maple Ridge',
    price: 849000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1520,
    lotSqft: 3900,
    yearBuilt: 1994,
    parkingSpaces: 2,
    propertyTaxesAnnual: 3310,
    description:
      'All the space of a house without strata fees. Three bedrooms up, an open main floor with a refreshed kitchen, and a sunny, fenced backyard. The oversized single garage has a workbench and power, set up as a workshop.\n\nWalking distance to shops, parks and the river.',
    neighborhoodHighlights: 'Close to downtown Maple Ridge shops, Memorial Peace Park and the Fraser River.',
    recentUpgrades: ['Kitchen cabinets and counters (2021)', 'Windows (2019)'],
    inclusions: ['Fridge, stove, dishwasher', 'Washer and dryer', 'Garage workbench'],
    photoIds: ['photo-1580587771525-78b9dba3b914', 'photo-1588854337221-4cf9fa96059c', 'photo-1598928506311-c55ded91a20c', 'photo-1696762932825-2737db830bbe'],
    photoCredits: ['Ярослав Алексеенко', 'Lotus Design N Print', 'Lotus Design N Print', 'Le Quan'],
  }),
  make({
    slug: 'abbotsford-hobby-farm',
    headline: '5-acre hobby farm with a barn and a renovated farmhouse',
    propertyType: 'Acreage / Farm',
    neighborhood: 'Bradner',
    city: 'Abbotsford',
    price: 1890000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2650,
    lotAcres: 5,
    yearBuilt: 1979,
    parkingSpaces: 6,
    propertyTaxesAnnual: 3980,
    description:
      'Five level acres with a renovated four-bedroom farmhouse, a barn with stalls and a hay loft, and fenced pasture. The country kitchen has a big wooden island, and the covered porch looks across the fields.\n\nPlenty of parking for trailers and equipment. A quiet rural road, minutes from town.',
    neighborhoodHighlights: 'Rural Bradner, known for its farms; about 10 minutes to Abbotsford and Aldergrove.',
    recentUpgrades: ['Farmhouse kitchen (2020)', 'Barn roof (2022)', 'Well pump (2021)'],
    inclusions: ['Fridge, stove, dishwasher', 'Washer and dryer', 'Barn stalls and fencing'],
    photoIds: ['photo-1596753365498-2d23bbfcbc24', 'photo-1628797285815-453c1d0d21e3', 'photo-1596327958020-27247c64f039', 'photo-1603726008204-77f56e5a2610'],
    photoCredits: ['Brandon Green', 'Sosey Interiors', 'Yaroslav Muzychenko', 'Erik van Dijk'],
  }),
];

/** The examples to show alongside `realCount` real homes (none once there are enough). */
export const examplesToShow = (realCount: number): Listing[] =>
  realCount >= EXAMPLE_LIMIT ? [] : EXAMPLE_LISTINGS.slice(0, EXAMPLE_LIMIT - realCount);

export const findExample = (id: string): Listing | undefined => EXAMPLE_LISTINGS.find((l) => l.id === id);
