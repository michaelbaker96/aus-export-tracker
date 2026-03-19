import { describe, it, expect } from 'vitest';
import { computeArcsForRange } from './computeArcsForRange';
import type { ResourceData } from '@/types';

// Minimal dataset fixture builder
function makeDataset(overrides: Partial<ResourceData> = {}): ResourceData {
  return {
    resource: 'lng',
    displayName: 'LNG',
    units: { volume: 'PJ', value: 'AUD millions' },
    lastUpdated: '2024-01-01',
    sources: [],
    arcs: [
      {
        resourceType: 'lng',
        originCoordinates: [116.85, -20.74],
        destinationCoordinates: [138.25, 36.2],
        destinationCountry: 'Japan',
        volume: 1000,
        exportValueAUD: 10000,
        royaltiesAUD: 300,
        corporateTaxAUD: 600,
        costBasisMinAUD: 2000,
        costBasisMaxAUD: 4000,
      },
    ],
    years: [
      {
        year: 2021,
        totalVolume: 1000,
        totalValue: 10000,
        totalRoyalties: 300,
        totalCorporateTax: 600,
        destinations: [
          { country: 'Japan', volume: 1000, value: 10000, royalties: 300, tax: 600 },
        ],
      },
      {
        year: 2022,
        totalVolume: 1200,
        totalValue: 12000,
        totalRoyalties: 360,
        totalCorporateTax: 720,
        destinations: [
          { country: 'Japan', volume: 1200, value: 12000, royalties: 360, tax: 720 },
        ],
      },
      {
        year: 2023,
        totalVolume: 800,
        totalValue: 8000,
        totalRoyalties: 240,
        totalCorporateTax: 480,
        destinations: [
          { country: 'Japan', volume: 800, value: 8000, royalties: 240, tax: 480 },
        ],
      },
    ],
    ...overrides,
  };
}

