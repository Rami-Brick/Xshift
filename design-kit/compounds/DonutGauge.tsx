import { useMemo } from 'react';

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

export interface DonutGaugeProps {
  segments: DonutSegment[];
  centerValue: string | number;
  centerLabel?: string;
  size?: number;
  strokeWidth?: number;
  /** Start angle in degrees, 0 = right, 90 = top (SVG convention: negative is counter-clockwise). */
  startAngle?: number;
  endAngle?: number;
  gapDegrees?: number;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, endDeg);
  const end = polar(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/**
 * A 3/4-arc donut gauge with rounded caps and gaps.
 * startAngle = -210 (begins at lower-left), endAngle = 30 (ends at lower-right),
 * sweeping clockwise through the top. Total sweep = 240°.
 */
export function DonutGauge({
  segments,
  centerValue,
  centerLabel,
  size = 220,
  strokeWidth = 28,
  startAngle = -210,
  endAngle = 30,
  gapDegrees = 4,
}: DonutGaugeProps) {
  const { tracks, totalSweep, radius, cx, cy } = useMemo(() => {
    const sweep = endAngle - startAngle;
    const r = (size - strokeWidth) / 2;
    const center = size / 2;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    const gapTotal = gapDegrees * (segments.length - 1);
    const drawable = Math.max(0, sweep - gapTotal);
    let cursor = startAngle;
    const built = segments.map((seg) => {
      const arcSize = total > 0 ? (seg.value / total) * drawable : 0;
      const a0 = cursor;
      const a1 = cursor + arcSize;
      cursor = a1 + gapDegrees;
      return { ...seg, a0, a1 };
    });
    return { tracks: built, totalSweep: sweep, radius: r, cx: center, cy: center };
  }, [segments, size, strokeWidth, startAngle, endAngle, gapDegrees]);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track (very subtle) */}
        <path
          d={arcPath(cx, cy, radius, startAngle, endAngle)}
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          opacity={totalSweep > 0 ? 0 : 0}
        />
        {tracks.map((t) => (
          <path
            key={t.name}
            d={arcPath(cx, cy, radius, t.a0, t.a1)}
            stroke={t.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-displayLg font-bold text-ink tabular-nums tracking-tight">{centerValue}</span>
        {centerLabel && <span className="mt-1 text-small text-muted">{centerLabel}</span>}
      </div>
    </div>
  );
}
