/**
 * Runtime country resolution (mirrors scripts/lib/country-resolver.js).
 *
 * Comtrade partner codes are ISO 3166-1 numeric, so any destination resolves
 * to coordinates from the bundled centroid table with no manual entry.
 */
import centroidsRaw from './country-centroids.json';

const centroids: Record<string, [number, number]> = {};
for (const [k, v] of Object.entries(centroidsRaw as Record<string, unknown>)) {
  if (k.startsWith('_')) continue;
  if (Array.isArray(v) && v.length === 2) centroids[k] = [v[0] as number, v[1] as number];
}

// Comtrade composite-area codes that are not standalone ISO numeric.
const COMTRADE_CODE_ALIASES: Record<number, number> = {
  251: 250, 699: 356, 579: 578, 757: 756, 842: 840, 381: 380,
};

// Informal / colloquial names -> Comtrade partner code.
const SEARCH_ALIASES: Record<string, number> = {
  'south korea': 410, korea: 410, 'north korea': 408,
  usa: 842, 'united states': 842, america: 842,
  uk: 826, britain: 826, england: 826,
  uae: 784, 'united arab emirates': 784,
  vietnam: 704, russia: 643, iran: 364, syria: 760, laos: 418,
  moldova: 498, bolivia: 68, venezuela: 862, tanzania: 834,
  czechia: 203, 'czech republic': 203, slovakia: 703,
  'hong kong': 344, macao: 446, macau: 446,
  'ivory coast': 384, 'cote divoire': 384,
  burma: 104, myanmar: 104, swaziland: 748, eswatini: 748,
  'cape verde': 132, brunei: 96, 'east timor': 626,
  'democratic republic of congo': 180, drc: 180,
};

export function normalize(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|of|rep|republic|dem|democratic|islamic|state|states|kingdom)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface CountryMatch {
  code: number;
  name: string;
  score: number;
}

export function fuzzyMatchCountries(
  query: string,
  partnerAreas: { id: string | number; text: string }[],
): CountryMatch[] {
  const q = normalize(query);
  if (!q) return [];
  const aliasCode = SEARCH_ALIASES[q] ?? SEARCH_ALIASES[query.trim().toLowerCase()];
  const results: CountryMatch[] = [];

  for (const area of partnerAreas) {
    const code = Number(area.id);
    if (!Number.isFinite(code) || code === 0) continue;
    const name = area.text;
    const n = normalize(name);
    if (!n) continue;

    if (aliasCode != null && code === aliasCode) {
      results.push({ code, name, score: 100 });
      continue;
    }

    let score = 0;
    if (n === q) score = 100;
    else if (n.startsWith(q)) score = 85;
    else if (n.split(' ').includes(q)) score = 75;
    else if (n.includes(q)) score = 60;
    else if (q.includes(n) && n.length >= 4) score = 50;
    else continue;

    score -= Math.min(10, Math.abs(n.length - q.length) / 3);
    results.push({ code, name, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

/** Resolve a Comtrade partner code to [lng, lat], or null if unknown. */
export function resolveCoords(code: number): [number, number] | null {
  const direct = centroids[String(code)];
  if (direct) return direct;
  const alias = COMTRADE_CODE_ALIASES[code];
  if (alias != null && centroids[String(alias)]) return centroids[String(alias)];
  return null;
}
