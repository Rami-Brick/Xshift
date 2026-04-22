import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { formatDelta } from '../utils/formatters';

type Variant = 'trendUp' | 'trendDown' | 'neutral' | 'lime' | 'dark' | 'brand';

export interface ChipProps {
  variant?: Variant;
  /** For trend variants, the percentage delta (will be auto-prefixed with +/−) */
  delta?: number;
  children?: ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  trendUp: 'bg-trend-up text-white',
  trendDown: 'bg-trend-down text-white',
  neutral: 'bg-soft text-ink',
  lime: 'bg-data-lime text-ink',
  dark: 'bg-navDark text-white',
  brand: 'bg-brand text-white',
};

export function Chip({ variant = 'neutral', delta, children, className }: ChipProps) {
  const content =
    typeof delta === 'number' ? formatDelta(delta) : children;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2 py-0.5 text-caption font-semibold leading-none h-6',
        variantClasses[variant],
        className
      )}
    >
      {content}
    </span>
  );
}
