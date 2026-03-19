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
    <div className="glass-panel rounded-lg flex flex-col gap-2.5 p-3 px-4 min-w-[140px]">
      <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-0.5">
        Filter
      </div>
      {resources.map(({ resourceType, displayName, color, active }) => (
        <button
          key={resourceType}
          onClick={() => onToggle(resourceType)}
          className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 font-body text-sm font-medium text-left transition-colors"
          style={{
            color: active ? 'var(--color-on-surface)' : 'rgba(226, 229, 235, 0.3)',
          }}
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
          {displayName}
        </button>
      ))}
    </div>
  );
}
