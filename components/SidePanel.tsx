'use client';

import { useEffect, useRef } from 'react';
import type { ArcData } from '@/types';
import { RESOURCE_COLORS } from '@/lib/resource-config';

interface SidePanelProps {
  arc: ArcData;
  yearLabel: string;
  onClose: () => void;
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

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between items-start py-2.5 gap-3">
      <div>
        <div className="font-body text-on-surface-variant text-xs">{label}</div>
        {sub && (
          <div className="font-body text-on-surface-variant/40 text-[11px] mt-0.5">{sub}</div>
        )}
      </div>
      <div className="font-body font-semibold text-on-surface text-sm text-right shrink-0">
        {value}
      </div>
    </div>
  );
}

export default function SidePanel({ arc, yearLabel, onClose }: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const accent = RESOURCE_COLORS[arc.resourceType] ?? '#e2e5eb';

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Element;
      if (target.closest('[data-no-dismiss]')) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const costRange = `A$${fmt(arc.costBasisMinAUD)}M – A$${fmt(arc.costBasisMaxAUD)}M`;

  return (
    <div
      ref={panelRef}
      className="fixed top-0 right-0 bottom-0 z-[200] w-80 bg-surface-container/95 backdrop-blur-xl flex flex-col shadow-[-8px_0_40px_rgba(0,0,0,0.4)]"
      style={{ animation: 'slideInRight 0.25s cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: accent }}
            />
            <span
              className="font-headline font-bold uppercase tracking-widest text-[13px]"
              style={{ color: accent }}
            >
              {LABELS[arc.resourceType] ?? arc.resourceType}
            </span>
          </div>
          <div className="font-headline text-xl font-bold text-on-surface leading-tight">
            → {arc.destinationCountry}
          </div>
          <div className="font-body text-on-surface-variant/60 text-xs mt-1">{yearLabel}</div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 bg-transparent outline outline-1 outline-outline-variant/15 rounded-lg text-on-surface-variant cursor-pointer text-base leading-none px-2 py-1 hover:text-on-surface transition-colors"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 overflow-y-auto">
        <Row
          label="Export volume"
          value={`${fmt(arc.volume)} ${VOLUME_UNIT[arc.resourceType]}`}
        />
        <Row
          label="Export value"
          value={`A$${fmt(arc.exportValueAUD)}M`}
        />
        <Row
          label="Cost basis range"
          value={costRange}
          sub="Estimated — sourced from company annual reports"
        />
        <Row
          label="Royalties paid"
          value={`A$${fmt(arc.royaltiesAUD)}M`}
        />
        <Row
          label="Corporate tax paid"
          value={`A$${fmt(arc.corporateTaxAUD)}M`}
        />
      </div>

      {/* Footer */}
      <div className="px-5 py-4">
        <a
          href={STAT_PAGE[arc.resourceType] ?? '#'}
          className="block text-center py-2.5 rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold text-[13px] no-underline transition-opacity hover:opacity-90"
        >
          View full {LABELS[arc.resourceType]} statistics →
        </a>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
