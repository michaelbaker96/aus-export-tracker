#!/usr/bin/env node
"use strict";
/**
 * add-country.js — dynamically search Comtrade for a destination and, if
 * Australia has export data for it, add it to the tracked dataset.
 *
 * Usage:
 *   node scripts/add-country.js "<search>" [options]
 *
 * Options:
 *   --add               Persist the matched country to country-coords.json
 *                       (otherwise the command only reports availability).
 *   --refresh           After --add, run refresh-data.js so the JSON datasets
 *                       pick up the new country immediately.
 *   --year-from <year>  Earliest year to probe (default: 5 years ago).
 *   --year-to   <year>  Latest year to probe   (default: last complete year).
 *
 * Examples:
 *   node scripts/add-country.js "South Korea"
 *   node scripts/add-country.js Qatar --add --refresh
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { createResolver, fuzzyMatchCountries } = require("./lib/country-resolver");
const {
  loadSubscriptionKey,
  fetchPartnerAreas,
  checkResourceData,
  RESOURCE_HS,
} = require("./lib/comtrade");

const ROOT = path.resolve(__dirname, "..");
const COORDS_PATH = path.join(__dirname, "manual-data", "country-coords.json");

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const VALUE_FLAGS = new Set(["--year-from", "--year-to"]);
const queryParts = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith("--")) {
    if (VALUE_FLAGS.has(a)) i++; // skip this flag's value too
    continue;
  }
  queryParts.push(a);
}
const query = queryParts.join(" ").trim();

const DO_ADD = hasFlag("--add");
const DO_REFRESH = hasFlag("--refresh");
const currentYear = new Date().getFullYear();
const lastComplete = currentYear - 1;
const YEAR_FROM = parseInt(getArg("--year-from") ?? String(lastComplete - 4), 10);
const YEAR_TO = parseInt(getArg("--year-to") ?? String(lastComplete), 10);

const log = (m) => console.log(m);

async function main() {
  if (!query) {
    console.error('Usage: node scripts/add-country.js "<country search>" [--add] [--refresh]');
    process.exit(1);
  }

  log(`Searching Comtrade partner areas for "${query}"…`);
  const partnerAreas = await fetchPartnerAreas();
  const matches = fuzzyMatchCountries(query, partnerAreas);

  if (matches.length === 0) {
    console.error(`No Comtrade partner area matched "${query}".`);
    process.exit(2);
  }

  const top = matches.slice(0, 5);
  if (top.length > 1 && top[0].score < 100 && top[1].score >= top[0].score - 5) {
    log("\nMultiple possible matches — be more specific or use the exact name:");
    top.forEach((m) => log(`  • ${m.name}  (code ${m.code})`));
  }

  const best = matches[0];
  const { resolveCountry } = createResolver();
  const resolved = resolveCountry(best.code, { [best.code]: best.name });

  log(`\nBest match: ${best.name}  (Comtrade code ${best.code})`);
  if (!resolved) {
    console.error(
      `No coordinates known for code ${best.code}. Add an entry to lib/country-centroids.json, then re-run.`,
    );
    process.exit(3);
  }
  log(`Coordinates: [${resolved.coords[0]}, ${resolved.coords[1]}]`);

  const key = loadSubscriptionKey();
  log(`\nProbing Australian exports ${YEAR_FROM}–${YEAR_TO} across resources…`);

  const available = [];
  for (const resourceKey of Object.keys(RESOURCE_HS)) {
    process.stdout.write(`  ${resourceKey.padEnd(9)} … `);
    let data = null;
    try {
      data = await checkResourceData(resourceKey, best.code, key, YEAR_FROM, YEAR_TO);
    } catch (e) {
      log(`error (${e.message})`);
      continue;
    }
    if (data) {
      available.push(resourceKey);
      const latest = data.years[data.years.length - 1];
      log(
        `DATA (HS ${data.hsCode}; latest ${latest.year}: ` +
          `${(latest.weightKg / 1e9).toFixed(2)} Mt, US$${(latest.valueUSD / 1e6).toFixed(1)}M)`,
      );
    } else {
      log("none");
    }
  }

  if (available.length === 0) {
    log(`\n${best.name} has no Australian export data on Comtrade for the probed resources/years.`);
    log("Nothing to add.");
    process.exit(0);
  }

  log(`\n${best.name} has Comtrade data for: ${available.join(", ")}.`);

  if (!DO_ADD) {
    log("\nRe-run with --add to persist it, e.g.:");
    log(`  node scripts/add-country.js "${query}" --add --refresh`);
    return;
  }

  // Persist into country-coords.json (merge, preserving existing overrides).
  const coords = JSON.parse(fs.readFileSync(COORDS_PATH, "utf8"));
  const codeKey = String(best.code);
  if (coords[codeKey]) {
    log(`\n${best.name} (code ${best.code}) is already in country-coords.json — leaving as-is.`);
  } else {
    coords[codeKey] = { name: best.name, coords: resolved.coords };
    fs.writeFileSync(COORDS_PATH, JSON.stringify(coords, null, 2) + "\n", "utf8");
    log(`\nAdded ${best.name} (code ${best.code}) to scripts/manual-data/country-coords.json.`);
  }

  if (DO_REFRESH) {
    log("\nRunning refresh-data.js to regenerate datasets…");
    const refreshArgs = ["scripts/refresh-data.js", "--year-from", String(YEAR_FROM), "--year-to", String(YEAR_TO)];
    execFileSync(process.execPath, refreshArgs, { cwd: ROOT, stdio: "inherit" });
  } else {
    log("\nNext: run `npm run refresh-data` to regenerate the JSON datasets with the new country.");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
