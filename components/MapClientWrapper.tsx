/**
 * Ahoy! Welcome to the Map Deck!
 * This be the main navigator where we frame the charts and the ledgers.
 * We've split the view: filters to the port side, and the map and booty details to the starboard.
 */
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { PickingInfo } from 'deck.gl';
import type { ArcData, ResourceData, AnnualRecord } from '@/types';
import { RESOURCE_COLORS } from '@/lib/resource-config';
import { computeArcsForRange } from '@/lib/computeArcsForRange';
import ArcTooltip from './ArcTooltip';
import DetailsPane from './DetailsPane';
import MapLegend from './MapLegend';
import TradeFiltersPanel, { type ResourceEntry, type CountryEntry } from './TradeFiltersPanel';
import YearRangeBar from './YearRangeBar';

// Dynamic import with ssr: false must live in a Client Component
const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface HoverState {
  arc: ArcData;
  x: number;
  y: number;
}

interface FoundResource {
  resource: string;
  displayName: string;
  units: { volume: string; value: string };
  years: { year: number; country: string; volume: number; value: number; royalties: number; tax: number }[];
  arc: ArcData;
}

export interface CountryLookupResult {
  query: string;
  match: { code: number; name: string; coords?: [number, number] } | null;
  found?: FoundResource[];
  notFound?: string[];
  hasData?: boolean;
  error?: string;
}

