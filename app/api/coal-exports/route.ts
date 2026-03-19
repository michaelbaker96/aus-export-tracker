import { NextResponse } from "next/server";

const COMTRADE_BASE = "https://comtradeapi.un.org/data/v1/get/C/A/HS";
const COMTRADE_REF =
  "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json";
const SUBSCRIPTION_KEY =
  process.env.COMTRADE_SUBSCRIPTION_KEY ?? "42710045c5044b2ca88a69a851323ba6";

// HS code 2701 covers coal; briquettes, ovoids and similar solid fuels from coal
const COAL_CMD_CODE = "2701";
// Australia ISO numeric country code
const AUSTRALIA_CODE = "36";
// Aggregate/unspecified partner codes to exclude
const EXCLUDE_CODES = new Set([0, 899, 837, 490]);

export async function GET() {
  const params = new URLSearchParams({
    reporterCode: AUSTRALIA_CODE,
    flowCode: "X",
    cmdCode: COAL_CMD_CODE,
    "subscription-key": SUBSCRIPTION_KEY,
  });

  // Fetch trade data + country reference in parallel
  const [tradeRes, refRes] = await Promise.all([
    fetch(`${COMTRADE_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    }),
    fetch(COMTRADE_REF, { next: { revalidate: 86400 } }),
  ]);

  if (!tradeRes.ok) {
    const text = await tradeRes.text();
    return NextResponse.json(
      { error: `Comtrade API error: ${tradeRes.status}`, detail: text },
      { status: tradeRes.status }
    );
  }

  const [tradeData, refData] = await Promise.all([
    tradeRes.json(),
    refRes.json(),
  ]);

  // Build partnerCode -> country name lookup
  const countryNames: Record<number, string> = {};
  for (const area of refData?.results ?? []) {
    countryNames[Number(area.id)] = area.text;
  }

  const records: ComtradeRecord[] = tradeData?.data ?? [];

  // Deduplicate by (partnerCode, period), exclude aggregate codes
  const seen = new Set<string>();
  const clean = records.filter((r) => {
    if (EXCLUDE_CODES.has(r.partnerCode)) return false;
    const key = `${r.partnerCode}-${r.period}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Group by country, summing value across all years
  const byCountry: Record<number, CountryExport> = {};
  for (const r of clean) {
    if (!byCountry[r.partnerCode]) {
      byCountry[r.partnerCode] = {
        partnerCode: r.partnerCode,
        country: countryNames[r.partnerCode] ?? `Unknown (${r.partnerCode})`,
        totalValueUSD: 0,
        totalWeightKg: 0,
        yearlyBreakdown: [],
      };
    }
    const entry = byCountry[r.partnerCode];
    entry.totalValueUSD += r.primaryValue ?? 0;
    entry.totalWeightKg += r.netWgt ?? 0;
    entry.yearlyBreakdown.push({
      year: Number(r.period),
      valueUSD: r.primaryValue ?? 0,
      weightKg: r.netWgt ?? 0,
    });
  }

  const exports = Object.values(byCountry).sort(
    (a, b) => b.totalValueUSD - a.totalValueUSD
  );

  return NextResponse.json({ count: exports.length, exports });
}

interface ComtradeRecord {
  partnerCode: number;
  partnerDesc: string | null;
  period: string | number;
  cmdCode: string;
  cmdDesc: string | null;
  flowCode: string;
  primaryValue: number;
  netWgt: number | null;
  qty: number | null;
  qtyUnitAbbr: string | null;
}

interface CountryExport {
  partnerCode: number;
  country: string;
  totalValueUSD: number;
  totalWeightKg: number;
  yearlyBreakdown: { year: number; valueUSD: number; weightKg: number }[];
}
