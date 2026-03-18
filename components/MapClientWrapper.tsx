'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import type { PickingInfo } from 'deck.gl';
import type { ArcData, ResourceData } from '@/types';

// Dynamic import with ssr: false must live in a Client Component
const MapView = dynamic(() => import('./MapView'), { ssr: false });

export default function MapClientWrapper() {
  const [arcs, setArcs] = useState<ArcData[]>([]);
  const [hoveredArc, setHoveredArc] = useState<ArcData | null>(null);
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
    setHoveredArc(info.object ?? null);
  }, []);

  const handleArcClick = useCallback((info: PickingInfo<ArcData>) => {
    setSelectedArc(info.object ?? null);
  }, []);

  return (
    <MapView
      arcs={arcs}
      onArcHover={handleArcHover}
      onArcClick={handleArcClick}
    />
  );
}
