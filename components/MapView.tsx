'use client';

import { useEffect, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator } from 'deck.gl';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

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

export default function MapView() {
  const [viewState, setViewState] = useState(WORLD_VIEW_STATE);

  // Trigger zoom-into-Australia animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setViewState(AUSTRALIA_VIEW_STATE as typeof WORLD_VIEW_STATE);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: vs }) =>
        setViewState(vs as typeof WORLD_VIEW_STATE)
      }
      controller={true}
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
