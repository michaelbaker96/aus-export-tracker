import Link from 'next/link';
import { RESOURCE_COLORS } from '@/lib/resource-config';

const RESOURCES = [
  { label: 'LNG', key: 'lng', href: '/resources/lng' },
  { label: 'Iron Ore', key: 'iron-ore', href: '/resources/iron-ore' },
  { label: 'Coal', key: 'coal', href: '/resources/coal' },
];

export default function MapLegend() {
  return (
    <div className="absolute bottom-8 left-4 bg-surface-container border border-outline/20 rounded-lg p-3 px-4 flex flex-col gap-2.5 z-10">
      <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-0.5">
        Resources
      </div>
      {RESOURCES.map(({ label, key, href }) => {
        const color = RESOURCE_COLORS[key];
        return (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-2 no-underline font-body text-sm font-medium text-on-surface hover:text-primary transition-colors"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
            />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
