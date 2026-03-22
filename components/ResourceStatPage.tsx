'use client';

import { useState, useMemo } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import * as d3 from 'd3';
import type { ResourceData } from '@/types';

const COUNTRY_COLORS = ['#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#84cc16'];

function fmt(n: number): string {
  return n.toLocaleString('en-AU');
}

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
    <div className="bg-surface-container-high rounded-lg p-5 px-6">
      <div className="font-body text-on-surface-variant/60 text-[11px] uppercase tracking-wider mb-2.5">
        {label}
      </div>
      <div className="text-[26px] font-bold leading-none" style={{ color: accent }}>{value}</div>
      {sub && (
        <div className="font-body text-on-surface-variant/40 text-[11px] mt-1.5">{sub}</div>
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
              fill="rgba(226, 229, 235, 0.75)"
              fontSize={11}
              fontFamily="'Inter', sans-serif"
            >
              {node.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendChart({
  data,
  unit,
}: {
  data: ResourceData;
  unit: string;
}) {
  const W = 760;
  const H = 280;
  const MARGIN = { top: 20, right: 120, bottom: 30, left: 60 };
  const INNER_W = W - MARGIN.left - MARGIN.right;
  const INNER_H = H - MARGIN.top - MARGIN.bottom;

  const [hovered, setHovered] = useState<{
    country: string;
    year: number;
    value: number;
    x: number;
    y: number;
    color: string;
  } | null>(null);

  const { chartData, countries } = useMemo(() => {
    // 1. Identify top 5 countries by total volume
    const countryTotals: Record<string, number> = {};
    for (const yr of data.years) {
      for (const d of yr.destinations) {
        countryTotals[d.country] = (countryTotals[d.country] ?? 0) + d.volume;
      }
    }
    const topCountries = Object.entries(countryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // 2. Format time-series data
    const sortedYears = [...data.years].sort((a, b) => a.year - b.year);
    const series = sortedYears.map(yr => ({
      year: yr.year,
      values: Object.fromEntries(
        topCountries.map(c => [
          c, 
          yr.destinations.find(d => d.country === c)?.volume ?? 0
        ])
      )
    }));

    return { chartData: series, countries: topCountries };
  }, [data.years]);

  if (chartData.length === 0) return null;

  const xScale = d3.scaleLinear()
    .domain(d3.extent(chartData, d => d.year) as [number, number])
    .range([0, INNER_W]);

  const maxY = d3.max(chartData, d => d3.max(Object.values(d.values))) ?? 0;
  const yScale = d3.scaleLinear()
    .domain([0, maxY * 1.1]) // +10% headroom
    .range([INNER_H, 0]);

  const lineGen = d3.line<{ year: number; value: number }>()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Grid lines */}
          {yScale.ticks(5).map((tick, i) => (
            <g key={i} transform={`translate(0, ${yScale(tick)})`}>
              <line x2={INNER_W} stroke="rgba(226, 229, 235, 0.05)" />
              <text
                x="-10"
                dy="0.32em"
                textAnchor="end"
                fill="rgba(226, 229, 235, 0.4)"
                fontSize="10"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* X Axis ticks */}
          {xScale.ticks(chartData.length).map((tick, i) => (
            <g key={i} transform={`translate(${xScale(tick)}, ${INNER_H})`}>
              <text
                y="20"
                textAnchor="middle"
                fill="rgba(226, 229, 235, 0.4)"
                fontSize="10"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* Lines */}
          {countries.map((country, i) => {
            const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
            const countryData = chartData.map(d => ({ year: d.year, value: d.values[country] }));
            return (
              <path
                key={country}
                d={lineGen(countryData) ?? ''}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeOpacity={hovered && hovered.country !== country ? "0.2" : "0.8"}
                className="transition-opacity duration-200"
              />
            );
          })}

          {/* Points (Interaction Area) */}
          {countries.map((country, i) => {
            const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
            return chartData.map(d => {
              const x = xScale(d.year);
              const y = yScale(d.values[country]);
              const isHovered = hovered?.country === country && hovered?.year === d.year;
              const isDimmed = hovered && hovered.country !== country;

              return (
                <g key={`${country}-${d.year}`} style={{ cursor: 'pointer' }}>
                  {/* Visual Circle (Always Visible) */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5 : 3}
                    fill={color}
                    stroke={isHovered ? "white" : "none"}
                    strokeWidth="1.5"
                    style={{ 
                      opacity: isDimmed ? 0.2 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  />
                  {/* Invisible Hit Area (Larger for easier hovering) */}
                  <circle
                    cx={x}
                    cy={y}
                    r={10}
                    fill="transparent"
                    onMouseEnter={() => setHovered({
                      country,
                      year: d.year,
                      value: d.values[country],
                      x: x + MARGIN.left,
                      y: y + MARGIN.top,
                      color
                    })}
                    onMouseLeave={() => setHovered(null)}
                  />
                </g>
              );
            });
          })}

          {/* Legend */}
          {countries.map((country, i) => {
            const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
            const lastPoint = chartData[chartData.length - 1];
            const yPos = yScale(lastPoint.values[country]);
            return (
              <g 
                key={country} 
                transform={`translate(${INNER_W + 10}, ${yPos})`}
                className="transition-opacity duration-200"
                style={{ opacity: hovered && hovered.country !== country ? 0.3 : 1 }}
              >
                <circle r="3" fill={color} />
                <text
                  x="8"
                  dy="0.32em"
                  fill="rgba(226, 229, 235, 0.7)"
                  fontSize="10"
                  fontWeight="500"
                >
                  {country}
                </text>
              </g>
            );
          })}

          {/* Y Axis Label */}
          <text
            transform="rotate(-90)"
            y="-45"
            x={-INNER_H / 2}
            textAnchor="middle"
            fill="rgba(226, 229, 235, 0.3)"
            fontSize="10"
            letterSpacing="0.05em"
            className="uppercase"
          >
            Volume ({unit})
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute pointer-events-none bg-surface-container-high/95 backdrop-blur-md border border-white/10 rounded px-3 py-2 shadow-xl z-50 transition-all duration-150"
          style={{
            left: hovered.x,
            top: hovered.y,
            transform: `translate(-50%, -120%)`
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: hovered.color }} />
            <span className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider">
              {hovered.country}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-4">
            <span className="font-body text-[11px] text-on-surface-variant/60">{hovered.year}</span>
            <span className="font-body font-bold text-sm text-on-surface">
              {fmt(hovered.value)} {unit}
            </span>
          </div>
          {/* Arrow */}
          <div 
            className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-surface-container-high/95"
          />
        </div>
      )}
    </div>
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
    <div className="fixed inset-0 overflow-y-auto bg-surface text-on-surface font-body">
      <div className="max-w-[900px] mx-auto px-6 pt-10 pb-20">
        {/* Back link */}
        <a
          href="/"
          className="text-primary/70 font-body text-sm no-underline inline-flex items-center gap-1.5 mb-9 hover:text-primary transition-colors"
        >
          ← Back to map
        </a>

        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{ background: accent }}
            />
            <span
              className="font-headline font-bold text-xs tracking-widest uppercase"
              style={{ color: accent }}
            >
              Australia
            </span>
          </div>
          <h1 className="font-headline text-4xl font-extrabold text-on-surface m-0 leading-tight">
            {data.displayName} Exports
          </h1>
          <p className="font-body text-on-surface-variant text-[15px] mt-2 mb-0">
            Annual export volumes, revenue, royalties, and corporate tax by destination country
          </p>
          <p className="font-body text-on-surface-variant/40 text-xs mt-1.5 mb-0">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Time range selector */}
        <div className="bg-surface-container rounded-lg p-[18px_24px] mb-7 flex items-center gap-6 flex-wrap">
          <div className="shrink-0">
            <div className="font-body text-on-surface-variant/60 text-[11px] uppercase tracking-wider mb-1">
              Time range
            </div>
            <div className="font-bold text-lg text-on-surface">
              {rangeYears} year{rangeYears > 1 ? 's' : ''}{' '}
              <span className="text-on-surface-variant/40 font-normal text-sm">
                ({yearLabel})
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <input
              type="range"
              min={1}
              max={maxYears}
              value={rangeYears}
              onChange={(e) => setRangeYears(Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ accentColor: accent }}
              aria-label="Select number of years"
            />
            <div className="flex justify-between text-on-surface-variant/30 text-[11px] mt-0.5">
              <span>1 yr</span>
              <span>{maxYears} yr</span>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4 mb-10">
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
        <div className="bg-surface-container rounded-lg p-6 mb-10">
          <h2 className="font-headline text-lg font-bold text-on-surface m-0 mb-1">
            Export flow by destination
          </h2>
          <p className="font-body text-on-surface-variant/50 text-[13px] m-0 mb-7">
            Total volume ({unit}) from Australia to each destination, {yearLabel}
          </p>
          <SankeyDiagram data={data} rangeYears={rangeYears} accent={accent} />
        </div>

        {/* Historical Trend Chart */}
        <div className="bg-surface-container rounded-lg p-6 mb-10">
          <h2 className="font-headline text-lg font-bold text-on-surface m-0 mb-1">
            Historical Export Trends
          </h2>
          <p className="font-body text-on-surface-variant/50 text-[13px] m-0 mb-7">
            Annual export volume ({unit}) to top 5 destination countries over time
          </p>
          <TrendChart data={data} unit={unit} />
        </div>

        {/* Data sources */}
        <div className="pt-6 mt-6">
          <div className="font-body text-on-surface-variant/40 text-[11px] uppercase tracking-wider mb-2.5">
            Data sources
          </div>
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
            {data.sources.map((s, i) => (
              <li key={i} className="font-body text-on-surface-variant/50 text-xs">
                · {s}
              </li>
            ))}
          </ul>
          <p className="font-body text-on-surface-variant/30 text-[11px] mt-3.5 mb-0">
            Cost basis figures are estimated from company annual reports. Corporate tax data is
            estimated. All monetary values in AUD millions.
          </p>
        </div>
      </div>
    </div>
  );
}