export default function MapClientWrapper() {
  const [datasets, setDatasets] = useState<ResourceData[]>([]);
  const [resourceMeta, setResourceMeta] = useState<Omit<ResourceEntry, 'active' | 'volume'>[]>([]);
  const [activeResources, setActiveResources] = useState<Set<string>>(new Set());
  const [allCountries, setAllCountries] = useState<string[]>([]);
  const [activeCountries, setActiveCountries] = useState<Set<string>>(new Set());
  const [yearRange, setYearRange] = useState<[number, number]>([2014, 2025]);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<{ resourceType: string; country: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/lng.json').then((r) => r.json()) as Promise<ResourceData>,
      fetch('/data/iron-ore.json').then((r) => r.json()) as Promise<ResourceData>,
      fetch('/data/coal.json').then((r) => r.json()) as Promise<ResourceData>,
    ]).then(([lng, ironOre, coal]) => {
      const loaded = [lng, ironOre, coal];
      const meta = loaded.map((d) => ({
        resourceType: d.resource,
        displayName: d.displayName,
        color: RESOURCE_COLORS[d.resource] ?? '#ffffff',
      }));
      const allArcs = loaded.flatMap((d) => d.arcs);
      const countries = [...new Set(allArcs.map((a) => a.destinationCountry))].sort();
      const allYears = loaded.flatMap((d) => d.years.map((y) => y.year));
      const minYear = Math.min(...allYears);
      const maxYear = Math.max(...allYears);
      setDatasets(loaded);
      setResourceMeta(meta);
      setActiveResources(new Set(meta.map((m) => m.resourceType)));
      setAllCountries(countries);
      setActiveCountries(new Set(countries));
      setYearRange([minYear, maxYear]);
    });
  }, []);

  const [startYear, endYear] = yearRange;

  const [globalMinYear, globalMaxYear] = useMemo(() => {
    if (datasets.length === 0) return [2014, 2025];
    const allYears = datasets.flatMap((d) => d.years.map((y) => y.year));
    return [Math.min(...allYears), Math.max(...allYears)];
  }, [datasets]);

  const rangeArcs = useMemo(
    () => computeArcsForRange(datasets, startYear, endYear),
    [datasets, startYear, endYear],
  );

  const filteredArcs = useMemo(
    () =>
      rangeArcs.filter(
        (a) => activeResources.has(a.resourceType) && activeCountries.has(a.destinationCountry),
      ),
    [rangeArcs, activeResources, activeCountries],
  );

  // Re-derive the selected route's arc from the current year range so the
  // details pane stays in sync when the year slider moves.
  const selectedArc = useMemo(
    () =>
      selectedRoute
        ? rangeArcs.find(
            (a) =>
              a.resourceType === selectedRoute.resourceType &&
              a.destinationCountry === selectedRoute.country,
          ) ?? null
        : null,
    [rangeArcs, selectedRoute],
  );

  const resourceVolumes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const arc of filteredArcs) {
      map[arc.resourceType] = (map[arc.resourceType] ?? 0) + arc.volume;
    }
    return map;
  }, [filteredArcs]);

  const resources: ResourceEntry[] = resourceMeta.map((m) => ({
    ...m,
    active: activeResources.has(m.resourceType),
    volume: resourceVolumes[m.resourceType] ?? 0,
  }));

  const countries: CountryEntry[] = allCountries.map((name) => ({
    name,
    active: activeCountries.has(name),
  }));

  const handleToggle = useCallback((resourceType: string) => {
    setActiveResources((prev) => {
      const next = new Set(prev);
      if (next.has(resourceType)) next.delete(resourceType);
      else next.add(resourceType);
      return next;
    });
  }, []);

  const handleCountryToggle = useCallback((country: string) => {
    setActiveCountries((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  }, []);

  const handleSelectAllResources = useCallback(() => {
    setActiveResources(new Set(resourceMeta.map((m) => m.resourceType)));
  }, [resourceMeta]);

  const handleDeselectAllResources = useCallback(() => {
    setActiveResources(new Set());
  }, []);

  const handleSelectAllCountries = useCallback(() => {
    setActiveCountries(new Set(allCountries));
  }, [allCountries]);

  const handleDeselectAllCountries = useCallback(() => {
    setActiveCountries(new Set());
  }, []);

  const handleLookupCountry = useCallback(
    async (query: string): Promise<CountryLookupResult> => {
      const res = await fetch(`/api/country-search?q=${encodeURIComponent(query)}`);
      return res.json();
    },
    [],
  );

  const handleAddCountry = useCallback((data: CountryLookupResult) => {
    if (!data.match || !data.found || data.found.length === 0) return;
    const name = data.match.name;

    setDatasets((prev) => {
      const next = prev.map((d) => ({
        ...d,
        arcs: [...d.arcs],
        years: d.years.map((y) => ({ ...y, destinations: [...y.destinations] })),
      }));

      for (const f of data.found!) {
        const ds = next.find((d) => d.resource === f.resource);
        if (!ds) continue;

        ds.arcs = ds.arcs.filter((a) => a.destinationCountry !== name);
        ds.arcs.push(f.arc);

        const byYear = new Map<number, AnnualRecord>(ds.years.map((y) => [y.year, y]));
        for (const yc of f.years) {
          let yr = byYear.get(yc.year);
          if (!yr) {
            yr = {
              year: yc.year,
              totalVolume: 0,
              totalValue: 0,
              totalRoyalties: 0,
              totalCorporateTax: 0,
              destinations: [],
            };
            ds.years.push(yr);
            byYear.set(yc.year, yr);
          }
          yr.destinations = yr.destinations.filter((dd) => dd.country !== name);
          yr.destinations.push({
            country: yc.country,
            volume: yc.volume,
            value: yc.value,
            royalties: yc.royalties,
            tax: yc.tax,
          });
        }
        ds.years.sort((a, b) => a.year - b.year);
      }
      return next;
    });

    setAllCountries((prev) => (prev.includes(name) ? prev : [...prev, name].sort()));
    setActiveCountries((prev) => {
      const nextSet = new Set(prev);
      nextSet.add(name);
      return nextSet;
    });
  }, []);

  const handleArcHover = useCallback((info: PickingInfo<ArcData>) => {
    if (info.object) {
      setHover({ arc: info.object, x: info.x, y: info.y });
    } else {
      setHover(null);
    }
  }, []);

  const handleArcClick = useCallback((info: PickingInfo<ArcData>) => {
    if (info.object) {
      setSelectedRoute({
        resourceType: info.object.resourceType,
        country: info.object.destinationCountry,
      });
      setHover(null);
    }
  }, []);

  const handleRangeChange = useCallback((start: number, end: number) => {
    setYearRange([start, end]);
  }, []);

  return (
    <div className="flex-1 flex gap-4 overflow-hidden">
      {/* Sidebar Filters */}
      <aside className="w-[320px] shrink-0 flex flex-col gap-4">
        <TradeFiltersPanel
          resources={resources}
          countries={countries}
          onToggleResource={handleToggle}
          onToggleCountry={handleCountryToggle}
          onSelectAllResources={handleSelectAllResources}
          onDeselectAllResources={handleDeselectAllResources}
          onSelectAllCountries={handleSelectAllCountries}
          onDeselectAllCountries={handleDeselectAllCountries}
          onLookupCountry={handleLookupCountry}
          onAddCountry={handleAddCountry}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Map Card */}
        <section className="flex-1 relative bg-surface-container rounded-2xl border border-outline/20 shadow-2xl overflow-hidden flex flex-col">
          <YearRangeBar
            minYear={globalMinYear}
            maxYear={globalMaxYear}
            startYear={startYear}
            endYear={endYear}
            onRangeChange={handleRangeChange}
          />
          <div className="flex-1 relative">
            <MapView
              arcs={filteredArcs}
              onArcHover={handleArcHover}
              onArcClick={handleArcClick}
            />
            {hover && (
              <ArcTooltip arc={hover.arc} x={hover.x} y={hover.y} />
            )}
            <MapLegend />
          </div>
        </section>

        {/* Details Area */}
        <section className="h-64 shrink-0 bg-surface-container rounded-2xl border border-outline/20 overflow-hidden shadow-2xl">
          <DetailsPane
            arc={selectedArc}
            yearLabel={startYear === endYear ? `${startYear}` : `${startYear} – ${endYear}`}
          />
        </section>
      </div>
    </div>
  );
}

