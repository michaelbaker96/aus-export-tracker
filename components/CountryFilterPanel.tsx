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
    <div
      style={{
        background: 'rgba(8, 12, 20, 0.82)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '12px 16px',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 140,
      }}
    >
      <div
        style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 2,
        }}
      >
        Countries
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: 220,
          overflowY: 'auto',
        }}
      >
        {countries.map(({ name, active }) => (
          <button
            key={name}
            onClick={() => onToggle(name)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)',
              fontSize: 13,
              fontWeight: 500,
              textAlign: 'left',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            aria-pressed={active}
            aria-label={`${active ? 'Hide' : 'Show'} ${name}`}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            />
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
