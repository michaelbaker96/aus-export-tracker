'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { PickingInfo } from 'deck.gl';
import type { ArcData, ResourceData } from '@/types';
import { RESOURCE_COLORS } from '@/lib/resource-config';
import ArcTooltip from './ArcTooltip';
import SidePanel from './SidePanel';
import MapLegend from './MapLegend';
import ResourceFilterPanel, { type ResourceEntry } from './ResourceFilterPanel';
import CountryFilterPanel, { type CountryEntry } from './CountryFilterPanel';

// Dynamic import with ssr: false must live in a Client Component
const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface HoverState {
  arc: ArcData;
  x: number;
  y: number;
}

export default function MapClientWrapper() {
  const [arcs, setArcs] = useState<ArcData[]>([]);
  const [resourceMeta, setResourceMeta] = useState<Omit<ResourceEntry, 'active'>[]>([]);
  const [activeResources, setActiveResources] = useState<Set<string>>(new Set());
  const [allCountries, setAllCountries] = useState<string[]>([]);
  const [activeCountries, setActiveCountries] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedArc, setSelectedArc] = useState<ArcData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/lng.json').then((r) => r.json()) as Promise<ResourceData>,
      fetch('/data/iron-ore.json').then((r) => r.json()) as Promise<ResourceData>,
    ]).then(([lng, ironOre]) => {
      const datasets = [lng, ironOre];
      const meta = datasets.map((d) => ({
        resourceType: d.resource,
        displayName: d.displayName,
        color: RESOURCE_COLORS[d.resource] ?? '#ffffff',
      }));
      const allArcs = datasets.flatMap((d) => d.arcs);
      const countries = [...new Set(allArcs.map((a) => a.destinationCountry))].sort();
      setResourceMeta(meta);
      setActiveResources(new Set(meta.map((m) => m.resourceType)));
      setAllCountries(countries);
      setActiveCountries(new Set(countries));
      setArcs(allArcs);
    });
  }, []);

  const filteredArcs = useMemo(
    () => arcs.filter((a) => activeResources.has(a.resourceType) && activeCountries.has(a.destinationCountry)),
    [arcs, activeResources, activeCountries],
  );

  const resources: ResourceEntry[] = resourceMeta.map((m) => ({
    ...m,
    active: activeResources.has(m.resourceType),
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

  return (
    <>
      <MapView
        arcs={filteredArcs}
        onArcHover={handleArcHover}
        onArcClick={handleArcClick}
      />
      {hover && (
        <ArcTooltip arc={hover.arc} x={hover.x} y={hover.y} />
      )}
      {selectedArc && (
        <SidePanel arc={selectedArc} onClose={() => setSelectedArc(null)} />
      )}
      <MapLegend />
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 10,
        }}
      >
        <ResourceFilterPanel resources={resources} onToggle={handleToggle} />
        <CountryFilterPanel countries={countries} onToggle={handleCountryToggle} />
      </div>
    </>
  );
}
