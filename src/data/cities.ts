/**
 * Provinces, territories and a starter list of cities across Canada.
 *
 * Sellers can type any city name; this list only powers suggestions and the
 * fallback map position used when an exact address cannot be looked up.
 * Public maps only ever show ~1 km accuracy anyway.
 */

export type ProvinceCode =
  | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

export interface ProvinceInfo {
  code: ProvinceCode;
  name: string;
  /** First letter(s) a postal code in this province can start with. */
  postalLetters: string[];
  lat: number;
  lng: number;
}

export const PROVINCES: ProvinceInfo[] = [
  { code: 'AB', name: 'Alberta', postalLetters: ['T'], lat: 53.5461, lng: -113.4938 },
  { code: 'BC', name: 'British Columbia', postalLetters: ['V'], lat: 49.2827, lng: -123.1207 },
  { code: 'MB', name: 'Manitoba', postalLetters: ['R'], lat: 49.8951, lng: -97.1384 },
  { code: 'NB', name: 'New Brunswick', postalLetters: ['E'], lat: 45.9636, lng: -66.6431 },
  { code: 'NL', name: 'Newfoundland and Labrador', postalLetters: ['A'], lat: 47.5615, lng: -52.7126 },
  { code: 'NS', name: 'Nova Scotia', postalLetters: ['B'], lat: 44.6488, lng: -63.5752 },
  { code: 'NT', name: 'Northwest Territories', postalLetters: ['X'], lat: 62.454, lng: -114.3718 },
  { code: 'NU', name: 'Nunavut', postalLetters: ['X'], lat: 63.7467, lng: -68.517 },
  { code: 'ON', name: 'Ontario', postalLetters: ['K', 'L', 'M', 'N', 'P'], lat: 43.6532, lng: -79.3832 },
  { code: 'PE', name: 'Prince Edward Island', postalLetters: ['C'], lat: 46.2382, lng: -63.1311 },
  { code: 'QC', name: 'Quebec', postalLetters: ['G', 'H', 'J'], lat: 45.5017, lng: -73.5673 },
  { code: 'SK', name: 'Saskatchewan', postalLetters: ['S'], lat: 52.1332, lng: -106.67 },
  { code: 'YT', name: 'Yukon', postalLetters: ['Y'], lat: 60.7212, lng: -135.0568 },
];

export const ALL_PROVINCES = 'All of Canada';

export function provinceByCode(code: string | undefined | null): ProvinceInfo | undefined {
  return PROVINCES.find((p) => p.code === code);
}

export function provinceName(code: string | undefined | null): string {
  return provinceByCode(code)?.name ?? (code || '');
}

export interface CityInfo {
  name: string;
  province: ProvinceCode;
  lat: number;
  lng: number;
}

