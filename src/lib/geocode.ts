/**
 * Address lookup using the free Province of BC Address Geocoder.
 * Used only when a seller creates a listing, to place the home on the map.
 * If the lookup fails for any reason we fall back to the city centre, so the
 * listing flow never gets stuck.
 */
import { cityCentre } from '../data/cities';

export interface GeocodeResult {
  lat: number;
  lng: number;
  precise: boolean;
}

export async function geocodeBCAddress(street: string, city: string): Promise<GeocodeResult> {
  const fallback = { ...cityCentre(city), precise: false };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const query = encodeURIComponent(`${street}, ${city}, BC`);
    const res = await fetch(
      `https://geocoder.api.gov.bc.ca/addresses.json?addressString=${query}&maxResults=1&echo=false&outputSRS=4326`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return fallback;
    const data = await res.json();
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const [lng, lat] = coords as [number, number];
      if (lat > 48 && lat < 51 && lng > -125 && lng < -121) {
        return { lat, lng, precise: true };
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}
