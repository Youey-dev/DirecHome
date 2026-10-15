/**
 * Address lookup, used only when a seller creates or edits a listing, to place
 * the home on the map.
 *
 * - BC addresses use the free Province of BC Address Geocoder (official, precise).
 * - Everywhere else uses OpenStreetMap's Nominatim service, limited to Canada.
 *   It is called at most once per listing save, well inside its usage policy.
 *
 * If a lookup fails for any reason we fall back to the city (or province)
 * centre, so the listing flow never gets stuck.
 */
import { cityCentre, isInCanada } from '../data/cities';

export interface GeocodeResult {
  lat: number;
  lng: number;
  precise: boolean;
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeWithBC(street: string, city: string): Promise<GeocodeResult | null> {
  const query = encodeURIComponent(`${street}, ${city}, BC`);
  const data = await fetchJson(
    `https://geocoder.api.gov.bc.ca/addresses.json?addressString=${query}&maxResults=1&echo=false&outputSRS=4326`
  );
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const [lng, lat] = coords as [number, number];
    if (lat > 48 && lat < 60.1 && lng > -139.1 && lng < -114) {
      return { lat, lng, precise: true };
    }
  }
  return null;
}

async function geocodeWithOSM(street: string, city: string, province: string, postalCode?: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    street,
    city,
    state: province,
    country: 'Canada',
    countrycodes: 'ca',
    format: 'jsonv2',
    limit: '1',
  });
  if (postalCode) params.set('postalcode', postalCode);
  const data = await fetchJson(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  const hit = Array.isArray(data) ? data[0] : null;
  const lat = Number(hit?.lat);
  const lng = Number(hit?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lng) && isInCanada(lat, lng)) {
    return { lat, lng, precise: true };
  }
  return null;
}

export async function geocodeAddress(
  street: string,
  city: string,
  province: string,
  postalCode?: string
): Promise<GeocodeResult> {
  const fallback = { ...cityCentre(city, province), precise: false };
  try {
    const result =
      province === 'BC'
        ? (await geocodeWithBC(street, city)) ?? (await geocodeWithOSM(street, city, province, postalCode))
        : await geocodeWithOSM(street, city, province, postalCode);
    return result ?? fallback;
  } catch {
    return fallback;
  }
}

/** Kept for any older callers: BC-only lookup. */
export function geocodeBCAddress(street: string, city: string): Promise<GeocodeResult> {
  return geocodeAddress(street, city, 'BC');
}
