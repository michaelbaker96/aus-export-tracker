"use strict";
/**
 * Shared country resolution for the data pipeline.
 *
 * Comtrade partner codes are ISO 3166-1 numeric, so any destination can be
 * resolved to coordinates from the bundled centroid table — no manual entry
 * required. scripts/manual-data/country-coords.json provides optional
 * hand-tuned overrides (precise port/city coords or preferred display names).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const CENTROIDS_PATH = path.join(ROOT, "lib", "country-centroids.json");
const OVERRIDES_PATH = path.join(ROOT, "scripts", "manual-data", "country-coords.json");

/**
 * A handful of Comtrade-specific partner codes are composite areas that are
 * not standalone ISO numeric codes. Map them onto the nearest ISO centroid.
 */
const COMTRADE_CODE_ALIASES = {
  251: 250, // France (incl. Monaco) -> France
  699: 356, // India (excl. ...) -> India
  579: 578, // Norway (incl. Svalbard) -> Norway
  757: 756, // Switzerland (incl. Liechtenstein) -> Switzerland
  842: 840, // USA (incl. PR & VI) -> United States
  381: 380, // Italy (incl. San Marino) -> Italy
};

function loadJson(filepath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch {
    return fallback;
  }
}

function stripMeta(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_")) continue;
    out[k] = v;
  }
  return out;
}

function createResolver() {
  const centroids = stripMeta(loadJson(CENTROIDS_PATH, {}));
  const overrides = stripMeta(loadJson(OVERRIDES_PATH, {}));

  /**
   * Resolve a Comtrade partner code to { name, coords:[lng,lat] } or null.
   * @param {number|string} code         Comtrade partner code.
   * @param {Object<string,string>} comtradeNames  code -> official Comtrade name.
   */
  function resolveCountry(code, comtradeNames = {}) {
    const key = String(code);

    // 1. Hand-tuned override wins (precise coords + preferred name).
    const override = overrides[key];
    if (override && Array.isArray(override.coords)) {
      return { name: override.name ?? comtradeNames[key] ?? `Country ${key}`, coords: override.coords };
    }

    // 2. Centroid lookup (direct, then via composite-area alias).
    let coords = centroids[key];
    if (!coords && COMTRADE_CODE_ALIASES[code] != null) {
      coords = centroids[String(COMTRADE_CODE_ALIASES[code])];
    }
    if (!coords) return null;

    const name = comtradeNames[key] ?? override?.name ?? `Country ${key}`;
    return { name, coords };
  }

  return { resolveCountry, centroids, overrides };
}

/** Normalize a country name for fuzzy comparison. */
function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|of|rep|republic|dem|democratic|islamic|state|states|kingdom)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Common informal / colloquial names mapped to Comtrade partner codes.
 * Comtrade uses formal names ("Rep. of Korea", "Russian Federation"), so a
 * plain text search needs this bridge.
 */
const SEARCH_ALIASES = {
  "south korea": 410, korea: 410, "north korea": 408,
  usa: 842, "united states": 842, america: 842,
  uk: 826, britain: 826, england: 826,
  uae: 784, "united arab emirates": 784,
  vietnam: 704, russia: 643, iran: 364, syria: 760, laos: 418,
  moldova: 498, bolivia: 68, venezuela: 862, tanzania: 834,
  czechia: 203, "czech republic": 203, slovakia: 703,
  "hong kong": 344, macao: 446, macau: 446,
  "ivory coast": 384, "cote divoire": 384,
  burma: 104, myanmar: 104, swaziland: 748, eswatini: 748,
  "cape verde": 132, brunei: 96, "east timor": 626,
  "democratic republic of congo": 180, drc: 180,
};

/**
 * Rank Comtrade partner areas against a free-text query.
 * @param {string} query
 * @param {Array<{id:string|number,text:string}>} partnerAreas  Comtrade reference results.
 * @returns {Array<{code:number,name:string,score:number}>} best matches first.
 */
function fuzzyMatchCountries(query, partnerAreas) {
  const q = normalize(query);
  if (!q) return [];
  const results = [];

  const aliasCode = SEARCH_ALIASES[q] ?? SEARCH_ALIASES[query.trim().toLowerCase()];

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
    else if (n.split(" ").includes(q)) score = 75;
    else if (n.includes(q)) score = 60;
    else if (q.includes(n) && n.length >= 4) score = 50;
    else continue;

    // Prefer shorter names (closer match) and standalone codes.
    score -= Math.min(10, Math.abs(n.length - q.length) / 3);
    results.push({ code, name, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

module.exports = { createResolver, fuzzyMatchCountries, normalize };
