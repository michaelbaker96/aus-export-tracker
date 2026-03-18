'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import type { PickingInfo } from 'deck.gl';
import type { ArcData, ResourceData } from '@/types';
import ArcTooltip from './ArcTooltip';
import SidePanel from './SidePanel';
import MapLegend from './MapLegend';

// Dynamic import with ssr: false must live in a Client Component
const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface HoverState {
  arc: ArcData;
  x: number;
  y: number;
}

export default function MapClientWrapper() {
  const [arcs, setArcs] = useState<ArcData[]>([]);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedArc, setSelectedArc] = useState<ArcData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/lng.json').then((r) => r.json()) as Promise<ResourceData>,
      fetch('/data/iron-ore.json').then((r) => r.json()) as Promise<ResourceData>,
    ]).then(([lng, ironOre]) => {
      setArcs([...lng.arcs, ...ironOre.arcs]);
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
        arcs={arcs}
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
    </>
  );
}
