import { LegendDot } from '../primitives/LegendDot';
import { cn } from '../utils/cn';

export interface GaugeLegendItem {
  color: string;
  label: string;
  value?: string;
}

export interface GaugeLegendProps {
  items: GaugeLegendItem[];
  className?: string;
}

export function GaugeLegend({ items, className }: GaugeLegendProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      {items.map((item) => (
        <LegendDot key={item.label} color={item.color} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
