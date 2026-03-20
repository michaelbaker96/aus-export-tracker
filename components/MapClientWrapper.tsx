'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { PickingInfo } from 'deck.gl';
import type { ArcData, ResourceData } from '@/types';
import { RESOURCE_COLORS } from '@/lib/resource-config';
import { computeArcsForRange } from '@/lib/computeArcsForRange';
import ArcTooltip from './ArcTooltip';
import SidePanel from './SidePanel';
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

export default function MapClientWrapper() {
  const [datasets, setDatasets] = useState<ResourceData[]>([]);
  const [resourceMeta, setResourceMeta] = useState<Omit<ResourceEntry, 'active' | 'volume'>[]>([]);
  const [activeResources, setActiveResources] = useState<Set<string>>(new Set());
  const [allCountries, setAllCountries] = useState<string[]>([]);
  const [activeCountries, setActiveCountries] = useState<Set<string>>(new Set());
  const [yearRange, setYearRange] = useState<[number, number]>([2014, 2025]);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedArc, setSelectedArc] = useState<ArcData | null>(null);

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

  const filteredArcs = useMemo(
    () =>
      computeArcsForRange(datasets, startYear, endYear).filter(
        (a) => activeResources.has(a.resourceType) && activeCountries.has(a.destinationCountry),
      ),
    [datasets, startYear, endYear, activeResources, activeCountries],
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

  const handleArcHover = useCallback((info: PickingInfo<ArcData>) => {
    if (info.object) {
      setHover({ arc: info.object, x: info.x, y: info.y });
    } else {
      setHover(null);
    }
  }, []);

  const handleArcClick = useCallback((info: PickingInfo<ArcData>) => {
    if (info.object) {
      setSelectedArc(info.object);
      setHover(null);
    }
  }, []);

  const handleRangeChange = useCallback((start: number, end: number) => {
    setYearRange([start, end]);
  }, []);

  return (
    <>
      <YearRangeBar
        minYear={globalMinYear}
        maxYear={globalMaxYear}
        startYear={startYear}
        endYear={endYear}
        onRangeChange={handleRangeChange}
      />
      <MapView
        arcs={filteredArcs}
        onArcHover={handleArcHover}
        onArcClick={handleArcClick}
      />
      {hover && (
        <ArcTooltip arc={hover.arc} x={hover.x} y={hover.y} />
      )}
      {selectedArc && (
        <SidePanel
          arc={selectedArc}
          yearLabel={startYear === endYear ? `${startYear}` : `${startYear} – ${endYear}`}
          onClose={() => setSelectedArc(null)}
        />
      )}
      <MapLegend />
      <div style={{ position: 'absolute', top: 52, left: 16, zIndex: 10 }}>
        <TradeFiltersPanel
          resources={resources}
          countries={countries}
          onToggleResource={handleToggle}
          onToggleCountry={handleCountryToggle}
          onSelectAllResources={handleSelectAllResources}
          onDeselectAllResources={handleDeselectAllResources}
          onSelectAllCountries={handleSelectAllCountries}
          onDeselectAllCountries={handleDeselectAllCountries}
        />
      </div>
    </>
  );
}
