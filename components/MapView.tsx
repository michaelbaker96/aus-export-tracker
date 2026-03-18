'use client';

import { useEffect, useState, useCallback } from 'react';
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

const ARC_COLORS: Record<string, [number, number, number]> = {
  lng: [0, 200, 255],
  'iron-ore': [255, 140, 50],
};

interface MapViewProps {
  arcs?: ArcData[];
  onArcHover?: (info: PickingInfo<ArcData>) => void;
  onArcClick?: (info: PickingInfo<ArcData>) => void;
}

export default function MapView({ arcs = [], onArcHover, onArcClick }: MapViewProps) {
  const [viewState, setViewState] = useState(WORLD_VIEW_STATE);

  // Trigger zoom-into-Australia animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setViewState(AUSTRALIA_VIEW_STATE as typeof WORLD_VIEW_STATE);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const layers = [
    new ArcLayer<ArcData>({
      id: 'export-arcs',
      data: arcs,
      getSourcePosition: (d) => d.originCoordinates,
      getTargetPosition: (d) => d.destinationCoordinates,
      getSourceColor: (d) => ARC_COLORS[d.resourceType] ?? [200, 200, 200],
      getTargetColor: (d) => ARC_COLORS[d.resourceType] ?? [200, 200, 200],
      getWidth: (d) => Math.max(1, Math.log2(d.exportValueAUD / 1000 + 1) * 2),
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 120],
      onHover: onArcHover as (info: PickingInfo<ArcData>) => void,
      onClick: onArcClick as (info: PickingInfo<ArcData>) => void,
    }),
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
        reuseMaps
      />
    </DeckGL>
  );
}
