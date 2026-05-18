import Link from 'next/link';
import { RESOURCE_COLORS } from '@/lib/resource-config';

const RESOURCES = [
  { label: 'LNG', key: 'lng', href: '/resources/lng' },
  { label: 'Iron Ore', key: 'iron-ore', href: '/resources/iron-ore' },
  { label: 'Coal', key: 'coal', href: '/resources/coal' },
];

export default function MapLegend() {
  return (
    <div
      className="absolute bottom-7 left-7 z-30 flex flex-col gap-2 border border-[var(--color-hud-dim)] bg-surface/70 backdrop-blur-sm px-4 py-3"
      style={{ fontFamily: 'var(--font-telemetry)' }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.28em] pb-1.5 border-b border-[var(--color-hud-dim)]/60"
        style={{ color: 'var(--color-hud)' }}
      >
        Cargo channels
      </div>
      {RESOURCES.map(({ label, key, href }) => {
        const color = RESOURCE_COLORS[key];
        return (
          <Link
            key={label}
            href={href}
            className="group flex items-center gap-2.5 no-underline text-[12px] tracking-[0.14em] uppercase text-on-surface transition-colors hover:text-[var(--color-hud)]"
          >
            <span
              className="w-3 h-px shrink-0 transition-all group-hover:w-5"
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
            />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
