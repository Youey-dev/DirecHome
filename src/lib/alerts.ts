/** New-listing alerts ("Email me new homes like these"): what a saved search looks for. */
import { provinceName } from '../data/cities';

export interface AlertCriteria {
  query?: string | null;
  province?: string | null;
  propertyType?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minBeds?: number | null;
  minBaths?: number | null;
}

export interface ListingAlert extends AlertCriteria {
  id: string;
  label: string;
  createdAt: string;
  lastSentAt: string | null;
}

const TYPE_WORDS: Record<string, [string, string]> = {
  'Single Family Detached': ['house', 'houses'],
  Townhouse: ['townhouse', 'townhouses'],
  'Condo / Apartment': ['condo', 'condos'],
  'Duplex / Half-Duplex': ['duplex', 'duplexes'],
  'Acreage / Farm': ['acreage', 'acreages'],
};

const money = (n: number) =>
  n >= 1_000_000 && n % 100_000 === 0
    ? `$${(n / 1_000_000).toLocaleString('en-CA', { maximumFractionDigits: 1 })}M`
    : `$${Math.round(n).toLocaleString('en-CA')}`;

/** "3+ bed houses in Abbotsford under $900,000" */
export function describeAlert(c: AlertCriteria): string {
  const kind = c.propertyType && TYPE_WORDS[c.propertyType] ? TYPE_WORDS[c.propertyType][1] : 'homes';
  const parts: string[] = [];
  const beds = c.minBeds ? `${c.minBeds}+ bed ` : '';
  const baths = c.minBaths ? ` with ${c.minBaths}+ baths` : '';
  parts.push(`${beds}${kind}${baths}`);
  const q = c.query?.trim();
  if (q && c.province) parts.push(`matching “${q}” in ${provinceName(c.province)}`);
  else if (q) parts.push(`matching “${q}”`);
  else if (c.province) parts.push(`in ${provinceName(c.province)}`);
  else parts.push('across Canada');
  if (c.minPrice && c.maxPrice) parts.push(`from ${money(c.minPrice)} to ${money(c.maxPrice)}`);
  else if (c.maxPrice) parts.push(`under ${money(c.maxPrice)}`);
  else if (c.minPrice) parts.push(`over ${money(c.minPrice)}`);
  const s = parts.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
