/**
 * Ahoy! This be the Details Pane, where we examine the booty of a single trade route.
 * It sits low in the hull, spread out wide so ye can see all the charts and ledgers at once.
 */
'use client';

import type { ArcData } from '@/types';
import { RESOURCE_COLORS } from '@/lib/resource-config';

interface DetailsPaneProps {
  arc: ArcData | null;
  yearLabel: string;
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

const STAT_PAGE: Record<string, string> = {
  lng: '/resources/lng',
  'iron-ore': '/resources/iron-ore',
  coal: '/resources/coal',
};

function fmt(n: number) {
  return n.toLocaleString('en-AU');
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-[140px] p-4 bg-surface-container-high rounded-xl border border-outline/10">
      <div className="font-body text-on-surface-variant text-[11px] uppercase tracking-wider mb-1">{label}</div>
      <div className="font-headline font-bold text-on-surface text-lg">
        {value}
      </div>
      {sub && (
        <div className="font-body text-on-surface-variant/40 text-[10px] mt-1 leading-tight">{sub}</div>
      )}
    </div>
  );
}

export default function DetailsPane({ arc, yearLabel }: DetailsPaneProps) {
  if (!arc) {
    return (
      <div className="h-full flex items-center justify-center text-on-surface-variant/40 font-body italic">
        Select an export route on the map to view details
      </div>
    );
  }

  const accent = RESOURCE_COLORS[arc.resourceType] ?? '#e2e5eb';
  const costRange = `A$${fmt(arc.costBasisMinAUD)}M – A$${fmt(arc.costBasisMaxAUD)}M`;

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <span
              className="font-headline font-bold uppercase tracking-widest text-[11px]"
              style={{ color: accent }}
            >
              {LABELS[arc.resourceType] ?? arc.resourceType}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="font-headline text-2xl font-bold text-on-surface leading-none">
              Australia → {arc.destinationCountry}
            </h2>
            <span className="font-body text-on-surface-variant/60 text-sm">{yearLabel}</span>
          </div>
        </div>
        
        <a
          href={STAT_PAGE[arc.resourceType] ?? '#'}
          className="px-4 py-2 rounded-lg bg-surface-container-highest text-on-surface font-semibold text-[12px] no-underline transition-colors hover:bg-outline/10 border border-outline/10"
        >
          Full {LABELS[arc.resourceType]} Stats →
        </a>
      </div>

      {/* Stats Grid */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
        <StatCard
          label="Export volume"
          value={`${fmt(arc.volume)} ${VOLUME_UNIT[arc.resourceType]}`}
        />
        <StatCard
          label="Export value"
          value={`A$${fmt(arc.exportValueAUD)}M`}
        />
        <StatCard
          label="Cost basis range"
          value={costRange}
          sub="Estimated from company annual reports"
        />
        <StatCard
          label="Royalties paid"
          value={`A$${fmt(arc.royaltiesAUD)}M`}
        />
        <StatCard
          label="Corporate tax paid"
          value={`A$${fmt(arc.corporateTaxAUD)}M`}
        />
      </div>
    </div>
  );
}
