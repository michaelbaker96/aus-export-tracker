"use strict";
/** Shared Comtrade helpers for the data-pipeline scripts. */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

const COMTRADE_BASE = "https://comtradeapi.un.org/data/v1/get/C/A/HS";
const COMTRADE_REF =
  "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json";

const AUSTRALIA_CODE = "36";

/** HS codes probed per resource (first with data wins). */
const RESOURCE_HS = {
  lng: ["271111", "2711"],
  "iron-ore": ["260111"],
  coal: ["2701"],
};

function loadSubscriptionKey() {
  if (process.env.COMTRADE_SUBSCRIPTION_KEY) return process.env.COMTRADE_SUBSCRIPTION_KEY;
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    const line = fs
      .readFileSync(envPath, "utf8")
      .split("\n")
      .find((l) => l.startsWith("COMTRADE_SUBSCRIPTION_KEY="));
    if (line) return line.split("=")[1].trim();
  }
  return "42710045c5044b2ca88a69a851323ba6";
}

async function fetchWithRetry(url, maxRetries = 4) {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? 0) * 1000 || delay;
      await new Promise((r) => setTimeout(r, retryAfter));
      delay *= 2;
      continue;
    }
    return res;
  }
  throw new Error(`Request failed after ${maxRetries} retries: ${url}`);
}

/** Fetch the Comtrade partner-area reference as [{ id, text }]. */
async function fetchPartnerAreas() {
  const res = await fetchWithRetry(COMTRADE_REF);
  if (!res.ok) throw new Error(`Comtrade reference error ${res.status}`);
  const json = await res.json();
  return json?.results ?? [];
}

/**
 * Probe Comtrade for Australian exports of a resource to one partner.
 * Returns { hsCode, years:[{year,weightKg,valueUSD}], totalWeightKg, totalValueUSD }
 * or null if no usable (non-zero) data exists for any HS code.
 */
async function checkResourceData(resourceKey, partnerCode, key, yearFrom, yearTo) {
  const period = [];
  for (let y = yearFrom; y <= yearTo; y++) period.push(y);
  const periodParam = period.join(",");

  for (const hsCode of RESOURCE_HS[resourceKey]) {
    const params = new URLSearchParams({
      reporterCode: AUSTRALIA_CODE,
      flowCode: "X",
      cmdCode: hsCode,
      partnerCode: String(partnerCode),
      period: periodParam,
      "subscription-key": key,
      maxRecords: "500",
    });
    const res = await fetchWithRetry(`${COMTRADE_BASE}?${params}`);
    if (!res.ok) continue;
    const json = await res.json();
    const rows = json?.data ?? [];

    const byYear = new Map();
    for (const r of rows) {
      const yr = Number(r.period);
      if (yr < yearFrom || yr > yearTo) continue;
      const prev = byYear.get(yr) ?? { weightKg: 0, valueUSD: 0 };
      byYear.set(yr, {
        weightKg: prev.weightKg + (r.netWgt ?? 0),
        valueUSD: prev.valueUSD + (r.primaryValue ?? 0),
      });
    }

    const years = [...byYear.entries()]
      .map(([year, v]) => ({ year, ...v }))
      .sort((a, b) => a.year - b.year);
    const totalWeightKg = years.reduce((s, y) => s + y.weightKg, 0);
    const totalValueUSD = years.reduce((s, y) => s + y.valueUSD, 0);

    if (totalWeightKg > 0 || totalValueUSD > 0) {
      return { hsCode, years, totalWeightKg, totalValueUSD };
    }
  }
  return null;
}

module.exports = {
  loadSubscriptionKey,
  fetchPartnerAreas,
  checkResourceData,
  fetchWithRetry,
  RESOURCE_HS,
  AUSTRALIA_CODE,
};
