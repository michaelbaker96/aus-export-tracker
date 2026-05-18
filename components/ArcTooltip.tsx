'use client';

import type { ArcData } from '@/types';
import { RESOURCE_COLORS } from '@/lib/resource-config';

interface ArcTooltipProps {
  arc: ArcData;
  x: number;
  y: number;
}

const LABELS: Record<string, string> = {
  lng: 'LNG',
  'iron-ore': 'Iron Ore',
  coal: 'Coal',
};

const VOLUME_UNIT: Record<string, string> = {
  lng: 'PJ',
  'iron-ore': 'Mt',
  coal: 'Mt',
};

function fmt(n: number) {
  return n.toLocaleString('en-AU');
}

export default function ArcTooltip({ arc, x, y }: ArcTooltipProps) {
  const revenue = arc.royaltiesAUD + arc.corporateTaxAUD;
  const accent = RESOURCE_COLORS[arc.resourceType] ?? '#e2e5eb';

  return (
    <div
      className="bg-surface-container-high border border-outline/20 rounded-lg pointer-events-none min-w-[200px] shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
      style={{
        position: 'fixed',
        left: x + 16,
        top: y - 8,
        zIndex: 100,
        padding: '10px 14px',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ background: accent }}
        />
        <span className="font-body font-semibold" style={{ color: accent }}>
          {LABELS[arc.resourceType] ?? arc.resourceType}
        </span>
        <span className="text-on-surface-variant/50 ml-0.5">→</span>
        <span className="font-semibold text-on-surface">{arc.destinationCountry}</span>
      </div>
      <div className="flex flex-col gap-y-1.5 font-body text-on-surface-variant">
        <span>
          Volume{' '}
          <strong className="text-on-surface font-semibold">
            {fmt(arc.volume)} {VOLUME_UNIT[arc.resourceType]}
          </strong>
        </span>
        <span>
          Govt. revenue{' '}
          <strong className="text-on-surface font-semibold">
            A${fmt(revenue)}M
          </strong>
        </span>
      </div>
    </div>
  );
}
