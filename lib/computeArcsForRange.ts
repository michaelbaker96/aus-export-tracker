import type { ArcData, ResourceData } from '@/types';

type CoordEntry = {
  originCoordinates: [number, number];
  destinationCoordinates: [number, number];
  costBasisMinAUD: number;
  costBasisMaxAUD: number;
  exportValueAUD: number;
};

type Accumulator = {
  volume: number;
  value: number;
  royalties: number;
  tax: number;
};

/**
 * Derives an ArcData array from the years[].destinations data in each resource
 * dataset, aggregating across the selected year range [startYear, endYear] inclusive.
 *
 * Uses the static arcs array in each dataset as a coordinate registry.
 * Routes with zero total volume in the selected range are excluded.
 */
export function computeArcsForRange(
  datasets: ResourceData[],
  startYear: number,
  endYear: number,
): ArcData[] {
  const result: ArcData[] = [];

  for (const dataset of datasets) {
    // Build coordinate registry from the static arcs array
    const coordRegistry = new Map<string, CoordEntry>();
    for (const arc of dataset.arcs) {
      coordRegistry.set(arc.destinationCountry, {
        originCoordinates: arc.originCoordinates,
        destinationCoordinates: arc.destinationCoordinates,
        costBasisMinAUD: arc.costBasisMinAUD,
        costBasisMaxAUD: arc.costBasisMaxAUD,
        exportValueAUD: arc.exportValueAUD,
      });
    }

    // Accumulate totals per destination within the selected range
    const accumulators = new Map<string, Accumulator>();
    for (const yearRecord of dataset.years) {
      if (yearRecord.year < startYear || yearRecord.year > endYear) continue;
      for (const dest of yearRecord.destinations) {
        const existing = accumulators.get(dest.country) ?? {
          volume: 0,
          value: 0,
          royalties: 0,
          tax: 0,
        };
        accumulators.set(dest.country, {
          volume: existing.volume + dest.volume,
          value: existing.value + dest.value,
          royalties: existing.royalties + dest.royalties,
          tax: existing.tax + dest.tax,
        });
      }
    }

    // Build output arcs, scaling cost basis proportionally by value
    for (const [country, totals] of accumulators) {
      if (totals.volume === 0) continue;

      const coords = coordRegistry.get(country);
      if (!coords) continue; // silently skip routes with no coordinate entry

      // Scale cost basis proportionally: if we exported 2× the reference value,
      // the cumulative cost basis is approximately 2× the annual reference figure.
      const valueRatio = coords.exportValueAUD > 0 ? totals.value / coords.exportValueAUD : 1;

      result.push({
        resourceType: dataset.resource,
        originCoordinates: coords.originCoordinates,
        destinationCoordinates: coords.destinationCoordinates,
        destinationCountry: country,
        volume: totals.volume,
        exportValueAUD: totals.value,
        royaltiesAUD: totals.royalties,
        corporateTaxAUD: totals.tax,
        costBasisMinAUD: Math.round(coords.costBasisMinAUD * valueRatio),
        costBasisMaxAUD: Math.round(coords.costBasisMaxAUD * valueRatio),
      });
    }
  }

  return result;
}
