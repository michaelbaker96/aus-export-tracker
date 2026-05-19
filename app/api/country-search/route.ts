import { NextResponse } from 'next/server';
import { fuzzyMatchCountries, resolveCoords } from '@/lib/country-resolver';
import lngManual from '@/scripts/manual-data/lng-manual.json';
import ironOreManual from '@/scripts/manual-data/iron-ore-manual.json';
import coalManual from '@/scripts/manual-data/coal-manual.json';

const COMTRADE_BASE = 'https://comtradeapi.un.org/data/v1/get/C/A/HS';
const COMTRADE_REF =
  'https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json';
const SUBSCRIPTION_KEY =
  process.env.COMTRADE_SUBSCRIPTION_KEY ?? '42710045c5044b2ca88a69a851323ba6';
const AUSTRALIA_CODE = '36';

const KG_TO_PJ = 54e-9;
const KG_TO_MT = 1e-9;

type ManualData = {
  displayName: string;
  originCoordinates: [number, number];
  usdToAudByYear?: Record<string, number>;
  royaltyRateFOB?: number;
  corporateTaxRateFOB?: number;
  costBasisPerPJMin?: number;
  costBasisPerPJMax?: number;
  costBasisPerMtMin?: number;
  costBasisPerMtMax?: number;
};

const RESOURCES: Record<
  string,
  { hsCodes: string[]; manual: ManualData; volumeUnit: string; toVolume: (kg: number) => number }
> = {
  lng: {
    hsCodes: ['271111', '2711'],
    manual: lngManual as unknown as ManualData,
    volumeUnit: 'PJ (petajoules)',
    toVolume: (kg) => Math.round(kg * KG_TO_PJ * 10) / 10,
  },
  'iron-ore': {
    hsCodes: ['260111'],
    manual: ironOreManual as unknown as ManualData,
    volumeUnit: 'million tonnes (Mt)',
    toVolume: (kg) => Math.round(kg * KG_TO_MT * 10) / 10,
  },
  coal: {
    hsCodes: ['2701'],
    manual: coalManual as unknown as ManualData,
    volumeUnit: 'million tonnes (Mt)',
    toVolume: (kg) => Math.round(kg * KG_TO_MT * 10) / 10,
  },
};

interface ComtradeRow {
  partnerCode: number;
  period: string | number;
  primaryValue: number | null;
  netWgt: number | null;
}

interface YearContribution {
  year: number;
  country: string;
  volume: number;
  value: number;
  royalties: number;
  tax: number;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters.' }, { status: 400 });
  }

  const refRes = await fetch(COMTRADE_REF, { next: { revalidate: 86400 } });
  if (!refRes.ok) {
    return NextResponse.json({ error: 'Comtrade reference unavailable.' }, { status: 502 });
  }
  const refData = await refRes.json();
  const matches = fuzzyMatchCountries(q, refData?.results ?? []);
  if (matches.length === 0) {
    return NextResponse.json({ query: q, match: null, suggestions: [] });
  }

  const best = matches[0];
  const coords = resolveCoords(best.code);
  if (!coords) {
    return NextResponse.json({
      query: q,
      match: { code: best.code, name: best.name },
      error: 'No coordinates known for this country.',
    });
  }

  const found: unknown[] = [];
  const notFound: string[] = [];

  for (const [resourceKey, cfg] of Object.entries(RESOURCES)) {
    const rows = await fetchResourceRows(cfg.hsCodes, best.code);
    if (rows.length === 0) {
      notFound.push(resourceKey);
      continue;
    }

    const byYear = new Map<number, { weightKg: number; valueUSD: number }>();
    for (const r of rows) {
      const yr = Number(r.period);
      const prev = byYear.get(yr) ?? { weightKg: 0, valueUSD: 0 };
      byYear.set(yr, {
        weightKg: prev.weightKg + (r.netWgt ?? 0),
        valueUSD: prev.valueUSD + (r.primaryValue ?? 0),
      });
    }

    const years: YearContribution[] = [];
    for (const [year, { weightKg, valueUSD }] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
      if (weightKg === 0 && valueUSD === 0) continue;
      const usdToAud = cfg.manual.usdToAudByYear?.[String(year)] ?? 1.45;
      const value = Math.round((valueUSD * usdToAud) / 1e6);
      years.push({
        year,
        country: best.name,
        volume: cfg.toVolume(weightKg),
        value,
        royalties: cfg.manual.royaltyRateFOB != null ? Math.round(value * cfg.manual.royaltyRateFOB) : 0,
        tax: cfg.manual.corporateTaxRateFOB != null ? Math.round(value * cfg.manual.corporateTaxRateFOB) : 0,
      });
    }

    if (years.length === 0) {
      notFound.push(resourceKey);
      continue;
    }

    const latest = years[years.length - 1];
    const cMin = cfg.manual.costBasisPerPJMin ?? cfg.manual.costBasisPerMtMin ?? 0;
    const cMax = cfg.manual.costBasisPerPJMax ?? cfg.manual.costBasisPerMtMax ?? 0;

    found.push({
      resource: resourceKey,
      displayName: cfg.manual.displayName,
      units: { volume: cfg.volumeUnit, value: 'AUD millions' },
      years,
      arc: {
        resourceType: resourceKey,
        originCoordinates: cfg.manual.originCoordinates,
        destinationCoordinates: coords,
        destinationCountry: best.name,
        volume: latest.volume,
        exportValueAUD: latest.value,
        royaltiesAUD: latest.royalties,
        corporateTaxAUD: latest.tax,
        costBasisMinAUD: Math.round(latest.volume * cMin),
        costBasisMaxAUD: Math.round(latest.volume * cMax),
      },
    });
  }

  return NextResponse.json({
    query: q,
    match: { code: best.code, name: best.name, coords },
    found,
    notFound,
    hasData: found.length > 0,
  });
}

async function fetchResourceRows(hsCodes: string[], partnerCode: number): Promise<ComtradeRow[]> {
  for (const hsCode of hsCodes) {
    const params = new URLSearchParams({
      reporterCode: AUSTRALIA_CODE,
      flowCode: 'X',
      cmdCode: hsCode,
      partnerCode: String(partnerCode),
      'subscription-key': SUBSCRIPTION_KEY,
      maxRecords: '500',
    });
    const res = await fetch(`${COMTRADE_BASE}?${params}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) continue;
    const json = await res.json();
    const rows: ComtradeRow[] = json?.data ?? [];
    const hasData = rows.some((r) => (r.netWgt ?? 0) > 0 || (r.primaryValue ?? 0) > 0);
    if (hasData) return rows;
  }
  return [];
}
