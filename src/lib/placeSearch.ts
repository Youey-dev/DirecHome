/**
 * The home search box: understands provinces by name or short code ("BC", "Ont", "PEI"),
 * "City, BC", postal codes, accents and small typos, and suggests places as you type.
 */
import { CITY_INFO, PROVINCES, provinceName, type ProvinceCode } from '../data/cities';

/** Lower case, no accents, no punctuation, single spaces: "Montréal, Q.C." → "montreal qc" */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bst[.]?\s/g, 'saint ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Every way people write each province or territory (normalized). */
const PROVINCE_ALIASES: Record<ProvinceCode, string[]> = {
  AB: ['ab', 'alta', 'alberta'],
  BC: ['bc', 'british columbia', 'b c'],
  MB: ['mb', 'man', 'manitoba'],
  NB: ['nb', 'new brunswick', 'n b'],
  NL: ['nl', 'nfld', 'newfoundland', 'labrador', 'newfoundland and labrador', 'newfoundland labrador', 'n l'],
  NS: ['ns', 'nova scotia', 'n s'],
  NT: ['nt', 'nwt', 'northwest territories', 'north west territories'],
  NU: ['nu', 'nvt', 'nunavut'],
  ON: ['on', 'ont', 'ontario'],
  PE: ['pe', 'pei', 'p e i', 'prince edward island'],
  QC: ['qc', 'pq', 'que', 'quebec'],
  SK: ['sk', 'sask', 'saskatchewan'],
  YT: ['yt', 'yk', 'yukon', 'yukon territory'],
};

/** The province a whole query (or its last words, as in "Abbotsford BC") names, if any. */
export function provinceFromText(text: string): ProvinceCode | null {
  const n = normalize(text);
  for (const [code, aliases] of Object.entries(PROVINCE_ALIASES) as [ProvinceCode, string[]][]) {
    if (aliases.includes(n)) return code;
  }
  return null;
}

export interface ParsedQuery {
  /** Province named in the query ("BC", "Abbotsford, BC") */
  province: ProvinceCode | null;
  /** What's left to match against city, neighbourhood, postal code and headline */
  text: string;
  /** A postal code or its first 3 characters, e.g. "V2V" */
  postal: string | null;
}

/** Splits "Abbotsford, BC" into place text and province; recognises "BC" and "V2V 0G3" on their own. */
export function parseQuery(q: string): ParsedQuery {
  const raw = q.trim();
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z]\d[A-Z](\d[A-Z]\d?)?$/.test(compact) || /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) {
    return { province: null, text: '', postal: compact.slice(0, 3) };
  }
  const whole = provinceFromText(raw);
  if (whole) return { province: whole, text: '', postal: null };

  const words = normalize(raw).split(' ').filter(Boolean);
  // Try the last 1–4 words as a province ("kelowna british columbia", "halifax ns")
  for (let k = Math.min(4, words.length - 1); k >= 1; k--) {
    const tail = words.slice(-k).join(' ');
    const code = provinceFromText(tail);
    if (code) return { province: code, text: words.slice(0, -k).join(' '), postal: null };
  }
  return { province: null, text: normalize(raw), postal: null };
}

/** Edit distance, capped (enough to forgive one or two typos). */
function distance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * How well `text` (normalized) matches `name`: 0 = no match. Whole start > word start > inside >
 * close spelling (1 typo from 4 letters, 2 from 7).
 */
export function matchScore(text: string, name: string): number {
  if (!text) return 1;
  const n = normalize(name);
  if (!n) return 0;
  if (n === text) return 100;
  if (n.startsWith(text)) return 90 - Math.min(20, n.length - text.length);
  if (n.split(' ').some((w) => w.startsWith(text))) return 70;
  if (text.length >= 3 && n.includes(text)) return 50;
  if (text.length >= 4) {
    const allowed = text.length >= 7 ? 2 : 1;
    const head = n.slice(0, Math.max(text.length, Math.min(n.length, text.length + 1)));
    if (distance(text, head, allowed) <= allowed || distance(text, n, allowed) <= allowed) return 30;
  }
  return 0;
}

/** The fields of a listing the search box looks at. */
export interface SearchableListing {
  city: string;
  province?: string;
  neighborhood: string;
  postalFsa?: string;
  headline: string;
}

/** True when a listing matches what's typed in the search box. */
export function listingMatchesQuery(l: SearchableListing, q: string): boolean {
  if (!q.trim()) return true;
  const p = parseQuery(q);
  const prov = (l.province || 'BC') as ProvinceCode;
  if (p.province && prov !== p.province) return false;
  if (p.postal) return (l.postalFsa ?? '').toUpperCase().startsWith(p.postal.slice(0, Math.min(3, p.postal.length)));
  if (!p.text) return true;
  if (matchScore(p.text, l.city) > 0) return true;
  if (matchScore(p.text, l.neighborhood) > 0) return true;
  if (normalize(l.postalFsa ?? '').startsWith(p.text)) return true;
  if (normalize(provinceName(prov)).includes(p.text)) return true;
  return p.text.length >= 3 && normalize(l.headline).includes(p.text);
}