describe('computeArcsForRange', () => {
  it('returns empty array when no datasets provided', () => {
    expect(computeArcsForRange([], 2020, 2023)).toEqual([]);
  });

  it('returns empty array when the year range contains no data', () => {
    const dataset = makeDataset();
    const result = computeArcsForRange([dataset], 2000, 2005);
    expect(result).toEqual([]);
  });

  it('correctly sums volume and value across multiple years in range', () => {
    const dataset = makeDataset();
    const result = computeArcsForRange([dataset], 2021, 2023);
    expect(result).toHaveLength(1);
    expect(result[0].volume).toBe(1000 + 1200 + 800); // 3000
    expect(result[0].exportValueAUD).toBe(10000 + 12000 + 8000); // 30000
    expect(result[0].royaltiesAUD).toBe(300 + 360 + 240); // 900
    expect(result[0].corporateTaxAUD).toBe(600 + 720 + 480); // 1800
  });

  it('excludes years outside the selected range', () => {
    const dataset = makeDataset();
    const result = computeArcsForRange([dataset], 2022, 2022);
    expect(result).toHaveLength(1);
    expect(result[0].volume).toBe(1200);
    expect(result[0].exportValueAUD).toBe(12000);
  });

  it('handles a single-year range (startYear === endYear)', () => {
    const dataset = makeDataset();
    const result = computeArcsForRange([dataset], 2021, 2021);
    expect(result).toHaveLength(1);
    expect(result[0].volume).toBe(1000);
  });

  it('excludes routes with zero total volume in the selected range', () => {
    const dataset = makeDataset({
      years: [
        {
          year: 2021,
          totalVolume: 0,
          totalValue: 0,
          totalRoyalties: 0,
          totalCorporateTax: 0,
          destinations: [{ country: 'Japan', volume: 0, value: 0, royalties: 0, tax: 0 }],
        },
      ],
    });
    const result = computeArcsForRange([dataset], 2021, 2021);
    expect(result).toEqual([]);
  });

  it('silently skips routes with no coordinate entry in the static arcs registry', () => {
    const dataset = makeDataset({
      years: [
        {
          year: 2021,
          totalVolume: 500,
          totalValue: 5000,
          totalRoyalties: 150,
          totalCorporateTax: 300,
          destinations: [
            { country: 'Japan', volume: 500, value: 5000, royalties: 150, tax: 300 },
            { country: 'Unknown Country', volume: 400, value: 4000, royalties: 120, tax: 240 },
          ],
        },
      ],
    });
    const result = computeArcsForRange([dataset], 2021, 2021);
    expect(result).toHaveLength(1);
    expect(result[0].destinationCountry).toBe('Japan');
  });

  it('returns one arc per unique (resourceType, destinationCountry) combination', () => {
    const lngDataset = makeDataset({ resource: 'lng' });
    const ironDataset = makeDataset({
      resource: 'iron-ore',
      arcs: [
        {
          resourceType: 'iron-ore',
          originCoordinates: [119.0, -22.0],
          destinationCoordinates: [138.25, 36.2],
          destinationCountry: 'Japan',
          volume: 500,
          exportValueAUD: 5000,
          royaltiesAUD: 150,
          corporateTaxAUD: 300,
          costBasisMinAUD: 1000,
          costBasisMaxAUD: 2000,
        },
      ],
    });
    const result = computeArcsForRange([lngDataset, ironDataset], 2021, 2023);
    expect(result).toHaveLength(2);
    const resourceTypes = result.map((a) => a.resourceType).sort();
    expect(resourceTypes).toEqual(['iron-ore', 'lng']);
  });

  it('handles sparse data (route missing in some years) without crashing', () => {
    const dataset = makeDataset({
      arcs: [
        {
          resourceType: 'lng',
          originCoordinates: [116.85, -20.74],
          destinationCoordinates: [138.25, 36.2],
          destinationCountry: 'Japan',
          volume: 1000,
          exportValueAUD: 10000,
          royaltiesAUD: 300,
          corporateTaxAUD: 600,
          costBasisMinAUD: 2000,
          costBasisMaxAUD: 4000,
        },
        {
          resourceType: 'lng',
          originCoordinates: [116.85, -20.74],
          destinationCoordinates: [121.47, 31.23],
          destinationCountry: 'China',
          volume: 800,
          exportValueAUD: 8000,
          royaltiesAUD: 240,
          corporateTaxAUD: 480,
          costBasisMinAUD: 1500,
          costBasisMaxAUD: 3000,
        },
      ],
      years: [
        {
          year: 2021,
          totalVolume: 1000,
          totalValue: 10000,
          totalRoyalties: 300,
          totalCorporateTax: 600,
          destinations: [{ country: 'Japan', volume: 1000, value: 10000, royalties: 300, tax: 600 }],
        },
        {
          year: 2022,
          totalVolume: 1800,
          totalValue: 18000,
          totalRoyalties: 540,
          totalCorporateTax: 1080,
          destinations: [
            { country: 'Japan', volume: 1000, value: 10000, royalties: 300, tax: 600 },
            { country: 'China', volume: 800, value: 8000, royalties: 240, tax: 480 },
          ],
        },
      ],
    });
    const result = computeArcsForRange([dataset], 2021, 2022);
    // Japan appears in both years; China only in 2022
    const japan = result.find((a) => a.destinationCountry === 'Japan');
    const china = result.find((a) => a.destinationCountry === 'China');
    expect(japan?.volume).toBe(2000);
    expect(china?.volume).toBe(800);
  });

  it('cost basis scales proportionally to the value ratio', () => {
    const dataset = makeDataset();
    // Single year: value = 10000, reference exportValueAUD = 10000, ratio = 1
    const singleYear = computeArcsForRange([dataset], 2021, 2021);
    expect(singleYear[0].costBasisMinAUD).toBe(2000); // 2000 * (10000/10000)

    // Multi-year: value = 30000, reference exportValueAUD = 10000, ratio = 3
    const multiYear = computeArcsForRange([dataset], 2021, 2023);
    expect(multiYear[0].costBasisMinAUD).toBe(6000); // 2000 * (30000/10000)
  });

  it('coordinates come from the static arcs registry', () => {
    const dataset = makeDataset();
    const result = computeArcsForRange([dataset], 2021, 2021);
    expect(result[0].originCoordinates).toEqual([116.85, -20.74]);
    expect(result[0].destinationCoordinates).toEqual([138.25, 36.2]);
  });
});
