/*
 * GlobeHud — the instrumentation overlay that frames the rotating planet.
 * Purely presentational and non-interactive (pointer-events: none) so it never
 * intercepts a drag on the globe beneath it.
 */
'use client';

interface GlobeHudProps {
  longitude: number;
  latitude: number;
  autoRotate: boolean;
  arcCount: number;
}

function formatCoord(value: number, posTag: string, negTag: string): string {
  const tag = value >= 0 ? posTag : negTag;
  return `${Math.abs(value).toFixed(2).padStart(6, '0')}° ${tag}`;
}

const BRACKET = 'absolute w-9 h-9 border-[var(--color-hud-dim)] pointer-events-none';

export default function GlobeHud({
  longitude,
  latitude,
  autoRotate,
  arcCount,
}: GlobeHudProps) {
  const statusColor = autoRotate ? 'var(--color-hud)' : 'var(--color-hud-warn)';

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none select-none"
      style={{
        fontFamily: 'var(--font-telemetry)',
        animation: 'hud-fade-in 1.2s ease-out both',
      }}
    >
      {/* Corner reticle brackets */}
      <span className={`${BRACKET} top-3 left-3 border-t border-l`} />
      <span className={`${BRACKET} top-3 right-3 border-t border-r`} />
      <span className={`${BRACKET} bottom-3 left-3 border-b border-l`} />
      <span className={`${BRACKET} bottom-3 right-3 border-b border-r`} />

      {/* Slow vertical scan sweep */}
      <div
        className="absolute inset-x-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--color-hud) 50%, transparent)',
          animation: 'hud-scan 9s linear infinite',
        }}
      />

      {/* Top-left: feed identity */}
      <div className="absolute top-6 left-7 flex flex-col gap-1">
        <div
          className="text-[10px] tracking-[0.2em] uppercase leading-none"
          style={{ color: 'var(--color-hud)' }}
        >
          Export Telemetry
        </div>
        <div
          className="text-[9px] tracking-[0.16em] uppercase leading-none"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Orbital feed // live
        </div>
      </div>

      {/* Top-right: rotation status lamp */}
      <div className="absolute top-[22px] right-7 flex items-center gap-2">
        <span
          className="text-[9px] tracking-[0.16em] uppercase leading-none"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Rot
        </span>
        <span
          className="text-[10px] tracking-[0.16em] uppercase tabular-nums leading-none"
          style={{ color: statusColor }}
        >
          {autoRotate ? 'AUTO' : 'MANUAL'}
        </span>
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{
            background: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
            animation: 'hud-blink 2.4s steps(1) infinite',
          }}
        />
      </div>

      {/* Bottom-right: live sub-point coordinates */}
      <div className="absolute bottom-7 right-7 flex flex-col items-end gap-1.5">
        <div
          className="text-[10px] tracking-[0.22em] uppercase leading-none"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Sub-point
        </div>
        <div
          className="text-[15px] tabular-nums tracking-[0.06em] leading-none"
          style={{ color: 'var(--color-hud)' }}
        >
          {formatCoord(latitude, 'N', 'S')}
        </div>
        <div
          className="text-[15px] tabular-nums tracking-[0.06em] leading-none"
          style={{ color: 'var(--color-hud)' }}
        >
          {formatCoord(longitude, 'E', 'W')}
        </div>
        <div
          className="mt-1 text-[10px] tracking-[0.16em] uppercase tabular-nums leading-none"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          {arcCount} active routes
        </div>
      </div>

      {/* Centre crosshair tick */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ color: 'var(--color-hud-dim)' }}
      >
        <span className="absolute -left-3 top-1/2 w-2 h-px -translate-y-1/2 bg-current" />
        <span className="absolute -right-3 top-1/2 w-2 h-px -translate-y-1/2 bg-current" />
        <span className="absolute -top-3 left-1/2 h-2 w-px -translate-x-1/2 bg-current" />
        <span className="absolute -bottom-3 left-1/2 h-2 w-px -translate-x-1/2 bg-current" />
      </div>
    </div>
  );
}
