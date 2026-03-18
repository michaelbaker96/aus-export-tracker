#!/usr/bin/env node
/**
 * refresh-data.js — Australian export data refresh script
 *
 * Fetches trade volume and value data from UN Comtrade, merges with manually
 * curated fiscal data (royalties, corporate tax, cost basis), and writes
 * /public/data/lng.json and /public/data/iron-ore.json.
 *
 * Usage:
 *   node scripts/refresh-data.js [options]
 *
 * Options:
 *   --year-from <year>   Earliest year to include (default: 10 years ago)
 *   --year-to   <year>   Latest year to include (default: last complete year)
 *   --dry-run            Print output to stdout instead of writing files
 *   --resource  <name>   Only refresh "lng" or "iron-ore" (default: both)
 *
 * Prerequisites:
 *   Set COMTRADE_SUBSCRIPTION_KEY in your environment, or create a .env.local
 *   file at the project root with:
 *     COMTRADE_SUBSCRIPTION_KEY=your_key_here
 *
 *   Free API keys: https://comtradeapi.un.org  (register, then "Get API Key")
 *   The free tier allows ~100 requests/day — this script uses 2–4 requests.
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT         = path.resolve(__dirname, "..");
const MANUAL_DIR   = path.join(__dirname, "manual-data");
const OUTPUT_DIR   = path.join(ROOT, "public", "data");

const COMTRADE_BASE = "https://comtradeapi.un.org/data/v1/get/C/A/HS";
const COMTRADE_REF  = "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json";

// ─── Constants ────────────────────────────────────────────────────────────────

const AUSTRALIA_CODE  = "36";
// Aggregate / unspecified partner codes to exclude from per-country breakdown
const EXCLUDE_CODES   = new Set([0, 899, 837, 490]);
// LNG energy content: ~54 MJ/kg → PJ (1 PJ = 1e15 J = 1e9 MJ)
const KG_TO_PJ        = 54e-9;
// Iron ore: kg → million tonnes
const KG_TO_MT        = 1e-9;

const RESOURCE_CONFIG = {
  lng: {
    // 271111 = LNG specifically; fall back to 2711 (all petroleum gases) if no per-country data.
    // 2711 is a broad 4-digit code — maxPages is capped to avoid fetching huge datasets.
    hsCodes:      [{ code: "271111", maxPages: 20 }, { code: "2711", maxPages: 3 }],
    manualFile:   "lng-manual.json",
    outputFile:   "lng.json",
    volumeUnit:   "PJ (petajoules)",
    convertVolume: (kg) => Math.round(kg * KG_TO_PJ * 10) / 10,
  },
  "iron-ore": {
    hsCodes:      [{ code: "260111", maxPages: 20 }],
    manualFile:   "iron-ore-manual.json",
    outputFile:   "iron-ore.json",
    volumeUnit:   "million tonnes (Mt)",
    convertVolume: (kg) => Math.round(kg * KG_TO_MT * 10) / 10,
  },
};

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const currentYear   = new Date().getFullYear();
const lastCompleteYear = currentYear - 1;
const YEAR_FROM = parseInt(getArg("--year-from") ?? String(lastCompleteYear - 9), 10);
const YEAR_TO   = parseInt(getArg("--year-to")   ?? String(lastCompleteYear),     10);
const DRY_RUN   = hasFlag("--dry-run");
const RESOURCE  = getArg("--resource"); // "lng" | "iron-ore" | null (both)

// ─── Logging ──────────────────────────────────────────────────────────────────

const log  = (level, msg) => console.log(`[${level.padEnd(5)}] ${msg}`);
const info  = (msg) => log("INFO",  msg);
const warn  = (msg) => log("WARN",  msg);
const error = (msg) => log("ERROR", msg);

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

/** Fetch with exponential backoff retry (handles 429 rate-limit responses). */
async function fetchWithRetry(url, maxRetries = 4) {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? 0) * 1000 || delay;
      warn(`Rate-limited (429). Waiting ${retryAfter / 1000}s before retry ${attempt}/${maxRetries}…`);
      await new Promise((r) => setTimeout(r, retryAfter));
      delay *= 2;
      continue;
    }
    return res;
  }
  throw new Error(`Request failed after ${maxRetries} retries: ${url}`);
}

