'use client';

import { useEffect, useRef } from 'react';
import type { ArcData } from '@/types';

interface SidePanelProps {
  arc: ArcData;
  onClose: () => void;
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

const STAT_PAGE: Record<string, string> = {
  lng: '/resources/lng',
  'iron-ore': '/resources/iron-ore',
};

function fmt(n: number) {
  return n.toLocaleString('en-AU');
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        gap: 12,
      }}
    >
      <div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{label}</div>
        {sub && (
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{sub}</div>
        )}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </div>
    </div>
  );
}

export default function SidePanel({ arc, onClose }: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const accent = ACCENT[arc.resourceType] ?? '#fff';

  // Close on click-outside
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  // Close on Escape
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
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        zIndex: 200,
        background: 'rgba(8, 12, 20, 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: accent,
                flexShrink: 0,
              }}
            />
            <span style={{ color: accent, fontWeight: 700, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {LABELS[arc.resourceType] ?? arc.resourceType}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
            → {arc.destinationCountry}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '4px 8px',
            flexShrink: 0,
          }}
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
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
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <a
          href={STAT_PAGE[arc.resourceType] ?? '#'}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '10px',
            borderRadius: 8,
            background: `${accent}18`,
            border: `1px solid ${accent}40`,
            color: accent,
            fontWeight: 600,
            fontSize: 13,
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
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
