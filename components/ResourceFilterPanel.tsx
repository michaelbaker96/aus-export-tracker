'use client';

export interface ResourceEntry {
  resourceType: string;
  displayName: string;
  color: string;
  active: boolean;
}

interface Props {
  resources: ResourceEntry[];
  onToggle: (resourceType: string) => void;
}

export default function ResourceFilterPanel({ resources, onToggle }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        background: 'rgba(8, 12, 20, 0.82)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '12px 16px',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 10,
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
        Filter
      </div>
      {resources.map(({ resourceType, displayName, color, active }) => (
        <button
          key={resourceType}
          onClick={() => onToggle(resourceType)}
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
          }}
          aria-pressed={active}
          aria-label={`${active ? 'Hide' : 'Show'} ${displayName}`}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: active ? color : 'rgba(255,255,255,0.15)',
              flexShrink: 0,
              boxShadow: active ? `0 0 6px ${color}88` : 'none',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
          />
          {displayName}
        </button>
      ))}
    </div>
  );
}
