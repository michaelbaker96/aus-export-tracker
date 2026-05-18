/*
 * Orbital Telemetry — a self-contained rotatable globe.
 *
 * Renders Earth entirely in deck.gl (no Mapbox token required): a dark ocean
 * sphere, glowing country outlines, and great-circle export arcs that hug the
 * planet so the far side is correctly occluded as it turns. The globe slowly
 * auto-orbits; grabbing it hands control to the user, and the orbit drifts
 * back after a short idle.
 */
'use client';

import '@luma.gl/webgl';
import { useEffect, useState, useCallback, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import {
  ArcLayer,
  GeoJsonLayer,
  ScatterplotLayer,
  SimpleMeshLayer,
  COORDINATE_SYSTEM,
  _GlobeView as GlobeView,
} from 'deck.gl';
import { SphereGeometry } from '@luma.gl/engine';
import type { PickingInfo } from 'deck.gl';
import type { ArcData } from '@/types';
import { RESOURCE_COLORS, hexToRgb } from '@/lib/resource-config';
import GlobeHud from './GlobeHud';

// deck.gl renders the globe at this radius (metres). Keep landmasses a hair
// above it so coastlines never z-fight with the ocean shell.
const EARTH_RADIUS = 6_370_000;

// Where the export beacon sits when no arc data is loaded yet — the Pilbara /
// North West Shelf, origin of WA's bulk resource exports.
const DEFAULT_ORIGIN: [number, number] = [117.8, -20.7];

const INITIAL_VIEW_STATE = {
  longitude: 125,
  latitude: -16,
  zoom: 2.7,
  pitch: 0,
  bearing: 0,
  minZoom: 1.5,
  maxZoom: 7,
};

const clampLat = (lat: number) => Math.max(-80, Math.min(80, lat));
const wrapLon = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;

// Degrees of spin per animation frame while idle (~0.66°/s at 60fps).
const ORBIT_SPEED = 0.011;
// How long after the last interaction before the orbit drifts back.
const IDLE_RESUME_MS = 2600;

function buildVolumeRanges(arcs: ArcData[]): Record<string, { min: number; max: number }> {
  const ranges: Record<string, { min: number; max: number }> = {};
  for (const arc of arcs) {
    const r = ranges[arc.resourceType];
    if (!r) {
      ranges[arc.resourceType] = { min: arc.volume, max: arc.volume };
    } else {
      if (arc.volume < r.min) r.min = arc.volume;
      if (arc.volume > r.max) r.max = arc.volume;
    }
  }
  return ranges;
}

interface MapViewProps {
  arcs?: ArcData[];
  onArcHover?: (info: PickingInfo<ArcData>) => void;
  onArcClick?: (info: PickingInfo<ArcData>) => void;
}

export default function MapView({ arcs = [], onArcHover, onArcClick }: MapViewProps) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [time, setTime] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);

  const rafRef = useRef<number>(0);
  const autoRotateRef = useRef(true);
  const lastInteractRef = useRef(0);

  // Single animation loop: drives the arc pulse, the beacon, and the idle orbit.
  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      const now = Date.now();
      setTime(now);

      const idle = now - lastInteractRef.current > IDLE_RESUME_MS;
      if (idle && !autoRotateRef.current) {
        autoRotateRef.current = true;
        setAutoRotate(true);
      }

      if (autoRotateRef.current) {
        setViewState((vs) => ({
          ...vs,
          longitude: wrapLon(vs.longitude + ORBIT_SPEED),
        }));
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const arcsByType = arcs.reduce<Record<string, ArcData[]>>((acc, d) => {
    (acc[d.resourceType] ??= []).push(d);
    return acc;
  }, {});

  const volumeRanges = buildVolumeRanges(arcs);
  const pulse = (Math.sin(time / 500) + 1) / 2;

  function normaliseVolume(d: ArcData): number {
    const range = volumeRanges[d.resourceType];
    if (!range || range.max === range.min) return 0.5;
    return (d.volume - range.min) / (range.max - range.min);
  }

  function makeArcLayer(id: string, data: ArcData[], resourceType: string) {
    const baseColor = hexToRgb(RESOURCE_COLORS[resourceType] ?? '#c8c8c8');
    return new ArcLayer<ArcData>({
      id,
      data,
      greatCircle: true,
      getSourcePosition: (d) => d.originCoordinates,
      getTargetPosition: (d) => d.destinationCoordinates,
      getSourceColor: (d) => {
        const t = normaliseVolume(d);
        const brightness = 0.7 + 0.3 * pulse * t;
        return [
          baseColor[0] * brightness,
          baseColor[1] * brightness,
          baseColor[2] * brightness,
          Math.round(140 + 115 * t),
        ] as [number, number, number, number];
      },
      getTargetColor: (d) => {
        const t = normaliseVolume(d);
        const brightness = 0.5 + 0.5 * pulse * t;
        return [
          baseColor[0] * brightness,
          baseColor[1] * brightness,
          baseColor[2] * brightness,
          Math.round(90 + 120 * t),
        ] as [number, number, number, number];
      },
      getWidth: (d) => 1 + normaliseVolume(d) * 4,
      widthMinPixels: 0.6,
      widthMaxPixels: 6,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 200],
      onHover: onArcHover as (info: PickingInfo<ArcData>) => void,
      onClick: onArcClick as (info: PickingInfo<ArcData>) => void,
      updateTriggers: {
        getSourceColor: [time],
        getTargetColor: [time],
      },
    });
  }

  const origin = arcs[0]?.originCoordinates ?? DEFAULT_ORIGIN;
  // Beacon ring expands and fades on a ~1.6s cycle.
  const beaconPhase = (time % 1600) / 1600;

  const layers = [
    // The planet body — a dark ocean shell.
    new SimpleMeshLayer({
      id: 'earth-sphere',
      data: [{ position: [0, 0, 0] }],
      mesh: new SphereGeometry({ radius: EARTH_RADIUS, nlat: 36, nlong: 72 }),
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      getPosition: (d: { position: number[] }) => d.position as [number, number, number],
      getColor: [8, 15, 26, 255],
      wireframe: false,
    }),
    // Landmasses — faint instrument fill with a glowing hairline coast.
    new GeoJsonLayer({
      id: 'countries',
      data: '/geo/countries.geojson',
      stroked: true,
      filled: true,
      getFillColor: (f: { properties?: { name?: string } }) =>
        f.properties?.name === 'Australia' ? [22, 52, 64, 255] : [16, 28, 42, 235],
      getLineColor: (f: { properties?: { name?: string } }) =>
        f.properties?.name === 'Australia' ? [110, 246, 232, 220] : [78, 124, 156, 150],
      getLineWidth: (f: { properties?: { name?: string } }) =>
        f.properties?.name === 'Australia' ? 2.2 : 1,
      lineWidthUnits: 'pixels',
      parameters: { depthTest: true },
    }),
    ...Object.entries(arcsByType).map(([type, data]) =>
      makeArcLayer(`${type}-arcs`, data, type),
    ),
    // Origin beacon — a steady core plus an expanding telemetry ring.
    new ScatterplotLayer({
      id: 'origin-core',
      data: [{ position: origin }],
      getPosition: (d: { position: [number, number] }) => d.position,
      getRadius: 26000,
      radiusMinPixels: 3,
      radiusMaxPixels: 7,
      getFillColor: [95, 242, 228, 255],
    }),
    new ScatterplotLayer({
      id: 'origin-ring',
      data: [{ position: origin }],
      getPosition: (d: { position: [number, number] }) => d.position,
      stroked: true,
      filled: false,
      getLineWidth: 2,
      lineWidthUnits: 'pixels',
      getRadius: 26000 + beaconPhase * 240000,
      radiusMinPixels: 4 + beaconPhase * 34,
      getLineColor: [95, 242, 228, Math.round((1 - beaconPhase) * 200)],
      updateTriggers: {
        getRadius: [time],
        radiusMinPixels: [time],
        getLineColor: [time],
      },
    }),
  ];

  const handleViewStateChange = useCallback(
    ({
      viewState: vs,
      interactionState,
    }: {
      viewState: Record<string, unknown>;
      interactionState?: { isDragging?: boolean; isZooming?: boolean; isPanning?: boolean };
    }) => {
      const next = vs as typeof INITIAL_VIEW_STATE;
      setViewState({
        ...next,
        latitude: clampLat(next.latitude),
        longitude: wrapLon(next.longitude),
      });
      const active =
        interactionState?.isDragging ||
        interactionState?.isZooming ||
        interactionState?.isPanning;
      if (active) {
        lastInteractRef.current = Date.now();
        if (autoRotateRef.current) {
          autoRotateRef.current = false;
          setAutoRotate(false);
        }
      }
    },
    [],
  );

  return (
    <div className="relative h-full w-full">
      <DeckGL
        views={new GlobeView({ id: 'globe' })}
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={{ dragRotate: true, inertia: 500 }}
        layers={layers}
        style={{ width: '100%', height: '100%', background: 'var(--color-surface)' }}
      />
      <GlobeHud
        longitude={viewState.longitude}
        latitude={viewState.latitude}
        autoRotate={autoRotate}
        arcCount={arcs.length}
      />
    </div>
  );
}
