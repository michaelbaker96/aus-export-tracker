'use client';

export interface CountryEntry {
  name: string;
  active: boolean;
}

interface Props {
  countries: CountryEntry[];
  onToggle: (country: string) => void;
}

export default function CountryFilterPanel({ countries, onToggle }: Props) {
  return (
    <div className="glass-panel rounded-lg flex flex-col gap-2.5 p-3 px-4 min-w-[140px]">
      <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-0.5">
        Countries
      </div>
      <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto">
        {countries.map(({ name, active }) => (
          <button
            key={name}
            onClick={() => onToggle(name)}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 font-body text-sm font-medium text-left transition-colors shrink-0"
            style={{
              color: active ? 'var(--color-on-surface)' : 'rgba(226, 229, 235, 0.3)',
            }}
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
    </div>
  );
}
