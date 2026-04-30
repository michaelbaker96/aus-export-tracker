/**
 * Ahoy! Ye've found the Trade Filters, the navigator's best friend.
 * Here ye can toggle the booty types and choose which far-off lands ye want to track.
 */
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
      data-no-dismiss
      className="bg-surface-container rounded-2xl border border-outline/20 flex flex-col p-6 h-full shadow-lg"
    >
      {/* Header */}
      <div className="font-headline text-lg font-bold text-on-surface mb-6">
        Trade Filters
      </div>

      {/* Resource Type */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/60">
          Resource Type
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectAllResources}
            className="font-body text-[10px] bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-primary text-on-surface-variant/40"
          >
            All
          </button>
          <span className="text-on-surface-variant/20 text-[10px]">·</span>
          <button
            onClick={onDeselectAllResources}
            className="font-body text-[10px] bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-primary text-on-surface-variant/40"
          >
            None
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 mb-8">
        {resources.map(({ resourceType, displayName, color, active, volume }) => (
          <button
            key={resourceType}
            onClick={() => onToggleResource(resourceType)}
            className="flex items-center gap-3 bg-transparent border-none cursor-pointer p-0 font-body text-sm font-medium text-left transition-colors"
            style={{ color: active ? 'var(--color-on-surface)' : 'rgba(226, 229, 235, 0.3)' }}
            aria-pressed={active}
            aria-label={`${active ? 'Hide' : 'Show'} ${displayName}`}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0 transition-all"
              style={{
                background: active ? color : 'rgba(226, 229, 235, 0.15)',
                boxShadow: active ? `0 0 10px ${color}66` : 'none',
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

      {/* Destinations */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/60">
          Destinations
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectAllCountries}
            className="font-body text-[10px] bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-primary text-on-surface-variant/40"
          >
            All
          </button>
          <span className="text-on-surface-variant/20 text-[10px]">·</span>
          <button
            onClick={onDeselectAllCountries}
            className="font-body text-[10px] bg-transparent border-none cursor-pointer p-0 transition-colors hover:text-primary text-on-surface-variant/40"
          >
            None
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search destinations..."
          className="w-full bg-surface-container-high rounded-xl px-4 py-2.5 font-body text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none border border-outline/10 focus:border-primary/30 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto flex-1 mb-6 pr-2 custom-scrollbar">
        {filteredCountries.map(({ name, active }) => (
          <button
            key={name}
            onClick={() => onToggleCountry(name)}
            className="flex items-center gap-3 bg-transparent border-none cursor-pointer p-0 font-body text-sm font-medium text-left transition-colors shrink-0"
            style={{ color: active ? 'var(--color-on-surface)' : 'rgba(226, 229, 235, 0.3)' }}
            aria-pressed={active}
            aria-label={`${active ? 'Hide' : 'Show'} ${name}`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 transition-colors"
              style={{
                background: active ? 'rgba(226, 229, 235, 0.4)' : 'rgba(226, 229, 235, 0.1)',
              }}
            />
            {name}
          </button>
        ))}
      </div>

      {/* Export Dataset */}
      <div className="pt-6 border-t border-outline/10">
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-highest font-body text-xs font-semibold text-on-surface transition-colors hover:bg-outline/10 border border-outline/10 cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v7M3.5 5.5L6 8l2.5-2.5M2 10.5h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export Full Dataset
        </button>
      </div>
    </div>
  );
}