export interface PlaceSuggestion {
  kind: 'province' | 'city' | 'neighbourhood' | 'postal';
  /** "Abbotsford" */
  label: string;
  /** "British Columbia" */
  detail: string;
  /** What the search box is set to when it's picked */
  query: string;
  province: ProvinceCode | null;
  /** Homes for sale there now */
  count: number;
}

/**
 * Up to `limit` places for what's typed: provinces, cities (with homes first, then well-known ones)
 * and neighbourhoods from listings, and postal areas.
 */
export function suggestPlaces(q: string, listings: SearchableListing[], limit = 6): PlaceSuggestion[] {
  const raw = q.trim();
  if (!raw) return [];
  const p = parseQuery(raw);
  const out: (PlaceSuggestion & { score: number })[] = [];
  const provOf = (l: SearchableListing) => (l.province || 'BC') as ProvinceCode;

  // Postal area
  if (p.postal) {
    const fsa = p.postal.slice(0, 3);
    const count = listings.filter((l) => (l.postalFsa ?? '').toUpperCase().startsWith(fsa)).length;
    const prov = PROVINCES.find((x) => x.postalLetters.includes(fsa[0]))?.code ?? null;
    out.push({ kind: 'postal', label: fsa, detail: prov ? `Postal area · ${provinceName(prov)}` : 'Postal area', query: fsa, province: null, count, score: 100 });
  }

  // Provinces: by code/alias ("BC", "Sask") or by name ("ont" → Ontario)
  const qn = normalize(raw);
  for (const pr of PROVINCES) {
    const exact = p.province === pr.code && !p.text;
    const aliasHit = PROVINCE_ALIASES[pr.code].some((a) => a.length > 2 && a.startsWith(qn));
    const nameScore = matchScore(qn, pr.name);
    const score = exact ? 120 : Math.max(aliasHit ? 85 : 0, nameScore);
    if (score > 0 && !p.postal && (qn.length >= 2 || exact)) {
      out.push({
        kind: 'province',
        label: pr.name,
        detail: 'Province or territory',
        query: '',
        province: pr.code,
        count: listings.filter((l) => provOf(l) === pr.code).length,
        score: score + 5,
      });
    }
  }

  if (!p.postal) {
    const text = p.text;
    // Cities: from homes for sale, plus the starter list
    const cities = new Map<string, { name: string; province: ProvinceCode; count: number }>();
    for (const l of listings) {
      const key = `${normalize(l.city)}|${provOf(l)}`;
      const c = cities.get(key) ?? { name: l.city.trim(), province: provOf(l), count: 0 };
      c.count++;
      cities.set(key, c);
    }
    for (const c of CITY_INFO) {
      const key = `${normalize(c.name)}|${c.province}`;
      if (!cities.has(key)) cities.set(key, { name: c.name, province: c.province, count: 0 });
    }
    for (const c of cities.values()) {
      if (p.province && c.province !== p.province) continue;
      if (!text) continue; // "BC" alone: the province suggestion covers it
      const s = matchScore(text, c.name);
      if (s > 0) {
        out.push({
          kind: 'city',
          label: c.name,
          detail: provinceName(c.province),
          query: c.name,
          province: c.province,
          count: c.count,
          score: s + (c.count > 0 ? 15 : 0),
        });
      }
    }

    // Neighbourhoods from homes for sale
    if (text.length >= 2) {
      const hoods = new Map<string, { name: string; city: string; province: ProvinceCode; count: number }>();
      for (const l of listings) {
        const name = (l.neighborhood || '').trim();
        if (!name || normalize(name) === normalize(l.city)) continue;
        if (p.province && provOf(l) !== p.province) continue;
        const key = `${normalize(name)}|${normalize(l.city)}`;
        const h = hoods.get(key) ?? { name, city: l.city, province: provOf(l), count: 0 };
        h.count++;
        hoods.set(key, h);
      }
      for (const h of hoods.values()) {
        const s = matchScore(text, h.name);
        if (s > 0) {
          out.push({
            kind: 'neighbourhood',
            label: h.name,
            detail: `${h.city}, ${h.province}`,
            query: h.name,
            province: h.province,
            count: h.count,
            score: s + 10,
          });
        }
      }
    }
  }

  return out
    .sort((a, b) => b.score - a.score || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map(({ score: _s, ...s }) => s);
}