/**
 * Fetch all pages of Comtrade annual export data for Australia.
 * Passes year range as a period filter to keep response sizes manageable.
 * Returns raw record array (may include aggregate partners).
 */
async function fetchComtradeRecords(cmdCode, subscriptionKey, maxPages = 20) {
  const allData = [];
  let startRecord = 1;
  const PAGE_SIZE = 500;

  // Build comma-separated year list to filter at the API level
  const periodYears = [];
  for (let y = YEAR_FROM; y <= YEAR_TO; y++) periodYears.push(y);
  const periodParam = periodYears.join(",");

  info(`Fetching Comtrade HS ${cmdCode} (Australia exports, ${YEAR_FROM}–${YEAR_TO})…`);

  let pageNum = 0;
  while (pageNum < maxPages) {
    pageNum++;
    const params = new URLSearchParams({
      reporterCode:        AUSTRALIA_CODE,
      flowCode:            "X",
      cmdCode,
      period:              periodParam,
      "subscription-key":  subscriptionKey,
      startRecord:         String(startRecord),
      maxRecords:          String(PAGE_SIZE),
    });

    const res = await fetchWithRetry(`${COMTRADE_BASE}?${params}`);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Comtrade API error ${res.status} for HS ${cmdCode}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const page = json.data ?? [];
    allData.push(...page);

    const totalHint = json.count != null && json.count !== page.length ? ` / ~${json.count}` : "";
    info(`  Page ${pageNum}: received ${page.length} records (total: ${allData.length}${totalHint})`);

    if (page.length < PAGE_SIZE) break; // last page
    startRecord += PAGE_SIZE;
  }

  if (pageNum >= maxPages) {
    warn(`Reached maxPages (${maxPages}) for HS ${cmdCode} — results may be incomplete. Consider narrowing the year range.`);
  }

  return allData;
}

// ─── Data processing ──────────────────────────────────────────────────────────

/**
 * Deduplicate raw records and filter to the year range.
 * Returns Map<partnerCode, Map<year, { weightKg, valueUSD }>>
 */
function buildCountryYearMap(records) {
  const seen = new Set();
  const map  = new Map(); // partnerCode -> Map<year, { weightKg, valueUSD }>

  for (const r of records) {
    if (EXCLUDE_CODES.has(r.partnerCode)) continue;
    const year = Number(r.period);
    if (year < YEAR_FROM || year > YEAR_TO) continue;

    const key = `${r.partnerCode}-${year}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!map.has(r.partnerCode)) map.set(r.partnerCode, new Map());
    map.get(r.partnerCode).set(year, {
      weightKg:  r.netWgt       ?? 0,
      valueUSD:  r.primaryValue ?? 0,
    });
  }

  return map;
}

/**
 * Given a country-year map, return true if at least one country-year entry
 * has non-zero weight — i.e. usable per-country breakdown exists.
 */
function hasUsableData(countryYearMap) {
  for (const yearMap of countryYearMap.values()) {
    for (const { weightKg } of yearMap.values()) {
      if (weightKg > 0) return true;
    }
  }
  return false;
}

// ─── Manual data loading ─────────────────────────────────────────────────────

function loadManualData(filename) {
  const filepath = path.join(MANUAL_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Manual data file not found: ${filepath}\nPlease create it — see scripts/manual-data/*.json for format.`);
  }
  return JSON.parse(fs.readFileSync(filepath, "utf8"));
}

function loadCountryCoords() {
  return JSON.parse(fs.readFileSync(path.join(MANUAL_DIR, "country-coords.json"), "utf8"));
}