export const CITY_INFO: CityInfo[] = [
  // British Columbia (original launch region first)
  { name: 'Langley', province: 'BC', lat: 49.1044, lng: -122.6604 },
  { name: 'Surrey', province: 'BC', lat: 49.1913, lng: -122.849 },
  { name: 'Abbotsford', province: 'BC', lat: 49.0504, lng: -122.3045 },
  { name: 'Burnaby', province: 'BC', lat: 49.2488, lng: -122.9805 },
  { name: 'Vancouver', province: 'BC', lat: 49.2827, lng: -123.1207 },
  { name: 'Coquitlam', province: 'BC', lat: 49.2838, lng: -122.7932 },
  { name: 'Chilliwack', province: 'BC', lat: 49.1579, lng: -121.9514 },
  { name: 'Richmond', province: 'BC', lat: 49.1666, lng: -123.1336 },
  { name: 'White Rock', province: 'BC', lat: 49.0253, lng: -122.8026 },
  { name: 'Maple Ridge', province: 'BC', lat: 49.2194, lng: -122.5984 },
  { name: 'Delta', province: 'BC', lat: 49.0847, lng: -123.0586 },
  { name: 'Mission', province: 'BC', lat: 49.1337, lng: -122.3112 },
  { name: 'Victoria', province: 'BC', lat: 48.4284, lng: -123.3656 },
  { name: 'Kelowna', province: 'BC', lat: 49.888, lng: -119.496 },
  { name: 'Kamloops', province: 'BC', lat: 50.6745, lng: -120.3273 },
  { name: 'Nanaimo', province: 'BC', lat: 49.1659, lng: -123.9401 },
  { name: 'Prince George', province: 'BC', lat: 53.9171, lng: -122.7497 },
  // Alberta
  { name: 'Calgary', province: 'AB', lat: 51.0447, lng: -114.0719 },
  { name: 'Edmonton', province: 'AB', lat: 53.5461, lng: -113.4938 },
  { name: 'Red Deer', province: 'AB', lat: 52.2681, lng: -113.8112 },
  { name: 'Lethbridge', province: 'AB', lat: 49.6956, lng: -112.8451 },
  // Saskatchewan
  { name: 'Saskatoon', province: 'SK', lat: 52.1332, lng: -106.67 },
  { name: 'Regina', province: 'SK', lat: 50.4452, lng: -104.6189 },
  // Manitoba
  { name: 'Winnipeg', province: 'MB', lat: 49.8951, lng: -97.1384 },
  { name: 'Brandon', province: 'MB', lat: 49.8485, lng: -99.95 },
  // Ontario
  { name: 'Toronto', province: 'ON', lat: 43.6532, lng: -79.3832 },
  { name: 'Ottawa', province: 'ON', lat: 45.4215, lng: -75.6972 },
  { name: 'Mississauga', province: 'ON', lat: 43.589, lng: -79.6441 },
  { name: 'Brampton', province: 'ON', lat: 43.7315, lng: -79.7624 },
  { name: 'Hamilton', province: 'ON', lat: 43.2557, lng: -79.8711 },
  { name: 'London', province: 'ON', lat: 42.9849, lng: -81.2453 },
  { name: 'Kitchener', province: 'ON', lat: 43.4516, lng: -80.4925 },
  { name: 'Windsor', province: 'ON', lat: 42.3149, lng: -83.0364 },
  { name: 'Barrie', province: 'ON', lat: 44.3894, lng: -79.6903 },
  { name: 'Kingston', province: 'ON', lat: 44.2312, lng: -76.486 },
  { name: 'Sudbury', province: 'ON', lat: 46.4917, lng: -80.993 },
  // Quebec
  { name: 'Montréal', province: 'QC', lat: 45.5017, lng: -73.5673 },
  { name: 'Québec', province: 'QC', lat: 46.8139, lng: -71.208 },
  { name: 'Laval', province: 'QC', lat: 45.6066, lng: -73.7124 },
  { name: 'Gatineau', province: 'QC', lat: 45.4765, lng: -75.7013 },
  { name: 'Sherbrooke', province: 'QC', lat: 45.4042, lng: -71.8929 },
  // Atlantic
  { name: 'Halifax', province: 'NS', lat: 44.6488, lng: -63.5752 },
  { name: 'Moncton', province: 'NB', lat: 46.0878, lng: -64.7782 },
  { name: 'Saint John', province: 'NB', lat: 45.2733, lng: -66.0633 },
  { name: 'Fredericton', province: 'NB', lat: 45.9636, lng: -66.6431 },
  { name: 'Charlottetown', province: 'PE', lat: 46.2382, lng: -63.1311 },
  { name: "St. John's", province: 'NL', lat: 47.5615, lng: -52.7126 },
  // Territories
  { name: 'Whitehorse', province: 'YT', lat: 60.7212, lng: -135.0568 },
  { name: 'Yellowknife', province: 'NT', lat: 62.454, lng: -114.3718 },
  { name: 'Iqaluit', province: 'NU', lat: 63.7467, lng: -68.517 },
];

export function citiesInProvince(code: string): CityInfo[] {
  return CITY_INFO.filter((c) => c.province === code);
}

const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Best-known centre point for a city, falling back to the province, then the original Langley default. */
export function cityCentre(city: string, province?: string): { lat: number; lng: number } {
  const found = CITY_INFO.find((c) => norm(c.name) === norm(city) && (!province || c.province === province));
  if (found) return { lat: found.lat, lng: found.lng };
  const prov = provinceByCode(province);
  if (prov) return { lat: prov.lat, lng: prov.lng };
  return { lat: 49.1044, lng: -122.6604 };
}

/** Rough bounding box for Canada, used to sanity-check address lookups. */
export function isInCanada(lat: number, lng: number): boolean {
  return lat > 41.5 && lat < 83.5 && lng > -141.5 && lng < -52.4;
}
