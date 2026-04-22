import { useMemo } from 'react';
import { squirclePath } from '../utils/squircle';

export interface SquircleTileProps {
  size?: number;
  fill: string;
  /** Superellipse exponent — n=5 matches the heatmap feel (softer than iOS n=4) */
  n?: number;
  title?: string;
  className?: string;
}

export function SquircleTile({ size = 42, fill, n = 5, title, className }: SquircleTileProps) {
  const d = useMemo(() => squirclePath(size, n), [size, n]);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
    >
      <path d={d} fill={fill} />
    </svg>
  );
}