// ─── Merge & build output ────────────────────────────────────────────────────

/**
 * Merge Comtrade country-year data with manual fiscal data to produce
 * a ResourceData-shaped object ready for schema validation and file output.
 */
function buildResourceData(resourceKey, countryYearMap, manual, countryCoords, comtradeSource) {
  const config       = RESOURCE_CONFIG[resourceKey];
  const years        = [];
  const allYears     = new Set();
  let   latestYear   = YEAR_FROM;

  // Collect all years present in the Comtrade data
  for (const yearMap of countryYearMap.values()) {
    for (const year of yearMap.keys()) allYears.add(year);
  }

  // Rank countries by total volume across all years (for arc ordering)
  const countryTotals = new Map();
  for (const [code, yearMap] of countryYearMap) {
    const total = [...yearMap.values()].reduce((s, r) => s + r.weightKg, 0);
    countryTotals.set(code, total);
  }
  const rankedCodes = [...countryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code);

  for (const year of [...allYears].sort((a, b) => a - b)) {
    const manualYear  = manual.years?.[String(year)] ?? {};
    const usdToAud    = manual.usdToAudByYear?.[String(year)] ?? 1.45;

    let totalWeightKg = 0;
    let totalValueUSD = 0;
    const destinations = [];

    for (const code of rankedCodes) {
      const entry = countryYearMap.get(code)?.get(year);
      if (!entry || (entry.weightKg === 0 && entry.valueUSD === 0)) continue;

      const coordEntry = countryCoords[String(code)];
      if (!coordEntry) {
        warn(`No coordinates for partner code ${code} — skipping from destinations`);
        continue;
      }

      totalWeightKg += entry.weightKg;
      totalValueUSD += entry.valueUSD;

      destinations.push({
        _code:    code, // internal — stripped before output
        country:  coordEntry.name,
        volume:   config.convertVolume(entry.weightKg),
        valueUSD: entry.valueUSD, // temporary — converted after totals
      });
    }

    const totalValueAUD = Math.round(totalValueUSD * usdToAud / 1e6); // → AUD millions

    // Compute per-destination royalties and tax proportionally from manual totals
    const totalRoyalties    = computeRoyalties(resourceKey, manual, manualYear, totalValueAUD);
    const totalCorporateTax = manualYear.totalCorporateTaxAUD ?? null;

    const finalDestinations = destinations.map((d) => {
      const share    = totalValueUSD > 0 ? d.valueUSD / totalValueUSD : 0;
      const valueAUD = Math.round(d.valueUSD * usdToAud / 1e6);
      return {
        country:   d.country,
        volume:    d.volume,
        value:     valueAUD,
        royalties: totalRoyalties != null ? Math.round(totalRoyalties * share) : null,
        tax:       totalCorporateTax != null ? Math.round(totalCorporateTax * share) : null,
      };
    });

    years.push({
      year,
      totalVolume:       config.convertVolume(totalWeightKg),
      totalValue:        totalValueAUD,
      totalRoyalties:    totalRoyalties,
      totalCorporateTax: totalCorporateTax,
      destinations:      finalDestinations,
    });

    if (year > latestYear) latestYear = year;
  }

  if (years.length === 0) {
    throw new Error(`No year data produced for ${resourceKey}. Check Comtrade data and year range.`);
  }

  // Build arcs from latest year
  const latestRecord = years.find((y) => y.year === latestYear);
  const arcs = latestRecord.destinations.map((dest) => {
    const coordEntry = Object.values(countryCoords).find((c) => c.name === dest.country);
    const vol  = dest.volume;
    const val  = dest.value;
    const cMin = manual.costBasisPerPJMin  ?? manual.costBasisPerMtMin  ?? 0;
    const cMax = manual.costBasisPerPJMax  ?? manual.costBasisPerMtMax  ?? 0;
    return {
      resourceType:           resourceKey,
      originCoordinates:      manual.originCoordinates,
      destinationCoordinates: coordEntry?.coords ?? [0, 0],
      destinationCountry:     dest.country,
      volumeLatestYear:       vol,
      exportValueAUD:         val,
      royaltiesAUD:           dest.royalties,
      corporateTaxAUD:        dest.tax,
      costBasisMinAUD:        Math.round(vol * cMin),
      costBasisMaxAUD:        Math.round(vol * cMax),
    };
  });

  return {
    resource:    resourceKey,
    displayName: manual.displayName,
    units: {
      volume: config.volumeUnit,
      value:  "AUD millions",
    },
    lastUpdated:  new Date().toISOString().slice(0, 10),
    fetchedAt:    new Date().toISOString(),
    sources: buildSourcesList(resourceKey, comtradeSource, manual),
    arcs,
    years,
  };
}

