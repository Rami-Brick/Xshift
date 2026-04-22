import { cn } from '../utils/cn';

export interface SegmentedPercentBarSegment {
  pct: number;
  color: string;
  label?: string;
}

export interface SegmentedPercentBarProps {
  segments: SegmentedPercentBarSegment[];
  height?: number;
  /** Show the percentage labels floating above each segment. */
  showLabels?: boolean;
  className?: string;
}

export function SegmentedPercentBar({
  segments,
  height = 10,
  showLabels = true,
  className,
}: SegmentedPercentBarProps) {
  const total = segments.reduce((s, seg) => s + seg.pct, 0) || 1;
  const last = segments.length - 1;
  return (
    <div className={cn('w-full', className)}>
      {showLabels && (
        <div className="flex">
          {segments.map((seg, i) => (
            <div
              key={i}
              style={{ flex: `${seg.pct} 0 0%` }}
              className="text-small font-semibold text-ink leading-none"
            >
              {seg.label ?? `${Math.round((seg.pct / total) * 100)}%`}
            </div>
          ))}
        </div>
      )}
      <div className={cn('mt-2 flex w-full overflow-hidden', 'rounded-pill')}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              flex: `${seg.pct} 0 0%`,
              background: seg.color,
              height,
              borderTopLeftRadius: i === 0 ? 9999 : 0,
              borderBottomLeftRadius: i === 0 ? 9999 : 0,
              borderTopRightRadius: i === last ? 9999 : 0,
              borderBottomRightRadius: i === last ? 9999 : 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
