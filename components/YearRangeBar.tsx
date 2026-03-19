'use client';

interface YearRangeBarProps {
  minYear: number;
  maxYear: number;
  startYear: number;
  endYear: number;
  onRangeChange: (start: number, end: number) => void;
}

export default function YearRangeBar({
  minYear,
  maxYear,
  startYear,
  endYear,
  onRangeChange,
}: YearRangeBarProps) {
  const label = startYear === endYear ? `${startYear}` : `${startYear} – ${endYear}`;
  const range = maxYear - minYear;
  const startPct = range === 0 ? 0 : ((startYear - minYear) / range) * 100;
  const endPct = range === 0 ? 100 : ((endYear - minYear) / range) * 100;

  function handleStart(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Math.min(Number(e.target.value), endYear);
    onRangeChange(value, endYear);
  }

  function handleEnd(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Math.max(Number(e.target.value), startYear);
    onRangeChange(startYear, value);
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 150,
        background: 'rgba(8, 12, 20, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          flexShrink: 0,
        }}
      >
        Year range
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          height: 20,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 3,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.1)',
            pointerEvents: 'none',
          }}
        />
        {/* Active range fill */}
        <div
          style={{
            position: 'absolute',
            left: `${startPct}%`,
            right: `${100 - endPct}%`,
            height: 3,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.45)',
            pointerEvents: 'none',
          }}
        />

        {/* Start handle — raise z-index when at max so it stays draggable */}
        <input
          className="year-range-thumb"
          type="range"
          min={minYear}
          max={maxYear}
          value={startYear}
          onChange={handleStart}
          aria-label="Start year"
          style={{
            position: 'absolute',
            width: '100%',
            background: 'transparent',
            zIndex: startYear === maxYear ? 5 : 4,
          }}
        />

        {/* End handle — raise z-index when at min so it stays draggable */}
        <input
          className="year-range-thumb"
          type="range"
          min={minYear}
          max={maxYear}
          value={endYear}
          onChange={handleEnd}
          aria-label="End year"
          style={{
            position: 'absolute',
            width: '100%',
            background: 'transparent',
            zIndex: endYear === minYear ? 5 : 4,
          }}
        />
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.85)',
          flexShrink: 0,
          minWidth: 90,
          textAlign: 'right',
        }}
      >
        {label}
      </div>

      <style>{`
        input.year-range-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 20px;
          pointer-events: none;
          position: absolute;
          width: 100%;
        }
        input.year-range-thumb::-webkit-slider-runnable-track {
          background: transparent;
          height: 3px;
        }
        input.year-range-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          pointer-events: all;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid rgba(255,255,255,0.5);
          cursor: grab;
          box-shadow: 0 1px 6px rgba(0,0,0,0.5);
          margin-top: -7px;
        }
        input.year-range-thumb:active::-webkit-slider-thumb {
          cursor: grabbing;
        }
        input.year-range-thumb::-moz-range-track {
          background: transparent;
          height: 3px;
        }
        input.year-range-thumb::-moz-range-thumb {
          pointer-events: all;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid rgba(255,255,255,0.5);
          cursor: grab;
          box-shadow: 0 1px 6px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}
