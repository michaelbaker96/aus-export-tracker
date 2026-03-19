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
    <div data-no-dismiss className="absolute top-0 left-0 right-0 z-[150] bg-surface/90 backdrop-blur-xl flex items-center gap-4 px-5 py-2.5">
      <div className="font-body text-on-surface-variant text-[10px] uppercase tracking-widest shrink-0">
        Year range
      </div>

      <div className="relative flex-1 h-5 flex items-center">
        {/* Track background */}
        <div className="absolute left-0 right-0 h-[3px] rounded-sm bg-on-surface/10 pointer-events-none" />
        {/* Active range fill */}
        <div
          className="absolute h-[3px] rounded-sm bg-on-surface/45 pointer-events-none"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
        />

        {/* Start handle */}
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

        {/* End handle */}
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

      <div className="font-body font-semibold text-on-surface text-sm shrink-0 min-w-[90px] text-right">
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
          background: #00daf3;
          border: 2px solid rgba(0, 218, 243, 0.5);
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
          background: #00daf3;
          border: 2px solid rgba(0, 218, 243, 0.5);
          cursor: grab;
          box-shadow: 0 1px 6px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}
