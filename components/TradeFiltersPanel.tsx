'use client';

import { useState } from 'react';

export interface ResourceEntry {
  resourceType: string;
  displayName: string;
  color: string;
  active: boolean;
  volume: number;
}

export interface CountryEntry {
  name: string;
  active: boolean;
}

interface Props {
  resources: ResourceEntry[];
  countries: CountryEntry[];
  onToggleResource: (resourceType: string) => void;
  onToggleCountry: (country: string) => void;
  onSelectAllResources: () => void;
  onDeselectAllResources: () => void;
  onSelectAllCountries: () => void;
  onDeselectAllCountries: () => void;
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${v.toFixed(0)}`;
}

export default function TradeFiltersPanel({
  resources,
  countries,
  onToggleResource,
  onToggleCountry,
  onSelectAllResources,
  onDeselectAllResources,
  onSelectAllCountries,
  onDeselectAllCountries,
}: Props) {
  const [search, setSearch] = useState('');

  const filteredCountries = search
    ? countries.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : countries;

  return (
    <div
      className="glass-panel rounded-lg flex flex-col p-3 px-4 w-[185px] max-h-[calc(100vh-80px)]"
      style={{ border: '1px solid rgba(226,229,235,0.07)' }}
    >
      {/* Header */}
      <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-3">
        Trade Filters
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search destinations..."
        className="w-full bg-surface-container-high rounded px-2.5 py-1.5 font-body text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none mb-3"
        style={{ border: '1px solid rgba(226,229,235,0.1)' }}
      />

      {/* Resource Type */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/60">
          Resource Type
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSelectAllResources}
            className="font-body text-[10px] bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-primary"
            style={{ color: 'rgba(226,229,235,0.35)' }}
          >
            All
          </button>
          <span style={{ color: 'rgba(226,229,235,0.2)' }} className="text-[10px]">·</span>
          <button
            onClick={onDeselectAllResources}
            className="font-body text-[10px] bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-primary"
            style={{ color: 'rgba(226,229,235,0.35)' }}
          >
            None
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-3">
        {resources.map(({ resourceType, displayName, color, active, volume }) => (
          <button
            key={resourceType}
            onClick={() => onToggleResource(resourceType)}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 font-body text-sm font-medium text-left transition-colors"
            style={{ color: active ? 'var(--color-on-surface)' : 'rgba(226, 229, 235, 0.3)' }}
            aria-pressed={active}
            aria-label={`${active ? 'Hide' : 'Show'} ${displayName}`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 transition-all"
              style={{
                background: active ? color : 'rgba(226, 229, 235, 0.15)',
                filter: active ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 2px ${color})` : 'none',
              }}
            />
            <span className="flex-1">{displayName}</span>
            <span
              className="font-body text-[11px] tabular-nums"
              style={{ color: active ? 'rgba(226,229,235,0.45)' : 'rgba(226,229,235,0.15)' }}
            >
              {formatVolume(volume)}
            </span>
          </button>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(226,229,235,0.08)' }} className="mb-3" />

      {/* Destinations */}
      <div className="flex items-center justify-between mb-2">
        <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/60">
          Destinations
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSelectAllCountries}
            className="font-body text-[10px] bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-primary"
            style={{ color: 'rgba(226,229,235,0.35)' }}
          >
            All
          </button>
          <span style={{ color: 'rgba(226,229,235,0.2)' }} className="text-[10px]">·</span>
          <button
            onClick={onDeselectAllCountries}
            className="font-body text-[10px] bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-primary"
            style={{ color: 'rgba(226,229,235,0.35)' }}
          >
            None
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 mb-3">
        {filteredCountries.map(({ name, active }) => (
          <button
            key={name}
            onClick={() => onToggleCountry(name)}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 font-body text-sm font-medium text-left transition-colors shrink-0"
            style={{ color: active ? 'var(--color-on-surface)' : 'rgba(226, 229, 235, 0.3)' }}
            aria-pressed={active}
            aria-label={`${active ? 'Hide' : 'Show'} ${name}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
              style={{
                background: active ? 'rgba(226, 229, 235, 0.4)' : 'rgba(226, 229, 235, 0.1)',
              }}
            />
            {name}
          </button>
        ))}
      </div>

      {/* Export Dataset */}
      <div style={{ borderTop: '1px solid rgba(226,229,235,0.08)' }} className="pt-3">
        <button className="flex items-center gap-1.5 font-body text-[11px] bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-primary"
          style={{ color: 'rgba(226,229,235,0.4)' }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v7M3.5 5.5L6 8l2.5-2.5M2 10.5h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export Dataset
        </button>
      </div>
    </div>
  );
}
