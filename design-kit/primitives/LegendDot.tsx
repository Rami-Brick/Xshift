import { cn } from '../utils/cn';

export interface LegendDotProps {
  color: string;
  label: string;
  value?: string;
  className?: string;
}

export function LegendDot({ color, label, value, className }: LegendDotProps) {
  return (
    <div className={cn('flex flex-col gap-1 min-w-0', className)}>
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="text-caption text-muted truncate">{label}</span>
      </div>
      {value && <span className="text-small font-semibold text-ink">{value}</span>}
    </div>
  );
}
