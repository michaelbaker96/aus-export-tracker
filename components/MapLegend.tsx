import Link from 'next/link';

const RESOURCES = [
  { label: 'LNG', color: '#00bfff', href: '/resources/lng' },
  { label: 'Iron Ore', color: '#ff8c00', href: '/resources/iron-ore' },
  { label: 'Coal', color: '#f59e0b', href: '/resources/coal' },
];

export default function MapLegend() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: 16,
        background: 'rgba(8, 12, 20, 0.82)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '12px 16px',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 10,
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
        Resources
      </div>
      {RESOURCES.map(({ label, color, href }) => (
        <Link
          key={label}
          href={href}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.75)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
              boxShadow: `0 0 6px ${color}88`,
            }}
          />
          {label}
        </Link>
      ))}
    </div>
  );
}
