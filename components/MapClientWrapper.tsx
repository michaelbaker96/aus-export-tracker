'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr: false must live in a Client Component
const MapView = dynamic(() => import('./MapView'), { ssr: false });

export default function MapClientWrapper() {
  return <MapView />;
}
