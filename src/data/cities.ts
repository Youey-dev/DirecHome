/**
 * Cities served at launch, with approximate centre points.
 * The centre point is only used as a fallback map position if an exact address
 * cannot be looked up. Public maps only ever show ~1 km accuracy anyway.
 */
export interface CityInfo {
  name: string;
  lat: number;
  lng: number;
}

export const BC_CITY_INFO: CityInfo[] = [
  { name: 'Langley', lat: 49.1044, lng: -122.6604 },
  { name: 'Surrey', lat: 49.1913, lng: -122.849 },
  { name: 'Abbotsford', lat: 49.0504, lng: -122.3045 },
  { name: 'Burnaby', lat: 49.2488, lng: -122.9805 },
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207 },
  { name: 'Coquitlam', lat: 49.2838, lng: -122.7932 },
  { name: 'Chilliwack', lat: 49.1579, lng: -121.9514 },
  { name: 'Richmond', lat: 49.1666, lng: -123.1336 },
  { name: 'White Rock', lat: 49.0253, lng: -122.8026 },
  { name: 'Maple Ridge', lat: 49.2194, lng: -122.5984 },
  { name: 'Delta', lat: 49.0847, lng: -123.0586 },
  { name: 'Mission', lat: 49.1337, lng: -122.3112 },
];

export const BC_CITIES = ['All Cities', ...BC_CITY_INFO.map((c) => c.name)];

export function cityCentre(city: string): { lat: number; lng: number } {
  const found = BC_CITY_INFO.find((c) => c.name === city);
  return found ? { lat: found.lat, lng: found.lng } : { lat: 49.1044, lng: -122.6604 };
}
