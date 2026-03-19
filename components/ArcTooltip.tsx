'use client';

import type { ArcData } from '@/types';

interface ArcTooltipProps {
  arc: ArcData;
  x: number;
  y: number;
}

const LABELS: Record<string, string> = {
  lng: 'LNG',
  'iron-ore': 'Iron Ore',
};

const ACCENT: Record<string, string> = {
  lng: 'var(--accent-lng)',
  'iron-ore': 'var(--accent-iron)',
};

const VOLUME_UNIT: Record<string, string> = {
  lng: 'PJ',
  'iron-ore': 'Mt',
};

function fmt(n: number) {
  return n.toLocaleString('en-AU');
}

export default function ArcTooltip({ arc, x, y }: ArcTooltipProps) {
  const revenue = arc.royaltiesAUD + arc.corporateTaxAUD;
  const accent = ACCENT[arc.resourceType] ?? '#fff';

  return (
    <div
      style={{
        position: 'fixed',
        left: x + 16,
        top: y - 8,
        pointerEvents: 'none',
        zIndex: 100,
        background: 'rgba(8, 12, 20, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        color: 'var(--foreground)',
        fontSize: 13,
        lineHeight: 1.5,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: accent,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 600, color: accent }}>
          {LABELS[arc.resourceType] ?? arc.resourceType}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 2 }}>→</span>
        <span style={{ fontWeight: 600 }}>{arc.destinationCountry}</span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span>
          Volume{' '}
          <strong style={{ color: 'var(--foreground)' }}>
            {fmt(arc.volume)} {VOLUME_UNIT[arc.resourceType]}
          </strong>
        </span>
        <span>
          Govt. revenue{' '}
          <strong style={{ color: 'var(--foreground)' }}>
            A${fmt(revenue)}M
          </strong>
        </span>
      </div>
    </div>
  );
}
