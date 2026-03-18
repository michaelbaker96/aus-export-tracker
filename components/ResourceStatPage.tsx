'use client';

import { useState, useMemo } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { ResourceData } from '@/types';

const COUNTRY_COLORS = ['#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#84cc16'];

function fmt(n: number): string {
  return n.toLocaleString('en-AU');
}

// "PJ (petajoules)" → "PJ"   |   "million tonnes (Mt)" → "Mt"
function shortUnit(unitStr: string): string {
  const match = unitStr.match(/\(([^)]+)\)/);
  if (match && match[1].length <= 5 && !match[1].includes(' ')) return match[1];
  return unitStr.split(' ')[0];
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      {sub && (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

interface SankeyNode {
  name: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface SankeyLink {
  source: string | SankeyNode;
  target: string | SankeyNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
}

function SankeyDiagram({
  data,
  rangeYears,
  accent,
}: {
  data: ResourceData;
  rangeYears: number;
  accent: string;
}) {
  const W = 760;
  const H = 320;
  const PAD_LEFT = 90;
  const PAD_RIGHT = 120;

  const graph = useMemo(() => {
    const sortedYears = [...data.years].sort((a, b) => b.year - a.year);
    const selected = new Set(sortedYears.slice(0, rangeYears).map((y) => y.year));

    const countryVol: Record<string, number> = {};
    for (const yr of data.years) {
      if (!selected.has(yr.year)) continue;
      for (const d of yr.destinations) {
        countryVol[d.country] = (countryVol[d.country] ?? 0) + d.volume;
      }
    }

    const countries = Object.keys(countryVol).sort((a, b) => countryVol[b] - countryVol[a]);
    const nodes: SankeyNode[] = [{ name: 'Australia' }, ...countries.map((c) => ({ name: c }))];
    const links: SankeyLink[] = countries.map((c) => ({
      source: 'Australia',
      target: c,
      value: countryVol[c],
    }));

    const gen = sankey<SankeyNode, SankeyLink>()
      .nodeId((d) => d.name)
      .nodeWidth(18)
      .nodePadding(16)
      .extent([
        [PAD_LEFT, 8],
        [W - PAD_RIGHT, H - 8],
      ]);

    return {
      ...gen({ nodes: nodes.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) }),
      countries,
    };
  }, [data, rangeYears]);

  const linkPath = sankeyLinkHorizontal<SankeyNode, SankeyLink>();

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      aria-label={`Sankey diagram of ${data.displayName} export flows`}
    >
      {graph.links.map((link, i) => {
        const d = linkPath(link as Parameters<typeof linkPath>[0]);
        const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
        return (
          <path
            key={i}
            d={d ?? ''}
            fill="none"
            stroke={color}
            strokeOpacity={0.35}
            strokeWidth={Math.max(1, link.width ?? 0)}
          />
        );
      })}

      {graph.nodes.map((node) => {
        const x0 = node.x0 ?? 0;
        const x1 = node.x1 ?? 0;
        const y0 = node.y0 ?? 0;
        const y1 = node.y1 ?? 0;
        const midY = (y0 + y1) / 2;
        const isAustralia = node.name === 'Australia';
        const countryIndex = graph.countries.indexOf(node.name);
        const color = isAustralia ? accent : COUNTRY_COLORS[countryIndex % COUNTRY_COLORS.length];

        return (
          <g key={node.name}>
            <rect x={x0} y={y0} width={x1 - x0} height={Math.max(1, y1 - y0)} fill={color} rx={3} />
            <text
              x={isAustralia ? x0 - 8 : x1 + 8}
              y={midY}
              dy="0.35em"
              textAnchor={isAustralia ? 'end' : 'start'}
              fill="rgba(255,255,255,0.75)"
              fontSize={11}
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            >
              {node.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ResourceStatPage({
  data,
  accent,
}: {
  data: ResourceData;
  accent: string;
}) {
  const maxYears = data.years.length;
  const [rangeYears, setRangeYears] = useState(Math.min(5, maxYears));

  const sortedYears = useMemo(
    () => [...data.years].sort((a, b) => b.year - a.year),
    [data.years],
  );
  const selectedSlice = sortedYears.slice(0, rangeYears);
  const minYear = Math.min(...selectedSlice.map((y) => y.year));
  const maxYear = Math.max(...selectedSlice.map((y) => y.year));
  const yearLabel = rangeYears === 1 ? `${maxYear}` : `${minYear}–${maxYear}`;
  const unit = shortUnit(data.units.volume);

  const kpis = useMemo(() => {
    const selected = new Set(selectedSlice.map((y) => y.year));
    let vol = 0, val = 0, royalties = 0, tax = 0;
    for (const yr of data.years) {
      if (!selected.has(yr.year)) continue;
      vol += yr.totalVolume;
      val += yr.totalValue;
      royalties += yr.totalRoyalties;
      tax += yr.totalCorporateTax;
    }
    return { vol, val, royalties, tax };
  }, [data.years, selectedSlice]);

  const lastUpdated = new Date(data.lastUpdated).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: '#080c14',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Back link */}
        <a
          href="/"
          style={{
            color: accent,
            textDecoration: 'none',
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 36,
            opacity: 0.7,
          }}
        >
          ← Back to map
        </a>

        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: accent,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: accent,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Australia
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, lineHeight: 1.1 }}>
            {data.displayName} Exports
          </h1>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
            Annual export volumes, revenue, royalties, and corporate tax by destination country
          </p>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Time range selector */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '18px 24px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 4,
              }}
            >
              Time range
            </div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {rangeYears} year{rangeYears > 1 ? 's' : ''}{' '}
              <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: 14 }}>
                ({yearLabel})
              </span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <input
              type="range"
              min={1}
              max={maxYears}
              value={rangeYears}
              onChange={(e) => setRangeYears(Number(e.target.value))}
              style={{ width: '100%', accentColor: accent, cursor: 'pointer' }}
              aria-label="Select number of years"
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'rgba(255,255,255,0.25)',
                fontSize: 11,
                marginTop: 2,
              }}
            >
              <span>1 yr</span>
              <span>{maxYears} yr</span>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 16,
            marginBottom: 40,
          }}
        >
          <KpiCard
            label="Total export volume"
            value={`${fmt(Math.round(kpis.vol))} ${unit}`}
            sub={data.units.volume}
            accent={accent}
          />
          <KpiCard
            label="Total export value"
            value={`A$${fmt(kpis.val)}M`}
            sub="AUD millions"
            accent={accent}
          />
          <KpiCard
            label="Royalties received"
            value={`A$${fmt(kpis.royalties)}M`}
            sub="AUD millions"
            accent={accent}
          />
          <KpiCard
            label="Corporate tax paid"
            value={`A$${fmt(kpis.tax)}M`}
            sub="Estimated — AUD millions"
            accent={accent}
          />
        </div>

        {/* Sankey diagram */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '24px',
            marginBottom: 40,
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
            Export flow by destination
          </h2>
          <p style={{ margin: '0 0 28px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            Total volume ({unit}) from Australia to each destination, {yearLabel}
          </p>
          <SankeyDiagram data={data} rangeYears={rangeYears} accent={accent} />
        </div>

        {/* Data sources */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
          <div
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 10,
            }}
          >
            Data sources
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            {data.sources.map((s, i) => (
              <li key={i} style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>
                · {s}
              </li>
            ))}
          </ul>
          <p style={{ margin: '14px 0 0', color: 'rgba(255,255,255,0.22)', fontSize: 11 }}>
            Cost basis figures are estimated from company annual reports. Corporate tax data is
            estimated. All monetary values in AUD millions.
          </p>
        </div>
      </div>
    </div>
  );
}
