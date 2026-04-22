import { SquircleTile } from '../primitives/SquircleTile';
import { semantic } from '../tokens/colors';
import { cn } from '../utils/cn';

export type HeatmapCell = {
  row: number;
  col: number;
  /** A bucket index 0..6 into data.grid (higher = deeper blue) or -1 for an explicit lime highlight. */
  bucket: number;
};

export interface HeatmapProps {
  rows: number;
  cols: number;
  cells: HeatmapCell[];
  xLabels?: string[];
  yLabels?: { label: string; chip?: string; chipColor?: string }[];
  tileSize?: number;
  n?: number;
  gap?: number;
  className?: string;
}

function colorForBucket(bucket: number): string {
  if (bucket < 0) return semantic.data.lime;
  const grid = semantic.data.grid;
  const clamped = Math.max(0, Math.min(grid.length - 1, bucket));
  return grid[clamped];
}

export function Heatmap({
  rows,
  cols,
  cells,
  xLabels,
  yLabels,
  tileSize = 34,
  n = 5,
  gap = 6,
  className,
}: HeatmapProps) {
  const grid: (number | undefined)[][] = Array.from({ length: rows }, () => Array(cols).fill(undefined));
  for (const c of cells) {
    if (c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols) {
      grid[c.row][c.col] = c.bucket;
    }
  }

  const labelColW = yLabels ? 40 : 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex">
        {yLabels && (
          <div className="flex flex-col" style={{ gap, width: labelColW }}>
            {yLabels.map((y, i) => (
              <div key={i} className="flex items-center gap-1.5" style={{ height: tileSize }}>
                {y.chip && (
                  <span
                    className="inline-flex h-4 w-6 items-center justify-center rounded-[4px] text-[9px] font-semibold text-white leading-none"
                    style={{ background: y.chipColor ?? semantic.data.blue }}
                  >
                    {y.chip}
                  </span>
                )}
                <span className="text-[10px] text-muted">{y.label}</span>
              </div>
            ))}
          </div>
        )}
        <div
          className="grid flex-1"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${tileSize}px)`,
            gap,
            justifyContent: 'space-between',
          }}
        >
          {Array.from({ length: rows * cols }).map((_, idx) => {
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const bucket = grid[r][c];
            const fill = bucket === undefined ? '#F3F4F6' : colorForBucket(bucket);
            return <SquircleTile key={idx} size={tileSize} n={n} fill={fill} />;
          })}
        </div>
      </div>
      {xLabels && (
        <div
          className="mt-2 grid"
          style={{
            gridTemplateColumns: `${labelColW}px 1fr`,
          }}
        >
          <div />
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${tileSize}px)`,
              gap,
              justifyContent: 'space-between',
            }}
          >
            {xLabels.map((l, i) => (
              <div key={i} className="text-center text-[10px] text-muted">
                {l}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