function computeRoyalties(resourceKey, manual, manualYear, totalValueAUD) {
  if (resourceKey === "iron-ore") {
    // WA state royalty: fixed rate on FOB value
    const rate = manual.royaltyRateFOB ?? 0.075;
    return Math.round(totalValueAUD * rate);
  }
  // LNG: use manually curated figure
  return manualYear.totalRoyaltiesAUD ?? null;
}

function buildSourcesList(resourceKey, comtradeHsCode, manual) {
  const comtradeEntry = `UN Comtrade – HS ${comtradeHsCode} (Australia exports), fetched ${new Date().toISOString().slice(0, 10)}`;
  return [comtradeEntry, ...(manual._sources ?? [])];
}

// ─── Schema validation ────────────────────────────────────────────────────────

/**
 * Validate a ResourceData object against the canonical schema.
 * Returns array of error strings (empty = valid).
 */
function validateResourceData(data) {
  const errors = [];
  const require = (obj, field, type, ctx) => {
    if (obj[field] == null) errors.push(`${ctx}: missing "${field}"`);
    else if (typeof obj[field] !== type) errors.push(`${ctx}: "${field}" should be ${type}, got ${typeof obj[field]}`);
  };

  require(data, "resource",    "string",  "root");
  require(data, "displayName", "string",  "root");
  require(data, "lastUpdated", "string",  "root");

  if (!Array.isArray(data.sources) || data.sources.length === 0)
    errors.push("root: \"sources\" must be a non-empty array");

  if (!data.units?.volume || !data.units?.value)
    errors.push("root: \"units\" must have volume and value strings");

  if (!Array.isArray(data.arcs) || data.arcs.length === 0)
    errors.push("root: \"arcs\" must be a non-empty array");

  if (!Array.isArray(data.years) || data.years.length === 0)
    errors.push("root: \"years\" must be a non-empty array");

  for (const arc of data.arcs ?? []) {
    const ctx = `arcs[${arc.destinationCountry}]`;
    require(arc, "resourceType",           "string", ctx);
    require(arc, "destinationCountry",     "string", ctx);
    require(arc, "volumeLatestYear",       "number", ctx);
    require(arc, "exportValueAUD",         "number", ctx);
    if (!Array.isArray(arc.originCoordinates) || arc.originCoordinates.length !== 2)
      errors.push(`${ctx}: "originCoordinates" must be [lng, lat]`);
    if (!Array.isArray(arc.destinationCoordinates) || arc.destinationCoordinates.length !== 2)
      errors.push(`${ctx}: "destinationCoordinates" must be [lng, lat]`);
  }

  for (const yr of data.years ?? []) {
    const ctx = `years[${yr.year}]`;
    require(yr, "year",        "number", ctx);
    require(yr, "totalVolume", "number", ctx);
    require(yr, "totalValue",  "number", ctx);
    if (!Array.isArray(yr.destinations) || yr.destinations.length === 0)
      errors.push(`${ctx}: "destinations" must be a non-empty array`);
    for (const dest of yr.destinations ?? []) {
      const dctx = `${ctx}.destinations[${dest.country}]`;
      require(dest, "country", "string", dctx);
      require(dest, "volume",  "number", dctx);
      require(dest, "value",   "number", dctx);
    }
  }

  return errors;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load subscription key
  const subscriptionKey = loadSubscriptionKey();

  // Load shared reference data
  info("Fetching Comtrade partner area reference…");
  const refRes = await fetchWithRetry(COMTRADE_REF);
  const refData = await refRes.json();
  const comtradeNames = {};
  for (const area of refData?.results ?? []) comtradeNames[area.id] = area.text;

  const countryCoords = loadCountryCoords();

  const resourcesToRefresh = RESOURCE
    ? [RESOURCE]
    : Object.keys(RESOURCE_CONFIG);

  for (const resourceKey of resourcesToRefresh) {
    if (!RESOURCE_CONFIG[resourceKey]) {
      error(`Unknown resource "${resourceKey}". Valid options: ${Object.keys(RESOURCE_CONFIG).join(", ")}`);
      process.exit(1);
    }

    info(`\n── Refreshing ${resourceKey} ──────────────────────────────────────`);

    const config     = RESOURCE_CONFIG[resourceKey];
    const manual     = loadManualData(config.manualFile);

    let countryYearMap;
    let usedHsCode;

    for (let i = 0; i < config.hsCodes.length; i++) {
      const { code: hsCode, maxPages } = config.hsCodes[i];
      const records = await fetchComtradeRecords(hsCode, subscriptionKey, maxPages);
      countryYearMap = buildCountryYearMap(records);

      if (hasUsableData(countryYearMap)) {
        info(`Using HS ${hsCode} — found usable per-country data.`);
        usedHsCode = hsCode;
        break;
      }

      warn(`HS ${hsCode} returned no usable per-country data.`);
      const next = config.hsCodes[i + 1];
      if (next) info(`Falling back to next HS code: ${next.code}`);
    }

    if (!hasUsableData(countryYearMap)) {
      error(`No usable per-country data found for ${resourceKey} with any HS code. Cannot produce output.`);
      process.exit(1);
    }

    info(`Building ResourceData for ${resourceKey}…`);
    const resourceData = buildResourceData(resourceKey, countryYearMap, manual, countryCoords, usedHsCode);

    info(`Validating schema…`);
    const validationErrors = validateResourceData(resourceData);
    if (validationErrors.length > 0) {
      error(`Schema validation failed for ${resourceKey}:`);
      validationErrors.forEach((e) => error(`  • ${e}`));
      process.exit(1);
    }
    info(`Schema valid. ${resourceData.years.length} years, ${resourceData.arcs.length} arcs.`);

    const outputJson = JSON.stringify(resourceData, null, 2);

    if (DRY_RUN) {
      info(`[DRY RUN] Would write ${config.outputFile}:`);
      console.log(outputJson.slice(0, 1000) + "\n… (truncated)");
    } else {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      const outputPath = path.join(OUTPUT_DIR, config.outputFile);
      fs.writeFileSync(outputPath, outputJson, "utf8");
      info(`Written: ${outputPath}`);
    }
  }

  info("\nDone.");
}

function loadSubscriptionKey() {
  // 1. Environment variable
  if (process.env.COMTRADE_SUBSCRIPTION_KEY) return process.env.COMTRADE_SUBSCRIPTION_KEY;

  // 2. .env.local at project root
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    const line = fs.readFileSync(envPath, "utf8")
      .split("\n")
      .find((l) => l.startsWith("COMTRADE_SUBSCRIPTION_KEY="));
    if (line) return line.split("=")[1].trim();
  }

  // 3. Fall back to the dev key bundled in the API route (for local development only)
  warn("COMTRADE_SUBSCRIPTION_KEY not set — using bundled dev key (rate limits apply).");
  warn("Set your own key at https://comtradeapi.un.org to avoid hitting shared limits.");
  return "42710045c5044b2ca88a69a851323ba6";
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
