'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { ArcLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from 'deck.gl';
import type { PickingInfo } from 'deck.gl';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ArcData } from '@/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Starting view — zoomed out world view
const WORLD_VIEW_STATE = {
  longitude: 100,
  latitude: -15,
  zoom: 1.8,
  pitch: 0,
  bearing: 0,
};

// Target view — Australia centred, showing all trade routes
const AUSTRALIA_VIEW_STATE = {
  longitude: 134,
  latitude: -26,
  zoom: 3.6,
  pitch: 0,
  bearing: 0,
  transitionDuration: 3200,
  transitionInterpolator: new FlyToInterpolator({ speed: 1.4 }),
};

// Colour per resource type — [R, G, B]
const ARC_COLORS: Record<string, [number, number, number]> = {
  lng: [0, 191, 255],        // electric blue (#00BFFF)
  'iron-ore': [255, 140, 0], // amber/orange (#FF8C00)
};

// Volume ranges per resource for normalising opacity/width
// (pre-computed from the seed data to avoid scanning every frame)
const VOLUME_RANGES: Record<string, { min: number; max: number }> = {
  lng: { min: 263, max: 1488 },
  'iron-ore': { min: 6.2, max: 738.7 },
};

function normaliseVolume(d: ArcData): number {
  const range = VOLUME_RANGES[d.resourceType];
  if (!range || range.max === range.min) return 0.5;
  return (d.volumeLatestYear - range.min) / (range.max - range.min);
}

interface MapViewProps {
  arcs?: ArcData[];
  onArcHover?: (info: PickingInfo<ArcData>) => void;
  onArcClick?: (info: PickingInfo<ArcData>) => void;
}

export default function MapView({ arcs = [], onArcHover, onArcClick }: MapViewProps) {
  const [viewState, setViewState] = useState(WORLD_VIEW_STATE);
  const [time, setTime] = useState(0);
  const rafRef = useRef<number>(0);

  // Trigger zoom-into-Australia animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setViewState(AUSTRALIA_VIEW_STATE as typeof WORLD_VIEW_STATE);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Animation loop — drives the arc pulse
  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      setTime(Date.now());
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Split arcs by resource type
  const lngArcs = arcs.filter((d) => d.resourceType === 'lng');
  const ironOreArcs = arcs.filter((d) => d.resourceType === 'iron-ore');

  // Pulse factor oscillates between 0 and 1 over ~3 seconds
  const pulse = (Math.sin(time / 500) + 1) / 2;

  function makeArcLayer(
    id: string,
    data: ArcData[],
    resourceType: string,
  ) {
    const baseColor = ARC_COLORS[resourceType] ?? [200, 200, 200];

    return new ArcLayer<ArcData>({
      id,
      data,
      getSourcePosition: (d) => d.originCoordinates,
      getTargetPosition: (d) => d.destinationCoordinates,
      getSourceColor: (d) => {
        const t = normaliseVolume(d);
        // Pulse modulates brightness — higher volume arcs pulse more visibly
        const brightness = 0.7 + 0.3 * pulse * t;
        return [
          baseColor[0] * brightness,
          baseColor[1] * brightness,
          baseColor[2] * brightness,
          Math.round(140 + 115 * t), // opacity: 140–255 based on volume
        ] as [number, number, number, number];
      },
      getTargetColor: (d) => {
        const t = normaliseVolume(d);
        const brightness = 0.7 + 0.3 * pulse * t;
        return [
          baseColor[0] * brightness,
          baseColor[1] * brightness,
          baseColor[2] * brightness,
          Math.round(140 + 115 * t),
        ] as [number, number, number, number];
      },
      // Width: 1–6 based on normalised volume
      getWidth: (d) => 1 + normaliseVolume(d) * 5,
      widthMinPixels: 1,
      widthMaxPixels: 8,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 180],
      onHover: onArcHover as (info: PickingInfo<ArcData>) => void,
      onClick: onArcClick as (info: PickingInfo<ArcData>) => void,
      updateTriggers: {
        getSourceColor: [time],
        getTargetColor: [time],
      },
    });
  }

  const layers = [
    makeArcLayer('lng-arcs', lngArcs, 'lng'),
    makeArcLayer('iron-ore-arcs', ironOreArcs, 'iron-ore'),
  ];

  const handleViewStateChange = useCallback(
    ({ viewState: vs }: { viewState: Record<string, unknown> }) => {
      setViewState(vs as typeof WORLD_VIEW_STATE);
    },
    [],
  );

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={handleViewStateChange}
      controller={true}
      layers={layers}
      style={{ width: '100%', height: '100%' }}
    >
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        projection="mercator"
        reuseMaps
      />
    </DeckGL>
  );
}
